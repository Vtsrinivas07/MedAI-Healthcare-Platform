"""
Symptom diagnosis service (text branch of the decision layer).

Primary: TF-IDF + logistic regression (scikit-learn) when trained weights exist.
Fallback 1: weighted keyword scoring (same condition set).
Fallback 2: AI-powered diagnosis via LLM when keywords produce no confident match.
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import joblib
except ImportError:  # pragma: no cover
    joblib = None  # type: ignore

logger = logging.getLogger(__name__)

_WEIGHTS_PATH = Path(__file__).resolve().parent.parent / "models" / "weights" / "symptom_text_clf.joblib"

# Comprehensive keyword map covering far more conditions
_CONDITION_KEYWORDS: Dict[str, Dict[str, float]] = {
    "Flu / Viral Fever": {
        "fever": 1.4, "chills": 1.2, "body ache": 1.1, "body pain": 1.1,
        "cough": 1.0, "fatigue": 0.9, "sore throat": 0.9, "runny nose": 0.8,
        "flu": 1.5, "influenza": 1.5, "viral": 1.2,
    },
    "Migraine": {
        "headache": 1.3, "nausea": 1.0, "light sensitivity": 1.2,
        "sound sensitivity": 1.1, "throbbing": 1.0, "migraine": 1.5, "aura": 1.2,
    },
    "Gastroenteritis": {
        "vomiting": 1.3, "diarrhea": 1.3, "stomach pain": 1.1,
        "abdominal pain": 1.1, "dehydration": 0.9, "nausea": 0.9,
        "loose stool": 1.2, "food poisoning": 1.3,
    },
    "Hypertension": {
        "high bp": 1.3, "high blood pressure": 1.4, "dizziness": 0.8,
        "headache": 0.7, "blurred vision": 1.0, "hypertension": 1.5,
    },
    "Diabetes": {
        "frequent urination": 1.2, "thirst": 1.1, "fatigue": 0.8,
        "blurred vision": 1.0, "high sugar": 1.3, "weight loss": 1.0,
        "diabetes": 1.5, "blood sugar": 1.3, "hyperglycemia": 1.4,
    },
    "Allergic Rhinitis": {
        "sneezing": 1.2, "runny nose": 1.2, "itchy eyes": 1.1,
        "nasal congestion": 1.1, "allergy": 1.1, "watery eyes": 1.0,
    },
    "Chest Pain / Cardiac": {
        "chest pain": 1.5, "chest tightness": 1.4, "heart attack": 1.5,
        "palpitations": 1.2, "shortness of breath": 1.1, "left arm pain": 1.3,
        "angina": 1.4, "cardiac": 1.4, "heart": 1.0,
    },
    "Respiratory Infection": {
        "cough": 1.2, "shortness of breath": 1.3, "wheezing": 1.3,
        "chest congestion": 1.2, "breathing difficulty": 1.3, "pneumonia": 1.4,
        "bronchitis": 1.4, "asthma": 1.3,
    },
    "Skin Condition": {
        "rash": 1.3, "itching": 1.2, "redness": 1.0, "hives": 1.3,
        "eczema": 1.4, "psoriasis": 1.4, "dermatitis": 1.4, "skin": 1.0,
    },
    "Urinary Tract Infection": {
        "burning urination": 1.4, "painful urination": 1.4, "frequent urination": 1.2,
        "urinary": 1.3, "uti": 1.5, "cloudy urine": 1.3, "blood in urine": 1.4,
    },
    "Anxiety / Mental Health": {
        "anxiety": 1.4, "panic": 1.3, "stress": 1.1, "depression": 1.3,
        "worry": 1.0, "mental health": 1.3, "insomnia": 1.0,
        "sleeplessness": 1.0, "restlessness": 1.0,
    },
    "Joint / Musculoskeletal": {
        "joint pain": 1.3, "arthritis": 1.4, "knee pain": 1.3, "back pain": 1.2,
        "muscle pain": 1.1, "stiffness": 1.2, "swollen joint": 1.3, "gout": 1.4,
    },
    "Dental / Oral": {
        "toothache": 1.5, "tooth pain": 1.5, "dental": 1.4, "gum": 1.2,
        "mouth pain": 1.3, "jaw pain": 1.2, "tooth": 1.3,
    },
    "Thyroid Disorder": {
        "thyroid": 1.5, "hypothyroid": 1.4, "hyperthyroid": 1.4,
        "weight gain": 1.0, "hair loss": 1.0, "fatigue": 0.7,
        "cold intolerance": 1.2, "heat intolerance": 1.2, "goiter": 1.3,
    },
    "Anemia": {
        "fatigue": 1.0, "weakness": 1.0, "pale": 1.2, "pallor": 1.2,
        "dizziness": 0.9, "shortness of breath": 0.9, "anemia": 1.5,
        "low hemoglobin": 1.4, "iron deficiency": 1.3,
    },
    "Infection / Lymphoma": {
        "weight loss": 1.2, "night sweats": 1.4, "swollen lymph": 1.5,
        "lymph node": 1.5, "lymphadenopathy": 1.5, "fatigue": 0.9,
        "fever": 1.0, "unexplained weight loss": 1.4, "painless lump": 1.3,
        "neck mass": 1.3, "lymphoma": 1.5,
    },
    "Drug Interaction": {
        "warfarin": 1.4, "ibuprofen": 1.3, "aspirin": 1.3, "blood thinner": 1.4,
        "drug interaction": 1.5, "medication": 1.0, "taking": 0.8,
        "blood clot": 1.3, "anticoagulant": 1.4,
    },
    "Gastrointestinal / GERD": {
        "heartburn": 1.4, "acid reflux": 1.4, "gerd": 1.5, "indigestion": 1.3,
        "stomach burning": 1.3, "regurgitation": 1.2, "upper abdomen": 1.1,
    },
}

_SPECIALIST_MAP: Dict[str, Dict[str, str]] = {
    "Flu / Viral Fever": {"specialty": "General Physician", "urgency": "routine"},
    "Migraine": {"specialty": "Neurologist", "urgency": "soon"},
    "Gastroenteritis": {"specialty": "Gastroenterologist", "urgency": "soon"},
    "Hypertension": {"specialty": "Cardiologist", "urgency": "soon"},
    "Diabetes": {"specialty": "Endocrinologist", "urgency": "routine"},
    "Allergic Rhinitis": {"specialty": "ENT Specialist", "urgency": "routine"},
    "Chest Pain / Cardiac": {"specialty": "Cardiologist", "urgency": "urgent"},
    "Respiratory Infection": {"specialty": "Pulmonologist", "urgency": "soon"},
    "Skin Condition": {"specialty": "Dermatologist", "urgency": "routine"},
    "Urinary Tract Infection": {"specialty": "Urologist", "urgency": "soon"},
    "Anxiety / Mental Health": {"specialty": "Psychiatrist", "urgency": "routine"},
    "Joint / Musculoskeletal": {"specialty": "Orthopedist", "urgency": "routine"},
    "Dental / Oral": {"specialty": "Dentist", "urgency": "soon"},
    "Thyroid Disorder": {"specialty": "Endocrinologist", "urgency": "routine"},
    "Anemia": {"specialty": "Hematologist", "urgency": "routine"},
    "Infection / Lymphoma": {"specialty": "Oncologist / Hematologist", "urgency": "urgent"},
    "Drug Interaction": {"specialty": "General Physician / Pharmacist", "urgency": "urgent"},
    "Gastrointestinal / GERD": {"specialty": "Gastroenterologist", "urgency": "routine"},
    "General Condition": {"specialty": "General Physician", "urgency": "routine"},
}


class SymptomDiagnosisService:
    def __init__(self) -> None:
        # Keep old attribute name for compatibility
        self.condition_keywords = _CONDITION_KEYWORDS
        self.specialist_map = _SPECIALIST_MAP

        self._sklearn_pipeline = None
        self.model_kind = "keyword-rules"
        self._ai_service: Optional[object] = None  # lazy-loaded

        if joblib is not None and _WEIGHTS_PATH.is_file():
            try:
                self._sklearn_pipeline = joblib.load(_WEIGHTS_PATH)
                self.model_kind = "sklearn-tfidf-logistic"
                logger.info("Loaded symptom ML pipeline from %s", _WEIGHTS_PATH)
            except Exception as exc:  # pragma: no cover
                logger.warning("Could not load symptom ML weights: %s", exc)
                self._sklearn_pipeline = None
                self.model_kind = "keyword-rules"

    def _get_ai_service(self):
        """Lazy-load AIService to avoid circular imports."""
        if self._ai_service is None:
            try:
                from services.ai_service import AIService
                self._ai_service = AIService()
            except Exception as exc:
                logger.warning("Could not load AIService for symptom fallback: %s", exc)
        return self._ai_service

    def predict(self, symptoms: str) -> Dict:
        text = (symptoms or "").strip().lower()
        if not text:
            raise ValueError("Symptoms text is required for text diagnosis.")

        if self._sklearn_pipeline is not None:
            try:
                return self._predict_sklearn(text)
            except Exception as exc:
                logger.warning(f"sklearn prediction failed, falling back to keywords: {exc}")
                self._sklearn_pipeline = None
                self.model_kind = "keyword-rules"

        return self._predict_keywords(text)

    async def predict_async(self, symptoms: str) -> Dict:
        """Async predict — tries keywords first, then AI if confidence is low."""
        text = (symptoms or "").strip().lower()
        if not text:
            raise ValueError("Symptoms text is required for text diagnosis.")

        if self._sklearn_pipeline is not None:
            try:
                result = self._predict_sklearn(text)
                if result.get("confidence", 0) >= 0.45:
                    return result
            except Exception as exc:
                logger.warning(f"sklearn prediction failed: {exc}")
                self._sklearn_pipeline = None

        kw_result = self._predict_keywords(text)

        # If keywords produced a confident match, use it
        if kw_result.get("confidence", 0) >= 0.50 and kw_result.get("disease") != "General Condition":
            return kw_result

        # Low confidence — use AI for a proper assessment
        logger.info("Keyword confidence too low (%.2f), using AI diagnosis.", kw_result.get("confidence", 0))
        ai_result = await self._predict_with_ai(symptoms)
        if ai_result:
            return ai_result

        return kw_result

    async def _predict_with_ai(self, symptoms: str) -> Optional[Dict]:
        """Use the configured AI (Gemini/Groq/etc.) to diagnose from free-text symptoms."""
        ai = self._get_ai_service()
        if ai is None or not getattr(ai, "api_key_valid", False):
            return None

        prompt = (
            f"A patient describes the following symptoms/situation:\n\n\"{symptoms}\"\n\n"
            "As a clinical AI, provide a structured differential diagnosis in JSON only. "
            "Do NOT include markdown fences. Return exactly this structure:\n"
            "{\n"
            '  "primary_diagnosis": "Most likely condition name",\n'
            '  "confidence": 0.75,\n'
            '  "specialty": "Relevant specialist (e.g. Oncologist, Cardiologist)",\n'
            '  "urgency": "routine|soon|urgent",\n'
            '  "differential": [\n'
            '    {"disease": "Condition 1", "confidence": 0.75},\n'
            '    {"disease": "Condition 2", "confidence": 0.15},\n'
            '    {"disease": "Condition 3", "confidence": 0.10}\n'
            '  ]\n'
            "}\n\n"
            "Rules:\n"
            "- primary_diagnosis must accurately reflect the symptoms given\n"
            "- confidence must be between 0.35 and 0.90\n"
            "- Return ONLY the JSON object, no other text"
        )

        try:
            raw = await ai.get_simple_response(
                prompt,
                [],
                max_tokens=400,
                system_prompt=(
                    "You are a clinical diagnosis assistant. "
                    "Respond with a single valid JSON object only. No markdown, no explanation."
                ),
            )

            # Strip any accidental markdown fences
            raw = raw.strip()
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)
            raw = raw.strip()

            data = json.loads(raw)
            disease = data.get("primary_diagnosis", "General Condition")
            confidence = float(data.get("confidence", 0.55))
            confidence = min(0.90, max(0.35, confidence))
            specialty = data.get("specialty", "General Physician")
            urgency = data.get("urgency", "routine")

            differential = data.get("differential", [])
            all_predictions = [
                {"disease": d.get("disease", ""), "confidence": round(float(d.get("confidence", 0)), 4)}
                for d in differential
            ]
            if not any(p["disease"] == disease for p in all_predictions):
                all_predictions.insert(0, {"disease": disease, "confidence": round(confidence, 4)})

            return {
                "modality": "text",
                "disease": disease,
                "confidence": round(confidence, 4),
                "all_predictions": all_predictions[:5],
                "meets_threshold": confidence >= 0.50,
                "doctor": {
                    "specialty": specialty,
                    "urgency": urgency,
                    "consultation_type": "in-person or teleconsultation",
                    "description": f"AI-assessed: {specialty} recommended.",
                },
                "model_backend": "ai-llm-diagnosis",
            }

        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.warning("AI diagnosis JSON parse failed: %s | raw: %s", exc, raw[:200] if 'raw' in dir() else '')
            return None
        except Exception as exc:
            logger.warning("AI diagnosis failed: %s", exc)
            return None

    def _predict_sklearn(self, text: str) -> Dict:
        clf = self._sklearn_pipeline
        classes_attr = getattr(clf, "classes_", None)
        if classes_attr is not None:
            classes = list(classes_attr)
        else:
            classes = list(clf.named_steps["clf"].classes_)
        proba = clf.predict_proba([text])[0]
        order = proba.argsort()[::-1]
        top_i = int(order[0])
        top_condition = classes[top_i]
        top_p = float(proba[top_i])

        if top_p < 0.18 and "General Condition" in classes:
            top_condition = "General Condition"
            top_p = max(top_p, 0.28)

        all_predictions = [
            {"disease": classes[int(i)], "confidence": round(float(proba[int(i)]), 4)}
            for i in order[: min(6, len(classes))]
        ]

        confidence = min(0.92, max(0.38, top_p))
        specialist = self.specialist_map.get(top_condition, self.specialist_map["General Condition"])

        return {
            "modality": "text",
            "disease": top_condition,
            "confidence": round(confidence, 4),
            "all_predictions": all_predictions,
            "meets_threshold": confidence >= 0.55,
            "doctor": {
                "specialty": specialist["specialty"],
                "urgency": specialist["urgency"],
                "consultation_type": "in-person or teleconsultation",
                "description": "Specialist suggestion from symptom ML model (TF-IDF + logistic).",
            },
            "model_backend": self.model_kind,
        }

    def _predict_keywords(self, text: str) -> Dict:
        scored: List[Tuple[str, float]] = []
        for condition, keywords in self.condition_keywords.items():
            score = 0.0
            for keyword, weight in keywords.items():
                if keyword in text:
                    score += weight
            scored.append((condition, score))

        scored.sort(key=lambda item: item[1], reverse=True)
        top_condition, top_score = scored[0]
        total_positive = sum(max(0.0, item[1]) for item in scored)

        if top_score <= 0:
            top_condition = "General Condition"
            confidence = 0.35
        else:
            confidence = min(0.92, max(0.45, top_score / (total_positive + 0.5)))

        all_predictions = [
            {
                "disease": condition,
                "confidence": round(
                    (score / (total_positive + 0.5)) if total_positive > 0 else 0.0,
                    4,
                ),
            }
            for condition, score in scored[:5]
        ]

        specialist = self.specialist_map.get(top_condition, self.specialist_map["General Condition"])

        return {
            "modality": "text",
            "disease": top_condition,
            "confidence": round(confidence, 4),
            "all_predictions": all_predictions,
            "meets_threshold": confidence >= 0.6,
            "doctor": {
                "specialty": specialist["specialty"],
                "urgency": specialist["urgency"],
                "consultation_type": "in-person or teleconsultation",
                "description": "Specialist suggested from symptom-based keyword model.",
            },
            "model_backend": self.model_kind,
        }


_symptom_service_instance: SymptomDiagnosisService | None = None


def get_symptom_diagnosis_service() -> SymptomDiagnosisService:
    global _symptom_service_instance
    if _symptom_service_instance is None:
        _symptom_service_instance = SymptomDiagnosisService()
    return _symptom_service_instance

