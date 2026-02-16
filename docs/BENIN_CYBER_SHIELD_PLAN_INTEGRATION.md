# Plan d Integration Strategique - BENIN CYBER SHIELD (Version Licence 3)

Version: v1.1-L3  
Date: 2026-02-15  
Portee: Prototype academique realiste, demonstrable, sans surdimensionnement institutionnel

## Resume Executif

Ce plan definit l integration de BENIN CYBER SHIELD en version Licence 3:
- application mobile citoyenne (PWA)
- interface web citoyenne
- dashboard SaaS (PME + analyste SOC)
- API centrale FastAPI
- orchestration SHIELD via operateur simule

Objectif pedagogique: demonstrer un flux complet Detect -> Scout -> Shield en environnement controle.

Objectif de soutenance: prouver une architecture logicielle solide, moderne et coherente, sans pretendre a un deploiement national reel.

## 1. Contexte Et Probleme Cible

Le projet repond aux cyber-arnaques mobiles frequentes au Benin:
- faux messages Mobile Money
- usurpation d identite (faux agents)
- arnaques SMS et web social engineering
- tentatives de fraude transactionnelle

Probleme a resoudre en L3:
- verifier rapidement un signal suspect
- transformer le signal en incident structuré
- produire des preuves tracables
- declencher une reponse automatisee simulee

## 2. Vision Produit L3

BENIN CYBER SHIELD est un prototype operationnel de plateforme intelligente de detection et reponse aux cyber-arnaques mobiles.

La vision nationale est conservee comme perspective long terme, mais la livraison L3 reste:
- simple
- demonstrable en live
- faisable techniquement dans un cadre academique

## 3. Positionnement Simplifie

Le projet combine 4 blocs:
- `DETECT`: scoring IA leger + regles explicables
- `SCOUT`: investigation OSINT + preuves
- `SHIELD`: orchestration d actions via operateur simule
- `SOC`: validation humaine et supervision via dashboard

Ce n est ni une simple app de verification, ni un simple scraper, ni un simple modele ML.

## 4. Architecture Cible L3 (Controlee)

```text
Canaux utilisateur Sprint 1
(App mobile PWA / Interface web)
      |
      v
API Centrale (FastAPI)
      |
      v
Moteur IA (regles + ML leger)
      |
      v
Redis queue
      |
      v
Module OSINT (Playwright)
      |
      v
PostgreSQL + evidences_store
      |
      v
Dashboard SaaS (React)
      |
      v
Module SHIELD (operateur simule + callback)
```

Principes:
- reutiliser au maximum l existant du repo
- evoluer sans casser les routes actuelles
- garder une stack unique, lisible et maintenable

## 5. Role Detaille Des Blocs

### Bloc A - DETECT
- verification d un message/lien/numero suspect
- score de risque 0-100
- explication simple du score (regles + indices)
- detection simple d anomalie transactionnelle (simulation PME)

### Bloc B - SCOUT
- collecte automatique de contenu cible (Playwright)
- extraction d indices techniques
- creation de preuves (capture + metadata + hash)
- liaison evidence <-> incident
- generation rapport PDF probatoire

### Bloc C - SHIELD (Simule)
- execution de playbooks automatiques
- API operateur simulee (pas d integration MTN/Moov reelle)
- changement d etat numero/compte en "blocked_simulated"
- callback vers API centrale

### Bloc D - Dashboard SaaS (PME + SOC)
- vue incidents et alertes
- details score IA et preuves
- decision analyste (valider/rejeter/escalader)
- declenchement action SHIELD

## 6. User Flow Consolide L3

| Acteur | Reel ou Simule | Role dans le prototype |
|---|---|---|
| Citoyen | Reel (app mobile + web) | Verifier et signaler |
| PME | Reel (SaaS) | Voir alertes et simulation risque transaction |
| Analyste SOC | Reel (SaaS) | Qualifier incidents et lancer SHIELD |
| Operateur | Simule | Executer action et callback |
| Autorite judiciaire | Simule | Exploiter rapport PDF exporte |

## 7. Role Reel De L IA En L3

