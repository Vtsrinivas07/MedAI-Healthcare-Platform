from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
import datetime as dt
from bson import ObjectId

class VitalSigns(BaseModel):
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    temperature: Optional[float] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    blood_sugar: Optional[float] = None
    oxygen_saturation: Optional[int] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    ethnicity: Optional[str] = None
    glucose_type: Optional[str] = None
    exercise_minutes: Optional[int] = None
    sleep_hours: Optional[float] = None
    water_intake_ml: Optional[int] = None
    pain_level: Optional[int] = None
    medication_schedule: Optional[str] = None
    chronic_conditions: Optional[str] = None
    allergies: Optional[str] = None

class HealthLog(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    user_id: str
    date: dt.date = Field(default_factory=dt.date.today)
    vital_signs: Optional[VitalSigns] = None
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = None
    mood: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class HealthLogCreate(BaseModel):
    date: Optional[dt.date] = None
    vital_signs: Optional[VitalSigns] = None
    symptoms: Optional[List[str]] = []
    notes: Optional[str] = None
    mood: Optional[str] = None

class HealthAnalysis(BaseModel):
    trends: dict
    alerts: List[str]
    recommendations: List[str]
    risk_score: Optional[float] = None
