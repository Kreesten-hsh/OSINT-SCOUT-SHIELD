# BENIN CYBER SHIELD — Plan d'Intégration Complet v3.0
## Guide d'implémentation pour GPT-5.4-codex

**Projet** : OSINT-SCOUT & SHIELD — v2.1 → v3.0
**Stack** : FastAPI + React 19 + PostgreSQL + Redis + Playwright + spaCy
**État de départ** : 66 tests passed, pipeline E2E fonctionnel, RBAC opérationnel
**Cible** : 90+ tests passed, 8 upgrades intégrés, mention Excellente

---

## INSTRUCTIONS GÉNÉRALES POUR CODEX

```
RÈGLES ABSOLUES :
1. Ne jamais casser un test existant — vérifie pytest -q avant chaque commit
2. Ne jamais modifier l'architecture RBAC existante (security.py, require_role)
3. Chaque upgrade = branche git séparée (upgrade/U1-observatoire, upgrade/U2-campagnes...)
4. Après chaque upgrade : pytest -q + tsc --noEmit + docker compose up -d vérification
5. Les migrations Alembic sont toujours nullable ou avec default pour éviter les locks
6. Zéro nouvelle dépendance npm — utiliser CDN pour Leaflet.js
7. Nouvelles dépendances Python : ajouter dans requirements.txt ET tester dans Docker
```

---

## UPGRADE 1 — Observatoire National Threat Intelligence + Carte Vivante
**Branche : `upgrade/U1-observatoire`**
**Durée estimée : 8-10h**
**Priorité : CRITIQUE — à faire en premier**

---

### ÉTAPE 1.1 — Modèle ThreatIndicator

**Fichier à créer : `backend/app/models/threat_indicator.py`**

```python
"""
Modèle ThreatIndicator — v3.0
Stocke les indicateurs de compromission agrégés depuis les signalements citoyens.
phone_hash et url_hash sont SHA-256 pour protéger les PII.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    indicator_type = Column(String(10), nullable=False)  # 'phone' | 'url'
    raw_value_masked = Column(String(50), nullable=False)  # ex: 016****090
    phone_hash = Column(String(64), nullable=True, index=True)
    url_hash = Column(String(64), nullable=True, index=True)
    occurrence_count = Column(Integer, default=1, nullable=False)
    danger_score = Column(Float, default=0.0, nullable=False)
    region = Column(String(50), nullable=True, index=True)  # ex: 'Atlantique'
    dominant_category = Column(String(50), nullable=True)
    alert_triggered = Column(Boolean, default=False, nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_threat_phone_hash', 'phone_hash'),
        Index('ix_threat_url_hash', 'url_hash'),
        Index('ix_threat_region', 'region'),
    )
```

---

### ÉTAPE 1.2 — Migration Alembic

**Fichier à créer : `backend/alembic/versions/c1d2e3f4_add_threat_indicators.py`**

```python
"""add threat_indicators table

Revision ID: c1d2e3f4
Revises: [DERNIÈRE REVISION EXISTANTE]
Create Date: 2026-03-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

def upgrade():
    op.create_table(
        'threat_indicators',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('indicator_type', sa.String(10), nullable=False),
        sa.Column('raw_value_masked', sa.String(50), nullable=False),
        sa.Column('phone_hash', sa.String(64), nullable=True),
        sa.Column('url_hash', sa.String(64), nullable=True),
        sa.Column('occurrence_count', sa.Integer, default=1),
        sa.Column('danger_score', sa.Float, default=0.0),
        sa.Column('region', sa.String(50), nullable=True),
        sa.Column('dominant_category', sa.String(50), nullable=True),
        sa.Column('alert_triggered', sa.Boolean, default=False),
        sa.Column('first_seen', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_seen', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_threat_phone_hash', 'threat_indicators', ['phone_hash'])
    op.create_index('ix_threat_url_hash', 'threat_indicators', ['url_hash'])
    op.create_index('ix_threat_region', 'threat_indicators', ['region'])

def downgrade():
    op.drop_table('threat_indicators')
```

---

### ÉTAPE 1.3 — Migration région sur incidents

**Fichier à créer : `backend/alembic/versions/e7f8a9b0_add_region_on_incidents.py`**

```python
"""add region column on incidents

Revision ID: e7f8a9b0
"""
from alembic import op
import sqlalchemy as sa

# Préfixes numéros béninois → département
BENIN_PREFIX_REGION = {
    '01': 'Atlantique',  # Cotonou
    '02': 'Borgou',
    '03': 'Ouémé',
    '04': 'Zou',
    '05': 'Mono',
    '06': 'Couffo',
    '07': 'Atacora',
    '08': 'Donga',
    '09': 'Collines',
    '10': 'Plateau',
    '11': 'Alibori',
    '12': 'Littoral',
    '61': 'Atlantique',  # MTN Cotonou
    '62': 'Atlantique',
    '66': 'Atlantique',
    '67': 'Littoral',
    '95': 'Ouémé',
    '96': 'Atlantique',
    '97': 'Borgou',
}

def upgrade():
    op.add_column('incidents',
        sa.Column('region', sa.String(50), nullable=True)
    )

def downgrade():
    op.drop_column('incidents', 'region')
```

---

### ÉTAPE 1.4 — Service intel_aggregator

**Fichier à créer : `backend/app/services/intel_aggregator.py`**

