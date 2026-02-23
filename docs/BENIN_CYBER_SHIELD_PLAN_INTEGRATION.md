# Plan d Integration Strategique - BENIN CYBER SHIELD

Version: v2.1-L3 (as-built)
Date: 2026-02-23
Portee: Etat reel du projet + feuille de route d'achevement soutenance

## Resume executif

Ce document aligne la vision BENIN CYBER SHIELD avec l'etat reel du code actuellement en branche `vision-benin-cyber-shield`.

Le socle est operationnel pour un prototype L3 complet:

- Detect: verification/scoring citoyen
- Scout: collecte OSINT et gestion de preuves
- Shield: orchestration operateur simulee
- Gouvernance: role-based access + decision humaine SOC

## 1. Contexte et probleme cible

Le projet traite les cyber-arnaques mobiles et social engineering frequents au Benin, avec une approche pragmatique L3:

- verification rapide cote citoyen
- qualification SOC outillee
- production de preuves exploitables
- action simulee demonstrable sans dependance operateur reelle

## 2. Objectifs strategiques mesurables

1. Flux E2E demonstrable en soutenance sans intervention cachee.
2. Contrat API stable: `verify` (analyse) separe de `report` (creation).
3. Separation des espaces utilisateurs par role.
4. Rapport forensique telechargeable (PDF/JSON) avec hash.
5. UX lisible et professionnelle pour jury et parties prenantes.

## 3. Positionnement plateforme (etat actuel)

### 3.1 Detect
- `POST /api/v1/signals/verify`
- scoring explicable et categories detectees
- recurrence count sur numero signale

### 3.2 Scout
- pipeline Redis/Playwright actif
- preuves stockees dans `evidences_store`
- captures citoyennes hashées (SHA-256)

### 3.3 Shield
- decision incident (`CONFIRM|REJECT|ESCALATE`)
- dispatch action operateur simule
- callback statut avec secret partage

### 3.4 Gouvernance
- roles JWT: `ADMIN`, `ANALYST`, `SME`
- guards frontend et RBAC backend
- decision critique reste humaine

## 4. Architecture cible as-built

```text
PWA/Web Citoyen + Dashboard SOC + Espace PME
                     |
                     v
             FastAPI (/api/v1)
                     |
       +-------------+-------------+
       |                           |
       v                           v
 PostgreSQL                    Redis queues
(alerts/sources/reports)   (osint_to_scan/results)
       |                           |
       +-------------+-------------+
                     |
                     v
               Worker Playwright
                     |
                     v
            evidences_store (preuves/rapports)
```

## 5. Role detaille des blocs

### Bloc A - Detection temps reel

- verification message/url/numero
- regles ponderees pour OTP, urgence, usurpation, gain inattendu
- seuils de risque: LOW/MEDIUM/HIGH

### Bloc B - Investigation OSINT

- enqueue url crawlable vers Redis
- capture et normalisation preuve
- lien incident <-> evidence <-> report

### Bloc C - Reponse automatisee (simulee)

- transitions statut incident
- playbooks operateur simules
- historique des actions SHIELD

### Bloc D - Gouvernance et conformite

- ownership des donnees (`owner_user_id`)
- scope `me` pour vues PME
- suppression en cascade traçable

## 6. User-flow multi-acteurs consolide

| Acteur | Entree | Traitement | Sortie |
|---|---|---|---|
| Citoyen | Message suspect | Verify + report | Incident cree + score lisible |
| Analyste SOC | Incident citoyen | Decision + action SHIELD | Statut confirme/rejete/bloque simule |
| PME | Espace business | Consultation scope=me | Alertes/sources/rapports personnels |
| Operateur simule | Dispatch SHIELD | Callback execution | Incident mis a jour |

## 7. IA: role reel et limites

### IA active
- scoring explicable par regles ponderees
- categories detectees retournees API
- recurrence via comptage historique

### Limites
- pas de decision legale automatique
- pas de federated learning en phase actuelle
- pas de modele lourd multi-langue en production demo

## 8. Gouvernance SOC et responsabilites

| Activite | SOC | PME | Citoyen | Operateur simule |
|---|---|---|---|---|
| Verification initiale | I | I | R | I |
| Qualification incident | A/R | I | I | I |
| Action SHIELD | A/R | I | I | R |
| Rapport probatoire | A/R | C (scope me) | I | I |

## 9. Traçabilite probatoire et conformite

- hash SHA-256 sur preuves et snapshots
- rapports PDF/JSON telechargeables
- chaines de suppression nettoient artefacts associes
- logs et controles d'acces par role

## 10. Feuille de route de deploiement

### Phase A - termine (v2.1)
- separation roles frontend/backend
- espaces business operationnels
- UX verify citizen stabilisee
- rapports PDF v2 + telechargements

### Phase B - en cours
- finalisation soutenance (polish/perf)
- validation integrale des parcours demo
- stabilisation operationnelle locale/cloud

### Phase C - suivante
- canal WhatsApp (prototype budget zero)
- extension IOC/STIX (si fenetre planning)

## 11. KPI cibles

| KPI | Cible prototype |
|---|---|
| Latence verify | <= 5s |
| Flux detect->shield simule | <= 60s |
| Rapports telechargeables | 100% dossiers eligibles |
| Incidents critiques avec hash | 100% |
| Regressions front/back | 0 sur routes critiques |

## 12. Risques et mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Scope creep | retard | gel perimetre canaux et backlog phase suivante |
| Instabilite demo | echec soutenance | checklist runbook + seed + smoke script |
| Incoherence docs/code | confusion jury | sync README/PRD/Plan/Notion a chaque lot |
| Dependances externes | blocage execution | simulation operateur locale maintenue |

## 13. Plan pilote operateur beninois (mode simulation)

- API callback signee (`X-Operator-Secret`)
- statut execution (`SENT`, `EXECUTED`, `FAILED`)
- demonstration blocage simule sur incident confirme
- timeline d'actions visible dans detail incident

## 14. Modele economique (projection)

- B2G: cellule SOC nationale et outillage decisionnel
- B2B: espace PME surveille + reporting probatoire
- approche progressive: prototype L3 -> pilote institutionnel

## 15. Criteres de succes vers pilote institutionnel

1. Flux E2E stable en demo.
2. Separation des roles prouvee.
3. Rapports probatoires fiables.
4. Documentation technique coherente.
5. Transition roadmap claire vers canal WhatsApp et integrations externes.

## Annexe A - APIs et types effectifs

### Endpoints effectifs

- `POST /api/v1/signals/verify`
- `POST /api/v1/incidents/report`
- `POST /api/v1/incidents/report-with-media`
- `GET /api/v1/incidents/citizen`
- `GET /api/v1/incidents/citizen/stats/top-numbers`
- `PATCH /api/v1/incidents/{id}/decision`
- `POST /api/v1/shield/actions/dispatch`
- `POST /api/v1/operators/callbacks/action-status`
- `GET /api/v1/reports`
- `POST /api/v1/reports/generate/{alert_uuid}`

### Types effectifs

- `SignalChannel`: `MOBILE_APP | WEB_PORTAL`
- `UserRole`: `ADMIN | ANALYST | SME`
- `AlertStatus`: `NEW | IN_REVIEW | CONFIRMED | DISMISSED | BLOCKED_SIMULATED`
- `PlaybookActionType`: `BLOCK_NUMBER | SUSPEND_WALLET | ENFORCE_MFA | BLACKLIST_ADD | USER_NOTIFY`

## Annexe B - References internes

- `README.md`
- `DEPLOYMENT.md`
- `docs/PRD_BENIN_CYBER_SHIELD_v1.md`
- `render.yaml`
