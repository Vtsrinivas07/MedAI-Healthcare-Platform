"""
Seed script: populates the `lab_tests` collection in MongoDB with sample lab tests.
Run from the backend directory:
    python scripts/seed_lab_tests.py
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Allow imports from the backend root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi

LAB_TESTS = [
    # ── Full Body Packages ──────────────────────────────────────────────────
    {
        "name": "Complete Health Gold Package",
        "category": "packages",
        "health_concern": "general",
        "organ": "general",
        "price": 1499.0,
        "original_price": 2999.0,
        "description": "Comprehensive full body checkup covering 80+ essential parameters including Blood, Liver, Kidney, Lipid profile, and Thyroid.",
        "preparation_required": True,
        "preparation_instructions": "Fasting of 10-12 hours is mandatory. Water is allowed.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 82
    },
    {
        "name": "Active Fit Health Screen",
        "category": "packages",
        "health_concern": "lifestyle",
        "organ": "general",
        "price": 999.0,
        "original_price": 1999.0,
        "description": "A baseline screening of vital organs and metabolic functions for active individuals.",
        "preparation_required": True,
        "preparation_instructions": "10-12 hours fasting required.",
        "sample_type": "blood & urine",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 55
    },

    # ── For Women ──────────────────────────────────────────────────────────
    {
        "name": "Well Woman Advanced Health Package",
        "category": "women",
        "health_concern": "hormone",
        "organ": "general",
        "price": 1999.0,
        "original_price": 3999.0,
        "description": "Specialized health package for women covering hormones (FSH, LH, Prolactin, Thyroid), Vitamin D, Vitamin B12, and blood tests.",
        "preparation_required": True,
        "preparation_instructions": "10-12 hours fasting required. Morning sample preferred.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 68
    },
    {
        "name": "PCOS Screening Profile",
        "category": "women",
        "health_concern": "hormone",
        "organ": "ovary",
        "price": 1299.0,
        "original_price": 2499.0,
        "description": "Recommended for women experiencing irregular periods, acne, or weight changes to screen for PCOS.",
        "preparation_required": False,
        "preparation_instructions": "No specific preparation required.",
        "sample_type": "blood",
        "turnaround_time": "36 hours",
        "fasting_required": False,
        "home_collection_available": True,
        "test_count": 8
    },

    # ── For Men ────────────────────────────────────────────────────────────
    {
        "name": "Well Man Comprehensive Package",
        "category": "men",
        "health_concern": "general",
        "organ": "general",
        "price": 1899.0,
        "original_price": 3799.0,
        "description": "Comprehensive screening for men including PSA (Prostate Specific Antigen), Testosterone, Cardiac Risk Markers, Liver, and Kidney.",
        "preparation_required": True,
        "preparation_instructions": "12 hours fasting required. Avoid heavy exercise 24 hours prior.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 72
    },
    {
        "name": "Male Hormone & Vitality Panel",
        "category": "men",
        "health_concern": "hormone",
        "organ": "general",
        "price": 1199.0,
        "original_price": 1999.0,
        "description": "Assesses key male hormones including Testosterone, Free Testosterone, and DHEA for vitality and fitness.",
        "preparation_required": False,
        "preparation_instructions": "Morning blood sample is recommended.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": False,
        "home_collection_available": True,
        "test_count": 5
    },

    # ── X-Rays & Scans ──────────────────────────────────────────────────────
    {
        "name": "X-Ray Chest PA View",
        "category": "xray_scans",
        "health_concern": "lungs",
        "organ": "lungs",
        "price": 399.0,
        "original_price": 599.0,
        "description": "Chest X-ray to evaluate lungs, heart, and chest wall. Used for persistent cough, breathing difficulty, or chest pain.",
        "preparation_required": False,
        "preparation_instructions": "Remove metal objects and jewelry before the procedure.",
        "sample_type": "imaging",
        "turnaround_time": "4 hours",
        "fasting_required": False,
        "home_collection_available": False,
        "test_count": 1
    },
    {
        "name": "Ultrasound Whole Abdomen (USG)",
        "category": "xray_scans",
        "health_concern": "liver",
        "organ": "liver",
        "price": 1199.0,
        "original_price": 1799.0,
        "description": "Ultrasound scan to examine abdominal organs including Liver, Gallbladder, Spleen, Pancreas, and Kidneys.",
        "preparation_required": True,
        "preparation_instructions": "6 hours fasting required before scan. Drink plenty of water to keep bladder full.",
        "sample_type": "imaging",
        "turnaround_time": "4 hours",
        "fasting_required": True,
        "home_collection_available": False,
        "test_count": 1
    },
    {
        "name": "CT Brain / Head Scan",
        "category": "xray_scans",
        "health_concern": "brain",
        "organ": "brain",
        "price": 2499.0,
        "original_price": 3999.0,
        "description": "Computed Tomography (CT) scan of the brain to diagnose headaches, trauma, tumors, or stroke symptoms.",
        "preparation_required": False,
        "preparation_instructions": "No metal accessories. Wear comfortable clothing.",
        "sample_type": "imaging",
        "turnaround_time": "8 hours",
        "fasting_required": False,
        "home_collection_available": False,
        "test_count": 1
    },

    # ── Lifestyle Checkups ──────────────────────────────────────────────────
    {
        "name": "Executive Stress & Fatigue Profile",
        "category": "lifestyle",
        "health_concern": "mental",
        "organ": "brain",
        "price": 1499.0,
        "original_price": 2799.0,
        "description": "Designed for individuals experiencing high stress, chronic fatigue, sleep issues, or anxiety.",
        "preparation_required": True,
        "preparation_instructions": "Fasting of 10-12 hours required.",
        "sample_type": "blood & urine",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 42
    },
    {
        "name": "Weight Management Fit Profile",
        "category": "lifestyle",
        "health_concern": "diabetes",
        "organ": "thyroid",
        "price": 1199.0,
        "original_price": 2199.0,
        "description": "Evaluates thyroid hormones, blood sugar, and metabolic indicators that affect weight loss/gain.",
        "preparation_required": True,
        "preparation_instructions": "Fasting of 10-12 hours required.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 15
    },

    # ── Special Tests & Body Systems ────────────────────────────────────────
    # Diabetes
    {
        "name": "HbA1c & Fasting Blood Sugar Duo",
        "category": "special",
        "health_concern": "diabetes",
        "organ": "pancreas",
        "price": 399.0,
        "original_price": 699.0,
        "description": "Combines Fasting Blood Sugar and Glycated Hemoglobin (HbA1c) to check average blood glucose levels over 3 months.",
        "preparation_required": True,
        "preparation_instructions": "Overnight fasting of 8-10 hours is required.",
        "sample_type": "blood",
        "turnaround_time": "12 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 2
    },
    # Heart
    {
        "name": "Cardiogen Advanced Lipid Profile",
        "category": "special",
        "health_concern": "heart",
        "organ": "heart",
        "price": 499.0,
        "original_price": 999.0,
        "description": "Measures Cholesterol, HDL, LDL, VLDL, and Triglycerides to assess risk of cardiovascular disease.",
        "preparation_required": True,
        "preparation_instructions": "Fasting of 10-12 hours mandatory.",
        "sample_type": "blood",
        "turnaround_time": "12 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 6
    },
    # Liver
    {
        "name": "Liver Function Test (LFT) with Enzymes",
        "category": "special",
        "health_concern": "liver",
        "organ": "liver",
        "price": 449.0,
        "original_price": 899.0,
        "description": "Checks Bilirubin, SGOT, SGPT, Alkaline Phosphatase, and Total Protein to screen for liver infections or disease.",
        "preparation_required": True,
        "preparation_instructions": "Fasting of 10-12 hours required.",
        "sample_type": "blood",
        "turnaround_time": "12 hours",
        "fasting_required": True,
        "home_collection_available": True,
        "test_count": 11
    },
    # Kidney
    {
        "name": "Kidney Function Test (KFT) with Electrolytes",
        "category": "special",
        "health_concern": "kidney",
        "organ": "kidney",
        "price": 449.0,
        "original_price": 899.0,
        "description": "Measures Urea, Creatinine, Uric Acid, and Electrolytes (Sodium, Potassium, Chloride) to evaluate renal function.",
        "preparation_required": True,
        "preparation_instructions": "Fasting is not strictly mandatory but recommended.",
        "sample_type": "blood",
        "turnaround_time": "12 hours",
        "fasting_required": False,
        "home_collection_available": True,
        "test_count": 9
    },
    # Thyroid
    {
        "name": "Thyroid Profile (T3, T4, Ultra-TSH)",
        "category": "special",
        "health_concern": "thyroid",
        "organ": "thyroid",
        "price": 349.0,
        "original_price": 699.0,
        "description": "Assesses thyroid gland activity to diagnose hypo- or hyper-thyroidism.",
        "preparation_required": False,
        "preparation_instructions": "No fasting required. Morning sample preferred.",
        "sample_type": "blood",
        "turnaround_time": "12 hours",
        "fasting_required": False,
        "home_collection_available": True,
        "test_count": 3
    },
    # Bones
    {
        "name": "Vitamin D3 & Calcium Bone Health Combo",
        "category": "special",
        "health_concern": "bones",
        "organ": "bones",
        "price": 899.0,
        "original_price": 1799.0,
        "description": "Evaluates Vitamin D levels and Blood Calcium levels to screen for osteoporosis or bone weakness.",
        "preparation_required": False,
        "preparation_instructions": "No specific preparation required.",
        "sample_type": "blood",
        "turnaround_time": "24 hours",
        "fasting_required": False,
        "home_collection_available": True,
        "test_count": 2
    },
    # Eyes
    {
        "name": "Diabetic Eye Diagnostic Consultation Test",
        "category": "special",
        "health_concern": "eyes",
        "organ": "eyes",
        "price": 299.0,
        "original_price": 599.0,
        "description": "Comprehensive vision testing and fundus review recommended annually for diabetic patients.",
        "preparation_required": False,
        "preparation_instructions": "Bring any current spectacles.",
        "sample_type": "clinical",
        "turnaround_time": "2 hours",
        "fasting_required": False,
        "home_collection_available": False,
        "test_count": 1
    }
]

async def seed():
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("DB_NAME", "medai")

    if not uri:
        print("[ERROR] MONGODB_URI not set in environment. Check backend/.env")
        sys.exit(1)

    client = AsyncIOMotorClient(uri, server_api=ServerApi("1"))
    db = client[db_name]

    # Check existing count
    existing = await db.lab_tests.count_documents({})
    if existing > 0:
        print(f"[INFO] {existing} lab tests already exist. Dropping and re-seeding...")
        await db.lab_tests.drop()

    now = datetime.utcnow()
    docs = []
    for t in LAB_TESTS:
        doc = {**t, "created_at": now, "updated_at": now}
        docs.append(doc)

    result = await db.lab_tests.insert_many(docs)
    print(f"[OK] Inserted {len(result.inserted_ids)} lab tests into '{db_name}.lab_tests'")

    # Create indexes for fast queries
    await db.lab_tests.create_index("category")
    await db.lab_tests.create_index("health_concern")
    await db.lab_tests.create_index("organ")
    await db.lab_tests.create_index([("name", "text"), ("description", "text")])
    print("[OK] Indexes created on category, health_concern, organ, and text search")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