```python
"""
Service intel_aggregator — v3.0
Gère l'upsert des ThreatIndicators et la dérivation géographique.
Appelé depuis incidents.py après chaque signalement confirmé.
"""
import hashlib
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.threat_indicator import ThreatIndicator

# Mapping préfixe numéro → région béninoise
BENIN_PREFIX_REGION = {
    '01': 'Atlantique', '02': 'Borgou', '03': 'Ouémé', '04': 'Zou',
    '05': 'Mono', '06': 'Couffo', '07': 'Atacora', '08': 'Donga',
    '09': 'Collines', '10': 'Plateau', '11': 'Alibori', '12': 'Littoral',
    '61': 'Atlantique', '62': 'Atlantique', '66': 'Atlantique',
    '67': 'Littoral', '95': 'Ouémé', '96': 'Atlantique', '97': 'Borgou',
}

ALERT_THRESHOLD = 3  # Nombre de signalements distincts déclenchant l'alerte


def derive_region_from_phone(phone: str) -> str | None:
    """Dérive la région béninoise depuis les 2 premiers chiffres du numéro."""
    clean = phone.replace(' ', '').replace('-', '').replace('+229', '').lstrip('0')
    prefix = clean[:2] if len(clean) >= 2 else None
    return BENIN_PREFIX_REGION.get(prefix) if prefix else None


def mask_phone(phone: str) -> str:
    """Masque un numéro : 0169647090 → 016****090"""
    if len(phone) >= 7:
        return phone[:3] + '****' + phone[-3:]
    return '***'


async def upsert_threat_indicator(
    db: AsyncSession,
    phone: str | None = None,
    url: str | None = None,
    danger_score: float = 0.0,
    dominant_category: str | None = None,
) -> ThreatIndicator:
    """
    Upsert un ThreatIndicator.
    Si le hash existe déjà → incrémente occurrence_count + met à jour last_seen.
    Si nouveau → crée l'entrée.
    Si occurrence_count atteint ALERT_THRESHOLD → active alert_triggered.
    """
    if phone:
        hash_key = hashlib.sha256(phone.encode()).hexdigest()
        indicator_type = 'phone'
        raw_masked = mask_phone(phone)
        region = derive_region_from_phone(phone)
        hash_field = 'phone_hash'
    elif url:
        hash_key = hashlib.sha256(url.encode()).hexdigest()
        indicator_type = 'url'
        raw_masked = url[:50]
        region = None
        hash_field = 'url_hash'
    else:
        raise ValueError("phone ou url requis")

    # Chercher l'existant
    stmt = select(ThreatIndicator).where(
        getattr(ThreatIndicator, hash_field) == hash_key
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.occurrence_count += 1
        existing.last_seen = datetime.utcnow()
        existing.danger_score = (existing.danger_score + danger_score) / 2
        if existing.occurrence_count >= ALERT_THRESHOLD:
            existing.alert_triggered = True
        await db.commit()
        return existing
    else:
        new_indicator = ThreatIndicator(
            indicator_type=indicator_type,
            raw_value_masked=raw_masked,
            **{hash_field: hash_key},
            danger_score=danger_score,
            region=region,
            dominant_category=dominant_category,
        )
        db.add(new_indicator)
        await db.commit()
        await db.refresh(new_indicator)
        return new_indicator
```

---

### ÉTAPE 1.5 — Endpoints threat_intel

**Fichier à créer : `backend/app/api/v1/endpoints/threat_intel.py`**

```python
"""
Endpoints Threat Intelligence Nationale — v3.0
GET /api/v1/threat-intel/dashboard   → agrégats nationaux (ANALYST)
GET /api/v1/map/heatmap              → données carte [{region, count, dominant_type}] (PUBLIC)
GET /api/v1/dashboard/intel/export  → CSV/JSON/STIX-lite (ANALYST)
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import json
import csv
import io
from app.database import get_db
from app.core.security import require_role, get_current_user
from app.models.threat_indicator import ThreatIndicator

router = APIRouter()


@router.get("/threat-intel/dashboard")
async def get_threat_intel_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(['ANALYST', 'ADMIN']))
):
    """Tableau de bord Threat Intelligence pour analyste ANSSI."""
    # Top 10 numéros les plus signalés
    stmt = (
        select(ThreatIndicator)
        .where(ThreatIndicator.indicator_type == 'phone')
        .order_by(ThreatIndicator.occurrence_count.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    top_phones = result.scalars().all()

    # Répartition par catégorie
    stmt_cats = select(
        ThreatIndicator.dominant_category,
        func.count(ThreatIndicator.id).label('count')
    ).group_by(ThreatIndicator.dominant_category)
    result_cats = await db.execute(stmt_cats)
    categories = result_cats.all()

    # Indicateurs actifs (alerte déclenchée)
    stmt_active = select(func.count(ThreatIndicator.id)).where(
        ThreatIndicator.alert_triggered == True
    )
    result_active = await db.execute(stmt_active)
    active_count = result_active.scalar()

    return {
        "top_numbers": [
            {
                "masked": t.raw_value_masked,
                "count": t.occurrence_count,
                "score": t.danger_score,
                "region": t.region,
                "category": t.dominant_category,
                "alert": t.alert_triggered,
            }
            for t in top_phones
        ],
        "categories": [
            {"name": cat or "UNKNOWN", "count": count}
            for cat, count in categories
        ],
        "active_threats": active_count,
    }


@router.get("/map/heatmap")
async def get_heatmap(db: AsyncSession = Depends(get_db)):
    """Données publiques pour la carte Leaflet — agrégats anonymisés par région."""
    stmt = select(
        ThreatIndicator.region,
        func.count(ThreatIndicator.id).label('count'),
        ThreatIndicator.dominant_category
    ).where(
        ThreatIndicator.region != None
    ).group_by(
        ThreatIndicator.region,
        ThreatIndicator.dominant_category
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Agréger par région
    regions = {}
    for region, count, category in rows:
        if region not in regions:
            regions[region] = {"region": region, "count": 0, "dominant_type": category}
        regions[region]["count"] += count

    return list(regions.values())


@router.get("/dashboard/intel/export")
async def export_intel(
    format: str = "json",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(['ANALYST', 'ADMIN']))
):
    """Export CSV/JSON/STIX-lite pour consommation bjCSIRT."""
    stmt = select(ThreatIndicator).where(
        ThreatIndicator.alert_triggered == True
    ).order_by(ThreatIndicator.occurrence_count.desc())
    result = await db.execute(stmt)
    indicators = result.scalars().all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['masked_value', 'type', 'count', 'score', 'region', 'category', 'first_seen'])
        for ind in indicators:
            writer.writerow([
                ind.raw_value_masked, ind.indicator_type,
                ind.occurrence_count, round(ind.danger_score, 2),
                ind.region, ind.dominant_category,
                ind.first_seen.isoformat() if ind.first_seen else ''
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=benin_threat_intel.csv"}
        )

    elif format == "stix":
        # STIX-lite : format simplifié compatible bjCSIRT
        bundle = {
            "type": "bundle",
            "id": "bundle--benin-cyber-shield",
            "spec_version": "2.1",
            "objects": [
                {
                    "type": "indicator",
                    "id": f"indicator--{str(ind.id)}",
                    "name": f"Benin Scam {ind.indicator_type.upper()}",
                    "pattern": f"[{ind.indicator_type}:value = '{ind.raw_value_masked}']",
                    "valid_from": ind.first_seen.isoformat() if ind.first_seen else '',
                    "labels": [ind.dominant_category or "malicious-activity"],
                    "x_benin_region": ind.region,
                    "x_occurrence_count": ind.occurrence_count,
                }
                for ind in indicators
            ]
        }
        return bundle

    # JSON par défaut
    return {
        "generated_at": "utcnow",
        "source": "BENIN CYBER SHIELD v3.0",
        "indicators": [
            {
                "masked": ind.raw_value_masked,
                "type": ind.indicator_type,
                "count": ind.occurrence_count,
                "score": round(ind.danger_score, 2),
                "region": ind.region,
                "category": ind.dominant_category,
                "first_seen": ind.first_seen.isoformat() if ind.first_seen else None,
            }
            for ind in indicators
        ]
    }
```

