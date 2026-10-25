from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: Optional[str]
    full_name: str
    role: UserRole
    district: Optional[str]

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
