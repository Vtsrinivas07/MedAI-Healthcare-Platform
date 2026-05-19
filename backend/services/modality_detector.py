"""
Automatic Modality Detection Service
Analyzes medical images to determine the correct modality (skin, chest, eye, brain)
"""

from PIL import Image
import io
import numpy as np
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class ModalityDetector:
    """
    Detects medical image modality using image characteristics
    
    Detection strategies:
    1. Image characteristics (color, texture, patterns)
    2. Aspect ratio and dimensions
    3. Color distribution analysis
    4. Edge and texture patterns
    """
    
    def __init__(self):
        self.modality_features = {
            'skin': {
                'color_range': 'warm',  # Skin tones
                'texture': 'varied',
                'typical_size': (224, 224),
                'color_channels': 3,
                'keywords': ['derma', 'skin', 'lesion', 'mole']
            },
            'chest': {
                'color_range': 'grayscale',  # X-rays are typically grayscale
                'texture': 'structured',
                'typical_size': (224, 224),
                'color_channels': 1,  # Often grayscale
                'keywords': ['chest', 'xray', 'lung', 'thorax']
            },
            'eye': {
                'color_range': 'mixed',  # OCT scans
                'texture': 'layered',
                'typical_size': (224, 224),
                'color_channels': 3,
                'keywords': ['oct', 'retina', 'eye', 'fundus']
            },
            'brain': {
                'color_range': 'grayscale',  # MRI/CT scans
                'texture': 'smooth',
                'typical_size': (224, 224),
                'color_channels': 1,
                'keywords': ['brain', 'mri', 'ct', 'head']
            }
        }
    
    def detect_modality(self, image_bytes: bytes, filename: str = None) -> Dict:
        """
        Detect modality from image
        
        Args:
            image_bytes: Raw image bytes
            filename: Optional filename for hint extraction
            
        Returns:
            Dictionary with detected modality and confidence
        """
        try:
            # Load image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Analyze image characteristics
            scores = {}
            
            # 1. Filename hint (if available)
            filename_score = self._analyze_filename(filename) if filename else {}
            
            # 2. Color analysis
            color_score = self._analyze_colors(image)
            
            # 3. Texture analysis
            texture_score = self._analyze_texture(image)
            
            # 4. Grayscale detection
            grayscale_score = self._analyze_grayscale(image)
            
            # Combine scores
            for modality in ['skin', 'chest', 'eye', 'brain']:
                score = 0.0
                
                # Filename hint (30% weight)
                if filename_score.get(modality, 0) > 0:
                    score += filename_score[modality] * 0.3
                
                # Color analysis (30% weight)
                score += color_score.get(modality, 0) * 0.3
                
                # Texture analysis (20% weight)
                score += texture_score.get(modality, 0) * 0.2
                
                # Grayscale analysis (20% weight)
                score += grayscale_score.get(modality, 0) * 0.2
                
                scores[modality] = score
            
            # Get best match
            best_modality = max(scores, key=scores.get)
            confidence = scores[best_modality]
            
            # If confidence is too low, default to skin
            if confidence < 0.3:
                logger.warning(f"Low confidence ({confidence:.2f}) in modality detection, defaulting to skin")
                best_modality = 'skin'
                confidence = 0.5
            
            result = {
                'modality': best_modality,
                'confidence': confidence,
                'all_scores': scores,
                'detection_method': 'automatic'
            }
            
            logger.info(f"🔍 Detected modality: {best_modality} (confidence: {confidence:.2%})")
            
            return result
            
        except Exception as e:
            logger.error(f"Error detecting modality: {e}")
            # Default to skin on error
            return {
                'modality': 'skin',
                'confidence': 0.5,
                'all_scores': {},
                'detection_method': 'fallback',
                'error': str(e)
            }
    
    def _analyze_filename(self, filename: str) -> Dict[str, float]:
        """Analyze filename for modality hints"""
        if not filename:
            return {}
        
        filename_lower = filename.lower()
        scores = {}
        
        for modality, features in self.modality_features.items():
            score = 0.0
            for keyword in features['keywords']:
                if keyword in filename_lower:
                    score = 1.0
                    break
            scores[modality] = score
        
        return scores
    
    def _analyze_colors(self, image: Image.Image) -> Dict[str, float]:
        """
        Analyze color distribution to determine modality
        
        Skin: Warm tones (red, orange, brown)
        Chest: Grayscale X-rays, typically darker with lung structures
        Brain: Grayscale CT/MRI, includes bone images (very bright/white)
        Eye: Mixed colors with specific patterns, often darker with reddish tones
        """
        # Resize for faster processing
        img_small = image.resize((64, 64))
        img_array = np.array(img_small)
        
        # Calculate color statistics
        r_mean = img_array[:, :, 0].mean()
        g_mean = img_array[:, :, 1].mean()
        b_mean = img_array[:, :, 2].mean()
        
        # Calculate color variance
        r_std = img_array[:, :, 0].std()
        g_std = img_array[:, :, 1].std()
        b_std = img_array[:, :, 2].std()
        
        # Calculate overall brightness
        brightness = (r_mean + g_mean + b_mean) / 3
        
        # Check for very bright/white background (common in bone/organ images)
        very_bright = brightness > 200
        
        scores = {}
        
        # Skin detection: warm tones, R > G > B typically, medium-high brightness
        skin_score = 0.0
        if r_mean > g_mean and r_mean > b_mean:
            skin_score += 0.4
        if 100 < r_mean < 220 and 70 < g_mean < 180:  # Typical skin tone range
            skin_score += 0.3
        if r_std > 20:  # Varied texture
            skin_score += 0.2
        if 120 < brightness < 180:  # Skin images are usually medium-bright
            skin_score += 0.1
        # Penalize if too bright (likely bone/organ image)
        if very_bright:
            skin_score *= 0.3
        scores['skin'] = min(skin_score, 1.0)
        
        # Calculate grayscale similarity
        color_diff = max(abs(r_mean - g_mean), abs(g_mean - b_mean), abs(r_mean - b_mean))
        is_grayscale = color_diff < 20
        
        # Chest detection: grayscale X-rays, medium darkness (50-150 brightness)
        chest_score = 0.0
        if is_grayscale:
            chest_score += 0.5
        if 50 < brightness < 150:  # Typical X-ray brightness range
            chest_score += 0.3
        if r_std > 15 and r_std < 50:  # Moderate variance (lung structures)
            chest_score += 0.2
        # Penalize if too bright (likely bone/organ, not chest X-ray)
        if very_bright:
            chest_score *= 0.2
        scores['chest'] = min(chest_score, 1.0)
        
        # Brain/Organ detection: grayscale CT/MRI, can be very bright (bones) or medium (organs)
        brain_score = 0.0
        if is_grayscale:
            brain_score += 0.5
        # Brain/organ images can be very bright (bones) or medium (soft tissue)
        if brightness > 150 or (50 < brightness < 120):
            brain_score += 0.3
        # Bone images are often very bright with low variance
        if very_bright and r_std < 40:
            brain_score += 0.2  # Strong indicator of bone image
        scores['brain'] = min(brain_score, 1.0)
        
        # Eye detection: mixed colors, often darker, may have reddish tones from blood vessels
        eye_score = 0.0
        if brightness < 100:  # OCT scans are typically darker
            eye_score += 0.4
        if r_std > 25 and g_std > 25:  # High variance in multiple channels
            eye_score += 0.3
        if not (r_mean > g_mean and r_mean > b_mean and brightness > 120):  # Not bright skin-like
            eye_score += 0.2
        # OCT often has layered appearance with color variation
        if color_diff > 15 and brightness < 120:  # Has color but not bright
            eye_score += 0.1
        # Penalize if too bright (not typical for OCT)
        if very_bright:
            eye_score *= 0.2
        scores['eye'] = min(eye_score, 1.0)
        
        return scores
    
    def _analyze_texture(self, image: Image.Image) -> Dict[str, float]:
        """Analyze texture patterns"""
        # Resize for processing
        img_small = image.resize((64, 64))
        img_gray = img_small.convert('L')
        img_array = np.array(img_gray)
        
        # Calculate texture variance
        texture_variance = img_array.std()
        
        # Calculate edge density (simple Sobel-like)
        edges_h = np.abs(np.diff(img_array, axis=0)).sum()
        edges_v = np.abs(np.diff(img_array, axis=1)).sum()
        edge_density = (edges_h + edges_v) / (64 * 64)
        
        # Calculate horizontal pattern strength (for OCT layering)
        horizontal_variance = np.var(img_array.mean(axis=1))
        
        # Check for smooth/uniform regions (common in bone/organ images)
        brightness = img_array.mean()
        is_very_bright = brightness > 200
        
        scores = {}
        
        # Skin: high texture variance, irregular patterns
        scores['skin'] = min(texture_variance / 50.0, 1.0)
        
        # Chest: moderate edges (ribs, lung structure), vertical and horizontal
        # Chest X-rays have structured patterns but not too smooth
        chest_score = 0.0
        if 20 < edge_density < 60:
            chest_score += 0.5
        if 30 < texture_variance < 60:  # Moderate variance
            chest_score += 0.3
        # Penalize if too smooth (likely bone/organ)
        if is_very_bright and texture_variance < 25:
            chest_score *= 0.3
        scores['chest'] = min(chest_score, 1.0)
        
        # Eye: layered patterns (OCT has strong horizontal layering)
        eye_score = 0.0
        if horizontal_variance > 100:  # Strong horizontal layering
            eye_score += 0.5
        if edge_density > 30:  # Moderate to high edges
            eye_score += 0.3
        if texture_variance > 25:  # Some texture variation
            eye_score += 0.2
        scores['eye'] = min(eye_score, 1.0)
        
        # Brain/Organ: can be smooth (bones) or structured (organs)
        # Bone images are very smooth with low variance
        brain_score = 0.0
        if is_very_bright and texture_variance < 30:
            brain_score += 0.6  # Strong indicator of bone
        if edge_density < 40:
            brain_score += 0.3
        if horizontal_variance < 100:  # Less layered than OCT
            brain_score += 0.1
        scores['brain'] = min(brain_score, 1.0)
        
        return scores
    
    def _analyze_grayscale(self, image: Image.Image) -> Dict[str, float]:
        """Check if image is grayscale (common for X-rays, MRI, CT)"""
        img_array = np.array(image.resize((64, 64)))
        
        # Check color channel similarity
        r = img_array[:, :, 0]
        g = img_array[:, :, 1]
        b = img_array[:, :, 2]
        
        # Calculate average difference between channels
        rg_diff = np.abs(r.astype(float) - g.astype(float)).mean()
        gb_diff = np.abs(g.astype(float) - b.astype(float)).mean()
        rb_diff = np.abs(r.astype(float) - b.astype(float)).mean()
        
        avg_diff = (rg_diff + gb_diff + rb_diff) / 3
        
        # Calculate brightness
        brightness = r.mean()
        
        scores = {}
        
        # If nearly grayscale (avg diff < 10), likely chest or brain
        if avg_diff < 10:
            # Very bright grayscale = likely bone/organ (brain modality)
            if brightness > 180:
                scores['chest'] = 0.2
                scores['brain'] = 0.9  # Strong indicator of bone/organ
                scores['skin'] = 0.1
                scores['eye'] = 0.2
            # Medium brightness grayscale = likely chest X-ray or brain CT
            elif 80 < brightness < 180:
                scores['chest'] = 0.7
                scores['brain'] = 0.6
                scores['skin'] = 0.1
                scores['eye'] = 0.3
            # Dark grayscale = could be chest or brain
            else:
                scores['chest'] = 0.5
                scores['brain'] = 0.6
                scores['skin'] = 0.1
                scores['eye'] = 0.4
        else:
            # Color image, likely skin or eye
            scores['chest'] = 0.2
            scores['brain'] = 0.2
            scores['skin'] = 0.7
            scores['eye'] = 0.6
        
        return scores


# Singleton instance
_detector_instance = None

def get_modality_detector() -> ModalityDetector:
    """Get singleton modality detector instance"""
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = ModalityDetector()
    return _detector_instance


def detect_modality(image_bytes: bytes, filename: str = None) -> str:
    """
    Convenience function to detect modality
    
    Args:
        image_bytes: Raw image bytes
        filename: Optional filename for hints
        
    Returns:
        Detected modality string ('skin', 'chest', 'eye', 'brain')
    """
    detector = get_modality_detector()
    result = detector.detect_modality(image_bytes, filename)
    return result['modality']
