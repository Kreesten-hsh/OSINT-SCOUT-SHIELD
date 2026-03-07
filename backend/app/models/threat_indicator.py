from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"
    __table_args__ = (
        Index("ix_threat_indicators_phone_hash_region", "phone_hash", "region"),
        Index("ix_threat_indicators_url_hash_region", "url_hash", "region"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    indicator_type = Column(String(10), nullable=False)
    raw_value_masked = Column(String(50), nullable=False)
    phone_hash = Column(String(64), nullable=True, index=True)
    url_hash = Column(String(64), nullable=True, index=True)
    occurrence_count = Column(Integer, nullable=False, default=1)
    danger_score = Column(Float, nullable=False, default=0.0)
    region = Column(String(50), nullable=True, index=True)
    dominant_category = Column(String(50), nullable=True)
    alert_triggered = Column(Boolean, nullable=False, default=False)
    first_seen = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, server_default=func.now())
    last_seen = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )
