
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    
    url = Column(String, index=True)
    source_type = Column(String) # WEB, SOCIAL, DARKWEB
    phone_number = Column(String, index=True, nullable=True)
    reported_message = Column(Text, nullable=True)
    citizen_channel = Column(String, index=True, nullable=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    
    risk_score = Column(Integer, index=True) # Index pour tri/filtre performant
    status = Column(String, default="NEW", index=True) # NEW, IN_REVIEW, CONFIRMED, DISMISSED, BLOCKED_SIMULATED
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True) # Index pour chronologie
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    analysis_note = Column(Text, nullable=True) # Note d'analyse (obligatoire pour CONFIRMED/DISMISSED)

    # Relations
    evidences = relationship("Evidence", back_populates="alert", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="alert", uselist=False, cascade="all, delete-orphan")




class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    
    categories = Column(JSON) # Liste des catézories détectées [{"name": "MM_FRAUD", "score": 90}]
    entities = Column(JSON) # Entités nommées
    
    alert = relationship("Alert", back_populates="analysis_results")