IA utilisee pour:
- classification phishing texte
- score heuristique explicable
- detection simple anomalie transactionnelle
- similarite de messages (recurrence)
- aide a priorisation

IA non requise en L3:
- deep learning complexe
- federation multi-sites
- orchestration adaptative avancee

## 8. Ce Qui Est Obligatoire En Soutenance

Demonstration live bout en bout:
1. Message suspect soumis
2. Analyse IA lancee
3. Score affiche
4. Scraping OSINT declenche
5. Preuve stockee et hash calcule
6. Incident cree
7. Analyste valide incident
8. Playbook SHIELD declenche
9. Statut numero passe en bloque (simule)
10. Rapport PDF exporte

## 9. Exigences De Conformite Et Securite L3

- authentification JWT pour routes metier
- journalisation des actions critiques
- integrite des preuves via SHA-256
- separation des roles (citoyen, PME, analyste)
- conservation des logs necessaires a la demo

## 10. Feuille De Route L3 (Realiste)

### Phase 0 - Cadrage technique (1 semaine)
- verrouiller scope L3
- valider UX de demo
- definir jeux de donnees de test

### Phase 1 - Canaux citoyens (1-2 semaines)
- ecran app mobile (PWA) de verification message suspect
- interface web de verification/signalement
- historique personnel minimal

### Phase 2 - API Detect + Incident (1-2 semaines)
- endpoint verify
- endpoint report incident
- moteur score explicable

### Phase 3 - SCOUT + preuve + PDF (1-2 semaines)
- enchainement queue -> worker -> evidence
- hash et metadata
- generation PDF

### Phase 4 - Dashboard PME/SOC + SHIELD simule (1-2 semaines)
- vue incidents
- decision analyste
- dispatch playbook et callback simule

### Phase 5 - Hardening demo (1 semaine)
- tests de scenario soutenance
- correction UX et messages
- script de demo final

## 11. KPI Cibles L3

| KPI | Cible prototype |
|---|---|
| TPR detection basique | >= 80% sur dataset de test |
| FPR | <= 15% sur dataset de test |
| Latence verification message | <= 5 s |
| Temps de cycle detect->shield simule | <= 60 s |
| Disponibilite demo locale | 100% pendant soutenance |
| Integrite preuve | 100% des incidents critiques avec hash |

## 12. Risques L3 Et Mitigation

| Risque | Mitigation |
|---|---|
| Scope trop ambitieux | Gel strict du perimetre L3 |
| Temps insuffisant | Prioriser flux E2E avant features secondaires |
| Faux positifs elevés | Ajuster seuils + jeux de test representatifs |
| Demo instable | Script de demo pre-valide + data seed |
| Dependance externe | Operateur 100% simule localement |

## 13. Interfaces Et APIs Cibles L3

| Domaine | Endpoint cible | But |
|---|---|---|
| Verification citoyen multi-canal | `POST /api/v1/signals/verify` | score + explication (MOBILE_APP/WEB_PORTAL) |
| Signalement | `POST /api/v1/incidents/report` | creer incident |
| Decision analyste | `PATCH /api/v1/incidents/{id}/decision` | valider/rejeter |
| SHIELD dispatch | `POST /api/v1/shield/actions/dispatch` | declencher action simulee |
| Callback simule | `POST /api/v1/operators/callbacks/action-status` | retour execution |
| Export PDF/JSON | `GET /api/v1/reports/*` | preuve soutenance |

## 14. Definition De Reussite L3

Le projet est considere reussi si:
- le flux complet est fonctionnel et demonstrable
- le score IA est explicable
- la preuve est tracee et rapportable
- l orchestration SHIELD simulee marche avec callback
- le jury voit un prototype maitrise, realiste et coherent

## 15. Positionnement Final Pour Soutenance

Titre recommande:

**BENIN CYBER SHIELD - Prototype fonctionnel de plateforme intelligente de detection et reponse aux cyber-arnaques mobiles**

Message cle:
- vision ambitieuse
- implementation L3 realiste
- demonstration technique complete

Note roadmap:
- bot WhatsApp planifie en Sprint 2, hors scope Sprint 1
