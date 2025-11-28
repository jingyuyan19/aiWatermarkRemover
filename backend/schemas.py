from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models import JobStatus

class JobCreate(BaseModel):
    quality: str = "lama"

class JobResponse(BaseModel):
    id: str
    status: JobStatus
    input_url: Optional[str] = None
    output_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
