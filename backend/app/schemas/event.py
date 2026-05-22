from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class EventBase(BaseModel):
    name: str
    category: str
    event_date: date
    event_time: str
    venue: str
    city: str
    price: float
    emoji: Optional[str] = None
    is_active: bool = True
    total_capacity: Optional[int] = None
    remaining_capacity: Optional[int] = None
    ticket_categories: Optional[list] = None
    place_id: Optional[str] = None
    description: Optional[str] = None
    featured_names: Optional[str] = None
    image_url: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    warranty_status: Optional[str] = None
    distributor_info: Optional[str] = None
    discount_rate: Optional[int] = 0

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    
    class Config:
        from_attributes = True