---

### ÉTAPE 1.6 — Hook dans incidents.py

**Modifier : `backend/app/api/v1/endpoints/incidents.py`**

Après la création d'un incident (dans le handler `POST /incidents/report`), ajouter :

```python
# ── NOUVEAU v3.0 : Upsert ThreatIndicator + dérivation région ──
from app.services.intel_aggregator import upsert_threat_indicator, derive_region_from_phone

# Dans le handler, après incident créé :
if incident.phone_number:
    indicator = await upsert_threat_indicator(
        db=db,
        phone=incident.phone_number,
        danger_score=signal_result.score,
        dominant_category=signal_result.categories_detected[0] if signal_result.categories_detected else None,
    )
    incident.region = indicator.region
    await db.commit()
```

---

### ÉTAPE 1.7 — Page /live (frontend)

**Fichier à créer : `frontend/src/features/live/LivePage.tsx`**

```tsx
/**
 * LivePage — Page publique sans login pour la soutenance
 * Affiche : compteur signalements + carte Leaflet + dernier incident
 * Auto-refresh toutes les 30s via TanStack Query
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

export default function LivePage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  const { data: heatmap } = useQuery({
    queryKey: ["heatmap"],
    queryFn: () => fetch("/api/v1/map/heatmap").then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["live-stats"],
    queryFn: () => fetch("/api/v1/dashboard/stats").then(r => r.json()),
    refetchInterval: 30000,
  });

  useEffect(() => {
    // Charger Leaflet depuis CDN (zéro npm)
    if (!window.L || !mapRef.current || leafletMap.current) return;
    const L = window.L;

    leafletMap.current = L.map(mapRef.current, { zoomControl: false }).setView([9.3077, 2.3158], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(leafletMap.current);
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !heatmap || !window.L) return;
    const L = window.L;

    // Coordonnées approximatives par département béninois
    const DEPT_COORDS: Record<string, [number, number]> = {
      'Atlantique': [6.3676, 2.4252],
      'Littoral': [6.3654, 2.4183],
      'Ouémé': [6.4900, 2.6300],
      'Borgou': [10.2300, 2.7700],
      'Zou': [7.1700, 2.0900],
      'Mono': [6.9000, 1.6600],
      'Couffo': [7.0000, 1.7500],
      'Atacora': [10.6300, 1.6500],
      'Donga': [9.7400, 1.6700],
      'Collines': [8.3900, 2.2700],
      'Plateau': [7.2100, 2.9800],
      'Alibori': [11.3300, 2.7800],
    };

    heatmap.forEach((item: any) => {
      const coords = DEPT_COORDS[item.region];
      if (!coords) return;
      const color = item.count > 10 ? '#ef4444' : item.count > 5 ? '#f59e0b' : '#22c55e';
      L.circleMarker(coords, {
        radius: Math.min(8 + item.count, 25),
        fillColor: color,
        color: color,
        fillOpacity: 0.7,
      }).bindPopup(`<b>${item.region}</b><br>${item.count} signalements<br>${item.dominant_type || ''}`).addTo(leafletMap.current);
    });
  }, [heatmap]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-indigo-400">🛡️ BENIN CYBER SHIELD</span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">LIVE</span>
        </div>
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-red-400">{stats?.total_high || 0}</div>
            <div className="text-xs text-slate-400">Menaces HIGH</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{stats?.total_incidents || 0}</div>
            <div className="text-xs text-slate-400">Signalements total</div>
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="flex-1 relative">
        {/* Leaflet CSS depuis CDN */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" />
        <div ref={mapRef} className="w-full h-full" style={{ minHeight: '500px', background: '#0f172a' }} />
      </div>
    </div>
  );
}
```

---

### ÉTAPE 1.8 — Enregistrer les routes dans le router principal

**Modifier : `backend/app/api/v1/router.py`**

