# OSINT-SCOUT & SHIELD

![Statut](https://img.shields.io/badge/Statut-D%C3%A9veloppement%20actif-0A84FF?style=for-the-badge)
![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-API-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Worker-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

Prototype L3 de plateforme intelligente de détection, investigation OSINT et réponse simulée contre les cyber-arnaques mobiles.

## 1) Vision produit

OSINT-SCOUT & SHIELD centralise tout le cycle d’investigation :

- surveillance continue de sources ciblées
- ingestion manuelle de cas urgents
- scoring et catégorisation orientés règles
- gestion complète du cycle de vie des alertes
- collecte de preuves techniques
- génération de rapports d’analyse

Le produit est conçu pour des environnements exigeants : fiabilité opérationnelle, traçabilité et qualité de restitution.

## 2) Fonctionnalités clés

- Canal citoyen public (mobile PWA + interface web) via `/verify`
- Contrat API citoyen séparé :
  - `POST /api/v1/signals/verify` (analyse seule)
  - `POST /api/v1/incidents/report` (création incident)
- Cycle d’alerte complet : `NEW -> IN_REVIEW -> CONFIRMED | DISMISSED`
- Notes analyste et transitions d’état synchronisées en temps réel UI/API
- Gestion des sources de monitoring (`/api/v1/sources`)
- Pipeline asynchrone Redis + Worker Playwright
- Gestion de preuves et artefacts de rapport
- Dashboard de pilotage (indicateurs métier)
- Endpoints d’observabilité (`/health`, `/metrics`)

## 3) Architecture de référence

```text
[Sources surveillées / Ingestion manuelle]
                  |
                  v
           API FastAPI (ingestion)
                  |
                  v
          Redis queue: osint_to_scan
                  |
                  v
        Worker Playwright (scraping)
                  |
                  v
          Redis queue: osint_results
                  |
                  v
       Consumer backend (normalisation)
                  |
                  v
      PostgreSQL + evidences_store (fichiers)
                  |
                  v
   Frontend Analyste (Dashboard/Alertes/Rapports)
```

## 4) Stack technique

- Backend : FastAPI, SQLAlchemy Async, Pydantic v2
- Frontend : React 19, TypeScript, Vite, TanStack Query
- Données : PostgreSQL 15
- Queue/Cache : Redis 7
- Scraping : Playwright
- Packaging : Docker Compose
- Observabilité : Prometheus metrics + Sentry (optionnel)

## 5) Démarrage rapide (Docker)

### 5.1 Préparer l’environnement

```bash
cp .env.example .env
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

### 5.2 Lancer la stack

```bash
docker compose up -d --build
```

### 5.3 Vérifier l’état

```bash
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

### 5.4 Accéder aux interfaces

- Vérification citoyenne (mobile/web) : `http://localhost:5173/verify`
- Dashboard analyste (auth) : `http://localhost:5173/login`
- API Docs : `http://localhost:8000/docs`

## 6) Variables d’environnement critiques

Avant toute exposition non locale, renseigner impérativement :

- `SECRET_KEY`
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `BACKEND_CORS_ORIGINS`
- `VITE_API_URL`
- `SENTRY_DSN` (recommandé)

Règle stricte : ne jamais committer `.env`.

## 7) Surface API principale

- `POST /api/v1/auth/login`
- `POST /api/v1/signals/verify`
- `POST /api/v1/incidents/report`
- `GET /api/v1/dashboard/stats/*`
- `GET|PATCH /api/v1/alerts/*`
- `POST /api/v1/ingestion/manual`
- `GET /api/v1/analysis/*`
- `GET|POST|PATCH|DELETE /api/v1/sources/*`
- `GET|POST /api/v1/reports/*`
- `GET /health`
- `GET /metrics`

## 8) Démo Sprint 1 (flux E2E rapide)

1. Ouvrir `http://localhost:5173/verify`.
2. Coller un message suspect et cliquer `Vérifier`.
3. Vérifier le score + l’explication.
4. Cliquer `Signaler cet incident`.
5. Noter l’UUID incident affiché.
6. Se connecter sur `http://localhost:5173/login`.
7. Vérifier l’incident dans la liste alertes.
8. Générer un rapport depuis le dashboard (si requis pour la soutenance).

## 9) Qualité et standards de livraison

Checklist avant release :

- lint frontend propre
- build frontend valide
- API démarrée sans erreur
- `/health` au vert (DB + Redis)
- parcours critiques testés : login, alertes, transitions, rapport
- documentation mise à jour

## 10) Sécurité et conformité opérationnelle

- Authentification JWT pour routes métier
- Gestion des secrets via variables d’environnement
- Healthchecks infra pour readiness
- Logs structurés (`LOG_JSON`) en production
- Sentry possible pour traçage incident
- Politique de backup DB + evidences obligatoire

## 11) Arborescence du dépôt

```text
backend/          API, modèles, logique métier, workers backend
frontend/         Interface React TypeScript
scrapers/         Worker Playwright
evidences_store/  Preuves et rapports générés
```

## 12) Déploiement et exploitation

Le guide opérationnel complet est disponible dans :

- `DEPLOYMENT.md`

## 13) Collaboration IA

Le contexte projet et les règles de collaboration agents sont maintenus dans :

- `GEMINI_CONTEXT.md`
