from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timedelta
from config.database import get_database
from middleware.auth import get_current_user, require_role
from bson import ObjectId
import math

router = APIRouter()

@router.get("/dashboard")
async def get_doctor_dashboard(
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Get doctor dashboard statistics"""
    import asyncio
    try:
        doctor_id = str(current_user["_id"])
        doctor_name = current_user.get("name", "")

        or_conditions = [{"doctor_id": doctor_id}]
        if doctor_name:
            or_conditions.append({"doctor_name": doctor_name})
        consultation_query = {"$or": or_conditions}

        week_ago = datetime.utcnow() - timedelta(days=7)

        # Run all counts in parallel instead of sequentially
        (
            total_patients,
            total_prescriptions,
            prescriptions_this_week,
            total_consultations,
            pending_consultations,
        ) = await asyncio.gather(
            db.prescriptions.distinct("patient_id", {"doctor_id": doctor_id}),
            db.prescriptions.count_documents({"doctor_id": doctor_id}),
            db.prescriptions.count_documents({"doctor_id": doctor_id, "date": {"$gte": week_ago}}),
            db.consultations.count_documents(consultation_query),
            db.consultations.count_documents({"$and": [consultation_query, {"status": {"$in": ["scheduled", "pending"]}}]}),
        )

        return {
            "success": True,
            "data": {
                "total_patients": len(total_patients),
                "total_prescriptions": total_prescriptions,
                "prescriptions_this_week": prescriptions_this_week,
                "total_consultations": total_consultations,
                "pending_consultations": pending_consultations,
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard: {str(e)}"
        )

@router.get("/patients")
async def get_doctor_patients(
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Get all patients for a doctor"""
    try:
        doctor_id = str(current_user["_id"])
        
        # Get unique patient IDs from prescriptions
        patient_ids = await db.prescriptions.distinct("patient_id", {"doctor_id": doctor_id})
        
        # Get patient details
        patients = []
        for patient_id in patient_ids:
            patient = await db.users.find_one({"_id": ObjectId(patient_id)}, {"password": 0})
            if patient:
                patient["_id"] = str(patient["_id"])
                
                # Get prescription count for this patient
                prescription_count = await db.prescriptions.count_documents({
                    "doctor_id": doctor_id,
                    "patient_id": patient_id
                })
                patient["prescription_count"] = prescription_count
                
                # Get last prescription date
                last_prescription = await db.prescriptions.find_one(
                    {"doctor_id": doctor_id, "patient_id": patient_id},
                    sort=[("date", -1)]
                )
                patient["last_visit"] = last_prescription["date"] if last_prescription else None
                
                patients.append(patient)
        
        return {
            "success": True,
            "data": patients
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching patients: {str(e)}"
        )

@router.get("/patients/{patient_id}")
async def get_patient_details(
    patient_id: str,
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Get detailed information about a specific patient"""
    try:
        # Get patient info
        patient = await db.users.find_one({"_id": ObjectId(patient_id)}, {"password": 0})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        patient["_id"] = str(patient["_id"])
        
        # Get prescriptions
        cursor = db.prescriptions.find({
            "patient_id": patient_id,
            "doctor_id": str(current_user["_id"])
        }).sort("date", -1)
        prescriptions = await cursor.to_list(length=50)
        
        for prescription in prescriptions:
            prescription["_id"] = str(prescription["_id"])
        
        # Get health logs
        cursor = db.health_logs.find({"user_id": patient_id}).sort("date", -1).limit(10)
        health_logs = await cursor.to_list(length=10)
        
        for log in health_logs:
            log["_id"] = str(log["_id"])
        
        return {
            "success": True,
            "data": {
                "patient": patient,
                "prescriptions": prescriptions,
                "health_logs": health_logs
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching patient details: {str(e)}"
        )

@router.get("/search")
async def search_doctors(
    specialty: str = None,
    search: str = None,
    city: str = None,
    is_demo: str = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """Search for doctors by specialty, name, and/or city"""
    try:
        query = {"role": "doctor"}

        # Filter by demo flag
        if is_demo == "true":
            query["is_demo"] = True
        elif is_demo == "false":
            query["is_demo"] = {"$ne": True}

        if specialty:
            query["specialty"] = {"$regex": specialty, "$options": "i"}

        if city:
            query["location"] = {"$regex": city, "$options": "i"}

        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"specialty": {"$regex": search, "$options": "i"}},
                {"location": {"$regex": search, "$options": "i"}},
            ]

        cursor = db.users.find(query, {"password": 0, "password_hash": 0}).limit(50)
        doctors = await cursor.to_list(length=50)

        for doctor in doctors:
            doctor["_id"] = str(doctor["_id"])

        return {
            "success": True,
            "data": doctors
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching doctors: {str(e)}"
        )

@router.get("/consultations")
async def get_doctor_consultations(
    status_filter: str = None,
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Get all consultations assigned to this doctor"""
    try:
        doctor_id = str(current_user["_id"])
        doctor_name = current_user.get("name", "")

        # Use exact match on doctor_id OR doctor_name (avoid slow regex on Atlas)
        or_conditions = [{"doctor_id": doctor_id}]
        if doctor_name:
            or_conditions.append({"doctor_name": doctor_name})

        base_query = {"$or": or_conditions}

        if status_filter:
            query = {"$and": [base_query, {"status": status_filter}]}
        else:
            query = base_query

        # Project only the fields the UI needs — avoids fetching large note blobs
        projection = {
            "_id": 1, "doctor_id": 1, "doctor_name": 1, "patient_id": 1,
            "patient_name": 1, "status": 1, "consultation_type": 1,
            "chief_complaint": 1, "specialization": 1, "date": 1, "time": 1,
            "fee": 1, "notes": 1, "created_at": 1, "updated_at": 1,
        }

        consultations = await db.consultations.find(query, projection).sort("created_at", -1).to_list(50)
        for c in consultations:
            c["_id"] = str(c["_id"])
            for field in ["created_at", "updated_at"]:
                if field in c and hasattr(c[field], "isoformat"):
                    c[field] = c[field].isoformat()

        return {"success": True, "consultations": consultations, "total": len(consultations)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching consultations: {str(e)}"
        )


@router.put("/consultations/{consultation_id}")
async def update_doctor_consultation(
    consultation_id: str,
    update_data: dict,
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Doctor updates a consultation (status, notes, prescription_given, meeting_link)"""
    try:
        allowed_fields = ["status", "notes", "duration", "prescription_given", "meeting_link"]
        update = {k: update_data[k] for k in allowed_fields if k in update_data}
        update["updated_at"] = datetime.utcnow()

        result = await db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {"$set": update}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Consultation not found")

        return {"success": True, "message": "Consultation updated"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating consultation: {str(e)}"
        )


@router.put("/profile")
async def update_doctor_profile(
    profile_data: dict,
    current_user: dict = Depends(require_role(["doctor"])),
    db = Depends(get_database)
):
    """Update doctor's own profile (specialty, location, availability, etc.)"""
    try:
        allowed_fields = ["specialty", "location", "bio", "experience_years",
                          "consultation_fee", "available_for_message",
                          "available_for_voice", "available_for_video",
                          "available_for_appointment", "languages", "qualification"]
        update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.utcnow()

        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )
        return {"success": True, "message": "Profile updated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )
