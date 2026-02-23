# PRD - BENIN CYBER SHIELD (Licence 3)

Version: 2.1-L3
Date: 2026-02-23
Statut: En execution (MVP fonctionnel, optimisation continue)
Produit: BENIN CYBER SHIELD - Detect, Scout, Shield

## 1. Product Summary

BENIN CYBER SHIELD est un prototype academique L3 qui detecte les signaux de cyber-arnaque, structure une investigation OSINT, puis orchestre une reponse operateur simulee.

Le produit est maintenant organise en 3 espaces:

- Canal citoyen public (`/verify`)
- Console SOC (ANALYST/ADMIN)
- Console PME (SME) avec vues filtrees

## 2. Problem Statement

Contexte cible (Benin):

- arnaques frequentes SMS/web social engineering
- usurpation d'identite d'agents operateurs
- faible verification preventive cote utilisateurs
- besoin de dossier probatoire clair pour traitement SOC

Le systeme doit:

- verifier rapidement un signal suspect
- convertir ce signal en incident exploitable
- enrichir avec preuves techniques
- permettre une action SOC puis SHIELD simulee
- produire un rapport telechargeable (PDF + JSON)

## 3. Product Goals

### 3.1 Goal principal
Demontrer en live un flux E2E stable:
`verify -> report -> SOC decision -> SHIELD dispatch -> report`.

### 3.2 Goals secondaires

- separation nette des roles (Citoyen, SME, Analyst/Admin)
- zero ambiguite API entre analyse (`verify`) et creation (`report`)
- UX citoyenne sans jargon technique
- tracabilite probatoire (hash + rapport)

## 4. Personas

1. Citoyen (public): verifie et signale.
2. PME (SME): surveille ses propres signaux/sources/rapports.
3. Analyste SOC (ANALYST/ADMIN): qualifie incidents et declenche SHIELD.
4. Operateur simule: execute action et callback.

## 5. Scope

### 5.1 In Scope (actuel)

- verification citoyenne web/PWA
- signalement avec captures ecran
- scoring explicable et recurrence count
- gestion incidents citoyens (liste/detail/stats)
- decision SOC et timeline SHIELD
- reports PDF/JSON telechargeables
- dashboard analytique avec graphiques
- espace PME en scope `me`

### 5.2 Out of Scope (phase actuelle)

- bot WhatsApp en production
- integration telecom reelle MTN/Moov
- federation nationale multi-operateurs
- infra HA enterprise

## 6. Current User Flows

### 6.1 Citizen flow
1. Utilisateur ouvre `/verify`.
2. Soumet message + numero suspect (obligatoire).
3. Recoit score + explications + recurrence.
4. Confirme le signalement en modal.
5. Incident cree (avec media optionnel).

### 6.2 SOC flow
1. Analyste consulte `/incidents-signales`.
2. Ouvre detail dossier, captures, stats numero.
3. Prend une decision SOC (confirm/reject/escalate).
4. Declenche une action SHIELD simulee.
5. Genere un rapport forensique.

### 6.3 SME flow
1. SME se connecte.
2. Est redirige vers `/business/verify`.
3. Consulte uniquement ses donnees (`scope=me`).
4. Telecharge ses rapports.

## 7. Functional Requirements

### 7.1 Verification / signalement citoyen
- FR-CIT-1: `POST /api/v1/signals/verify` sans ecriture DB.
- FR-CIT-2: `POST /api/v1/incidents/report` pour creation incident.
- FR-CIT-3: `POST /api/v1/incidents/report-with-media` pour captures.
- FR-CIT-4: recurrence count visible si > 0.

### 7.2 SOC
- FR-SOC-1: consultation incidents citoyens.
- FR-SOC-2: decision incident (`CONFIRM|REJECT|ESCALATE`).
- FR-SOC-3: dispatch SHIELD simule.
- FR-SOC-4: suppression en cascade dossier complet.

