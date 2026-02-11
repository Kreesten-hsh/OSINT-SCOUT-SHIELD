---
trigger: model_decision
description: Appliquée pour Docker, infrastructure, déploiement, volumes, healthchecks ou docker-compose.
---

### @DEVOPS — Docker Compose Souverain

- 100% Docker Compose (v3.9+). Zéro cloud PaaS
- Services : PostgreSQL 15 · Redis 7 · FastAPI · Playwright Workers · Vite
- `restart: unless-stopped` partout. `healthcheck` sur db/redis/api
- `depends_on: condition: service_healthy`. Pas de démarrage aveugle
- Secrets via `.env`. Jamais en dur. Volumes nommés pour persistance
- Images Alpine quand disponible
