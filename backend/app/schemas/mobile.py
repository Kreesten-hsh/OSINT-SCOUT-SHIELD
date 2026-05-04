from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.risk_levels import normalize_risk_level


class MobileBootstrapData(BaseModel):
    departments: list[str] = Field(default_factory=list)
    minimum_supported_version: str


class MobileHistoryItem(BaseModel):
    type: Literal["VERIFY", "REPORT"]
    created_at: datetime
    risk_score: int
    risk_level: Literal["FAIBLE", "MOYEN", "FORT"]
    primary_category: str | None = None
    masked_phone: str
    public_reference: str | None = None
    status: str | None = None

    @field_validator("risk_level", mode="before")
    @classmethod
    def _normalize_risk_level(cls, value: str) -> str:
        return normalize_risk_level(value)


class MobileHistoryData(BaseModel):
    items: list[MobileHistoryItem] = Field(default_factory=list)
