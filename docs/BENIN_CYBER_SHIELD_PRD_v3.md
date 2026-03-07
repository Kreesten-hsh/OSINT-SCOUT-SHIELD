# BENIN CYBER SHIELD — PRD v3.0
**Product Requirements Document — Mis à jour le 07 mars 2026**
**Intègre la fusion des analyses : Codex + Gemini + Claude Opus + Claude Sonnet**

---

## CHANGELOG v2.1 → v3.0

| # | Changement |
|---|---|
| + | 8 nouveaux upgrades issus de la fusion quadri-IA |
| + | Tier 1 : Observatoire National Threat Intelligence + Carte vivante |
| + | Tier 1 : Détecteur de Campagnes Coordonnées |
| + | Tier 2 : Explication Pédagogique + Surlignage Visuel |
| + | Tier 2 : Dossier Probatoire CRIET Case Bundle |
| + | Tier 2 : Automated Forensic Preservation |
| + | Tier 3 : Enrichissement Moteur Détection (7 catégories) |
| + | Tier 3 : Bouclier Familial WhatsApp 1-clic |
| + | Tier 4 : Mode Soutenance Live Threat Board |
| ~ | Roadmap v3 séquencée sur 6 semaines + soutenance |
| ~ | Titre mémoire et phrase d'ouverture définitifs |

---

## 1. VISION ET POSITIONNEMENT

### 1.1 Le Gap comblé (inchangé)
Il n'existe aujourd'hui **aucun outil accessible et intelligent** permettant à un Béninois ordinaire de vérifier préventivement un message suspect, ni aux PME de documenter une usurpation d'identité de façon exploitable par les autorités.

**BENIN CYBER SHIELD** est le chaînon manquant entre le citoyen/PME victime et les autorités (bjCSIRT, OCRC, Police Républicaine, CRIET).

### 1.2 Nouveau positionnement v3.0
> En v2.1, le projet était un **outil d'investigation interne (SOC)**.
> En v3.0, il devient une **infrastructure de renseignement national** :
> chaque signalement citoyen alimente une intelligence collective
> exploitable par l'ANSSI et la CRIET pour des décisions de politique publique.

### 1.3 Titre officiel du mémoire (v3.0)
**Titre :**
*BENIN CYBER SHIELD : Plateforme Nationale de Renseignement Opérationnel contre la Cyberfraude Mobile — Du Signal Citoyen à la Décision de Politique Publique*

**Sous-titre :**
*Conception et évaluation d'un prototype interopérable ANSSI/CRIET intégrant scoring NLP explicable, investigation OSINT asynchrone, intelligence collective territoriale et production probatoire forensique certifiée*

---

## 2. ACTEURS ET ESPACES (inchangé v2.1)

| Acteur | Rôle JWT | Espace | Accès |
|---|---|---|---|
| Citoyen | Aucun (public) | `/verify`, `/map`, `/live` | Sans login |
| Agent ANSSI/OCRC | ANALYST ou ADMIN | `/dashboard` + sous-pages | Après login |
| PME | SME | `/business/*` | Après login |

---

## 3. STACK TECHNIQUE (inchangé)

- **Backend** : FastAPI + SQLAlchemy Async + Alembic + Pydantic
- **Frontend** : React 19 + TypeScript + Vite + TanStack Query + Recharts + Leaflet.js (CDN)
- **Data** : PostgreSQL 15
- **Queue** : Redis 7 (queues + sliding windows campagnes)
- **Worker** : Playwright async (scraping OSINT + forensic preservation)
- **NLP** : spaCy fr_core_news_sm
- **Infra** : Docker Compose
- **Thème UI** : Dark slate-950, indigo/amber accents

---

## 4. PIPELINE FONCTIONNEL v3.0 (étendu)

```
Citoyen /verify
  → score_signal() [7→9 signaux]
  → highlighted_spans + recommendations retournés
  → Bouton WhatsApp sharing généré si HIGH/MEDIUM
  → [si suspicious_url] → Redis queue → Playwright → screenshot + DNS cert scellé
  → Incident créé
  → ThreatIndicators upsert + dérivation region
  → CampaignDetector.check() via Redis sorted set
  → [si campagne] → CampaignAlert créée → bandeau dashboard
  → Décision SOC → SHIELD dispatch → rapport PDF/JSON
  → Case Bundle ZIP (PDF + JSON + manifest + custody chain)
  → Données alimentent /threat-map + /live en temps réel
```

---

