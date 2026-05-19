from datetime import datetime
from typing import Optional
import logging

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

logger = logging.getLogger(__name__)

from config.database import get_database
from middleware.auth import get_current_user
from services.diagnosis_orchestrator import get_diagnosis_orchestrator
from services.multimodal_diagnosis_service import MultimodalDiagnosisService
from services.modality_detector import get_modality_detector

router = APIRouter()
modality_detector = get_modality_detector()
_diagnosis_orchestrator_instance = None


def get_orchestrator():
    global _diagnosis_orchestrator_instance
    if _diagnosis_orchestrator_instance is None:
        _diagnosis_orchestrator_instance = get_diagnosis_orchestrator()
    return _diagnosis_orchestrator_instance

_multimodal_service_instance: MultimodalDiagnosisService | None = None


def get_multimodal_service() -> MultimodalDiagnosisService:
    global _multimodal_service_instance
    if _multimodal_service_instance is None:
        _multimodal_service_instance = MultimodalDiagnosisService()
    return _multimodal_service_instance


MEDAI_DOCTOR_ROLES = [
    {
        "name": "Dr. Aisha Patel",
        "specialty": "General Physician",
        "role": "Primary triage and first consultation",
        "experience_years": 10,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 500,
        "is_demo": True,
    },
    {
        "name": "Dr. Michael Chen",
        "specialty": "Cardiologist",
        "role": "Heart disease, cardiac interventions, preventive cardiology",
        "experience_years": 15,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 1200,
        "is_demo": True,
    },
    {
        "name": "Dr. Sofia Martinez",
        "specialty": "Pulmonologist",
        "role": "Chest findings and respiratory conditions",
        "experience_years": 12,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 900,
        "is_demo": True,
    },
    {
        "name": "Dr. Rahul Iyer",
        "specialty": "Ophthalmologist",
        "role": "Retina, vision, and OCT-based review",
        "experience_years": 14,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 800,
        "is_demo": True,
    },
    {
        "name": "Dr. Priya Sharma",
        "specialty": "Dermatologist",
        "role": "Skin disease diagnosis and cosmetic dermatology",
        "experience_years": 9,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 700,
        "is_demo": True,
    },
    {
        "name": "Dr. Arjun Nair",
        "specialty": "Neurologist",
        "role": "Brain disorders, epilepsy, stroke management",
        "experience_years": 18,
        "location": "Amaravati, Andhra Pradesh",
        "consultation_fee": 1500,
        "is_demo": True,
    },
]


async def _get_doctor_suggestions(db, specialty_text: str) -> list[dict]:
    specialty_hint = (specialty_text or "").split("(")[0].strip()
    specialty_key = specialty_hint.lower()

    def _matches(doctor: dict) -> bool:
        if not specialty_key:
            return doctor.get("specialty", "").lower() == "general physician"
        fields = " ".join(
            str(doctor.get(field, "")).lower() for field in ("specialty", "role", "bio")
        )
        return specialty_key in fields

    suggestions = []

    if specialty_hint:
        specialty_doctors = await db.users.find(
            {
                "role": "doctor",
                "$or": [
                    {"specialty": {"$regex": specialty_hint, "$options": "i"}},
                    {"bio": {"$regex": specialty_hint, "$options": "i"}},
                ],
            },
            {"password": 0, "password_hash": 0},
        ).limit(1).to_list(1)

        for doctor in specialty_doctors:
            suggestions.append(
                {
                    "id": str(doctor["_id"]),
                    "name": doctor.get("name", "Doctor"),
                    "specialty": doctor.get("specialty") or specialty_hint,
                    "role": doctor.get("bio") or "Clinical consultation",
                    "location": doctor.get("location") or "Not specified",
                    "experience_years": doctor.get("experience_years"),
                    "consultation_fee": doctor.get("consultation_fee"),
                    "is_demo": doctor.get("is_demo", False),
                }
            )

    if not suggestions:
        fallback_doctors = [doctor for doctor in MEDAI_DOCTOR_ROLES if _matches(doctor)]
        if not fallback_doctors:
            fallback_doctors = [doctor for doctor in MEDAI_DOCTOR_ROLES if doctor.get("specialty") == "General Physician"]
        fallback_doctors = fallback_doctors[:1]

        suggestions = [
            {
                "id": f"demo-{index}",
                "name": doctor.get("name", "Doctor"),
                "specialty": doctor.get("specialty") or specialty_hint or "General Physician",
                "role": doctor.get("role") or "Clinical consultation",
                "location": doctor.get("location") or "Amaravati, Andhra Pradesh",
                "experience_years": doctor.get("experience_years"),
                "consultation_fee": doctor.get("consultation_fee"),
                "is_demo": True,
            }
            for index, doctor in enumerate(fallback_doctors, start=1)
        ]

    return suggestions


