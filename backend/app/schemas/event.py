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

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    
    class Config:
        from_attributes = True
