from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
import uuid

class SourceBase(BaseModel):
    name: str
    url: str
    source_type: str = "WEB"
    frequency_minutes: int = 1440
    is_active: bool = True

class SourceCreate(SourceBase):
    pass

class SourceUpdate(SourceBase):
    name: Optional[str] = None
    url: Optional[str] = None
    source_type: Optional[str] = None
    frequency_minutes: Optional[int] = None
    is_active: Optional[bool] = None

class SourceResponse(SourceBase):
    id: int
    uuid: uuid.UUID
    last_run_at: Optional[datetime]
    last_status: Optional[str]
    next_run_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ScrapingRunResponse(BaseModel):
    uuid: uuid.UUID
    status: str
    alerts_generated_count: int
    started_at: datetime
    completed_at: Optional[datetime]
    log_message: Optional[str]
    
    class Config:
        from_attributes = True