@router.post("/multimodal")
async def multimodal_diagnosis(
    symptoms: Optional[str] = Form(None),
    modality: str = Form("skin"),
    patient_age: Optional[int] = Form(None),
    patient_gender: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Multimodal diagnosis endpoint combining image and symptom analysis
    
    Features:
    - Image pathway: EfficientNet model
    - Text pathway: Symptom classifier
    - Fusion: Weighted average of predictions
    - Confidence-based decision system
    - Structured medical recommendations
    
    Args:
        symptoms: Comma-separated symptom text (optional)
        modality: Image modality (skin, chest, eye, brain)
        patient_age: Patient age for context (optional)
        patient_gender: Patient gender for context (optional)
        image: Medical image file (optional)
        
    Returns:
        Comprehensive diagnosis result with recommendations
    """
    try:
        # Validate input
        if not symptoms and not image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide either symptoms, medical image, or both for multimodal diagnosis"
            )
        
        # Process image if provided
        image_bytes = None
        detected_modality = modality  # Default to provided modality
        
        if image:
            if not image.content_type or not image.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only image files are supported"
                )
            image_bytes = await image.read()
            if not image_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded image is empty"
                )
            
            # Automatically detect modality from image
            detection_result = modality_detector.detect_modality(image_bytes, image.filename)
            detected_modality = detection_result['modality']
            
            logger.info(
                f"🔍 Modality detection: {detected_modality} "
                f"(confidence: {detection_result['confidence']:.2%}, "
                f"original: {modality})"
            )
        
        # Run multimodal diagnosis
        result = get_multimodal_service().diagnose_multimodal(
            image_bytes=image_bytes,
            symptoms=symptoms,
            modality=detected_modality,  # Use detected modality
            patient_age=patient_age,
            patient_gender=patient_gender
        )
        
        # Check for errors
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("message", "Diagnosis failed")
            )
        
        # Get doctor suggestions based on specialty
        doctor_specialty = result.get("doctor_specialty", "General Physician")
        doctor_suggestions = await _get_doctor_suggestions(db, doctor_specialty)
        result["doctor_suggestions"] = doctor_suggestions
        
        # Save to database
        diagnosis_record = {
            "user_id": str(current_user["_id"]),
            "symptoms": symptoms,
            "modality": detected_modality,  # Save detected modality
            "original_modality": modality,  # Save original for reference
            "has_image": bool(image_bytes),
            "patient_age": patient_age,
            "patient_gender": patient_gender,
            "diagnosis_mode": result.get("mode"),
            "predicted_disease": result.get("predicted_disease"),
            "confidence": result.get("confidence"),
            "confidence_level": result.get("confidence_level"),
            "agreement": result.get("agreement"),
            "requires_doctor": result.get("requires_doctor"),
            "urgency": result.get("urgency"),
            "doctor_specialty": doctor_specialty,
            "recommendations": result.get("recommendations", []),
            "fusion_method": result.get("fusion_method"),
            "created_at": datetime.utcnow(),
            "source": "multimodal-diagnosis-api"
        }
        await db.multimodal_diagnosis_history.insert_one(diagnosis_record)
        
        # Also log to health tracking
        if symptoms:
            health_log = {
                "user_id": str(current_user["_id"]),
                "date": datetime.utcnow(),
                "symptoms": [s.strip() for s in symptoms.split(",") if s.strip()],
                "notes": (
                    f"Multimodal AI diagnosis: {result.get('predicted_disease')} "
                    f"(confidence: {result.get('confidence_level')}, "
                    f"mode: {result.get('mode')})"
                ),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "from_multimodal_ai": True
            }
            await db.health_logs.insert_one(health_log)
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multimodal diagnosis failed: {str(exc)}"
        )


@router.post("/complete")
async def complete_diagnosis(
    symptoms: Optional[str] = Form(None),
    modality: str = Form("basic"),
    image: Optional[UploadFile] = File(None),
    session_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Unified diagnosis pipeline endpoint:
    - Decision layer: image -> EfficientNet, text -> Symptom model
    - RAG retrieval + LLM explanation
    - Specialist mapping + downstream module routing
    """
    try:
        image_data = None
        detected_modality = modality

        if image:
            if not image.content_type or not image.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only image files are supported for image diagnosis.",
                )
            image_data = await image.read()
            if not image_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded image is empty.",
                )
            detection_result = modality_detector.detect_modality(image_data, image.filename)
            detected_modality = detection_result['modality']
            logger.info(
                f"🔍 Modality detection: {detected_modality} "
                f"(confidence: {detection_result['confidence']:.2%}, original: {modality})"
            )

        result = await get_orchestrator().run(
            symptoms=symptoms,
            image_data=image_data,
            modality=detected_modality,
        )

        doctor_mapping = result.get("doctor_mapping", {})
        treatment = result.get("treatment", {})
        tests = result.get("tests", [])
        doctor_suggestions = await _get_doctor_suggestions(db, doctor_mapping.get("specialty", ""))

        reminder_suggestions = []
        for med in (treatment.get("medications") or [])[:4]:
            reminder_suggestions.append({"medicine_name": med, "frequency": "twice_daily", "times": ["08:00", "20:00"]})

        care_plan = {
            "doctor_suggestions": doctor_suggestions,
            "appointment": {
                "recommended_within": "24 hours" if doctor_mapping.get("urgency") in ("urgent", "soon") else "3-7 days",
                "consultation_type": doctor_mapping.get("consultation_type", "telemedicine or in-person"),
                "specialty": doctor_mapping.get("specialty", "General Physician"),
            },
            "lab_tests": tests[:5],
            "pharmacy_medicines": (treatment.get("medications") or [])[:6],
            "medicine_reminders": reminder_suggestions,
            "health_tracking": {
                "status": "logged",
                "module": "/health-tracking",
                "note": "This assessment is added to your health tracking history.",
            },
        }
        result["chatbot_care_plan"] = care_plan

        # ── Save to chat_sessions so it appears in Chat History ──────────────
        user_id = str(current_user["_id"])
        disease_name = result.get("prediction", {}).get("disease", "Diagnosis")
        confidence_pct = round(float(result.get("prediction", {}).get("confidence", 0.0)) * 100)
        user_msg_content = symptoms or (f"[Medical image — {detected_modality}]" if image_data else "Diagnosis request")
        assistant_msg_content = (
            f"**{disease_name}** detected ({confidence_pct}% confidence).\n\n"
            + (result.get("rag_llm_output") or "")
        )

        now = datetime.utcnow()
        user_chat_msg = {"role": "user", "content": user_msg_content, "timestamp": now}
        assistant_chat_msg = {"role": "assistant", "content": assistant_msg_content, "timestamp": now}

        chat_session = None
        if session_id and session_id != "null":
            try:
                chat_session = await db.chat_sessions.find_one({
                    "_id": ObjectId(session_id), "user_id": user_id
                })
            except Exception:
                chat_session = None

        if chat_session:
            await db.chat_sessions.update_one(
                {"_id": chat_session["_id"]},
                {"$push": {"messages": {"$each": [user_chat_msg, assistant_chat_msg]}},
                 "$set": {"updated_at": now}}
            )
            resolved_session_id = str(chat_session["_id"])
        else:
            new_session = {
                "user_id": user_id,
                "title": (symptoms or disease_name)[:50],
                "messages": [user_chat_msg, assistant_chat_msg],
                "created_at": now,
                "updated_at": now,
            }
            insert_result = await db.chat_sessions.insert_one(new_session)
            resolved_session_id = str(insert_result.inserted_id)

        result["session_id"] = resolved_session_id
        # ─────────────────────────────────────────────────────────────────────

        # Health log
        health_log = {
            "user_id": user_id,
            "date": now,
            "symptoms": [symptoms] if symptoms else [],
            "notes": f"AI triage result: {disease_name} ({confidence_pct}%).",
            "created_at": now,
            "updated_at": now,
            "from_ai_chatbot": True,
        }
        await db.health_logs.insert_one(health_log)

        diagnosis_record = {
            "user_id": user_id,
            "symptoms": symptoms,
            "modality": detected_modality if image_data else "text",
            "original_modality": modality,
            "has_image": bool(image_data),
            "prediction": result.get("prediction", {}),
            "doctor_mapping": result.get("doctor_mapping", {}),
            "module_routes": result.get("module_routes", {}),
            "rag_llm_output": result.get("rag_llm_output", ""),
            "chatbot_care_plan": result.get("chatbot_care_plan", {}),
            "chat_session_id": resolved_session_id,
            "created_at": now,
            "source": "chatbot-ui-unified-diagnosis",
        }
        await db.ai_diagnosis_history.insert_one(diagnosis_record)

        return {"success": True, "data": result}
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run diagnosis pipeline: {str(exc)}",
        )
