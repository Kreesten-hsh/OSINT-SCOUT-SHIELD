# GEMINI_CONTEXT - BENIN CYBER SHIELD

Derniere mise a jour: 2026-02-23
Statut global: Refonte v2.1 active, prototype L3 operationnel (roles + canaux + rapports + SHIELD simule)

Ce fichier est la source de verite operationnelle pour les agents IA qui travaillent sur ce repo.

## 1) Mission produit

BENIN CYBER SHIELD (OSINT-SCOUT & SHIELD) est un prototype L3 qui couvre tout le flux:

1. verification citoyenne
2. creation d'incident
3. collecte OSINT et preuves
4. decision SOC
5. action operateur simulee
6. generation rapport PDF/JSON

Objectif soutenance: demonstrer un flux bout-en-bout fiable, lisible et reproductible.

## 2) Scope reel actuel

### Canaux utilisateurs actifs
- Interface web citoyenne (`/verify`)
- Experience PWA (meme interface detectee en mode standalone)

### Espaces applicatifs
- Public (sans login): `/verify`
- SOC Analyst/Admin: `/dashboard` + modules SOC
- PME (role SME): `/business/verify`, `/business/monitoring`, `/business/alerts`, `/business/reports`

### Hors scope actuel
- Integration operateur telecom reelle
- Bot WhatsApp production
- Federation nationale multi-operateurs

## 3) Architecture technique de reference

- Backend: FastAPI + SQLAlchemy async + Alembic
- Frontend: React 19 + TypeScript + TanStack Query + Recharts
- DB: PostgreSQL 15
- Queue: Redis
- Scraper worker: Playwright
- Fichiers probatoires: `evidences_store`
- Observabilite: `/health`, `/metrics`, Sentry optionnel

## 4) Contrats API structurants

Endpoints coeur a considerer stables:

- `POST /api/v1/auth/login` (retourne `user.role`)
- `POST /api/v1/auth/change-password`
- `POST /api/v1/signals/verify`
- `POST /api/v1/incidents/report`
- `POST /api/v1/incidents/report-with-media`
- `GET /api/v1/incidents/citizen`
- `GET /api/v1/incidents/citizen/{id}`
- `PATCH /api/v1/incidents/{id}/decision`
- `POST /api/v1/shield/actions/dispatch`
- `POST /api/v1/operators/callbacks/action-status`
- `GET /api/v1/sources` (`scope=me`)
- `GET /api/v1/alerts` (`scope=me`)
- `GET /api/v1/reports` (`scope=me`)
- `GET /api/v1/dashboard/stats`

## 5) Regles produit et securite non negociables

- Zero secret dans Git
- Migrations Alembic obligatoires pour changements schema
- Pas de fake data en production demo
- RBAC obligatoire pour actions critiques
- SHA-256 conserve sur preuves/rapports
- Decision legale finale reste humaine

## 6) RBAC actuel (a respecter)

Blocage `SME` (403) sur:

- `PATCH /api/v1/incidents/{id}/decision`
- `POST /api/v1/shield/actions/dispatch`
- Tous les DELETE critiques (`alerts`, `incidents/citizen`, `sources`)
- Endpoints SOC sensibles (`dashboard`, `evidence`, `ingestion/manual`)

`ANALYST` et `ADMIN` gardent le comportement historique.

## 7) Ownership / filtrage donnees

- Colonnes `owner_user_id` sur `monitoring_sources` et `alerts`
- `scope=me` supporte sur listes (`sources`, `alerts`, `reports`, `incidents/citizen`)
- Pour role `SME`, le scope personnel est force cote backend

## 8) UX et demonstration

- `/verify` sans jargon technique cote citoyen
- Numero citoyen valide cote front au format beninois `0XXXXXXXXX`
- Confirmation de signalement via modal
- Ecran de succes citoyen non technique
- Dialogues de confirmation centralises via `ConfirmDialog`

## 9) Priorites d'execution (ordre)

1. Stabilite fonctionnelle (pas de regression)
2. Coherence documentaire (README/PRD/Plan/Deployment)
3. Fiabilite demo soutenance
4. Extensions de canaux (WhatsApp) et integrations externes

## 10) Definition "ready soutenance"

Une version est prete si:

- parcours citoyen -> SOC -> SHIELD -> rapport fonctionne sans patch manuel
- frontend build OK
- backend tests OK
- `/health` indique db=ok et redis=ok
- docs locales et page Notion sont alignees avec le code reel