## 5. NOUVELLES ROUTES v3.0

| Route | Accès | Description |
|---|---|---|
| `/map` | PUBLIC | Carte nationale Leaflet.js |
| `/live` | PUBLIC | Live Threat Board (soutenance) |
| `/threat-map` | ANALYST | Dashboard Threat Intelligence |
| `GET /api/v1/threat-intel/dashboard` | ANALYST | Agrégats nationaux |
| `GET /api/v1/map/heatmap` | PUBLIC | Données carte [{region, count, dominant_type}] |
| `GET /api/v1/dashboard/intel/summary` | ANALYST | Campagnes actives |
| `GET /api/v1/dashboard/intel/export` | ANALYST | CSV/JSON/STIX-lite export |
| `GET /api/v1/reports/{uuid}/download/case-bundle` | ANALYST | ZIP probatoire CRIET |

---

## 6. NOUVEAUX MODÈLES DE DONNÉES v3.0

### 6.1 ThreatIndicators
```python
class ThreatIndicator(Base):
    id: UUID
    phone_hash: str          # SHA-256 du numéro (PII protégée)
    url_hash: str            # SHA-256 de l'URL
    raw_value_masked: str    # 016****090
    indicator_type: str      # 'phone' | 'url'
    occurrence_count: int    # incrémenté à chaque signalement
    danger_score: float      # score moyen pondéré
    region: str              # dérivé du préfixe numéro
    last_seen: datetime
    first_seen: datetime
    alert_triggered: bool    # True si seuil 3 atteint
```

### 6.2 CampaignAlert
```python
class CampaignAlert(Base):
    id: UUID
    campaign_type: str       # ex: 'MTN_IMPERSONATION'
    matched_rules: list      # règles en commun
    incident_count: int
    first_seen: datetime
    last_seen: datetime
    dominant_region: str
    status: str              # 'ACTIVE' | 'RESOLVED' | 'MONITORING'
```

---

## 7. LES 8 UPGRADES — SPÉCIFICATIONS COMPLÈTES

---

### 🔴 TIER 1 — UPGRADE 1 : Observatoire National Threat Intelligence + Carte Vivante
**Convergence : 4/4 sources**

**Quoi :**
- Nouveau router `backend/app/api/v1/endpoints/threat_intel.py`
- Table `ThreatIndicators` avec score dangerosité incrémental
- Seuil 3 signalements distincts → alerte critique + notification TanStack Query
- Champ `region` dérivé automatiquement du préfixe numéro béninois (dict 20 lignes)
- `GET /api/v1/threat-intel/dashboard` : top 10 numéros masqués, catégories, taux confirmation, tendances 7/30j
- `GET /api/v1/map/heatmap` → `[{region, count, dominant_type}]` auto-refresh 30s
- `GET /api/v1/dashboard/intel/export` → CSV/JSON + STIX-lite JSON pour bjCSIRT
- Page `/threat-map` : Leaflet.js CDN + GeoJSON Bénin + marqueurs rouge/amber/vert
- Page `/live` publique sans login : compteur + carte + dernier incident (écran soutenance)

**Fichiers impactés :**
- `backend/app/models/threat_indicator.py` ← NOUVEAU
- `backend/app/api/v1/endpoints/threat_intel.py` ← NOUVEAU
- `backend/app/services/intel_aggregator.py` ← NOUVEAU
- `backend/app/api/v1/endpoints/incidents.py` ← MODIFIÉ (upsert ThreatIndicators)
- `frontend/src/features/threat-map/ThreatMapPage.tsx` ← NOUVEAU
- `frontend/src/features/live/LivePage.tsx` ← NOUVEAU
- `alembic/versions/` ← NOUVELLE MIGRATION

**Score : 38/40**

---

### 🔴 TIER 1 — UPGRADE 2 : Détecteur de Campagnes Coordonnées
**Convergence : 3/4 sources**

**Quoi :**
- Service `campaign_detector.py` : Redis `ZRANGEBYSCORE` sur sorted set `campaign:signals`
- Seuil : 5+ incidents avec mêmes `matched_rules` en < 2 heures
- Corrélation avec `ThreatIndicators` : si numéro atteint 3 signalements + mêmes rules → priorité max
- Modèle `CampaignAlert` avec migration Alembic
- Hook post-création dans `incidents.py`
- Bandeau `CampaignBanner` dans `DashboardLayout.tsx` polling 60s

**Fichiers impactés :**
- `backend/app/services/campaign_detector.py` ← NOUVEAU
- `backend/app/models/campaign_alert.py` ← NOUVEAU
- `backend/app/api/v1/endpoints/incidents.py` ← MODIFIÉ
- `frontend/src/components/layout/CampaignBanner.tsx` ← NOUVEAU
- `frontend/src/layouts/DashboardLayout.tsx` ← MODIFIÉ
- `alembic/versions/` ← NOUVELLE MIGRATION

**Score : 34/40**

---

### 🟠 TIER 2 — UPGRADE 3 : Explication Pédagogique + Surlignage Visuel
**Convergence : 3/4 sources**

**Quoi :**
- `highlighted_spans: [{start, end, rule, label, color}]` dans `VerifySignalData`
- `trigger_spans` + `citizen_advice[]` retournés depuis `score_signal()`
- `str.find()` dans `score_signal()` pour localiser les mots déclencheurs
- `RECOMMENDATION_MAPPING` dans `detection.py` (même pattern qu'`EXPLANATION_MAPPING`)
- Composant `HighlightedMessage.tsx` : `<mark>` colorés + tooltip Shadcn
- Section "Que faire maintenant" sous le score
- Optionnel : 5 phrases d'alerte en fon (20 lignes)
- Recommandations retournées dans JSON `/verify` (compatible `/business/verify`)

**Fichiers impactés :**
- `backend/app/services/detection.py` ← MODIFIÉ
- `backend/app/schemas/signal.py` ← MODIFIÉ
- `frontend/src/features/verify/HighlightedMessage.tsx` ← NOUVEAU
- `frontend/src/features/verify/VerifySignalPanel.tsx` ← MODIFIÉ

**Score : 35/40**

---

### 🟠 TIER 2 — UPGRADE 4 : Dossier Probatoire CRIET "Case Bundle Signé"
**Convergence : 3/4 sources**

**Quoi :**
- Endpoint `GET /api/v1/reports/{report_uuid}/download/case-bundle` → ZIP
- ZIP : PDF forensique + snapshot JSON + manifest hash (hash de chaque fichier) + timeline custody
- Section 6 dans PDF : "RECOMMANDATIONS POUR LE CITOYEN" personnalisées par signal
- QR code dynamique (`qrcode` + `Pillow` + `ReportLab Image`) pointant vers `/verify`
- Table "Chaîne de Custody" dans PDF : timestamps UTC de chaque événement
- Bouton "Dossier CRIET" dans l'UI en plus du bouton PDF existant

**Fichiers impactés :**
- `backend/app/services/pdf_generator.py` ← MODIFIÉ (Section 6 + custody + QR)
- `backend/app/services/case_bundle.py` ← NOUVEAU
- `backend/app/api/v1/endpoints/reports.py` ← MODIFIÉ
- `frontend/src/features/reports/ReportsListPage.tsx` ← MODIFIÉ

**Score : 35/40**

---

### 🟠 TIER 2 — UPGRADE 5 : Automated Forensic Preservation
**Convergence : 1/4 sources (OPUS) — CONSERVÉ**

**Quoi :**
- Si `suspicious_url` détecté dans `score_signal()` → push Redis queue `osint_to_scan`
- Worker Playwright existant : screenshot + extraction certificat DNS + scellement géographique
- Stockage dans `/app/evidences_store/` existant
- Injection automatique en Section Annexe du PDF (`_is_image_evidence` existe déjà)
- Hash SHA-256 de la capture calculé immédiatement

**Fichiers impactés :**
- `backend/app/api/v1/endpoints/signals.py` ← MODIFIÉ (push Redis si suspicious_url)
- `scrapers/workers/worker.py` ← MODIFIÉ (gestion HTTP sans HTTPS)
- `backend/app/workers/results_consumer.py` ← MODIFIÉ (mapping alert_id → incident)
- `backend/app/services/pdf_generator.py` ← MODIFIÉ (vérifier mapping)

**Score : 37/40**

---

### 🟡 TIER 3 — UPGRADE 6 : Enrichissement Moteur Détection (7 catégories)
**Convergence : 1/4 sources (GEMINI) — CONSERVÉ**

**Quoi :**
- 5 nouvelles catégories dans `rules.json` :
  - `FAKE_RECRUITMENT` (faux emploi Dubaï/Canada + frais dossier)
  - `FAKE_LOTTERY` (faux gain Samsung/iPhone + frais livraison)
  - `SEXTORTION`
  - `PHISHING_BANCAIRE` (faux UBA/BOA)
  - `FAUX_DON_ONG`
- 2 nouveaux signaux dans `detection.py` :
  - `fcfa_amount_in_message` : regex `\d{1,3}[.\s]?\d{3}\s*(?:F\s*CFA|FCFA|francs)` → +20pts
  - `whatsapp_number` : regex `wa\.me|whatsapp` → +15pts
- Mise à jour `SIGNAL_WEIGHTS`, `CATEGORY_LABELS`, `EXPLANATION_MAPPING`, `RULE_MAPPING`, `RECOMMENDATION_MAPPING`
- Taxonomie alignée catégories CRIET pour statistiques judiciaires

**Fichiers impactés :**
- `backend/app/services/detection.py` ← MODIFIÉ
- `config/rules.json` ← MODIFIÉ

**Score : 34/40**

---

### 🟡 TIER 3 — UPGRADE 7 : Bouclier Familial WhatsApp 1-Clic
**Convergence : 1/4 sources (OPUS) — CONSERVÉ**

**Quoi :**
- Bouton "Prévenir ma famille" après résultat HIGH ou MEDIUM uniquement
- Template : *"⚠️ Alerte BENIN CYBER SHIELD : Ce numéro [XXX] est signalé arnaque. Ne communiquez jamais votre OTP. Rapport n°[UUID court]. Vérifiez : [URL]/verify"*
- `href="wa.me/?text=[encodeURIComponent(message)]"`
- Disponible dans `VerifySignalPanel.tsx` et `BusinessVerifyPage.tsx`

**Fichiers impactés :**
- `frontend/src/features/verify/VerifySignalPanel.tsx` ← MODIFIÉ

**Score : 32/40**

---

### ⚡ TIER 4 — UPGRADE 8 : Mode Soutenance "Live Threat Board 5 Minutes"
**Convergence : 4/4 sources**

**Script de démo :**

| Temps | Action | Écran | Impact |
|---|---|---|---|
| 0:00 | Phrase d'ouverture | `/live` projeté | Silence attentif |
| 0:45 | Coller message MTN dans `/verify` | Citoyen | Interface sobre |
| 1:15 | Score 90/100 HIGH + surlignages + tooltip | Citoyen | "Ma mère comprendrait" |
| 1:30 | Bouton WhatsApp → s'ouvre sur mobile | Mobile | Viralité visible |
| 1:45 | Clic "Signaler" + confirmation | Citoyen | Signalement complet |
| 2:00 | `/live` — point apparu sur carte Atlantique | Live Board | **SILENCE DANS LA SALLE** |
| 2:30 | Dashboard analyste — incident NEW | Analyste | Pont citoyen→SOC |
| 2:45 | Si 5+ signalements : bandeau rouge campagne | Analyste | Détection systémique |
| 3:15 | Décision CONFIRMED + dispatch SHIELD | Analyste | Workflow pro |
| 3:45 | Dossier CRIET téléchargé — PDF Section 6 + QR | Analyste | "Recevable CRIET" |
| 4:15 | `/threat-map` — stats nationales mises à jour | Intelligence | Outil politique publique |
| 4:45 | Conclusion intro → architecture | Jury | Transition fluide |

---

## 8. NOUVEAUX MODÈLES SCHEMAS API

### 8.1 VerifySignalData (étendu)
```python
class VerifySignalData(BaseModel):
    # Existant
    score: int
    risk_level: str
    categories_detected: list[str]
    explanation: str
    recurrence_count: int
    # NOUVEAU v3.0
    highlighted_spans: list[HighlightedSpan]   # Upgrade 3
    citizen_advice: list[str]                   # Upgrade 3
    recommendations: list[str]                  # Upgrade 3 + 4
    whatsapp_template: str | None               # Upgrade 7 (si HIGH/MEDIUM)

class HighlightedSpan(BaseModel):
    start: int
    end: int
    rule: str
    label: str
    color: str   # 'red' | 'orange' | 'amber'
```

---

## 9. ROUTES FRONTEND COMPLÈTES v3.0

```
/                     → Redirect selon rôle
/verify               → PUBLIC — Citoyen
/map                  → PUBLIC — Carte nationale Leaflet
/live                 → PUBLIC — Live Threat Board (soutenance)
/login                → PUBLIC

/dashboard            → ANALYST/ADMIN — Pilotage SOC
/threat-map           → ANALYST/ADMIN — Intelligence nationale
/incidents-signales   → ANALYST/ADMIN — Signalements citoyens
/alerts               → ANALYST/ADMIN — Alertes surveillance
/monitoring           → ANALYST/ADMIN — Surveillance continue
/ingestion            → ANALYST/ADMIN — Investigation manuelle
/reports              → ANALYST/ADMIN — Rapports + Case Bundle
/evidence             → ANALYST/ADMIN — Preuves forensiques
/settings             → ANALYST/ADMIN — Paramètres

/business/verify      → SME — Vérification
/business/monitoring  → SME — Surveillance filtrée
/business/alerts      → SME — Alertes filtrées
/business/reports     → SME — Rapports filtrés
```

---

## 10. MIGRATIONS ALEMBIC REQUISES v3.0

| # | Fichier | Contenu |
|---|---|---|
| M1 | `c1d2e3f4_add_threat_indicators.py` | Table `threat_indicators` + index |
| M2 | `d4e5f6a7_add_campaign_alerts.py` | Table `campaign_alerts` |
| M3 | `e7f8a9b0_add_region_on_incidents.py` | Colonne `region` sur `incidents` |

---

## 11. DÉPENDANCES PYTHON NOUVELLES

```
qrcode[pil]==7.4.2      # QR code PDF (Upgrade 4)
# Leaflet.js : CDN uniquement, zéro npm
```

---

## 12. TESTS REQUIS v3.0

```
tests/
├── test_threat_indicators.py       # upsert, seuil 3, masquage PII
├── test_campaign_detector.py       # sliding window Redis, CampaignAlert
├── test_detection_7_categories.py  # FAKE_RECRUITMENT, FCFA, WhatsApp signal
├── test_highlighted_spans.py       # positions correctes dans le message
├── test_case_bundle.py             # intégrité ZIP + manifest hash
├── test_forensic_preservation.py   # push Redis si suspicious_url
└── test_heatmap_endpoint.py        # agrégation région par préfixe
```

**Cible : 90+ tests passed (vs 66 actuels)**

---

## 13. ROADMAP v3.0

| Semaine | Upgrade | Livrables concrets |
|---|---|---|
| 1-2 | Upgrade 1 — Observatoire + Carte | `ThreatIndicators` + migrations + endpoints + `/threat-map` + `/live` |
| 3 | Upgrade 2 — Campagnes | `campaign_detector.py` + `CampaignAlert` + `CampaignBanner` |
| 4 | Upgrade 3 — Surlignage | `highlighted_spans` + `HighlightedMessage.tsx` + `RECOMMENDATION_MAPPING` |
| 5 | Upgrade 4 + 5 — Case Bundle + Forensic | `case_bundle.py` + Section 6 PDF + QR + branchement Playwright |
| 6 | Upgrade 6 + 7 — Moteur + WhatsApp | 7 catégories `rules.json` + bouton `wa.me` |
| Avant soutenance | Upgrade 8 — Mode démo | Seed 30 incidents réalistes + répétition script x5 + plan B offline |

---

## 14. CHECKLIST SOUTENANCE v3.0

- [ ] `/live` accessible publiquement sans login
- [ ] Carte Leaflet affiche les incidents par département
- [ ] Score 90/100 sur message MTN test avec surlignages
- [ ] Bouton WhatsApp fonctionnel sur mobile
- [ ] Bandeau rouge campagne après 5 signalements en rafale
- [ ] ZIP Case Bundle téléchargeable avec manifest intègre
- [ ] Screenshot Playwright dans PDF après signalement URL suspecte
- [ ] `/threat-map` affiche top numéros + tendances
- [ ] Docker cold-start < 90 secondes
- [ ] 90+ tests passed

---

## 15. PHRASE D'OUVERTURE DÉFINITIVE

> *"Le 23 janvier 2026, une habitante de Fidjrossè a perdu 47 000 FCFA en répondant à un SMS de 'Agent MTN Bénin'. Elle n'avait aucun outil pour vérifier ce message avant d'agir — parce que bjCSIRT protège les institutions de l'État, mais personne ne protège Madame Adjoua. Jusqu'à aujourd'hui. Et pendant que je vous parle, au moins 3 Béninois reçoivent ce même type de SMS. Le premier qui utilisera BENIN CYBER SHIELD protégera aussi les deux suivants."*

---

*PRD v3.0 — BENIN CYBER SHIELD — 07 mars 2026*
*Basé sur la fusion : Codex + Gemini 2.1 Pro + Claude Opus + Claude Sonnet*
