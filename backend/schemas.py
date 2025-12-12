from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import JobStatus

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    id: str

class UserResponse(UserBase):
    id: str
    credits: int
    created_at: datetime

    class Config:
        from_attributes = True

class JobCreate(BaseModel):
    quality: str = "lama"
    duration: float = 0.0
    width: int = 0
    height: int = 0

class JobResponse(BaseModel):
    id: str
    status: JobStatus
    input_url: Optional[str] = None
    output_url: Optional[str] = None
    quality: str
    cost: int
    progress: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
