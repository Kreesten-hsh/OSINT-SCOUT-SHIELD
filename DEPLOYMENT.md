# Guide de Déploiement Production — OSINT-SCOUT & SHIELD

Ce document décrit le standard de déploiement et d’exploitation du SaaS en environnement de production.
Il couvre la configuration, le lancement, la validation, l’observabilité, la sécurité et les opérations de maintenance.

## 1) Périmètre et architecture cible

Stack déployée via `docker-compose.yml` :

- `frontend` : interface React servie par Nginx (`:5173`)
- `api` : backend FastAPI (`:8000`)
- `db` : PostgreSQL 15 (données métier)
- `redis` : Redis 7 (cache + files de traitement)
- `scraper` : worker Playwright (consommation des jobs)

Stockage persistant :

- Volume Docker PostgreSQL : `postgres_data`
- Preuves et rapports : `./evidences_store`

## 2) Prérequis techniques

- Docker Engine `24+`
- Docker Compose `v2+`
- Serveur Linux recommandé (VPS/VM) ou hôte Windows stable
- DNS configuré si exposition internet
- Reverse proxy TLS recommandé (Traefik, Nginx, Caddy)

## 3) Préparation des variables d’environnement

Créer le fichier de configuration local :

```bash
cp .env.example .env
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

Variables critiques à définir avant mise en ligne :

- `SECRET_KEY`
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `POSTGRES_PASSWORD`
- `BACKEND_CORS_ORIGINS`
- `VITE_API_URL`
- `SENTRY_DSN` (recommandé)

Exemples de génération de secrets robustes :

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Règle sécurité : ne jamais versionner `.env`.

## 4) Déploiement initial

### 4.1 Build + lancement

```bash
docker compose up -d --build
```

### 4.2 Vérification des conteneurs

```bash
docker compose ps
docker compose logs -f api
```

### 4.3 Migration base de données

En production, appliquer les migrations Alembic :

```bash
docker compose exec api alembic upgrade head
```

## 5) Validation post-déploiement

### 5.1 Santé applicative

```bash
curl http://localhost:8000/health
```

Résultat attendu :

- `status = ok`
- `components.db = ok`
- `components.redis = ok`

### 5.2 Métriques

```bash
curl http://localhost:8000/metrics
```

### 5.3 Frontend

- URL locale : `http://localhost:5173`
- L’interface doit charger sans erreur de connexion API.

### 5.4 Authentification (smoke test)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@osint.com","password":"<mot_de_passe_env>"}'
```

## 6) Exploitation et runbook

Commandes utiles :

```bash
docker compose logs -f frontend
docker compose logs -f scraper
docker compose restart api
```

Redémarrage complet :

```bash
docker compose down
docker compose up -d
```

## 7) Sauvegarde et restauration

### 7.1 Sauvegarde PostgreSQL

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

### 7.2 Restauration PostgreSQL

```bash
docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < backup.sql
```

### 7.3 Sauvegarde des preuves

Sauvegarder régulièrement le dossier :

- `./evidences_store`

## 8) Durcissement sécurité (obligatoire en prod)

- Forcer HTTPS en frontal (certificats TLS valides)
- Restreindre l’exposition réseau de PostgreSQL et Redis
- Conserver `AUTO_CREATE_TABLES=False`
- Conserver `SQL_ECHO=False`
- Activer `LOG_JSON=True` pour logs structurés
- Roter les secrets administrateur et base de données
- Mettre en place une politique de backup automatisé + test de restauration
- Superviser les erreurs via `SENTRY_DSN`

## 9) Stratégie de mise à jour

Avant chaque release :

- valider lint/build frontend
- valider démarrage API + `/health`
- valider parcours critiques (login, alertes, rapports)

Déploiement :

1. construire la nouvelle image
2. appliquer migrations
3. redémarrer services
4. vérifier santé et métriques

Rollback :

1. revenir à la version précédente des images
2. restaurer base si migration non rétrocompatible
3. vérifier `/health` et flux métier

## 10) Checklist “Go Live”

- Variables `.env` sécurisées et revues
- Secrets non présents dans Git
- Services `docker compose ps` en état `healthy`
- `/health` et `/metrics` opérationnels
- Accès frontend et login validés
- Sauvegardes testées
- Monitoring et alerting actifs
