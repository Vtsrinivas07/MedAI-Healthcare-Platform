"""
Unified diagnosis orchestration service.

Flow (matches product architecture):
1) Decision layer: image -> EfficientNet-B0 (modality weights; chest = MedMNIST ChestMNIST multi-label),
   text -> TF-IDF + logistic regression if `models/weights/symptom_text_clf.joblib` exists, else keyword rules.
2) Disease prediction
3) RAG (FAISS / Chroma) retrieval
4) LLM explanation (Gemini / configured provider)
5) Doctor mapping + module routes (portal, prescriptions, pharmacy, labs, reminders, tracking)
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from models.disease_mappings import get_full_disease_context
from models.medmnist_labels import MEDMNIST_DATASET_ID
from services.ai_service import AIService

logger = logging.getLogger(__name__)

_SERVICE_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SERVICE_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent


def _weight_path(filename: str) -> Path:
    return _REPO_ROOT / "models" / "weights" / filename


class DiagnosisOrchestratorService:
    def __init__(self) -> None:
        from services.medical_image_pipeline import get_medical_image_pipeline
        from services.symptom_diagnosis_service import get_symptom_diagnosis_service

        self.ai_service = AIService()
        self.image_pipeline = get_medical_image_pipeline()
        self.symptom_service = get_symptom_diagnosis_service()

    async def run(
        self,
        symptoms: Optional[str],
        image_data: Optional[bytes],
        modality: str = "basic",
    ) -> dict:
        if not symptoms and not image_data:
            raise ValueError("Provide symptoms text or a medical image.")

        mod = (modality or "basic").strip().lower()
        
        # Auto-detect modality for medical images when basic mode is used
        if image_data and mod in ("basic", "normal", "general"):
            # Check if any trained models are available
            available_modalities = []
            for m in ["chest", "skin", "eye", "brain"]:
                model_path = _weight_path(f"efficientnet_{m}_disease.pth")
                if model_path.is_file():
                    available_modalities.append(m)
            
            # If models are available, try to auto-detect the best modality
            if available_modalities:
                # Priority order: chest (most common medical scans), skin, eye, brain
                # You can enhance this with actual image classification later
                if "chest" in available_modalities:
                    mod = "chest"  # Default to chest for X-rays/CT scans
                elif "skin" in available_modalities:
                    mod = "skin"  # Fallback to skin
                elif "eye" in available_modalities:
                    mod = "eye"
                elif "brain" in available_modalities:
                    mod = "brain"
                
                logger.info(f"🔍 Auto-detected modality: {mod} (available: {', '.join(available_modalities)})")

        if image_data and mod in ("skin", "chest", "eye", "brain"):
            model_path = self.image_pipeline.diagnosis_service.modality_model_paths.get(mod)
            if not model_path or not Path(model_path).is_file():
                logger.warning(
                    "⚠️ No trained checkpoint found for %s; falling back to basic image description.",
                    mod,
                )
                mod = "basic"

        if image_data:
            decision_path = "image"
            if mod in ("basic", "normal", "general"):
                vision_text = await self.ai_service.describe_image_basic(
                    image_data, "image/jpeg", symptoms or ""
                )
                vt = (vision_text or "").strip()
                if not vt:
                    raise ValueError(
                        "Basic image mode did not return a description. "
                        "Set AI_PROVIDER=gemini and GEMINI_API_KEY in backend/.env."
                    )
                if vt.startswith("[Basic mode needs Gemini") or vt.startswith("[Basic mode: vision call failed"):
                    raise ValueError(vt.strip("[]"))

                disease = "General visual description"
                confidence = 0.55
                disease_context = get_full_disease_context(disease, confidence, modality="basic")
                explanation = (
                    f"{vt}\n\n---\n**BASIC** mode uses general vision only (no clinical weight files). "
                    "Use **Skin / Chest / Eye / Brain** only for that type of medical image when weights are installed."
                )
                return {
                    "decision_layer": {"path": decision_path, "model": "vision-llm-basic"},
                    "prediction": {
                        "disease": disease,
                        "confidence": round(float(confidence), 4),
                        "modality": "basic",
                        "all_predictions": [],
                        "meets_threshold": False,
                    },
                    "doctor_mapping": disease_context["doctor"],
                    "treatment": disease_context.get("treatment", {}),
                    "tests": disease_context.get("tests", []),
                    "disease_info": disease_context.get("disease_info", {}),
                    "rag_llm_output": explanation,
                    "module_routes": {
                        "doctor_portal": "/doctor-dashboard",
                        "prescription_module": "/patient-prescriptions",
                        "pharmacy": "/pharmacy",
                        "lab_tests": "/lab-tests",
                        "medicine_reminders": "/medicine-reminder",
                        "health_tracking": "/health-tracking",
                        "admin_dashboard": "/admin-dashboard",
                    },
                    "disclaimer": (
                        "BASIC mode is for general image description only—not a medical diagnosis. "
                        "Consult a licensed professional for health decisions."
                    ),
                }

            try:
                prediction = self.image_pipeline.diagnosis_service.predict(image_data, modality=mod)
            except RuntimeError as exc:
                logger.warning(
                    "⚠️ Trained checkpoint unavailable for %s; falling back to basic image description (%s)",
                    mod,
                    exc,
                )
                vision_text = await self.ai_service.describe_image_basic(
                    image_data, "image/jpeg", symptoms or ""
                )
                vt = (vision_text or "").strip()
                if not vt:
                    raise ValueError(
                        "Basic image mode did not return a description. "
                        "Set AI_PROVIDER=gemini and GEMINI_API_KEY in backend/.env."
                    )
                if vt.startswith("[Basic mode needs Gemini") or vt.startswith("[Basic mode: vision call failed"):
                    raise ValueError(vt.strip("[]"))

                disease = "General visual description"
                confidence = 0.55
                disease_context = get_full_disease_context(disease, confidence, modality="basic")
                explanation = (
                    f"{vt}\n\n---\n**BASIC** mode uses general vision only (no clinical weight files). "
                    "Use **Skin / Chest / Eye / Brain** only for that type of medical image when weights are installed."
                )
                return {
                    "decision_layer": {"path": decision_path, "model": "vision-llm-basic"},
                    "prediction": {
                        "disease": disease,
                        "confidence": round(float(confidence), 4),
                        "modality": "basic",
                        "all_predictions": [],
                        "meets_threshold": False,
                    },
                    "doctor_mapping": disease_context["doctor"],
                    "treatment": disease_context.get("treatment", {}),
                    "tests": disease_context.get("tests", []),
                    "disease_info": disease_context.get("disease_info", {}),
                    "rag_llm_output": explanation,
                    "module_routes": {
                        "doctor_portal": "/doctor-dashboard",
                        "prescription_module": "/patient-prescriptions",
                        "pharmacy": "/pharmacy",
                        "lab_tests": "/lab-tests",
                        "medicine_reminders": "/medicine-reminder",
                        "health_tracking": "/health-tracking",
                        "admin_dashboard": "/admin-dashboard",
                    },
                    "disclaimer": (
                        "BASIC mode is for general image description only—not a medical diagnosis. "
                        "Consult a licensed professional for health decisions."
                    ),
                }
        else:
            decision_path = "text"
            prediction = self.symptom_service.predict(symptoms or "")

        disease = prediction["disease"]
        confidence = float(prediction["confidence"])
        resolved_modality = prediction.get("modality", mod if image_data else "text")

        context_modality = (
            "text"
            if not image_data
            else (mod if mod in ("skin", "chest", "eye", "brain") else "skin")
        )
        disease_context = get_full_disease_context(
            disease, confidence, modality=context_modality
        )

        # For text predictions that are not part of disease_mappings, keep specialist from symptom model.
        if decision_path == "text":
            disease_context["doctor"] = prediction.get("doctor", disease_context["doctor"])

        explanation = await self._generate_diagnosis_explanation(
            decision_path=decision_path,
            symptoms=symptoms,
            disease=disease,
            confidence=confidence,
            modality=resolved_modality,
            disease_context=disease_context,
        )

        img_meta = {}
        if decision_path == "image":
            try:
                img_meta = self.image_pipeline.diagnosis_service.model_metadata.get(mod, {})
            except Exception:
                img_meta = {}

        decision_model = (
            {
                "backbone": "EfficientNet-B0",
                "dataset": img_meta.get("dataset")
                or (
                    MEDMNIST_DATASET_ID.get(mod)
                    if mod in MEDMNIST_DATASET_ID
                    else "custom-weights"
                ),
                "multi_label": bool(img_meta.get("multi_label")),
            }
            if decision_path == "image"
            else {
                "backend": prediction.get("model_backend", self.symptom_service.model_kind),
                "family": "tfidf-logistic" if "sklearn" in self.symptom_service.model_kind else "keyword-rules",
            }
        )

        return {
            "decision_layer": {
                "path": decision_path,
                "model": decision_model,
            },
            "prediction": {
                "disease": disease,
                "confidence": round(confidence, 4),
                "modality": resolved_modality,
                "all_predictions": prediction.get("all_predictions", [])[:5],
                "meets_threshold": prediction.get("meets_threshold", confidence >= 0.6),
            },
            "doctor_mapping": disease_context["doctor"],
            "treatment": disease_context.get("treatment", {}),
            "tests": disease_context.get("tests", []),
            "disease_info": disease_context.get("disease_info", {}),
            "rag_llm_output": explanation,
            "module_routes": {
                "doctor_portal": "/doctor-dashboard",
                "prescription_module": "/patient-prescriptions",
                "pharmacy": "/pharmacy",
                "lab_tests": "/lab-tests",
                "medicine_reminders": "/medicine-reminder",
                "health_tracking": "/health-tracking",
                "admin_dashboard": "/admin-dashboard",
            },
            "disclaimer": (
                "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis. "
                "Please consult a licensed healthcare professional."
            ),
        }

    async def _generate_diagnosis_explanation(
        self,
        decision_path: str,
        symptoms: Optional[str],
        disease: str,
        confidence: float,
        modality: str,
        disease_context: dict,
    ) -> str:
        # Fetch RAG context concurrently while building the prompt
        rag_context = ""
        if self.ai_service.rag_enabled and self.ai_service.rag_service:
            try:
                docs = await self.ai_service.rag_service.search_medical_knowledge(
                    query=f"{disease} {symptoms or ''}".strip(),
                    k=2,  # Reduced from 3 to 2 for speed
                )
                if docs:
                    rag_context = "\n".join([f"- {d.get('content', '')[:200]}" for d in docs])
            except Exception as exc:
                logger.warning(f"RAG lookup failed: {exc}")

        prompt = (
            f"Predicted: **{disease}** ({confidence:.0%} confidence) via {decision_path}.\n"
            f"Symptoms: {symptoms or 'Not provided'}\n"
            f"Specialist: {disease_context.get('doctor', {}).get('specialty', 'General Physician')}\n"
            f"Tests: {', '.join(disease_context.get('tests', [])[:3])}\n"
            + (f"Medical references:\n{rag_context}\n" if rag_context else "")
            + "\nWrite a brief medical explanation with these 4 sections (use ### headings exactly):\n\n"
            "### Why This Prediction Was Made\n"
            "2-3 sentences on clinical reasoning.\n\n"
            "### What You Should Do Next\n"
            "2-3 sentences: specialist, urgency, preparation.\n\n"
            "### Warning Signs to Watch For\n"
            "3-4 bullet points of red-flag symptoms.\n\n"
            "### How This App Can Help\n"
            "1-2 sentences on relevant app modules.\n\n"
            "Keep total under 200 words. Be clear and compassionate."
        )
        return await self.ai_service.get_simple_response(
            prompt,
            [],
            max_tokens=800,
            system_prompt=(
                "You are MedAI, a medical assistant. "
                "Write the complete explanation exactly as requested with all 4 sections. "
                "Do NOT stop early. Complete every section fully. "
                "Use ### markdown headings. Be clear and compassionate."
            ),
        )


_orchestrator_instance: Optional[DiagnosisOrchestratorService] = None


def get_diagnosis_orchestrator() -> DiagnosisOrchestratorService:
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = DiagnosisOrchestratorService()
    return _orchestrator_instance
