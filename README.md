# BENIN CYBER SHIELD

<p align="left">
  <img src="https://img.shields.io/badge/Version-v2.1_L3-0f172a?style=for-the-badge" alt="version"/>
  <img src="https://img.shields.io/badge/Status-Functional_Prototype-0ea5e9?style=for-the-badge" alt="status"/>
  <img src="https://img.shields.io/badge/Architecture-Detect_%7C_Scout_%7C_Shield-1d4ed8?style=for-the-badge" alt="architecture"/>
  <img src="https://img.shields.io/badge/Roles-CITIZEN_%7C_SME_%7C_SOC-334155?style=for-the-badge" alt="roles"/>
</p>

Plateforme intelligente de detection, investigation OSINT et reponse simulee contre les cyber-arnaques mobiles.

Ce repository contient un prototype **L3 operationnel** qui demontre un flux complet:

`Verification citoyenne -> Incident -> Investigation -> Decision SOC -> Action SHIELD simulee -> Rapport PDF/JSON`

---

## 1) C'est quoi ce projet ?

**BENIN CYBER SHIELD** est une solution logicielle orientee cyberdefense civile qui vise a:

- aider les citoyens a verifier un message suspect avant de se faire arnaquer
- outiller les analystes SOC pour qualifier et traiter les incidents
- fournir aux PME un espace dedie avec leurs donnees filtrees
- produire des preuves exploitables (captures, hash, rapports)

Le projet suit la logique produit:

- **Detect**: detecter et scorer le risque
- **Scout**: collecter/croiser les preuves
- **Shield**: orchestrer une reponse operateur simulee

---

## 2) Probleme cible et solution proposee

### Probleme

Les arnaques mobiles (phishing, faux agents, demandes OTP, urgence artificielle) provoquent des pertes rapides et une reponse tardive.

### Solution

BENIN CYBER SHIELD propose une architecture modulaire qui transforme un simple signal utilisateur en dossier d'incident exploitable:

1. verification immediate du signal
2. creation incident structuree
3. collecte OSINT asynchrone
4. decision SOC tracee
5. action SHIELD simulee
6. generation rapport forensique

---

## 3) Valeur par acteur

| Acteur | Valeur cle |
|---|---|
| Citoyen | Verification preventive + signalement simplifie |
| PME | Vues personnelles (`scope=me`) sur alertes/sources/rapports |
| Analyste SOC | Pilotage incident, decision, orchestration SHIELD |
| Autorite (demo) | Rapport PDF/JSON avec hash d'integrite |

---

## 4) Modules fonctionnels

### Detect

- `POST /api/v1/signals/verify`
- scoring explicable (OTP, urgence, usurpation, etc.)
- compteur de recurrence sur numero deja signale

### Scout

- queue Redis (`osint_to_scan`, `osint_results`)
- worker Playwright pour collecte
- stockage preuves dans `evidences_store`

### Shield (simulation operateur)

- `PATCH /api/v1/incidents/{id}/decision`
- `POST /api/v1/shield/actions/dispatch`
- `POST /api/v1/operators/callbacks/action-status`

### Reporting

- `POST /api/v1/reports/generate/{alert_uuid}`
- telechargement PDF et JSON
- hash SHA-256 conserve

---

## 5) Architecture as-built

```text
Canaux utilisateur (verify public + espaces SOC/PME)
                         |
                         v
                FastAPI (/api/v1)
                         |
        +----------------+----------------+
        |                                 |
        v                                 v
   PostgreSQL                        Redis queues
(alerts, sources, reports, users)   (osint_to_scan/results)
        |                                 |
        +----------------+----------------+
                         |
                         v
                   Worker Playwright
                         |
                         v
               evidences_store (files)
```

---

## 6) Espaces front et acces

| Espace | Auth | Routes principales |
|---|---|---|
| Citoyen | Public | `/verify` |
| SOC | `ANALYST` / `ADMIN` | `/dashboard`, `/alerts`, `/incidents-signales`, `/reports`, `/monitoring`, `/ingestion`, `/settings` |
| PME | `SME` | `/business/verify`, `/business/monitoring`, `/business/alerts`, `/business/reports` |

Regles de redirection:

- non connecte -> `/verify`
- SME connecte -> `/business/verify`
- ANALYST/ADMIN connecte -> `/dashboard`

---

## 7) Etat d'avancement v2.1

### Deja livre

- separation stricte `verify` vs `report`
- RBAC backend cible + guards frontend par role
- ownership `owner_user_id` + filtres `scope=me`
- dashboard analytique (graphiques Recharts)
- incidents citoyens (liste/detail/stats)
- suppressions en cascade (incident/alerte + preuves + rapports)
- UX citoyenne sans jargon technique

### Non livre (volontaire)

- bot WhatsApp production
- integration operateur telecom reelle
- federation nationale multi-operateurs

---

## 8) Stack technique

| Couche | Technologies |
|---|---|
| Backend | FastAPI, SQLAlchemy Async, Alembic, Pydantic |
| Frontend | React 19, TypeScript, Vite, TanStack Query, Recharts |
| Data | PostgreSQL 15 |
| Messaging | Redis 7 |
| OSINT Worker | Playwright |
| Infra | Docker Compose, Render Blueprint |

---

## 9) Quickstart local

### 9.1 Preparer l'environnement

```bash
cp .env.example .env
```

### 9.2 Lancer la stack

```bash
docker compose up -d --build
```

### 9.3 Verifier la sante

```bash
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

### 9.4 URLs utiles

- Frontend: `http://localhost:5173`
- Verify citoyen: `http://localhost:5173/verify`
- Login: `http://localhost:5173/login`
- API docs: `http://localhost:8000/docs`

---

## 10) API highlights

```text
POST /api/v1/auth/login
POST /api/v1/auth/change-password
POST /api/v1/signals/verify
POST /api/v1/incidents/report
POST /api/v1/incidents/report-with-media
GET  /api/v1/incidents/citizen
GET  /api/v1/incidents/citizen/{id}
PATCH /api/v1/incidents/{id}/decision
POST /api/v1/shield/actions/dispatch
POST /api/v1/operators/callbacks/action-status
GET  /api/v1/reports
POST /api/v1/reports/generate/{alert_uuid}
GET  /api/v1/dashboard/stats
GET  /health
GET  /metrics
```

---

## 11) Deploiement

Le blueprint Render est deja versionne dans `render.yaml`:

- API (docker)
- worker scraper (docker)
- frontend static
- PostgreSQL + Redis manages

Procedure detaillee: voir `DEPLOYMENT.md`.

---

## 12) Documentation projet

- `docs/PRD_BENIN_CYBER_SHIELD_v1.md`
- `docs/BENIN_CYBER_SHIELD_PLAN_INTEGRATION.md`
- `GEMINI_CONTEXT.md`
- `DEPLOYMENT.md`

---

## 13) Vision roadmap

- Stabilisation finale soutenance (qualite + robustesse)
- Extension canal WhatsApp (phase dediee budget minimal)
- Extension IOC/STIX selon fenetre planning

---

## 14) Licence et usage

Prototype academique L3. Usage pedagogique et demonstration.
