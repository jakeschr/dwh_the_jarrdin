from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    timestamp: int  # kamu pakai BIGINT di DB, kita sesuaikan

class UserOut(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    is_active: bool
    timestamp: int

    class Config:
        orm_mode = True  # agar bisa dibaca dari SQLAlchemy model
