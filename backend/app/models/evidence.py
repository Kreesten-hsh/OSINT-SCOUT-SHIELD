from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class EvidenceStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SEALED = "SEALED"

class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    
    # Type de preuve (SCREENSHOT, HTML, etc.) - Strings simples pour l'instant ou Enum futur
    type = Column(String, default="SCREENSHOT", index=True)
    
    # Stockage CAS (Content Addressable Storage)
    file_path = Column(String) # Ex: "a1b2c3d4..." (le hash est le nom du fichier)
    file_hash = Column(String, unique=True, index=True, nullable=False) # SHA-256
    
    content_text_preview = Column(Text)
    metadata_json = Column(JSON) # Titre, headers, user-agent...
    
    # Statut d'immutabilité
    status = Column(String, default=EvidenceStatus.ACTIVE.value, index=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    sealed_at = Column(DateTime(timezone=True), nullable=True)

    alert = relationship("Alert", back_populates="evidences")
