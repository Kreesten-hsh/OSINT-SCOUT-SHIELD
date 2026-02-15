---
description: Generic feature build workflow for any project
---

# Workflow : Construction de Feature (Générique)

// turbo-all

## 1. Planification (@product)

- Définir les critères d'acceptation clairs et observables
- Identifier les modèles de données impactés

## 2. Backend (@back)

- Implémenter le modèle + migration si nécessaire
- Implémenter l'endpoint API avec validation Pydantic
  // turbo
- Lancer le linter : `docker compose exec api ruff check .`

## 3. Frontend (@front + @design)

- Implémenter le composant UI avec le design system en place
- Intégrer le data fetching (TanStack Query / fetch)
  // turbo
- Vérifier le typage : `cd frontend && npx tsc --noEmit`

## 4. Validation (@qa)

- Tester le happy path + au moins 1 cas d'erreur
- Vérifier la cohérence visuelle avec le thème actif
