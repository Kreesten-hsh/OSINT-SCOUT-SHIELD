---
description: Debug scraper pipeline and evidence integrity
---

# Workflow : Diagnostic Pipeline Scraper

// turbo-all

## 1. Vérifier l'état des services

// turbo

- Statut conteneurs : `docker compose ps`
  // turbo
- Health Redis : `docker compose exec redis redis-cli ping`
  // turbo
- Health PostgreSQL : `docker compose exec db pg_isready -U osint_user`

## 2. Inspecter la queue Redis

// turbo

- Taille de la queue : `docker compose exec redis redis-cli llen osint_to_scan`
  // turbo
- Voir les éléments en attente : `docker compose exec redis redis-cli lrange osint_to_scan 0 -1`

## 3. Logs Worker

// turbo

- Logs scraper récents : `docker compose logs --tail=100 scraper`
  // turbo
- Logs API récents : `docker compose logs --tail=100 api`

## 4. Vérifier les evidences

// turbo

- Lister les evidences récentes : `ls -la evidences_store/`
- Vérifier intégrité SHA-256 : comparer le hash fichier avec le hash en DB
  // turbo
- Compter les evidences en DB : `docker compose exec db psql -U osint_user -d osint_db -c "SELECT COUNT(*) FROM evidences;"`

## 5. Test pipeline bout-en-bout

// turbo

- Trigger test manuel : `docker compose exec scraper python trigger_test.py`
  // turbo
- Suivre le traitement : `docker compose logs -f --tail=20 scraper`
- Vérifier que l'evidence apparaît dans la DB et dans `evidences_store/`
