"""
Seed demo doctors into MongoDB.
Run from the backend/ directory:
    python scripts/seed_demo_doctors.py

These doctors will appear in the Find Doctors page for every user.
Each doctor can log in with the credentials listed below.
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Always seed into the same DB the server uses
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

import bcrypt
from datetime import datetime
from config.database import connect_db, get_database

DEMO_DOCTORS = [
    {
        "name": "Dr. Aisha Patel",
        "email": "dr.aisha.patel@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "General Physician",
        "qualification": "MBBS, MD (Internal Medicine)",
        "experience_years": 10,
        "consultation_fee": 500,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543210",
        "bio": "Experienced general physician specializing in preventive care, chronic disease management, and primary healthcare. Available for in-person and telemedicine consultations.",
        "languages": ["English", "Telugu", "Hindi"],
        "rating": 4.8,
        "reviews": 312,
        "available_for_message": True,
        "available_for_voice": True,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Today, 4:00 PM",
        "distance": "1.5 km",
        "is_demo": True,
    },
    {
        "name": "Dr. Michael Chen",
        "email": "dr.michael.chen@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "Cardiologist",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience_years": 15,
        "consultation_fee": 1200,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543211",
        "bio": "Senior cardiologist with expertise in interventional cardiology, heart failure management, and preventive cardiology. Trained at AIIMS Delhi.",
        "languages": ["English", "Hindi"],
        "rating": 4.9,
        "reviews": 487,
        "available_for_message": True,
        "available_for_voice": False,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Tomorrow, 10:00 AM",
        "distance": "2.1 km",
        "is_demo": True,
    },
    {
        "name": "Dr. Sofia Martinez",
        "email": "dr.sofia.martinez@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "Pulmonologist",
        "qualification": "MBBS, MD (Pulmonology), FCCP",
        "experience_years": 12,
        "consultation_fee": 900,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543212",
        "bio": "Pulmonologist specializing in chest findings, respiratory conditions, asthma, COPD, and lung disease management. Expert in CT chest interpretation.",
        "languages": ["English", "Telugu"],
        "rating": 4.7,
        "reviews": 256,
        "available_for_message": True,
        "available_for_voice": True,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Today, 3:00 PM",
        "distance": "1.8 km",
        "is_demo": True,
    },
    {
        "name": "Dr. Rahul Iyer",
        "email": "dr.rahul.iyer@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "Ophthalmologist",
        "qualification": "MBBS, MS (Ophthalmology), FRCS",
        "experience_years": 14,
        "consultation_fee": 800,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543213",
        "bio": "Ophthalmologist specializing in retina, vision disorders, and OCT-based review. Expert in diabetic retinopathy, glaucoma, and cataract surgery.",
        "languages": ["English", "Telugu", "Tamil"],
        "rating": 4.8,
        "reviews": 198,
        "available_for_message": True,
        "available_for_voice": True,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Today, 5:30 PM",
        "distance": "2.4 km",
        "is_demo": True,
    },
    {
        "name": "Dr. Priya Sharma",
        "email": "dr.priya.sharma@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "Dermatologist",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 9,
        "consultation_fee": 700,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543214",
        "bio": "Dermatologist specializing in skin disease diagnosis, cosmetic dermatology, and AI-assisted skin lesion analysis. Expert in melanoma screening.",
        "languages": ["English", "Telugu", "Hindi"],
        "rating": 4.9,
        "reviews": 341,
        "available_for_message": True,
        "available_for_voice": True,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Today, 6:00 PM",
        "distance": "1.2 km",
        "is_demo": True,
    },
    {
        "name": "Dr. Arjun Nair",
        "email": "dr.arjun.nair@medai.demo",
        "password": "Doctor@123",
        "role": "doctor",
        "specialty": "Neurologist",
        "qualification": "MBBS, MD, DM (Neurology)",
        "experience_years": 18,
        "consultation_fee": 1500,
        "location": "Amaravati, Andhra Pradesh",
        "mobile": "+91-9876543215",
        "bio": "Neurologist specializing in brain disorders, epilepsy, stroke management, and neuroimaging interpretation. Expert in MRI brain analysis.",
        "languages": ["English", "Malayalam", "Hindi"],
        "rating": 5.0,
        "reviews": 523,
        "available_for_message": True,
        "available_for_voice": False,
        "available_for_video": True,
        "available_for_appointment": True,
        "next_available": "Tomorrow, 9:00 AM",
        "distance": "3.0 km",
        "is_demo": True,
    },
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed():
    await connect_db()
    db = get_database()

    inserted = 0
    updated = 0

    for doc_data in DEMO_DOCTORS:
        password = doc_data.pop("password")
        email = doc_data["email"]

        existing = await db.users.find_one({"email": email})
        if existing:
            # Update profile fields and always (re)set the password hash
            await db.users.update_one(
                {"email": email},
                {"$set": {**doc_data, "password_hash": hash_password(password), "updated_at": datetime.utcnow()}},
            )
            updated += 1
            print(f"  ↻ Updated: {doc_data['name']} ({email})")
        else:
            user_doc = {
                **doc_data,
                "password_hash": hash_password(password),
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            result = await db.users.insert_one(user_doc)
            inserted += 1
            print(f"  ✓ Created: {doc_data['name']} ({email})  id={result.inserted_id}")

    print(f"\nDone. {inserted} inserted, {updated} updated.")
    print("\nDemo doctor login credentials:")
    for d in DEMO_DOCTORS:
        print(f"  {d['name']:30s}  email: {d['email']}  password: Doctor@123")


if __name__ == "__main__":
    asyncio.run(seed())
