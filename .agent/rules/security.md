---
trigger: model_decision
description: Appliquée pour auth, JWT, CORS, sécurité API, intégrité des données ou gestion des evidences.
---

### @SECURITY — Sécurité API & Intégrité Données

**API :**

- JWT `python-jose` (30min). Middleware auth sur toutes routes sauf `/health`, `/login`
- CORS origines explicites. Input sanitization Pydantic systématique
- Rate limiting sur `/ingestion` et `/login`
- Interdit : `eval()`, `exec()`, SQL brut interpolé, `pickle`, `yaml.load()` unsafe

**Données :**

- Preuves immutables après capture (append-only). Pas de DELETE sur evidences
- Zéro Fake Data. Faker/factory_boy interdit. Payloads réalistes uniquement
- Hash SHA-256 + timestamp UTC stockés en DB ET métadonnées fichier
- Pas de données sensibles dans les logs (passwords, tokens, PII)
- `created_at` auto, jamais modifiable. Soft delete + archive uniquement
- Redis : TTL obligatoire. Nettoyer queues après traitement
