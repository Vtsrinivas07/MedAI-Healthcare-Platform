from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from bson import ObjectId

class OrderItem(BaseModel):
    product_id: Optional[str] = "item-id"
    product_name: Optional[str] = "Medicine Item"
    quantity: Optional[int] = 1
    price: Optional[float] = 0.0

    class Config:
        extra = "allow"

class Order(BaseModel):
    id: Optional[str] = Field(default=None, alias='_id')
    user_id: Optional[str] = None
    order_number: Optional[str] = None
    items: Optional[List[Any]] = Field(default_factory=list)
    total_amount: Optional[float] = 0.0
    status: Optional[str] = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    payment_status: Optional[str] = "pending"  # pending, paid, failed, refunded
    payment_method: Optional[str] = "cod"
    shipping_address: Optional[Any] = Field(default_factory=dict)
    prescription_url: Optional[str] = None
    requires_prescription: Optional[bool] = False
    notes: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        extra = "allow"
        json_encoders = {ObjectId: str}
