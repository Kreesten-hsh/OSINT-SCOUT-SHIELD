# Guide de Deploiement - BENIN CYBER SHIELD

Version: 2.1
Date: 2026-02-23

Ce document couvre:

- deploiement local Docker Compose
- verification operationnelle
- deploiement Render via blueprint
- runbook d'exploitation

## 1) Architecture deploiement

Services applicatifs:

- `frontend` (React + Nginx) sur `:5173`
- `api` (FastAPI) sur `:8000`
- `scraper` (worker Playwright)
- `db` (PostgreSQL 15) sur `:5433 -> 5432`
- `redis` (Redis 7) sur `:6379`

Stockage persistant:

- volume Docker PostgreSQL
- dossier `./evidences_store` (preuves + rapports)

## 2) Prerequis

- Docker Desktop/Engine demarre
- Docker Compose v2+
- fichier `.env` configure

## 3) Configuration `.env`

Creer `.env` depuis le modele:

```bash
cp .env.example .env
```

Variables minimales a verifier:

- `SECRET_KEY`
- `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD`
- `AUTH_ANALYST_EMAIL` / `AUTH_ANALYST_PASSWORD`
- `AUTH_SME_EMAIL` / `AUTH_SME_PASSWORD`
- `POSTGRES_PASSWORD`
- `SHIELD_OPERATOR_SHARED_SECRET`
- `BACKEND_CORS_ORIGINS`
- `VITE_API_URL`

Regle: ne jamais versionner `.env`.

## 4) Deploiement local

### 4.1 Build et lancement

```bash
docker compose up -d --build
```

### 4.2 Verifications minimales

```bash
docker compose ps
curl http://localhost:8000/health
curl http://localhost:8000/metrics
```

Attendu:

- API accessible
- `db=ok` et `redis=ok` sur `/health`

### 4.3 Migrations

Le conteneur API lance `alembic upgrade head` au demarrage.

Commande de secours:

```bash
docker compose exec api alembic upgrade head
```

## 5) Endpoints de controle

- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Front: `http://localhost:5173`
- Verify citoyen: `http://localhost:5173/verify`

## 6) Runbook operationnel

Logs:

```bash
docker compose logs -f api
docker compose logs -f scraper
docker compose logs -f frontend
```

Redemarrage service:

```bash
docker compose restart api
```

Redemarrage stack:

```bash
docker compose down
docker compose up -d --build
```

## 7) Sauvegarde et restauration

### Sauvegarde PostgreSQL

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

### Restauration PostgreSQL

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup.sql
```

### Sauvegarde artefacts

- archiver `./evidences_store`

## 8) Deploiement Render (blueprint)

Le fichier `render.yaml` provisionne:

- `benin-cyber-shield-api` (web, docker)
- `benin-cyber-shield-worker` (worker, docker)
- `benin-cyber-shield-web` (static)
- `benin-cyber-shield-db` (PostgreSQL)
- `benin-cyber-shield-redis` (Redis)

Procedure:

1. Push branche `vision-benin-cyber-shield`.
2. Ouvrir Render Blueprint depuis le repo.
3. Renseigner les variables `sync:false` (mots de passe, secrets).
4. Lancer le deploy.
5. Verifier endpoint health de l'API Render.

## 9) Durcissement securite

Avant exposition publique:

- CORS strict vers domaine frontend
- rotation des secrets
- `AUTO_CREATE_TABLES=False`
- TLS force via Render/proxy
- restriction acces DB/Redis hors runtime

## 10) Checklist go-live

- `.env` complete et securisee
- `docker compose ps` sain
- `/health` OK
- login 3 roles valide
- verify/report/decision/shield/report testes
- sauvegardes DB + evidences testees
- docs README/PRD/Plan a jour
