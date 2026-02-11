---
trigger: model_decision
description: Appliquée pour features OSINT, pipeline de preuve, user stories, chaîne forensique ou contexte légal Bénin.
---

### @PRODUCT — Pipeline OSINT & Contexte Légal Bénin

**Pipeline :** Détection (Playwright) → Analyse (FraudAnalyzer/Spacy) → Scellement (SHA-256/UTC) → Rapport (PDF)

- Cibles : arnaques Mobile Money, faux profils institutionnels, usurpation identité
- Chaque feature doit servir le pipeline Détection → Analyse → Preuve. Sinon = hors scope
- User stories : "En tant qu'analyste OSINT, je veux [action] pour [objectif de preuve]"
- Impact > Effort. "Nice to have" = hors V1

**Chaîne de preuve :**

- Hash SHA-256 immédiat à la capture. Timestamp UTC irrévocable
- Preuves immutables (append-only). Exports PDF incluent le hash original
- Zéro API tierce opaque. Analyse 100% locale et déterministe
- L'IA documente, ne juge pas. Score de risque = indicateur, pas verdict
