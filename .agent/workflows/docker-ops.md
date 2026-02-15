---
description: Docker Compose lifecycle management
---

# Workflow : Opérations Docker

// turbo-all

## 1. Build & démarrage

// turbo

- Build et démarrage : `docker compose up -d --build`
  // turbo
- Vérifier le statut : `docker compose ps`

## 2. Logs

// turbo

- Logs API : `docker compose logs -f --tail=100 api`
  // turbo
- Logs Scraper : `docker compose logs -f --tail=100 scraper`
  // turbo
- Logs tous services : `docker compose logs -f --tail=50`

## 3. Redémarrage sélectif

// turbo

- Redémarrer l'API : `docker compose restart api`
  // turbo
- Redémarrer le scraper : `docker compose restart scraper`

## 4. Arrêt & nettoyage

// turbo

- Arrêt propre : `docker compose down`
  // turbo
- Arrêt + suppression volumes : `docker compose down -v --remove-orphans`
  // turbo
- Nettoyage système Docker : `docker system prune -f`

## 5. Base de données

// turbo

- Shell PostgreSQL : `docker compose exec db psql -U osint_user -d osint_db`
  // turbo
- Appliquer migrations : `docker compose exec api alembic upgrade head`
  // turbo
- Créer migration : `docker compose exec api alembic revision --autogenerate -m "description"`
