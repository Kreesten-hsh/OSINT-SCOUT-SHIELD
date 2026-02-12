# Guide de Deploiement Production (VPS/Serveur)

Ce guide decrit une base de deploiement SaaS pour OSINT-SCOUT & SHIELD.

## 1. Pre-requis

- Docker Engine + Docker Compose v2
- Domaine pointe vers le serveur (optionnel mais recommande)
- Fichier `.env` renseigne avec des secrets forts

## 2. Configuration

```bash
cp .env.example .env
```

Variables critiques a modifier avant production:

- `SECRET_KEY`
- `POSTGRES_PASSWORD`
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `BACKEND_CORS_ORIGINS`
- `VITE_API_URL`

## 3. Lancement

```bash
docker compose up -d --build
docker compose logs -f api
```

## 4. Verification

- API health: `GET /health` doit retourner `db=ok` et `redis=ok`
- Metrics: `GET /metrics`
- Login: `POST /api/v1/auth/login`
- Frontend: `http://localhost:5173` (contenu statique servi par Nginx)

## 5. Durcissement recommande

- Reverse proxy (Nginx/Traefik) avec TLS
- Rotation des secrets (`SECRET_KEY`, credentials admin)
- Sauvegarde reguliere PostgreSQL
- Separation stricte des environnements (dev/staging/prod)
