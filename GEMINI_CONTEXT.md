# GEMINI_CONTEXT — OSINT-SCOUT & SHIELD

Dernière mise à jour : 13 février 2026
Statut global : Stabilisation, durcissement sécurité et préparation production

Ce fichier est la source de vérité opérationnelle pour les agents IA collaborant sur le projet.

## 1) Mission produit

OSINT-SCOUT & SHIELD est une plateforme SaaS de renseignement opérationnel orientée investigation.
Objectif : transformer des signaux web bruts en alertes exploitables, preuves traçables et rapports structurés.

## 2) Principes non négociables

- Zéro secret dans le dépôt Git (`.env`, clés, tokens)
- Décisions de risque basées sur des règles explicables
- Intégrité de preuve (horodatage, hash, traçabilité)
- Routes métier protégées par authentification JWT
- Aucun faux jeu de données en environnement de production

## 3) Référentiel technique actuel

- Backend : FastAPI, SQLAlchemy Async, Pydantic Settings
- Frontend : React 19, TypeScript, TanStack Query
- Queue : Redis (`osint_to_scan`, `osint_results`)
- Worker : Playwright scraper
- Stockage : PostgreSQL + `evidences_store`
- Observabilité : `/health`, `/metrics`, Sentry optionnel

## 4) Flux métier de référence

1. Ingestion (monitoring automatique ou saisie manuelle URL)
2. Publication du job vers `osint_to_scan`
3. Scraping et collecte de preuves
4. Retour résultat vers `osint_results`
5. Consumer backend vers base PostgreSQL
6. Traitement analyste : note, transition d’état, génération rapport

## 5) Contrat d’API (à respecter)

- Préfixe API : `/api/v1`
- Auth : `/api/v1/auth/login`
- Sources : `/api/v1/sources`
- Alertes : `/api/v1/alerts`
- Rapports : `/api/v1/reports`
- Dashboard : `/api/v1/dashboard/*`
- Santé/metrics : `/health`, `/metrics`

Règle : toute évolution backend doit vérifier le contrat côté frontend avant merge.

## 6) Standards d’ingénierie attendus

### Backend

- Pas de valeurs sensibles hardcodées
- Migrations Alembic obligatoires pour tout changement de schéma
- Gestion d’erreurs explicite avec messages API cohérents
- Logs structurés exploitables en production

### Frontend

- Typage strict TypeScript
- États UI synchronisés avec mutations API (sans rechargement manuel)
- Gestion d’erreur utilisateur claire (toasts, fallback)
- Pages critiques : Dashboard, Alertes, Investigation, Rapports

### DevOps

- Déploiement reproductible via Docker Compose
- Healthchecks services obligatoires
- Variables prod via `.env` hors dépôt
- Sauvegardes DB et evidences documentées

### Sécurité

- Rotation périodique des secrets
- CORS strict selon domaines autorisés
- Ports DB/Redis non exposés publiquement en prod
- Trafic HTTP protégé par TLS côté proxy

## 7) Priorités projet (ordre d’exécution)

- P0 : pipeline CI (lint, typecheck, tests, smoke)
- P0 : stratégie migration-first et contrôle drift schéma
- P1 : hardening réseau + reverse proxy TLS
- P1 : supervision incident + politique de backup/restore
- P2 : couverture E2E des parcours premium

## 8) Protocole de collaboration IA (Codex + Agent Antigravity)

- Partager une source unique de vérité (ce fichier + docs déploiement)
- Vérifier les impacts croisés front/back avant toute correction
- Documenter chaque changement structurel dans `DEPLOYMENT.md` et `README.md`
- Exécuter les vérifications locales avant déclaration “ready”
- Ne pas modifier les fichiers de politique/consignes sans demande explicite utilisateur

## 9) Critères “Release Ready”

Une release est considérée prête uniquement si :

- aucune régression fonctionnelle sur les parcours critiques
- build frontend valide
- API saine (`/health`) avec DB + Redis à `ok`
- authentification et autorisations testées
- génération et consultation de rapports validées
- documentation projet à jour
