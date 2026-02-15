---
description: Rules and evidence pipeline update workflow
---

# Workflow : Mise à Jour Règles & Pipeline Evidence

// turbo-all

## 1. Mettre à jour les règles

- Éditer `scrapers/config/rules.json` avec les nouveaux mots-clés, catégories ou seuils
- Documenter le rationnel de chaque modification (commentaire ou commit message)
- S'assurer que les expressions couvrent l'argot béninois pertinent

## 2. Tester le pipeline

// turbo

- Relancer le worker scraper : `docker compose restart scraper`
  // turbo
- Déclencher un test contrôlé : `docker compose exec scraper python trigger_test.py`
  // turbo
- Vérifier les logs worker : `docker compose logs -f --tail=50 scraper`

## 3. Vérifier les evidences

- Confirmer la présence dans `evidences_store/` :
  - Screenshot full-page (PNG)
  - Hash SHA-256 dans les métadonnées
  - Timestamp UTC irrévocable
  - Métadonnées d'analyse (score, catégorie, mots-clés trouvés)

## 4. Audit sécurité logs

- Review les logs pour fuites de données sensibles (emails, phones, tokens)
- S'assurer que les URLs suspectes sont loguées mais les contenus sensibles redactés

## 5. Documentation

- Si les seuils de risque changent, mettre à jour `GEMINI_CONTEXT.md`
- Commiter avec un message clair : `feat(rules): add [category] keywords for [context]`
