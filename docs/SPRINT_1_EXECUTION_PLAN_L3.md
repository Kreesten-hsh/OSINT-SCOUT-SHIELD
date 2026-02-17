# Sprint 1 Execution Plan - BENIN CYBER SHIELD (L3)

Version: v1.0  
Date: 2026-02-15  
Sprint length: 2 semaines  
Objectif sprint: livrer un premier flux E2E demonstrable avec contrat citoyen stabilise (`verify` + `report`) vers incident SOC (sans SHIELD complet)

## 1. Sprint Goal

A la fin du Sprint 1, on doit pouvoir demontrer:
1. un utilisateur soumet un message/lien suspect
2. l API genere un score via `signals/verify`
3. l API cree un incident via `incidents/report`
4. le worker OSINT collecte une preuve
5. l analyste voit l incident dans le dashboard
6. un rapport PDF est exportable

## 2. Scope Sprint 1 (In)

- Endpoint de verification citoyenne (`signals/verify`) minimal
- Endpoint de signalement incident (`incidents/report`) minimal
- Normalisation du flux incident vers le modele `Alert` existant
- canaux citoyens minimaux:
  - app mobile (PWA) page verify
  - interface web verify (meme UI responsive)
- Liaison front -> API pour creation/visualisation incident
- Stabilisation pipeline queue -> worker -> evidence
- Test E2E du flux detect -> scout -> report

## 3. Scope Sprint 1 (Out)

- SHIELD complet et callback operateur simule
- module transaction PME avance
- export STIX
- gestion multi-tenant avancee

## 4. Mapping Sur L Existant

Backend deja disponible:
- `POST /api/v1/ingestion/manual`
- `GET/PATCH /api/v1/alerts/*`
- `GET /api/v1/evidence/*`
- `POST /api/v1/reports/generate/{alert_uuid}`

Objectif Sprint 1:
- ajouter la couche `signals/verify` et `incidents/report` sans casser les routes existantes
- reutiliser le pipeline actuel comme socle de detection/investigation

## 5. Sprint Backlog (Tickets Executables)

## T1 - API Verify Citizen Signal
Type: Backend  
Priorite: P0  
Estimation: 1.5 jours

Description:
- Creer `POST /api/v1/signals/verify`.
- Entree: `message`, `url` optionnelle, `phone` optionnel, `channel`.
- Sortie: `risk_score`, `risk_level`, `explanation`, `should_report`.

Definition of Done:
- Endpoint documente dans OpenAPI.
- Validation Pydantic stricte.
- Reponse uniforme avec `APIResponse`.
- `channel` supporte au minimum: `MOBILE_APP`, `WEB_PORTAL`.
- Tests unitaires endpoint OK.

Fichiers cibles:
- `backend/app/api/v1/endpoints/signals.py` (nouveau)
- `backend/app/api/v1/api.py`
- `backend/app/schemas/` (nouveaux schemas)

## T2 - Detection Service (Regles + Explication)
Type: Backend  
Priorite: P0  
Estimation: 1.5 jours

Description:
- Extraire une logique de scoring reutilisable cote API (sans dependre du worker Playwright).
- Regles simples: mots cles phishing, urgence, demande code OTP, numero suspect.
- Fournir une explication lisible (top 3 facteurs).

Definition of Done:
- Service testable independamment.
- Score deterministic sur jeux de tests.
- Niveau de risque mappe: LOW/MEDIUM/HIGH.

Fichiers cibles:
- `backend/app/services/detection.py` (nouveau)
- `backend/app/schemas/` (types score/explication)

## T3 - Incident Report Endpoint
Type: Backend  
Priorite: P0  
Estimation: 1 jour

Description:
- Creer `POST /api/v1/incidents/report`.
- Creer un `Alert` systematiquement et pousser job Redis si URL HTTP(S) valide.
- Conserver compatibilite avec dashboard existant base sur `alerts`.

Definition of Done:
- Alert creee en DB avec `status=NEW`.
- Queue Redis recue correctement le job.
- Reponse endpoint contient `alert_uuid`, `queued_for_osint`, `risk_score_initial`.

Fichiers cibles:
- `backend/app/api/v1/endpoints/incidents.py`
- `backend/app/models/alert.py` (si ajustements mineurs)

## T4 - Citizen Mobile/Web Verify UI (MVP)
Type: Frontend  
Priorite: P0  
Estimation: 2 jours

Description:
- Ajouter une page `/verify` (mobile/web responsive) avec formulaire:
  - message suspect
  - url optionnelle
  - numero optionnel
- canal detecte automatiquement (pas de selection manuelle):
  - `WEB_PORTAL` si usage via interface web
  - `MOBILE_APP` si usage via app mobile PWA (mode standalone)
- Afficher resultat score + explication + bouton "Signaler".

Definition of Done:
- UI responsive mobile-first.
- Gestion erreurs API.
- Etat loading/success/failure.

Fichiers cibles:
- `frontend/src/features/` (nouvelle feature pwa)
- `frontend/src/App.tsx`
- `frontend/src/api/client.ts` / service dedie