```python
from app.api.v1.endpoints import threat_intel

api_router.include_router(threat_intel.router, prefix="/api/v1", tags=["threat-intel"])
```

**Modifier : `frontend/src/App.tsx`**

```tsx
// Ajouter les routes publiques
import LivePage from "@/features/live/LivePage";
import ThreatMapPage from "@/features/threat-map/ThreatMapPage";

// Dans les routes publiques :
<Route path="/live" element={<LivePage />} />

// Dans les routes analyste :
<Route path="/threat-map" element={<ThreatMapPage />} />
```

---

## UPGRADE 2 — Détecteur de Campagnes Coordonnées
**Branche : `upgrade/U2-campagnes`**
**Durée estimée : 4-5h**

---

### ÉTAPE 2.1 — Migration CampaignAlert

**Fichier à créer : `backend/alembic/versions/d4e5f6a7_add_campaign_alerts.py`**

```python
"""add campaign_alerts table"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY

def upgrade():
    op.create_table(
        'campaign_alerts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_type', sa.String(100), nullable=False),
        sa.Column('matched_rules', sa.JSON, nullable=True),
        sa.Column('incident_count', sa.Integer, default=1),
        sa.Column('dominant_region', sa.String(50), nullable=True),
        sa.Column('status', sa.String(20), default='ACTIVE'),
        sa.Column('first_seen', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_seen', sa.DateTime, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('campaign_alerts')
```

---

### ÉTAPE 2.2 — Service campaign_detector

**Fichier à créer : `backend/app/services/campaign_detector.py`**

```python
"""
Service campaign_detector — v3.0
Détecte les campagnes d'arnaques coordonnées via Redis sliding window.

Algorithme :
- À chaque signalement, push dans un Redis Sorted Set (score = timestamp UNIX)
- Clé : campaign:{matched_rules_hash}
- Si 5+ incidents dans la même fenêtre de 2h → CampaignAlert créée
- Nettoyage automatique des entrées > 2h
"""
import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.campaign_alert import CampaignAlert

CAMPAIGN_WINDOW_SECONDS = 7200   # 2 heures
CAMPAIGN_THRESHOLD = 5           # Nombre d'incidents pour déclencher alerte
REDIS_KEY_PREFIX = "campaign:"


def _rules_hash(matched_rules: list[str]) -> str:
    """Hash stable des règles pour clé Redis."""
    return hashlib.md5(json.dumps(sorted(matched_rules)).encode()).hexdigest()[:8]


async def register_signal(
    redis_client: aioredis.Redis,
    incident_id: str,
    matched_rules: list[str],
    region: Optional[str] = None,
) -> dict:
    """
    Enregistre un signal dans Redis et vérifie si une campagne est active.
    Retourne {"campaign_detected": bool, "count": int, "type": str}.
    """
    if not matched_rules:
        return {"campaign_detected": False, "count": 0, "type": None}

    now = time.time()
    rules_key = _rules_hash(matched_rules)
    redis_key = f"{REDIS_KEY_PREFIX}{rules_key}"

    # Nettoyer les entrées trop anciennes
    cutoff = now - CAMPAIGN_WINDOW_SECONDS
    await redis_client.zremrangebyscore(redis_key, 0, cutoff)

    # Ajouter le nouvel incident
    member = f"{incident_id}:{region or 'unknown'}"
    await redis_client.zadd(redis_key, {member: now})
    await redis_client.expire(redis_key, CAMPAIGN_WINDOW_SECONDS + 60)

    # Compter
    count = await redis_client.zcard(redis_key)

    campaign_type = "_".join(sorted(matched_rules)[:2]).upper()

    return {
        "campaign_detected": count >= CAMPAIGN_THRESHOLD,
        "count": count,
        "type": campaign_type,
        "rules": matched_rules,
    }


async def create_or_update_campaign(
    db: AsyncSession,
    campaign_data: dict,
    dominant_region: Optional[str] = None,
) -> Optional[CampaignAlert]:
    """Crée ou met à jour une CampaignAlert en base."""
    if not campaign_data.get("campaign_detected"):
        return None

    campaign_type = campaign_data["type"]
    stmt = select(CampaignAlert).where(
        CampaignAlert.campaign_type == campaign_type,
        CampaignAlert.status == 'ACTIVE'
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.incident_count = campaign_data["count"]
        existing.last_seen = datetime.utcnow()
        await db.commit()
        return existing
    else:
        new_campaign = CampaignAlert(
            campaign_type=campaign_type,
            matched_rules=campaign_data["rules"],
            incident_count=campaign_data["count"],
            dominant_region=dominant_region,
            status='ACTIVE',
        )
        db.add(new_campaign)
        await db.commit()
        await db.refresh(new_campaign)
        return new_campaign
```

---

### ÉTAPE 2.3 — Hook dans incidents.py

**Modifier : `backend/app/api/v1/endpoints/incidents.py`**

```python
# Ajouter en haut
from app.services.campaign_detector import register_signal, create_or_update_campaign
from app.core.redis_client import get_redis  # adapter selon ton import Redis

# Dans le handler POST /incidents/report, après création incident :
redis = await get_redis()
campaign_data = await register_signal(
    redis_client=redis,
    incident_id=str(new_incident.id),
    matched_rules=signal_result.categories_detected,
    region=new_incident.region,
)
if campaign_data["campaign_detected"]:
    await create_or_update_campaign(db, campaign_data, new_incident.region)
```

---

### ÉTAPE 2.4 — Endpoint campagnes actives

**Dans `threat_intel.py` ajouter :**

