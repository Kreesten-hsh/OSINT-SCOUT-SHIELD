# Demo Checklist - Sprint 1 (L3)

Version: v1.2  
Date: 2026-02-18  
Objectif: valider un flux E2E demonstrable, repetable et sans ambiguite entre `verify` (analyse) et `report` (creation incident).

## 1. Prerequis environnement

- Stack lancee: `docker compose up -d --build`
- API OK: `http://localhost:8000/health`
- Front OK: `http://localhost:5173/verify`
- Auth analyste validee sur `http://localhost:5173/login`
- Base saine (recommande avant demo): `docker compose down -v` puis `docker compose up -d --build`

Note operationnelle:
- Le service `api` applique deja `alembic upgrade head` au demarrage.
- En cas de drift local: `docker compose exec api alembic upgrade head`.

## 2. Pack T7 semi-auto (API smoke)

Script fourni:
- `scripts/demo_sprint1_smoke.ps1`
- `scripts/demo_confirm_block_smoke.ps1` (workflow rapide SOC -> SHIELD)

Execution:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/demo_sprint1_smoke.ps1
powershell -ExecutionPolicy Bypass -File scripts/demo_confirm_block_smoke.ps1 -Username "admin@osint.com" -Password "adminosint"
```

Resultats attendus:
- `POST /signals/verify` retourne un score exploitable
- `POST /incidents/report` sans URL retourne `queued_for_osint=false`
- `POST /incidents/report` avec URL HTTP(S) retourne `queued_for_osint=true`
- login analyste + lecture `GET /incidents/citizen` OK (si identifiants fournis)
- generation `POST /reports/generate/{alert_uuid}` OK (si identifiants fournis)
- workflow accelere:
  - `PATCH /incidents/{id}/decision` avec `CONFIRM`
  - `POST /shield/actions/dispatch` avec `BLOCK_NUMBER`
  - verification `BLOCKED_SIMULATED` + timeline SHIELD

## 3. Scenario E2E UI principal (soutenance)

1. Ouvrir `http://localhost:5173/verify`.
2. Saisir message suspect + numero suspect (obligatoire) + URL optionnelle.
3. Ajouter au moins une capture ecran (optionnel mais recommande pour la demo).
4. Cliquer `Verifier` et controler:
   - `risk_score`
   - `risk_level`
   - `explanation`
5. Cliquer `Signaler cet incident`.
6. Controler le retour:
   - `alert_uuid`
   - `status=NEW`
   - etat OSINT (`envoye en file` ou `sans URL crawlable`)
7. Se connecter analyste sur `http://localhost:5173/login`.
8. Ouvrir `http://localhost:5173/incidents-signales`.
9. Verifier la presence du signalement citoyen et ouvrir le detail `/incidents-signales/{id}`.
10. Controler le mini-dashboard incident:
    - stats numero (`reports_for_phone`, etc.)
    - captures associees
    - incidents lies
11. Option A (classique): appliquer une decision SOC (`CONFIRM`, `REJECT` ou `ESCALATE`) puis declencher une action SHIELD.
12. Option B (raccourci soutenance): cliquer `Confirmer + Bloquer (auto)`.
13. Generer un rapport depuis:
    - soit la liste `incidents-signales`
    - soit le detail incident
14. Ouvrir `http://localhost:5173/reports` et verifier le rapport cree.
15. Ouvrir le detail rapport et tester le telechargement PDF.

## 4. Cas de validation rapide

- Verify seul:
  - reponse 200
  - aucun effet de bord visible sur incidents sans action report
- Report sans URL:
  - incident cree
  - `queued_for_osint=false`
- Report avec URL HTTP(S):
  - incident cree
  - `queued_for_osint=true`
- Payload invalide (message trop court, numero absent):
  - reponse `422` coherente
- Endpoints citoyens publics:
  - `signals/verify`, `incidents/report`, `incidents/report-with-media` accessibles sans JWT

## 5. Cas robustesse pipeline (Sprint 1B)

- URL invalide (`notaurl`) en queue:
  - worker ne crash pas
  - incident conserve
  - note explicite `OSINT FAILED: INVALID_URL`
- JSON invalide dans `osint_to_scan`:
  - log `Invalid JSON payload dropped`
  - traitement des taches suivantes maintenu
- Tache valide apres erreur:
  - retour `COMPLETED` ou `FAILED` consomme
  - alerte mise a jour
  - preuve stockee si hash non duplique

## 6. Critere "demo ready"

- Flux complet execute en moins de 5 minutes
- Aucun blocage UI/API durant le parcours
- Incident citoyen visible en liste + detail
- Rapport genere et disponible dans `/reports`
- Scenario rejouable 2 fois de suite sans correction manuelle

## 7. Plan B (si scraping externe instable)

- Refaire la demo avec signalement sans URL
- Continuer jusqu a la decision SOC + generation rapport
- Expliquer que l objectif Sprint 1 est de prouver le contrat fonctionnel et la chaine probatoire, pas la qualite d une source web externe
