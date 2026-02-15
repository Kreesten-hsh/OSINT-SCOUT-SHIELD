---
description: OSINT-SCOUT & SHIELD feature delivery workflow
---

# Workflow : Livraison Feature OSINT-SCOUT

// turbo-all

## 1. Planification (@product)

- Définir la User Story : "En tant qu'analyste OSINT, je veux [action] pour [objectif de preuve]"
- Lister les critères d'acceptation observables dans l'UI
- Vérifier que la feature sert le pipeline Détection → Analyse → Preuve

## 2. Schema & API (@back)

- Concevoir le modèle SQLAlchemy si nécessaire
  // turbo
- Créer la migration Alembic : `docker compose exec api alembic revision --autogenerate -m "description"`
  // turbo
- Appliquer la migration : `docker compose exec api alembic upgrade head`
- Implémenter l'endpoint FastAPI avec Pydantic schemas (request + response)
- Ajouter la validation Pydantic et les error handlers (400/404/422)

## 3. Interface (@front + @design)

- Implémenter le composant React avec Shadcn/ui
- Intégrer TanStack Query (`useQuery`/`useMutation`) pour le data fetching
- Respecter le thème "Deep Void Enterprise" (dark slate-950, indigo accents)
- Vérifier le typage TypeScript strict (zéro `any`)

## 4. Validation (@qa)

// turbo

- Lancer le linter backend : `docker compose exec api ruff check .`
  // turbo
- Lancer le type-check frontend : `cd frontend && npx tsc --noEmit`
- Tester le happy path manuellement via l'UI
- Tester au moins 1 cas d'erreur (input invalide, unauthorized)

## 5. Documentation

- Mettre à jour `GEMINI_CONTEXT.md` si l'architecture change
- Mettre à jour `rules.json` si de nouvelles règles d'analyse sont ajoutées