```python
@router.get("/dashboard/intel/summary")
async def get_intel_summary(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(['ANALYST', 'ADMIN']))
):
    """Retourne les campagnes actives pour le dashboard SOC."""
    from app.models.campaign_alert import CampaignAlert
    stmt = select(CampaignAlert).where(
        CampaignAlert.status == 'ACTIVE'
    ).order_by(CampaignAlert.incident_count.desc())
    result = await db.execute(stmt)
    campaigns = result.scalars().all()

    return {
        "active_campaigns": [
            {
                "id": str(c.id),
                "type": c.campaign_type,
                "count": c.incident_count,
                "region": c.dominant_region,
                "first_seen": c.first_seen.isoformat() if c.first_seen else None,
                "last_seen": c.last_seen.isoformat() if c.last_seen else None,
            }
            for c in campaigns
        ]
    }
```

---

### ÉTAPE 2.5 — CampaignBanner (frontend)

**Fichier à créer : `frontend/src/components/layout/CampaignBanner.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export default function CampaignBanner() {
  const { data } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiClient.get("/api/v1/dashboard/intel/summary").then(r => r.data),
    refetchInterval: 60000,
  });

  const campaigns = data?.active_campaigns ?? [];
  if (campaigns.length === 0) return null;

  const top = campaigns[0];
  return (
    <div className="bg-red-900/80 border border-red-500 text-red-100 px-4 py-2 flex items-center gap-3 text-sm">
      <span className="text-red-400 font-bold text-base">⚠️</span>
      <span>
        <strong>Campagne active détectée</strong> — {top.count} signalements{" "}
        <span className="font-mono text-red-300">{top.type}</span>
        {top.region && <> dans <strong>{top.region}</strong></>}
        {" "}depuis{" "}
        {top.first_seen ? new Date(top.first_seen).toLocaleTimeString("fr-FR") : "—"}
      </span>
      {campaigns.length > 1 && (
        <span className="ml-auto text-red-400 text-xs">+{campaigns.length - 1} autre(s)</span>
      )}
    </div>
  );
}
```

**Modifier : `frontend/src/layouts/DashboardLayout.tsx`** — Ajouter `<CampaignBanner />` en haut du layout, avant le contenu principal.

---

## UPGRADE 3 — Explication Pédagogique + Surlignage Visuel
**Branche : `upgrade/U3-surlignage`**
**Durée estimée : 3-4h**

---

### ÉTAPE 3.1 — Étendre detection.py

**Modifier : `backend/app/services/detection.py`**

```python
# Ajouter après EXPLANATION_MAPPING existant :

RECOMMENDATION_MAPPING = {
    "otp_request": "Ne communiquez JAMAIS un code reçu par SMS. Ce code est votre clé de sécurité. Aucun service officiel ne vous le demandera.",
    "urgency": "L'urgence est la principale arme des arnaqueurs. Un vrai service vous laisse toujours le temps de vérifier.",
    "unexpected_gain": "Aucun gain légitime ne nécessite un paiement préalable ou votre code secret.",
    "operator_impersonation": "MTN et Moov ne vous contacteront jamais par SMS pour demander un transfert ou votre code PIN.",
    "threat_of_loss": "Les menaces de blocage de compte sont de fausses urgences. Appelez directement votre opérateur pour vérifier.",
    "phone_number_in_message": "Ce numéro n'appartient pas à votre opérateur officiel. Ne le rappelez pas.",
    "suspicious_url": "Ne cliquez jamais sur un lien reçu par SMS. Tapez toujours l'adresse officielle de votre service.",
    "fcfa_amount_in_message": "Les demandes de paiement de frais à l'avance sont une technique d'arnaque classique au Bénin.",
    "whatsapp_number": "Les services officiels n'utilisent pas WhatsApp pour des transactions financières.",
}

FON_ALERTS = {
    "HIGH": "⚠️ Wɛ — Nyanya wɛ ɖo ali bo na xò wɛ!",       # Attention — Ce message veut vous voler
    "MEDIUM": "⚠️ Ðó wantɔ ɖagbe — Kpɔ nú enɛ jɛ nukɔn",  # Soyez prudent — Vérifiez d'abord
}


def _find_spans(text: str, matched_rules: list[str]) -> list[dict]:
    """
    Trouve les positions des mots déclencheurs dans le texte original.
    Retourne une liste de {start, end, rule, label, color}.
    """
    from app.services.detection import CATEGORY_LABELS  # adapter l'import

    # Mots-clés associés à chaque règle (extraits du moteur existant)
    RULE_KEYWORDS = {
        "otp_request": ["otp", "code", "secret", "pin", "mot de passe"],
        "urgency": ["urgent", "immédiatement", "maintenant", "vite", "minutes", "heures", "bloqué"],
        "unexpected_gain": ["gagné", "félicitations", "cadeau", "gratuit", "récompense"],
        "operator_impersonation": ["mtn", "moov", "agent", "service client"],
        "threat_of_loss": ["suspendu", "bloqué", "désactivé", "clôturé"],
        "phone_number_in_message": [],  # géré par regex
        "suspicious_url": ["http", "www", ".xyz", ".tk", "cliquez", "lien"],
        "fcfa_amount_in_message": ["fcfa", "cfa", "francs"],
        "whatsapp_number": ["whatsapp", "wa.me"],
    }

    COLOR_MAP = {
        "otp_request": "red",
        "urgency": "orange",
        "unexpected_gain": "amber",
        "operator_impersonation": "red",
        "threat_of_loss": "red",
        "phone_number_in_message": "orange",
        "suspicious_url": "red",
        "fcfa_amount_in_message": "amber",
        "whatsapp_number": "orange",
    }

    spans = []
    text_lower = text.lower()

    for rule in matched_rules:
        keywords = RULE_KEYWORDS.get(rule, [])
        label = CATEGORY_LABELS.get(rule, rule)
        color = COLOR_MAP.get(rule, "orange")

        for keyword in keywords:
            start = 0
            while True:
                pos = text_lower.find(keyword, start)
                if pos == -1:
                    break
                spans.append({
                    "start": pos,
                    "end": pos + len(keyword),
                    "rule": rule,
                    "label": label,
                    "color": color,
                })
                start = pos + len(keyword)

    # Fusionner les spans qui se chevauchent
    spans.sort(key=lambda x: x["start"])
    return spans
```

