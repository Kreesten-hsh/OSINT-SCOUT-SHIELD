from typing import List, Optional, Any
from pydantic import BaseModel, UUID4
from datetime import datetime

# --- EVIDENCE SCHEMAS ---
class EvidenceBase(BaseModel):
    file_path: str
    file_hash: str
    type: str = "SCREENSHOT"
    status: str = "ACTIVE"
    content_text_preview: Optional[str] = None
    captured_at: Optional[datetime] = None
    metadata_json: Optional[dict] = None

class EvidenceResponse(EvidenceBase):
    id: int
    alert_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- ANALYSIS SCHEMAS ---
class AnalysisResultBase(BaseModel):
    categories: Optional[List[Any]] = None
    entities: Optional[List[Any]] = None

class AnalysisResultResponse(AnalysisResultBase):
    id: int
    alert_id: Optional[int] = None
    
    class Config:
        from_attributes = True

# --- ALERT SCHEMAS ---
class AlertBase(BaseModel):
    url: str
    source_type: str
    risk_score: int
    status: str
    is_confirmed: bool

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    is_confirmed: Optional[bool] = None
    analysis_note: Optional[str] = None

class AlertResponse(AlertBase):
    id: int
    uuid: UUID4
    created_at: datetime
    updated_at: Optional[datetime] = None
    analysis_note: Optional[str] = None
    
    evidences: List[EvidenceResponse] = []
    analysis_results: Optional[AnalysisResultResponse] = None

    class Config:
        from_attributes = True
