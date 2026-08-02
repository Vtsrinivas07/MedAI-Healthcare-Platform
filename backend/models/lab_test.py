from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from bson import ObjectId

class LabTest(BaseModel):
    id: Optional[str] = Field(default=None, alias='_id')
    name: str
    category: str  # blood, urine, imaging, etc.
    price: float
    description: Optional[str] = None
    preparation_required: bool = False
    preparation_instructions: Optional[str] = None
    sample_type: Optional[str] = None  # blood, urine, saliva, etc.
    turnaround_time: Optional[str] = None  # "24 hours", "2-3 days", etc.
    fasting_required: bool = False
    home_collection_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class LabTestBooking(BaseModel):
    id: Optional[str] = Field(default=None, alias='_id')
    user_id: Optional[str] = None
    test_ids: List[str] = Field(default_factory=list)
    test_names: List[str] = Field(default_factory=list)
    total_price: float = 0.0
    booking_date: Optional[Any] = Field(default_factory=datetime.utcnow)
    scheduled_date: Optional[Any] = None
    scheduled_time: Optional[str] = "09:00"
    collection_type: Optional[str] = "home"
    address: Optional[str] = "To be confirmed"
    contact_number: Optional[str] = "Not provided"
    payment_method: Optional[str] = "cod"
    status: Optional[str] = "pending"
    payment_status: Optional[str] = "pending"
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