**Modifier le retour de `score_signal()` dans `detection.py` :**

```python
# Dans la valeur de retour de score_signal(), ajouter :
highlighted_spans = _find_spans(text, matched_rules)
recommendations = [
    RECOMMENDATION_MAPPING[rule]
    for rule in matched_rules
    if rule in RECOMMENDATION_MAPPING
]
citizen_advice = recommendations[:3]  # Max 3 conseils affichés
fon_alert = FON_ALERTS.get(risk_level)

return {
    # ... champs existants ...
    "highlighted_spans": highlighted_spans,
    "recommendations": recommendations,
    "citizen_advice": citizen_advice,
    "fon_alert": fon_alert,
}
```

---

### ÉTAPE 3.2 — Schéma Pydantic

**Modifier : `backend/app/schemas/signal.py`**

```python
class HighlightedSpan(BaseModel):
    start: int
    end: int
    rule: str
    label: str
    color: str  # 'red' | 'orange' | 'amber'

class VerifySignalData(BaseModel):
    # Champs existants (ne pas toucher)
    score: int
    risk_level: str
    categories_detected: list[str]
    explanation: str
    recurrence_count: int
    # NOUVEAU v3.0
    highlighted_spans: list[HighlightedSpan] = []
    recommendations: list[str] = []
    citizen_advice: list[str] = []
    fon_alert: str | None = None
    whatsapp_template: str | None = None  # Ajouté par l'endpoint si HIGH/MEDIUM
```

---

### ÉTAPE 3.3 — Composant HighlightedMessage

**Fichier à créer : `frontend/src/features/verify/HighlightedMessage.tsx`**

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Span {
  start: number;
  end: number;
  rule: string;
  label: string;
  color: string;
}

interface Props {
  text: string;
  spans: Span[];
}

const COLOR_CLASSES: Record<string, string> = {
  red: "bg-red-900/60 text-red-200 border-b-2 border-red-500 cursor-help",
  orange: "bg-orange-900/60 text-orange-200 border-b-2 border-orange-500 cursor-help",
  amber: "bg-amber-900/60 text-amber-200 border-b-2 border-amber-500 cursor-help",
};

const RULE_TOOLTIPS: Record<string, string> = {
  otp_request: "🔴 Demande de code secret — aucun service officiel ne demande votre OTP",
  urgency: "🟠 Urgence artificielle — technique classique d'arnaqueur pour vous empêcher de réfléchir",
  operator_impersonation: "🔴 Usurpation d'opérateur — MTN et Moov ne demandent jamais de transfert par SMS",
  unexpected_gain: "🟡 Gain inattendu — aucun gain légitime n'exige un paiement préalable",
  threat_of_loss: "🔴 Menace de perte — fausse urgence pour vous pousser à agir sans vérifier",
  suspicious_url: "🔴 URL suspecte — ne cliquez pas, tapez l'adresse officielle manuellement",
  fcfa_amount_in_message: "🟡 Montant FCFA — les paiements de frais à l'avance sont une arnaque",
  whatsapp_number: "🟠 Lien WhatsApp — les services officiels n'utilisent pas WhatsApp pour transactions",
};

export default function HighlightedMessage({ text, spans }: Props) {
  if (!spans || spans.length === 0) {
    return <p className="text-slate-300 font-mono text-sm whitespace-pre-wrap">{text}</p>;
  }

  // Construire les segments du texte
  const segments: Array<{ text: string; span?: Span }> = [];
  let cursor = 0;

  const sortedSpans = [...spans].sort((a, b) => a.start - b.start);

  for (const span of sortedSpans) {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start) });
    }
    if (span.start >= cursor) {
      segments.push({ text: text.slice(span.start, span.end), span });
      cursor = span.end;
    }
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return (
    <TooltipProvider>
      <p className="text-slate-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
        {segments.map((seg, i) =>
          seg.span ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <mark className={`rounded px-0.5 ${COLOR_CLASSES[seg.span.color] || COLOR_CLASSES.orange}`}>
                  {seg.text}
                </mark>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-slate-900 border-slate-700 text-slate-100">
                <p className="text-xs">{RULE_TOOLTIPS[seg.span.rule] || seg.span.label}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
    </TooltipProvider>
  );
}
```

---

## UPGRADE 4 — Dossier Probatoire CRIET Case Bundle
**Branche : `upgrade/U4-case-bundle`**
**Durée estimée : 4-5h**

---

### ÉTAPE 4.1 — Service case_bundle.py

**Fichier à créer : `backend/app/services/case_bundle.py`**

```python
"""
Service case_bundle — v3.0
Génère un ZIP probatoire complet pour transmission à la CRIET.
Contenu : PDF forensique + snapshot JSON + manifest d'intégrité (hashes).
"""
import io
import json
import hashlib
import zipfile
from datetime import datetime
from app.services.pdf_generator import generate_forensic_pdf  # existant


def compute_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


async def generate_case_bundle(
    incident_data: dict,
    report_data: dict,
    pdf_bytes: bytes,
) -> bytes:
    """
    Retourne un ZIP en mémoire contenant :
    - rapport_forensique_{uuid_court}.pdf
    - snapshot_{uuid_court}.json
    - manifest_integrite.txt
    """
    uuid_short = str(incident_data.get("id", "unknown"))[:8]

    # 1. PDF (déjà généré)
    pdf_hash = compute_file_hash(pdf_bytes)

    # 2. Snapshot JSON
    snapshot = {
        "generated_at": datetime.utcnow().isoformat(),
        "source": "BENIN CYBER SHIELD v3.0",
        "incident": incident_data,
        "report": report_data,
        "chain_of_custody": incident_data.get("custody_events", []),
    }
    snapshot_bytes = json.dumps(snapshot, ensure_ascii=False, indent=2).encode("utf-8")
    snapshot_hash = compute_file_hash(snapshot_bytes)

    # 3. Manifest d'intégrité
    manifest_lines = [
        "MANIFEST D'INTÉGRITÉ — BENIN CYBER SHIELD",
        f"Généré le : {datetime.utcnow().isoformat()} UTC",
        f"Incident UUID : {incident_data.get('id', 'N/A')}",
        "",
        "Fichiers inclus :",
        f"  rapport_forensique_{uuid_short}.pdf   SHA-256: {pdf_hash}",
        f"  snapshot_{uuid_short}.json            SHA-256: {snapshot_hash}",
        "",
        "Ce bundle est transmissible à la CRIET, bjCSIRT et l'OCRC.",
        "Toute modification après génération invalide les hashes ci-dessus.",
    ]
    manifest_bytes = "\n".join(manifest_lines).encode("utf-8")
    manifest_hash = compute_file_hash(manifest_bytes)
    manifest_lines.append(f"  manifest_integrite.txt                SHA-256: {manifest_hash}")
    manifest_bytes = "\n".join(manifest_lines).encode("utf-8")

    # 4. Assembler le ZIP en mémoire
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"rapport_forensique_{uuid_short}.pdf", pdf_bytes)
        zf.writestr(f"snapshot_{uuid_short}.json", snapshot_bytes)
        zf.writestr("manifest_integrite.txt", manifest_bytes)

    zip_buffer.seek(0)
    return zip_buffer.read()
