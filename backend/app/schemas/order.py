from pydantic import BaseModel
from typing import Optional, List

class OrderItemBase(BaseModel):
    event_id: int
    event_name: str
    event_date: str
    venue: str
    quantity: int
    price: float
    category: Optional[str] = None

class CreateOrder(BaseModel):
    items: List[OrderItemBase]
    total: float

class OrderResponseItem(OrderItemBase):
    id: int
    order_id: int
    
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: str  # e.g., "TH-1712100000"
    status: str
    total: float
    date: str
    items: List[dict] # or OrderResponseItem, but dict works for the required response

    class Config:
        from_attributes = True