### 7.3 PME
- FR-SME-1: espace dedie 4 pages business.
- FR-SME-2: filtres server-side `scope=me`.
- FR-SME-3: lecture seule sur alertes business.

### 7.4 Reporting
- FR-REP-1: generation snapshot + hash SHA-256.
- FR-REP-2: PDF structure professionnelle (5 sections).
- FR-REP-3: telechargement JSON/PDF depuis UI.

## 8. API Contracts (Current)

| Endpoint | Methode | Statut |
|---|---|---|
| `/api/v1/auth/login` | POST | Implemented |
| `/api/v1/auth/change-password` | POST | Implemented |
| `/api/v1/signals/verify` | POST | Implemented |
| `/api/v1/incidents/report` | POST | Implemented |
| `/api/v1/incidents/report-with-media` | POST | Implemented |
| `/api/v1/incidents/citizen` | GET | Implemented |
| `/api/v1/incidents/citizen/{id}` | GET | Implemented |
| `/api/v1/incidents/{id}/decision` | PATCH | Implemented |
| `/api/v1/shield/actions/dispatch` | POST | Implemented |
| `/api/v1/operators/callbacks/action-status` | POST | Implemented |
| `/api/v1/reports/generate/{alert_uuid}` | POST | Implemented |

## 9. Data Model (Current)

Entites principales:

- `users` (role: ADMIN | ANALYST | SME)
- `alerts` (inclut `owner_user_id`, `phone_number`, `citizen_channel`)
- `analysis_results`
- `evidences`
- `reports`
- `monitoring_sources` (inclut `owner_user_id`)
- `scraping_runs`

## 10. Security and RBAC

- JWT obligatoire pour espaces prives
- RBAC backend via `require_role(["ANALYST", "ADMIN"])` sur endpoints critiques
- SME interdit sur decision SHIELD/SOC sensibles
- Secrets via variables d'environnement

## 11. Non-Functional Requirements

### 11.1 Performance
- Verify percu fluide cote UI (loader + etapes)
- Dashboard lisible avec skeleton loaders

### 11.2 Reliability
- queue Redis + worker asynchrone
- rapport telechargeable meme apres regeneration

### 11.3 Observability
- `/health` pour DB/Redis
- `/metrics` pour instrumentation

### 11.4 Evidence integrity
- hash SHA-256 sur fichiers/preuves
- snapshot JSON associe au PDF

## 12. KPI (Targets L3)

| KPI | Cible |
|---|---|
| Latence verification | <= 5 s |
| Flux E2E verify -> report -> SOC -> SHIELD | <= 60 s en demo |
| Integrite preuves (hash present) | 100% incidents critiques |
| Reussite generation rapport PDF/JSON | 100% dossiers eligibles |
| Faux positifs | Reduction iterative par calibration |

## 13. Acceptance Criteria

Le lot est valide si:

1. `/verify` fonctionne sans login.
2. signalement cree un incident exploitable SOC.
3. detail incident affiche preuves/stats/timeline.
4. decision + dispatch SHIELD fonctionnent sans erreur.
5. rapport PDF et JSON se telechargent correctement.
6. role SME reste cantonne a `/business/*`.
7. aucune regression sur routes existantes analyste/admin.

## 14. Risks and Mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Scope creep | Retard soutenance | Gel strict des canaux et backlog phase suivante |
| Integration externe indisponible | Blocage demo | Operateur simule maintenu en local |
| Regressions UI/UX | Demo fragile | Validation manuelle parcours critique a chaque lot |
| Derive documentaire | Incoherence jury | Sync README + PRD + Plan + Notion a chaque milestone |

## 15. Roadmap Next Steps

### Phase suivante (post-v2.1)

1. Stabilisation finale soutenance (perf + polish + checks)
2. Canal WhatsApp (prototype budget zero) en phase dediee
3. Extensibilite `IOCs/STIX` si fenetre temporelle disponible
4. Durcissement operations (backup/restore/script demo automatises)