```

---

### ÉTAPE 4.2 — Endpoint case-bundle

**Modifier : `backend/app/api/v1/endpoints/reports.py`**

```python
@router.get("/{report_uuid}/download/case-bundle")
async def download_case_bundle(
    report_uuid: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(['ANALYST', 'ADMIN']))
):
    """Téléchargement du bundle CRIET complet."""
    # Récupérer le rapport et l'incident associé
    # ... (adapter selon ton modèle Report existant)

    from app.services.case_bundle import generate_case_bundle
    from fastapi.responses import Response

    zip_bytes = await generate_case_bundle(
        incident_data=incident_dict,
        report_data=report_dict,
        pdf_bytes=existing_pdf_bytes,
    )

    uuid_short = report_uuid[:8]
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=dossier_criet_{uuid_short}.zip"
        }
    )
```

---

## UPGRADE 5 — Automated Forensic Preservation
**Branche : `upgrade/U5-forensic`**
**Durée estimée : 2-3h (Playwright déjà opérationnel)**

---

### ÉTAPE 5.1 — Hook dans signals.py

**Modifier : `backend/app/api/v1/endpoints/signals.py`**

```python
# Dans le handler POST /verify ou dans le pipeline post-signalement :
# Après score_signal(), si suspicious_url détecté :

if "suspicious_url" in signal_result.get("categories_detected", []):
    # Extraire l'URL du message (regex simple)
    import re
    urls = re.findall(r'https?://[^\s]+', message_text)
    for url in urls[:1]:  # Traiter la première URL uniquement
        await redis_client.lpush("osint_to_scan", json.dumps({
            "url": url,
            "incident_id": str(new_incident.id),
            "trigger": "suspicious_url_auto",
            "priority": "HIGH",
        }))
```

---

## UPGRADE 6 — Enrichissement Moteur (7 catégories)
**Branche : `upgrade/U6-detection`**
**Durée estimée : 2h**

---

### ÉTAPE 6.1 — Nouvelles catégories rules.json

**Modifier : `config/rules.json`** — Ajouter au format existant :

```json
{
  "FAKE_RECRUITMENT": {
    "keywords": ["emploi", "recrutement", "poste", "dubaï", "canada", "europe", "visa", "frais de dossier", "frais de visa", "sélectionné", "embauché"],
    "patterns": ["\\d{1,3}[.\\s]?\\d{3}\\s*(?:F\\s*CFA|FCFA|francs)\\s+(?:de frais|frais)"]
  },
  "FAKE_LOTTERY": {
    "keywords": ["gagné", "loterie", "tirage", "samsung", "iphone", "voiture", "cadeau", "livraison", "frais de livraison", "récompense", "félicitations"],
    "patterns": []
  },
  "SEXTORTION": {
    "keywords": ["photos", "vidéos", "intime", "publier", "diffuser", "honte", "famille", "chantage"],
    "patterns": []
  },
  "PHISHING_BANCAIRE": {
    "keywords": ["uba", "boa", "banque", "compte bancaire", "bloqué", "vérification", "mise à jour", "informations bancaires"],
    "patterns": ["https?://[^\\s]*(uba|boa|banque)[^\\s]*"]
  },
  "FAUX_DON_ONG": {
    "keywords": ["ong", "association", "don", "aide humanitaire", "subvention", "bénéficiaire", "sélectionné", "inscription"],
    "patterns": []
  }
}
```

---

### ÉTAPE 6.2 — Nouveaux signaux dans detection.py

**Modifier : `backend/app/services/detection.py`**

```python
# Ajouter dans SIGNAL_WEIGHTS :
"fcfa_amount_in_message": 20,
"whatsapp_number": 15,

# Ajouter dans CATEGORY_LABELS :
"FAKE_RECRUITMENT": "Arnaque à l'emploi",
"FAKE_LOTTERY": "Fausse loterie",
"SEXTORTION": "Sextorsion",
"PHISHING_BANCAIRE": "Phishing bancaire",
"FAUX_DON_ONG": "Faux don / ONG",
"fcfa_amount_in_message": "Montant FCFA suspect",
"whatsapp_number": "Redirection WhatsApp",

# Nouvelles fonctions de matching :
import re

