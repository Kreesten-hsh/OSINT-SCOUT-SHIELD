# PRD - BENIN CYBER SHIELD (Licence 3)

Version: 1.1-L3  
Date: 2026-02-15  
Statut: Ready for Development  
Produit: BENIN CYBER SHIELD - Prototype fonctionnel Detect, Scout, Shield

## 1. Product Summary

BENIN CYBER SHIELD est un prototype academique de plateforme anti-cyber-arnaques mobiles.

Perimetre L3:
- canaux citoyens Sprint 1: app mobile (PWA) + interface web
- Dashboard SaaS (PME + analyste SOC)
- API centrale FastAPI
- moteur IA leger + regles explicables
- pipeline OSINT et gestion de preuves
- orchestration SHIELD avec operateur simule

## 2. Problem To Solve

Les utilisateurs sont exposes a:
- arnaques SMS et messages frauduleux web/social
- usurpation d identite d agents services financiers
- fraudes transactionnelles simples

Le systeme doit permettre:
- verification rapide d un signal suspect
- creation et traitement d incidents
- collecte de preuves tracees
- reponse automatisee simulee

## 3. Product Goals (L3)

### 3.1 Goal principal
Livrer un flux complet demonstrable en live: signal suspect -> decision analyste -> action SHIELD simulee -> rapport probatoire.

### 3.2 Goals secondaires
- garantir explicabilite du score IA
- stabiliser la latence de verification
- offrir une UX claire pour citoyen et analyste

## 4. Personas

1. Citoyen
- verifier un message suspect via app mobile ou interface web
- signaler une arnaque depuis l un des 2 canaux

2. PME (compte SaaS)
- consulter alertes liees a son espace
- voir simulation risque transactionnel

3. Analyste SOC (demo academique)
- prioriser incidents
- valider/rejeter
- lancer SHIELD

4. Operateur simule
- recevoir action
- appliquer changement etat
- renvoyer callback

## 5. Scope

### 5.1 In Scope (MVP L3)
- verification + signalement citoyens via 2 canaux (app mobile, web)
- scoring IA texte (regles + modele leger)
- queue Redis et worker Playwright
- stockage incidents/preuves PostgreSQL + evidences_store
- dashboard incidents/preuves/decisions
- playbooks SHIELD simules
- export rapport PDF

### 5.2 Out of Scope (L3)
- integration reelle telecom nationale
- federation multi-operateurs
- haute disponibilite production
- automatisation legale sans humain

## 6. Product Principles

- Demonstration d abord (E2E prioritaire)
- Simplicite technique et clarte du code
- Explicabilite IA obligatoire
- Traçabilite probatoire obligatoire
- Actions critiques validees par humain

## 7. User Flows

## 7.1 Citizen verify flow
1. Citizen soumet message/lien/numero via app mobile ou web.
2. API calcule score.
3. UI affiche niveau risque + explication.
4. Citizen peut signaler en incident.

## 7.2 Incident investigation flow
1. Incident cree.
2. Job envoye dans Redis.
3. Worker collecte preuve via Playwright.
4. Evidence et hash stockes.
5. Incident enrichi visible dans dashboard.

## 7.3 SOC to SHIELD flow
1. Analyste ouvre incident.
2. Analyste valide menace.
3. SHIELD dispatch action vers operateur simule.
4. Operateur simule applique `blocked_simulated`.
5. Callback met a jour statut incident.
6. Rapport PDF exportable.

## 8. Functional Requirements

## 8.1 Canaux citoyens
- FR-CH-1: app mobile (PWA) pour verifier message suspect.
- FR-CH-2: interface web pour verifier et signaler.
- FR-CH-3: historique personnel cross-canal (compte utilisateur).
- FR-CH-4: recommandations de securite selon score.

## 8.2 API Detect
- FR-DET-1: `POST /api/v1/signals/verify`.
- FR-DET-2: score 0-100 + categorie probable.
- FR-DET-3: explication score (keywords/regles).
- FR-DET-4: endpoint simulation anomalie transaction PME.

## 8.3 SCOUT
- FR-SCT-1: enqueue job apres signalement.
- FR-SCT-2: scraping evidence.
- FR-SCT-3: hash SHA-256 et metadata.
- FR-SCT-4: lien evidence -> incident.
- FR-SCT-5: generation rapport PDF.

