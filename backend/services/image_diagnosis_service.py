"""
Medical Image Diagnosis Service using EfficientNet.
Supports modality-specific inference for skin, chest, eye, and brain images.
"""

from __future__ import annotations

import os
import io
import logging
from pathlib import Path
from typing import Dict, Optional, TYPE_CHECKING
import numpy as np

if TYPE_CHECKING:
    import torch
    import torch.nn as nn

from models.medmnist_labels import (
    CHEST_DISPLAY_CLASSES,
    DERMA_DISPLAY_CLASSES,
    OCT_DISPLAY_CLASSES,
    ORGAN_S_DISPLAY_CLASSES,
)

logger = logging.getLogger(__name__)

_SERVICE_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SERVICE_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent


def _resolve_weight_path(filename: str) -> Path:
    for base_dir in (_BACKEND_DIR, _REPO_ROOT):
        candidate = base_dir / "models" / "weights" / filename
        if candidate.is_file():
            return candidate
    return _REPO_ROOT / "models" / "weights" / filename


class ImageDiagnosisService:
    """
    Service for medical image classification using EfficientNet-B0
    Predicts diseases from uploaded medical images by modality.
    """

    MODALITY_CONFIG = {
        "skin": {
            "model_path": _resolve_weight_path("efficientnet_skin_disease.pth"),
            "default_backbone": "efficientnet_b0",
            "default_image_size": 224,
            # MedMNIST DermaMNIST (7); train with scripts/train_medmnist_efficientnet.py --modality skin
            "disease_classes": list(DERMA_DISPLAY_CLASSES),
        },
        "chest": {
            "model_path": _resolve_weight_path("efficientnet_chest_disease.pth"),
            "default_backbone": "efficientnet_b0",
            "default_image_size": 224,
            # MedMNIST ChestMNIST: 14 labels (multi-label); training script saves class names + multi_label flag.
            "disease_classes": list(CHEST_DISPLAY_CLASSES),
        },
        "eye": {
            "model_path": _resolve_weight_path("efficientnet_eye_disease.pth"),
            "default_backbone": "efficientnet_b0",
            "default_image_size": 224,
            # MedMNIST OCTMNIST (4 retinal OCT classes)
            "disease_classes": list(OCT_DISPLAY_CLASSES),
        },
        "brain": {
            "model_path": _resolve_weight_path("efficientnet_brain_disease.pth"),
            "default_backbone": "efficientnet_b0",
            "default_image_size": 224,
            # MedMNIST OrganSMNIST: abdominal CT organ slices (not brain MRI). Train: --modality brain
            "disease_classes": list(ORGAN_S_DISPLAY_CLASSES),
        },
    }
    
    def __init__(
        self,
        model_path: str | Path = _resolve_weight_path("efficientnet_skin_disease.pth"),
        confidence_threshold: float = 0.6
    ):
        """
        Initialize the image diagnosis service
        
        Args:
            model_path: Backward-compatible default skin model path
            confidence_threshold: Minimum confidence for predictions (0-1)
        """
        self.model_path = Path(model_path)
        self.confidence_threshold = confidence_threshold
        self._torch = None
        self._timm = None
        self._nn = None
        self._transforms = None
        self.device = None
        self.models = {}
        self.model_metadata = {}
        self.modality_classes = {
            modality: list(config["disease_classes"])
            for modality, config in self.MODALITY_CONFIG.items()
        }
        self.modality_model_paths = {
            modality: Path(config["model_path"])
            for modality, config in self.MODALITY_CONFIG.items()
        }
        self.modality_backbones = {
            modality: config.get("default_backbone", "efficientnet_b0")
            for modality, config in self.MODALITY_CONFIG.items()
        }
        self.modality_image_sizes = {
            modality: config.get("default_image_size", 224)
            for modality, config in self.MODALITY_CONFIG.items()
        }
        self.modality_model_paths["skin"] = model_path
        self.transforms = {
            modality: self._get_transform(self.modality_image_sizes.get(modality, 224))
            for modality in self.MODALITY_CONFIG
        }

        logger.info("🩺 Initializing Image Diagnosis Service")
        logger.info("   Device will be detected lazily when a model is loaded")
        logger.info(f"   Confidence threshold: {confidence_threshold}")
        logger.info("   Model weights will be loaded lazily on first use")

        for modality, path in self.modality_model_paths.items():
            if not path.is_file():
                logger.warning(f"⚠️ {modality.capitalize()} model weights not found at {path}")
    
    def _get_transform(self, image_size: int = 224):
        """
        Get image preprocessing transformations
        Uses ImageNet normalization (standard for EfficientNet)
        
        Returns:
            torchvision transforms composition
        """
        transforms = self._get_transforms_module()
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet mean
                std=[0.229, 0.224, 0.225]     # ImageNet std
            )
        ])

    def _get_torch_module(self):
        if self._torch is None:
            import torch
            self._torch = torch
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        return self._torch

    def _get_timm_module(self):
        if self._timm is None:
            import timm
            self._timm = timm
        return self._timm

    def _get_nn_module(self):
        if self._nn is None:
            import torch.nn as nn
            self._nn = nn
        return self._nn

    def _get_transforms_module(self):
        if self._transforms is None:
            from torchvision import transforms
            self._transforms = transforms
        return self._transforms
    
    def _create_model(self, backbone: str, num_classes: int) -> nn.Module:
        """
        Create EfficientNet model architecture
        
        Returns:
            PyTorch model
        """
        timm = self._get_timm_module()
        nn = self._get_nn_module()
        model = timm.create_model(backbone, pretrained=False)
        
        # Modify classifier for our number of disease classes
        if hasattr(model, 'classifier') and isinstance(model.classifier, nn.Linear):
            in_features = model.classifier.in_features
            model.classifier = nn.Linear(in_features, num_classes)
        elif hasattr(model, 'get_classifier'):
            classifier = model.get_classifier()
            in_features = classifier.in_features
            model.classifier = nn.Linear(in_features, num_classes)
        else:
            raise RuntimeError(f"Unsupported backbone head for {backbone}")

        return model

    @staticmethod
    def _extract_state_dict(checkpoint):
        if isinstance(checkpoint, dict):
            if 'model_state_dict' in checkpoint:
                return checkpoint['model_state_dict'], checkpoint
            if 'state_dict' in checkpoint:
                return checkpoint['state_dict'], checkpoint
        return checkpoint, checkpoint if isinstance(checkpoint, dict) else {}

    @staticmethod
    def _clean_state_dict(state_dict):
        if not isinstance(state_dict, dict):
            return state_dict

        cleaned_state_dict = {}
        for key, value in state_dict.items():
            if key.startswith('module.'):
                cleaned_state_dict[key[len('module.'):]] = value
            else:
                cleaned_state_dict[key] = value
        return cleaned_state_dict

    def _load_model(self, modality: str):
        """Load modality model weights from .pth file"""
        model_path = self.modality_model_paths[modality]
        try:
            logger.info(f"📥 Loading {modality} model weights from {model_path}")

            torch = self._get_torch_module()
            if self.device is None:
                self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
            state_dict, metadata = self._extract_state_dict(checkpoint)
            state_dict = self._clean_state_dict(state_dict)

            class_names = metadata.get('disease_classes') or metadata.get('class_names')
            if class_names:
                self.modality_classes[modality] = list(class_names)

            backbone = (
                metadata.get('backbone')
                or metadata.get('model_name')
                or self.modality_backbones.get(modality, 'efficientnet_b0')
            )
            image_size = int(metadata.get('image_size') or self.modality_image_sizes.get(modality, 224))
            self.modality_backbones[modality] = backbone
            self.modality_image_sizes[modality] = image_size
            self.transforms[modality] = self._get_transform(image_size)

            meta_dict = dict(metadata) if isinstance(metadata, dict) else {}
            ml = meta_dict.get("multi_label")
            if ml is None and modality == "chest":
                ds = str(meta_dict.get("dataset", "")).lower()
                ml = "medmnist" in ds or "chestmnist" in ds
            meta_dict["multi_label"] = bool(ml) if ml is not None else False
            self.model_metadata[modality] = meta_dict

            model = self._create_model(backbone, num_classes=len(self.modality_classes[modality]))
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()

            self.models[modality] = model

            logger.info(f"✅ {modality.capitalize()} model loaded successfully")
            logger.info(f"   Backbone: {backbone}")
            logger.info(f"   Image size: {image_size}")
            logger.info(f"   Classes: {len(self.modality_classes[modality])}")
            logger.info(f"   Parameters: {sum(p.numel() for p in model.parameters()):,}")

        except Exception as e:
            logger.error(f"❌ Failed to load {modality} model: {e}")
            raise
    
    def preprocess_image(self, image_data: bytes, modality: str = "skin") -> torch.Tensor:
        """
        Preprocess image for model input
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Preprocessed tensor (1, 3, 224, 224)
        """
        try:
            from PIL import Image

            # Open image from bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB (handle RGBA, grayscale, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Apply transformations
            transform = self.transforms.get(modality, self.transforms["skin"])
            tensor = transform(image)
            
            # Add batch dimension
            tensor = tensor.unsqueeze(0)
            
            return tensor
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            raise ValueError(f"Invalid image data: {e}")
    
    def _ensure_model_loaded(self, modality: str):
        if modality in self.models:
            return

        model_path = self.modality_model_paths.get(modality)
        if not model_path or not model_path.is_file():
            raise RuntimeError(
                f"Model for modality '{modality}' is not loaded. "
                f"Expected weights at: {model_path}"
            )

        self._load_model(modality)

    def predict(self, image_data: bytes, modality: str = "skin") -> Dict:
        """
        Predict disease from image
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary with prediction results:
            {
                'disease': str,
                'confidence': float,
                'all_predictions': List[Dict],
                'meets_threshold': bool
            }
        """
        modality = (modality or "skin").lower().strip()
        if modality not in self.MODALITY_CONFIG:
            raise ValueError(
                f"Unsupported modality '{modality}'. "
                f"Supported: {list(self.MODALITY_CONFIG.keys())}"
            )

        self._ensure_model_loaded(modality)
        model = self.models[modality]
        class_names = self.modality_classes[modality]
        
        try:
            import numpy as np
            torch = self._get_torch_module()

            # Preprocess image
            tensor = self.preprocess_image(image_data, modality=modality)
            tensor = tensor.to(self.device)

            multi_label = bool(self.model_metadata.get(modality, {}).get("multi_label"))

            # Run inference
            with torch.no_grad():
                logits = model(tensor)
                if multi_label:
                    probabilities = torch.sigmoid(logits)
                    probs = probabilities[0].cpu().numpy()
                else:
                    probabilities = torch.nn.functional.softmax(logits, dim=1)
                    probs = probabilities[0].cpu().numpy()

            # Use specialized classification methods based on modality
            if modality == 'skin':
                classification_result = self._classify_skin(probs, class_names)
            elif modality == 'chest':
                classification_result = self._classify_chest(probs, class_names)
            elif modality == 'eye':
                classification_result = self._classify_eye(probs, class_names)
            elif modality == 'brain':
                classification_result = self._classify_brain(probs, class_names)
            else:
                # Fallback to generic classification
                top_idx = int(probs.argmax())
                classification_result = {
                    'disease': class_names[top_idx],
                    'confidence': float(probs[top_idx]),
                    'meets_threshold': float(probs[top_idx]) >= self.confidence_threshold,
                    'all_predictions': [
                        {'disease': class_names[i], 'confidence': float(probs[i])}
                        for i in range(len(class_names))
                    ],
                    'classification_type': 'generic'
                }
                classification_result['all_predictions'].sort(key=lambda x: x['confidence'], reverse=True)

            # Build result
            result = {
                'modality': modality,
                'multi_label': multi_label,
                **classification_result
            }
            
            # Add warning for brain/organ modality with low confidence
            if modality == 'brain' and result['confidence'] < 0.7:
                result['warning'] = (
                    "Note: The 'brain' model is trained on abdominal CT scan slices (cross-sections) "
                    "from OrganSMNIST dataset. It may not accurately classify full bone images, "
                    "3D renderings, or images outside the training distribution. "
                    "For best results, use CT scan slices showing organ cross-sections."
                )

            # Enhanced logging based on modality
            if modality == 'chest' and 'detected_conditions' in result:
                logger.info(
                    f"🔍 Prediction (chest): {result['num_conditions']} condition(s) detected - "
                    f"Primary: {result['disease']} ({result['confidence']:.2%})"
                )
            elif modality == 'eye' and 'uncertainty' in result:
                logger.info(
                    f"🔍 Prediction (eye): {result['disease']} ({result['confidence']:.2%}) - "
                    f"Certainty: {result['certainty_level']}"
                )
            elif modality == 'brain' and 'differential_diagnosis' in result:
                logger.info(
                    f"🔍 Prediction (brain): {result['disease']} ({result['confidence']:.2%}) - "
                    f"Top-3 differential provided"
                )
            else:
                logger.info(
                    f"🔍 Prediction ({modality}): {result['disease']} ({result['confidence']:.2%})"
                )

            return result

        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise

    def _classify_skin(self, probs: np.ndarray, class_names: list) -> Dict:
        """
        Skin classification - Single-label with softmax, high threshold (0.6)
        
        Returns top prediction with high confidence requirement
        """
        top_idx = int(probs.argmax())
        top_disease = class_names[top_idx]
        top_confidence = float(probs[top_idx])
        
        # High threshold for skin conditions
        meets_threshold = top_confidence >= 0.6
        
        # Get all predictions sorted
        all_predictions = [
            {'disease': class_names[i], 'confidence': float(probs[i])}
            for i in range(len(class_names))
        ]
        all_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'disease': top_disease,
            'confidence': top_confidence,
            'meets_threshold': meets_threshold,
            'all_predictions': all_predictions,
            'classification_type': 'single-label',
            'threshold_used': 0.6
        }
    
    def _classify_chest(self, probs: np.ndarray, class_names: list) -> Dict:
        """
        Chest classification - Multi-label with sigmoid, lower threshold (0.35)
        
        Returns all detected conditions above threshold
        """
        threshold = 0.35
        
        # Find all conditions above threshold
        detected_conditions = []
        for i, prob in enumerate(probs):
            if prob >= threshold:
                detected_conditions.append({
                    'disease': class_names[i],
                    'confidence': float(prob)
                })
        
        # Sort by confidence
        detected_conditions.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Primary diagnosis is highest confidence
        if detected_conditions:
            primary = detected_conditions[0]
            top_disease = primary['disease']
            top_confidence = primary['confidence']
        else:
            # If nothing above threshold, return highest anyway
            top_idx = int(probs.argmax())
            top_disease = class_names[top_idx]
            top_confidence = float(probs[top_idx])
            detected_conditions = [{'disease': top_disease, 'confidence': top_confidence}]
        
        # Get all predictions sorted
        all_predictions = [
            {'disease': class_names[i], 'confidence': float(probs[i])}
            for i in range(len(class_names))
        ]
        all_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'disease': top_disease,
            'confidence': top_confidence,
            'meets_threshold': len(detected_conditions) > 0,
            'detected_conditions': detected_conditions,  # All conditions above threshold
            'num_conditions': len(detected_conditions),
            'all_predictions': all_predictions,
            'classification_type': 'multi-label',
            'threshold_used': threshold
        }
    
    def _classify_eye(self, probs: np.ndarray, class_names: list) -> Dict:
        """
        Eye classification - Single-label with softmax, includes uncertainty metric
        
        Returns top prediction with uncertainty analysis
        """
        top_idx = int(probs.argmax())
        top_disease = class_names[top_idx]
        top_confidence = float(probs[top_idx])
        
        # Calculate uncertainty metrics
        # Entropy: measure of prediction uncertainty
        epsilon = 1e-10  # Avoid log(0)
        entropy = -np.sum(probs * np.log(probs + epsilon))
        max_entropy = np.log(len(class_names))  # Maximum possible entropy
        normalized_entropy = entropy / max_entropy  # 0 = certain, 1 = uncertain
        
        # Confidence gap: difference between top 2 predictions
        sorted_probs = np.sort(probs)[::-1]
        confidence_gap = float(sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else 1.0
        
        # Overall uncertainty score (0 = certain, 1 = uncertain)
        uncertainty = (normalized_entropy + (1 - confidence_gap)) / 2
        
        # Certainty level
        if uncertainty < 0.2:
            certainty_level = "high"
        elif uncertainty < 0.5:
            certainty_level = "medium"
        else:
            certainty_level = "low"
        
        meets_threshold = top_confidence >= 0.6
        
        # Get all predictions sorted
        all_predictions = [
            {'disease': class_names[i], 'confidence': float(probs[i])}
            for i in range(len(class_names))
        ]
        all_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'disease': top_disease,
            'confidence': top_confidence,
            'meets_threshold': meets_threshold,
            'uncertainty': float(uncertainty),
            'certainty_level': certainty_level,
            'confidence_gap': confidence_gap,
            'entropy': float(normalized_entropy),
            'all_predictions': all_predictions,
            'classification_type': 'single-label',
            'threshold_used': 0.6
        }
    
    def _classify_brain(self, probs: np.ndarray, class_names: list) -> Dict:
        """
        Brain/Organ classification - Single-label with softmax, returns top-3 differential diagnosis
        
        Returns primary diagnosis plus top-3 alternatives for differential diagnosis
        """
        top_idx = int(probs.argmax())
        top_disease = class_names[top_idx]
        top_confidence = float(probs[top_idx])
        
        meets_threshold = top_confidence >= 0.6
        
        # Get all predictions sorted
        all_predictions = [
            {'disease': class_names[i], 'confidence': float(probs[i])}
            for i in range(len(class_names))
        ]
        all_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Top-3 differential diagnosis
        differential_diagnosis = all_predictions[:3]
        
        # Calculate confidence distribution
        top3_sum = sum(p['confidence'] for p in differential_diagnosis)
        
        return {
            'disease': top_disease,
            'confidence': top_confidence,
            'meets_threshold': meets_threshold,
            'differential_diagnosis': differential_diagnosis,  # Top-3 alternatives
            'top3_confidence_sum': float(top3_sum),
            'all_predictions': all_predictions,
            'classification_type': 'single-label',
            'threshold_used': 0.6
        }

    def predict_from_file(self, file_path: str, modality: str = "skin") -> Dict:
        """
        Predict disease from image file path
        
        Args:
            file_path: Path to image file
            
        Returns:
            Prediction dictionary (same as predict())
        """
        with open(file_path, 'rb') as f:
            image_data = f.read()
        return self.predict(image_data, modality=modality)

    def get_model_info(self, modality: Optional[str] = None) -> Dict:
        """
        Get information about the loaded model
        
        Returns:
            Dictionary with model metadata
        """
        def _single_modality_info(modality_name: str) -> Dict:
            backbone = self.modality_backbones.get(modality_name, 'efficientnet_b0')
            return {
                'model_name': backbone.replace('_', '-').upper(),
                'backbone': backbone,
                'modality': modality_name,
                'num_classes': len(self.modality_classes[modality_name]),
                'disease_classes': self.modality_classes[modality_name],
                'input_size': (self.modality_image_sizes.get(modality_name, 224), self.modality_image_sizes.get(modality_name, 224)),
                'confidence_threshold': self.confidence_threshold,
                'device': str(self.device),
                'model_loaded': modality_name in self.models,
                'model_path': self.modality_model_paths[modality_name]
            }

        if modality:
            normalized_modality = modality.lower().strip()
            if normalized_modality not in self.MODALITY_CONFIG:
                raise ValueError(
                    f"Unsupported modality '{modality}'. "
                    f"Supported: {list(self.MODALITY_CONFIG.keys())}"
                )
            return _single_modality_info(normalized_modality)

        return {
            'model_name': 'EfficientNet Multi-Modal',
            'supported_modalities': list(self.MODALITY_CONFIG.keys()),
            'input_size': {
                modality_name: (self.modality_image_sizes.get(modality_name, 224), self.modality_image_sizes.get(modality_name, 224))
                for modality_name in self.MODALITY_CONFIG
            },
            'backbones': self.modality_backbones,
            'confidence_threshold': self.confidence_threshold,
            'device': str(self.device),
            'modalities': {
                modality_name: _single_modality_info(modality_name)
                for modality_name in self.MODALITY_CONFIG
            }
        }


# Singleton instance
_diagnosis_service_instance = None

def get_diagnosis_service() -> ImageDiagnosisService:
    """Get or create singleton diagnosis service instance"""
    global _diagnosis_service_instance
    if _diagnosis_service_instance is None:
        _diagnosis_service_instance = ImageDiagnosisService()
    return _diagnosis_service_instance