def _match_fcfa_amount(text: str) -> bool:
    """Détecte un montant en FCFA dans le message."""
    pattern = r'\d{1,3}[.\s]?\d{3}\s*(?:F\s*CFA|FCFA|francs?)'
    return bool(re.search(pattern, text, re.IGNORECASE))

def _match_whatsapp(text: str) -> bool:
    """Détecte une redirection WhatsApp."""
    return bool(re.search(r'wa\.me|whatsapp', text, re.IGNORECASE))
```

---

## UPGRADE 7 — Bouclier Familial WhatsApp
**Branche : `upgrade/U7-whatsapp`**
**Durée estimée : 1h**

---

### ÉTAPE 7.1 — Modifier VerifySignalPanel.tsx

**Modifier : `frontend/src/features/verify/VerifySignalPanel.tsx`**

```tsx
// Ajouter la génération du template WhatsApp dans le handler de résultat :

function buildWhatsAppMessage(result: VerifySignalData, phone: string): string {
  const riskLabel = result.risk_level === 'HIGH' ? '🔴 DANGER' : '🟡 Suspect';
  const shortId = result.report_id?.slice(0, 8) ?? 'N/A';
  return encodeURIComponent(
    `⚠️ Alerte BENIN CYBER SHIELD\n\n` +
    `${riskLabel} : Ce numéro (${phone}) est signalé comme arnaque.\n` +
    `Score : ${result.score}/100\n\n` +
    `Ne communiquez JAMAIS votre code OTP ou PIN à quelqu'un qui vous contacte.\n\n` +
    `Vérifiez vous-même : https://benincybershield.bj/verify\n` +
    `Rapport n° ${shortId}`
  );
}

// Dans le rendu, après le score HIGH ou MEDIUM :
{(result.risk_level === 'HIGH' || result.risk_level === 'MEDIUM') && (
  <a
    href={`https://wa.me/?text=${buildWhatsAppMessage(result, phoneInput)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
  >
    <span>📲</span>
    Prévenir ma famille sur WhatsApp
  </a>
)}
```

---

## VÉRIFICATIONS FINALES APRÈS CHAQUE UPGRADE

```bash
# À exécuter après chaque branche :

# 1. Tests backend
docker compose exec -T api pytest -q --tb=short
# Cible : 0 failed, aucune régression

# 2. Migrations
docker compose exec -T api alembic upgrade head

# 3. TypeScript
cd frontend && node ./node_modules/typescript/bin/tsc --noEmit

# 4. Build frontend
cd frontend && npm run build

# 5. Health check
curl http://localhost:8000/health
# Attendu : {"status": "ok", "db": "ok", "redis": "ok"}

# 6. Test endpoint spécifique après chaque upgrade
# U1 : curl http://localhost:8000/api/v1/map/heatmap
# U2 : curl -H "Authorization: Bearer {token}" http://localhost:8000/api/v1/dashboard/intel/summary
# U6 : pytest tests/test_detection_7_categories.py -v
```

---

## SEED DATA SOUTENANCE

**Fichier à créer : `backend/scripts/seed_demo_data.py`**

```python
"""
Seed 30 incidents réalistes répartis sur les départements béninois.
À exécuter avant la soutenance : python seed_demo_data.py
"""
DEMO_INCIDENTS = [
    # Atlantique / Cotonou — 12 incidents (zone la plus touchée)
    {"phone": "0169647090", "message": "URGENT MTN: Transfert erroné de 85.000 FCFA. Renvoyez code 4821 au 66001133 sous 30min", "region": "Atlantique"},
    {"phone": "0196234501", "message": "Félicitations! Vous avez gagné un Samsung Galaxy. Frais de livraison: 15.000 FCFA au 97112233", "region": "Atlantique"},
    # ... (30 entrées réalistes couvrant MM_FRAUD, FAKE_RECRUITMENT, PHISHING_BANCAIRE)
    # Borgou — 4 incidents
    {"phone": "0297441122", "message": "Agent MTN Borgou: votre compte sera suspendu. Envoyez votre PIN au 97334455", "region": "Borgou"},
    # Ouémé — 5 incidents
    # Zou — 3 incidents
    # Autres départements — 6 incidents
]
```

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

```
Semaine 1-2 : git checkout -b upgrade/U1-observatoire
              → Étapes 1.1 à 1.8
              → pytest + build + health check
              → Merge main

Semaine 3   : git checkout -b upgrade/U2-campagnes
              → Étapes 2.1 à 2.5
              → Test : 6 signalements → bandeau rouge
              → Merge main

Semaine 4   : git checkout -b upgrade/U3-surlignage
              → Étapes 3.1 à 3.3
              → Test visuel : surlignages sur message MTN
              → Merge main

Semaine 5a  : git checkout -b upgrade/U4-case-bundle
              → Étapes 4.1 à 4.2
              → Test : ZIP téléchargeable + manifest intègre
              → Merge main

Semaine 5b  : git checkout -b upgrade/U5-forensic
              → Étape 5.1
              → Test : signalement URL → screenshot dans PDF
              → Merge main

Semaine 6a  : git checkout -b upgrade/U6-detection
              → Étapes 6.1 à 6.2
              → Test : 7 catégories pytest
              → Merge main

Semaine 6b  : git checkout -b upgrade/U7-whatsapp
              → Étape 7.1
              → Test manuel sur mobile
              → Merge main

Avant soutenance :
              → python scripts/seed_demo_data.py
              → Répétition script démo x5
              → docker compose down && docker compose up (cold start test)
              → Plan B : screenshots de chaque étape sauvegardés
              → Résoudre ambiguïté result_consumer.py / results_consumer.py
              → pytest -q → cible 90+ tests passed
```

---

*Plan d'intégration v3.0 — BENIN CYBER SHIELD*
*Généré le 07 mars 2026 — Fusion Codex + Gemini + Claude Opus + Claude Sonnet*