## 8.4 Dashboard SaaS
- FR-DASH-1: liste incidents (filtres statut/severite/date).
- FR-DASH-2: detail score, preuves, historique.
- FR-DASH-3: action decisionnelle analyste.
- FR-DASH-4: vue PME simplifiee.

## 8.5 SHIELD simule
- FR-SHD-1: endpoint dispatch action.
- FR-SHD-2: API operateur simulee.
- FR-SHD-3: callback statut execution.
- FR-SHD-4: journal d actions complet.

## 9. API Contracts (Target)

| Endpoint | Methode | Resultat attendu |
|---|---|---|
| `/api/v1/signals/verify` | POST | score + explication + severite |
| `/api/v1/incidents/report` | POST | incident cree + id |
| `/api/v1/detect/transactions/analyze` | POST | score transaction + statut |
| `/api/v1/incidents/{id}/decision` | PATCH | decision mise a jour |
| `/api/v1/shield/actions/dispatch` | POST | action lancee |
| `/api/v1/operators/callbacks/action-status` | POST | incident/action sync |
| `/api/v1/reports/generate/{incident_id}` | POST | rapport genere |

## 10. Data Model (Simplified)

- `Signal`
- `Incident`
- `DetectionResult`
- `Evidence`
- `ShieldAction`
- `OperatorCallback`
- `Report`

## 11. Non-Functional Requirements

### 11.1 Performance
- P95 verify <= 5s.
- P95 opening incident detail <= 2s (hors image lourde).

### 11.2 Reliability
- pipeline queue robuste en demo locale
- recovery simple sur redemarrage services

### 11.3 Security
- auth JWT
- roles minimum: CITIZEN, SME, ANALYST, ADMIN
- logs d actions sensibles
- validation du canal source (`MOBILE_APP`, `WEB_PORTAL`)

### 11.4 Evidence integrity
- hash SHA-256 pour chaque evidence
- lien evidence/report immutable dans base

## 12. IA Requirements (L3-credible)

Obligatoire:
- modele texte leger ou heuristique avancée
- explication du score
- seuils ajustables

Facultatif:
- isolation forest pour scenario transactionnel

Non necessaire:
- deep learning complexe
- federation
- XAI avancee multi-modeles

## 13. KPI And Acceptance Targets

| KPI | Cible L3 |
|---|---|
| TPR | >= 80% |
| FPR | <= 15% |
| Latence verify | <= 5s |
| E2E detect->shield simule | <= 60s |
| Incidents avec evidence hash | 100% critiques |
| Disponibilite demo | 100% en soutenance |

## 14. Demo Script (Mandatory)

1. Soumettre message suspect dans PWA.
1. Soumettre message suspect via app mobile ou web.
2. Afficher score IA + explication.
3. Signaler incident.
4. Declencher collecte OSINT.
5. Afficher preuve stockee + hash.
6. Ouvrir dashboard analyste.
7. Valider incident.
8. Lancer playbook SHIELD.
9. Voir statut `blocked_simulated`.
10. Exporter rapport PDF.

## 15. Milestones (6-8 semaines)

### M1 - Setup + cadrage (Semaine 1)
- structure repo, conventions, seeds demo

### M2 - PWA + API verify/report (Semaine 2-3)
- verification et signalement operationnels sur 3 canaux

### M3 - SCOUT + preuves + PDF (Semaine 4-5)
- pipeline queue complet

### M4 - Dashboard + SHIELD simule (Semaine 6-7)
- decision analyste + callback operateur simule

### M5 - stabilisation soutenance (Semaine 8)
- tests E2E et script demo final

## 16. Risks And Mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| Scope creep | retard | backlog strict MVP |
| Demo fragile | echec soutenance | rehearsal + seed data |
| faux positifs | perte credibilite | calibration seuils |
| bugs queue/worker | flux casse | tests E2E quotidiens |
| dette UX | incomprehension jury | simplifier parcours |

## 17. Definition Of Done (MVP L3)

Le MVP est termine si:
- endpoints critiques implementes et testes
- 3 canaux citoyens et dashboard couvrent le flux demo
- preuve et rapport fonctionnent
- SHIELD simule fonctionne avec callback
- demo complete executee sans intervention manuelle cachée

## 18. Next Step After PRD

Produire un plan Sprint 1 detaille avec tickets:
- backend API
- frontend app mobile/web
- frontend dashboard
- worker OSINT
- test E2E demo

Roadmap canal additionnel:
- bot WhatsApp reporte en Sprint 2 (hors scope Sprint 1)
