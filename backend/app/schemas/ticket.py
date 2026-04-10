from pydantic import BaseModel
from typing import Optional

class TicketResponse(BaseModel):
    id: str
    token: str
    event_id: int
    order_id: int
    is_used: bool

class TicketVerifyResponse(BaseModel):
    valid: bool
    is_used: bool
    used_at: Optional[str] = None
    event: Optional[str] = None
