from pydantic import BaseModel, EmailStr

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    tax_id: str
    home_address: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
