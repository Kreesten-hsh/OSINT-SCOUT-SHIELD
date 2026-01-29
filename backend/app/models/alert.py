
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
    
    risk_score = Column(Integer, index=True) # Index pour tri/filtre performant
    is_confirmed = Column(Boolean, default=False) 
    status = Column(String, default="NEW", index=True) # Index pour filtre workflow
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True) # Index pour chronologie
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    evidence = relationship("Evidence", back_populates="alert", uselist=False, cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="alert", uselist=False, cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    
    file_path = Column(String) # Chemin vers le screenshot (S3 ou local)
    file_hash = Column(String, unique=True) # SHA-256
    content_text_preview = Column(Text) # Extrait du texte
    
    captured_at = Column(DateTime(timezone=True))
    metadata_json = Column(JSON) # Titre, headers, user-agent...

    alert = relationship("Alert", back_populates="evidence")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    
    categories = Column(JSON) # Liste des catézories détectées [{"name": "MM_FRAUD", "score": 90}]
    entities = Column(JSON) # Entités nommées
    
    alert = relationship("Alert", back_populates="analysis_results")