## T5 - Dashboard Incident Readiness
Type: Frontend  
Priorite: P1  
Estimation: 1 jour

Description:
- Verifier que les incidents crees via `incidents/report` apparaissent dans `/alerts`.
- Ajouter badge/source claire pour incidents citoyens.

Definition of Done:
- Incident visible en liste + detail.
- Informations score et statut lisibles.

Fichiers cibles:
- `frontend/src/features/alerts/*`
- `frontend/src/features/investigation/*`

## T6 - Pipeline OSINT Stabilization
Type: Backend/Worker  
Priorite: P0  
Estimation: 1.5 jours

Description:
- Verifier robustesse `osint_to_scan` -> worker -> `osint_results` -> consumer.
- Corriger handling erreurs connues (payload invalide, URL invalide, timeout scraping).

Definition of Done:
- Logs d erreur explicites.
- Aucun crash silencieux du worker.
- Incident mis a jour meme en cas de scraping partiel.

Fichiers cibles:
- `scrapers/workers/worker.py`
- `backend/app/workers/result_consumer.py`

Implementation Sprint 1B (realise):
- Worker:
  - validation stricte du payload (`id` UUID + URL `http(s)`),
  - rapports standardises `COMPLETED` / `FAILED` avec `error_code`,
  - gestion defensives des JSON invalides et reconnexion Redis.
- Scraper engine:
  - persistance des captures dans `evidences_store/screenshots`,
  - transmission de `evidence_file_path` au consumer.
- Result consumer:
  - mise a jour incident meme en echec (`analysis_note` explicite),
  - marquage run `FAILED` / `COMPLETED`,
  - protection anti crash sur doublon de hash preuve.

Limite connue:
- `evidences.file_hash` est unique globalement. Si le hash existe deja, l evidence est sautee et une note est ajoutee a l alerte.

## T7 - E2E Demo Test Pack
Type: QA  
Priorite: P0  
Estimation: 1 jour

Description:
- Ecrire un script de verification manuelle/semiauto du flux demo.
- Jeux de cas: benign, suspect, phishing fort.

Definition of Done:
- Checklist de demo versionnee.
- 1 scenario de demo passe de bout en bout sans correction manuelle.

Fichiers cibles:
- `docs/DEMO_CHECKLIST_SPRINT1.md` (nouveau)
- tests backend minimaux si possible

## T8 - Documentation Update
Type: Documentation  
Priorite: P1  
Estimation: 0.5 jour

Description:
- Mettre a jour README avec nouvelles routes Sprint 1.
- Ajouter section "How to run Sprint 1 demo".

Definition of Done:
- README coherent avec implementation.
- Commandes de lancement testees localement.

## 6. Ordre D Implementation Recommande

1. T2 Detection Service  
2. T1 API Verify  
3. T3 Incident Report Endpoint  
4. T6 Pipeline stabilization  
5. T4 PWA page  
6. T5 Dashboard readiness  
7. T7 Demo test pack  
8. T8 Documentation

## 7. Definition Of Done (Sprint)

Le sprint est termine si:
- tous les tickets P0 sont "done"
- le flux E2E fonctionne sur machine locale
- au moins 1 scenario de demo est repetable en moins de 5 minutes
- aucune regression majeure sur routes existantes (`alerts`, `ingestion/manual`, `reports`)

## 8. Tests Obligatoires Sprint 1

- Test API `signals/verify`: payload valide/invalides
- Test creation incident via report
- Test queue processing (job present -> result consume)
- Test UI PWA verify: affichage score/explication
- Test generation PDF sur incident issu de report

## 9. Risks Sprint 1

| Risque | Impact | Mitigation |
|---|---|---|
| Ajout route casse API existante | blocage front | ajouter route sans modifier contrats existants |
| Scraping instable sur URL externes | demo fragile | utiliser URLs de test controlees |
| UI PWA trop lourde | retard | rester sur page unique MVP |
| dette tests | bugs en demo | checklist E2E obligatoire avant fin sprint |

## 10. Sprint 1 Deliverables

- Code backend: endpoint verify + service scoring
- Code frontend: page verify mobile/web
- Pipeline OSINT stabilise
- Flux incident visible dashboard
- Checklist demo Sprint 1
- Documentation mise a jour

## 11. Sprint 2 Preview (Non engage)

- SHIELD simule complet (dispatch + callback)
- bot WhatsApp (webhook/bridge) vers `signals/verify`
- workflow analyste -> action automatisee
- statut `blocked_simulated`
- scenario soutenance final 10 etapes

Note scope:
- WhatsApp est explicitement hors Sprint 1A

## 12. Clarifications Produit Integrees (Mise a jour)

- Le formulaire citoyen `/verify` impose maintenant `numero suspect` obligatoire.
- Le signalement citoyen accepte des captures d ecran (upload images) via `report-with-media`.
- Le dashboard SOC dispose d un onglet dedie `Incidents signales` (liste + detail mini dashboard).
- Les simulations operateur SHIELD sont retirees de `/alerts/{id}` et deplacees dans le detail des incidents signales.
