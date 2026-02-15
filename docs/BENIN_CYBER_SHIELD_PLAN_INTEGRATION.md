# Plan d'Integration Strategique - BENIN CYBER SHIELD (Detect, Scout & Orchestrate)

Version: v1.0  
Date: 2026-02-14  
Portee: Vision + architecture + feuille de route strategique (niveau master)

## Resume Executif

Ce document formalise l'integration de la nouvelle vision du projet vers une plateforme nationale unifiee de detection, investigation OSINT et orchestration automatisee contre les cyber-arnaques mobiles au Benin.

Le plan s'appuie sur l'existant technique:
- Backend FastAPI et API v1 modulaire
- Pipeline asynchrone Redis (`osint_to_scan`, `osint_results`)
- Worker Playwright pour la collecte
- Stockage PostgreSQL + `evidences_store`
- Generation de preuves et rapports (hash SHA-256 + PDF)
- Front SOC analyste deja operationnel (dashboard, alertes, evidence, rapports, monitoring)

Objectif de transformation: passer d'une plateforme OSINT SaaS solide a un ecosysteme national multi-acteurs (citoyen, PME, operateurs telecom/mobile money, SOC national, administration systeme, autorites judiciaires).

## 1. Contexte National Et Probleme Cible

Le contexte beninois est marque par:
- Forte adoption Mobile Money et messageries mobiles (WhatsApp, SMS, USSD)
- Volume eleve d'arnaques d'usurpation (faux agents MTN/Moov, faux support)
- Cas recurrents de SIM swap, fraude transactionnelle et phishing social
- Signalements encore fragmentes entre victimes, operateurs et autorites

Probleme structurel: absence d'une plateforme nationale integree reliant detection precoce, investigation exploitable et execution coordonnee des contre-mesures.

## 2. Vision Master Et Objectifs Strategiques Mesurables

Vision cible:
> Construire une plateforme nationale intelligente de detection, investigation OSINT et orchestration automatisee contre les cyber-arnaques mobiles au Benin, avec IA explicable et chaine probatoire complete.

Objectifs strategiques:
- Unifier les flux de signalement multi-canaux (citoyen, PME, operateurs)
- Reduire le temps de reaction incident (MTTR) grace a des playbooks automatises
- Augmenter la precision de detection locale (fraudes Mobile Money, patterns linguistiques locaux)
- Produire des preuves tracables et juridiquement exploitables
- Mettre en place une gouvernance SOC nationale pour la decision critique humaine

## 3. Positionnement De La Plateforme

BENIN CYBER SHIELD se positionne comme un systeme national integre, et non comme:
- une simple application citoyenne
- un simple outil OSINT
- un simple detecteur ML

Positionnement final:
- `DETECT`: detection temps reel edge + IA explicable
- `SCOUT`: investigation OSINT structuree avec correlation et preuves
- `SHIELD`: orchestration et execution des actions via playbooks
- `GOUVERNANCE`: supervision SOC, conformite, auditabilite, coordination inter-acteurs

## 4. Architecture Cible Edge-To-Cloud (Flux Bout-En-Bout)

```text
Citoyen / PME / Operateur
        |
        v
Ingestion multi-source
(SMS, WhatsApp, USSD, URL, transaction, signalement)
        |
        v
Moteur IA Hybride
(regles + ML + scoring explicable)
        |
        v
Pipeline evenementiel
(Redis existant, extensible RabbitMQ/Kafka)
        |
        v
Module SCOUT
(scraping, correlation, graphe, preuves, IOC)
        |
        v
Base incidents nationale + evidences_store
        |
        v
Dashboard SOC national
        |
        v
Module SHIELD
(playbooks n8n/API operateur)
```

Principes d'architecture:
- Evolution progressive (non-breaking) a partir du socle actuel
- Separation claire des responsabilites par module
- Decouplage par evenements et contrats API explicites
- Priorite a la tracabilite et a l'explicabilite

## 5. Role Detaille Des 4 Blocs

### Bloc A - Detection Temps Reel (DETECT)
- Detection linguistique phishing/friction psychologique (FR + variantes locales)
- Scoring de risque 0-100 explicable
- Detection d'anomalies transactionnelles (PME et flux Mobile Money)
- Signalement automatique des incidents critiques vers SOC/SHIELD

### Bloc B - Investigation OSINT (SCOUT)
- Collecte asynchrone et evidence acquisition (Playwright)
- Correlation numero/domaine/IP/contenu
- Construction de clusters d'arnaque (approche graphe)
- Generation d'IOC (dont export STIX)
- Rapport forensique structure et auditable

### Bloc C - Orchestration Automatisee (SHIELD)
- Execution de playbooks dynamiques selon severite
- Integrations API operateur (blocage numero, suspension wallet, MFA renforcee)
- Gestion des callbacks statut d'execution
- Journalisation complete des actions et delais

### Bloc D - Gouvernance Et Conformite
- Decision critique humaine (SOC) sur sanctions majeures
- Confidentialite et minimisation des donnees
- Audit trail, retention, chain-of-custody
- Cadre RGPD-like adapte au contexte local

## 6. User-Flow Multi-Acteurs Consolide

| Acteur | Entree | Traitement plateforme | Sortie attendue |
|---|---|---|---|
| Citoyen | Message suspect (SMS/WhatsApp) | Verification + scoring + explication + option signalement | Conseil immediat + alerte officielle si critique |
| PME | Flux transactionnel/API | Detection anomalie + blocage temporaire + notification | Limitation pertes + journal d'audit |
| Operateur | Alerte signee SHIELD | Verification signature + action playbook | Confirmation API + statut incident |
| Analyste SOC | Incident priorise | Analyse preuves + correlation + decision | Validation, rejet, escalade, action nationale |
| Admin Systeme | Metriques techniques | Ajustement modeles/regles/clefs/backups | Stabilite, reduction FPR, resilience |
| Autorite judiciaire | Dossier certifie | Consultation preuves, hash, logs integrite | Exploitation probatoire et poursuite |

## 7. Role De L'IA Et Limites (Decision Humaine Critique)

Niveaux IA retenus:
1. IA de detection linguistique (phishing, manipulation, patterns locaux)
2. IA d'anomalie transactionnelle (Isolation Forest / autoencoder leger)
3. IA de correlation OSINT (graphe relationnel + similarite)
4. IA d'orchestration adaptative (seuils, priorites, efficacite playbooks)
5. IA federative (amelioration locale sans centralisation brute des donnees)

Limites explicites:
- L'IA ne remplace pas l'analyste SOC
- L'IA ne prononce pas de sanction legale
- La decision critique (blocage national, transmission judiciaire) reste humaine

## 8. Modele De Gouvernance SOC National

Roles de gouvernance:
- Cellule SOC nationale: arbitrage des incidents critiques
- Operateurs: execution des contre-mesures selon SLA
- Equipe technique plateforme: disponibilite, securite, maintenance
- Autorites cyber/judiciaires: validation legale et exploitation probatoire

Matrice RACI simplifiee:

| Activite | SOC national | Operateur | Equipe plateforme | Autorite judiciaire |
|---|---|---|---|---|
| Qualification incident critique | A/R | C | C | I |
| Execution blocage/suspension | C | A/R | C | I |
| Integrite de preuve | C | I | A/R | C |
| Transmission dossier legal | A/R | I | C | A/R |
| Mise a jour regles/modeles | C | C | A/R | I |

## 9. Tracabilite Probatoire Et Conformite

Exigences probatoires:
- Horodatage systematique des artefacts
- Hash SHA-256 pour evidence et snapshots
- Journal d'integrite et historique d'acces
- Scellement logique des preuves liees au rapport final

Exigences conformite:
- Minimisation et pseudonymisation des donnees personnelles
- Separation donnees operationnelles / donnees probatoires
- Politique de retention et purge documentee
- Controles d'acces stricts (JWT + RBAC evolutif)

## 10. Feuille De Route De Deploiement (Phases)

### Phase 0 - Cadrage Institutionnel
- Validation du cadre national et des parties prenantes
- Validation architecture cible et gouvernance
- Definition des SLA inter-acteurs

### Phase 1 - Renforcement DETECT
- Ajout ingestion multi-canal citoyen/PME
- Scoring explicable standardise
- Detection anomalie transactionnelle prototype

### Phase 2 - Extension SCOUT
- Correlation graphe multi-indicateurs
- Generation IOC STIX
- Durcissement chaine probatoire

### Phase 3 - Deploiement SHIELD
- Mise en place orchestrateur playbooks (n8n + API)
- Simulation operateur + signature des messages
- Boucle callback de statut d'execution

### Phase 4 - SOC National Et Pilote Terrain
- Tableau decisionnel SOC national
- Mise sous monitoring KPI operationnels
- Pilote operateur beninois controle

### Phase 5 - Passage A L'Echelle Nationale
- Federation modeles multi-sites
- Standardisation inter-operateurs
- Extension de couverture geographique et organisationnelle

## 11. KPI Cibles Et Metriques De Pilotage

| KPI | Definition | Cible pilote |
|---|---|---|
| TPR (True Positive Rate) | Part des arnaques reelles correctement detectees | >= 85% |
| FPR (False Positive Rate) | Part des alertes erronees | <= 12% puis <= 8% |
| Latence detection | Temps entree signal -> scoring exploitable | <= 5 s (flux simple) |
| MTTR | Temps de resolution incident critique | reduction >= 40% vs baseline |
| Taux actions auto validees | Actions SHIELD confirmees sans rework | >= 80% |
| Qualite probatoire | Dossiers sans rupture de chain-of-custody | 100% des dossiers transmis |

## 12. Risques Majeurs Et Plan De Mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Faible cooperation inter-acteurs | Blocage execution nationale | Cadre de gouvernance formalise + SLA + comite de pilotage |
| Qualite de donnees heterogene | Degradation precision IA | Normalisation schema + controles qualite + boucle feedback SOC |
| Faux positifs eleves au demarrage | Fatigue analyste, rejet operateur | Seuils progressifs, mode shadow, recalibrage hebdomadaire |
| Dependance API operateur | Retard SHIELD | Simulateur API + adaptation connecteurs + tests contractuels |
| Risque juridique/protection donnees | Non-conformite, blocage institutionnel | Privacy-by-design, minimisation, journalisation audit |

## 13. Plan Pilote Operateur Beninois

Perimetre pilote:
- 1 operateur telecom/mobile money volontaire
- 1 socle de signaux prioritaire (SMS, WhatsApp URL, transactions suspectes)
- 1 cellule SOC restreinte pour arbitrage

Composants pilote:
- Ingestion multi-source en conditions controlees
- Detection + SCOUT + SHIELD avec API simulee puis API reelle
- Tableau de bord KPI hebdomadaire

Criteres de passage de gate:
- Stabilité technique sur periode pilote
- KPI detection/MTTR dans les bornes cibles
- Aucun incident critique sans tracabilite complete
- Validation institutionnelle de la gouvernance operationnelle

## 14. Modele Economique B2G + B2B

Piste B2G:
- Plateforme nationale de surveillance et coordination cyber-arnaques
- Contrat de service public (socle detection + SOC + gouvernance)

Piste B2B:
- Offre PME (protection transactionnelle + verification proactive)
- Offre operateur (orchestration anti-fraude et reduction cout operationnel)

Leviers de viabilite:
- Abonnements modulaires par niveau de service
- Services premium (investigation avancee, audit, export legal)
- Mutualisation des couts d'infrastructure et maintenance

## 15. Criteres De Succes - Du Prototype Academique Au Pilote Institutionnel

Le projet est considere transforme avec succes si:
- La plateforme fonctionne en flux bout-en-bout detect -> scout -> shield
- Les decisions critiques sont gouvernees et tracees
- Les dossiers probatoires sont exploitables par les autorites
- Le pilote operateur est valide avec KPI cibles atteints
- Le cadre de gouvernance permet un passage a l'echelle nationale

## Annexe A - Changements Publics APIs / Interfaces / Types

### A.1 Endpoints Cibles (non-breaking)

| Domaine | Ajout cible | Compatibilite |
|---|---|---|
| Ingestion citoyenne | `POST /api/v1/signals/verify` | Non-breaking, nouveau domaine |
| Signalement incident | `POST /api/v1/incidents/report` | Non-breaking |
| Detection transactionnelle PME | `POST /api/v1/detect/transactions/analyze` | Non-breaking |
| Decision SOC | `PATCH /api/v1/incidents/{id}/decision` | Non-breaking |
| Orchestration SHIELD | `POST /api/v1/shield/actions/dispatch` | Non-breaking |
| Callback operateur | `POST /api/v1/operators/callbacks/action-status` | Non-breaking |
| Export renseignement | `GET /api/v1/iocs/stix/{incident_id}` | Non-breaking |

### A.2 Types Metier A Formaliser

- `SignalChannel`: `SMS | WHATSAPP | USSD | WEB | API`
- `ActorType`: `CITIZEN | SME | OPERATOR | SOC_ANALYST | ADMIN | JUDICIAL`
- `IncidentSeverity`: `LOW | MEDIUM | HIGH | CRITICAL`
- `PlaybookActionType`: `BLOCK_NUMBER | SUSPEND_WALLET | ENFORCE_MFA | BLACKLIST_ADD | USER_NOTIFY`
- `DecisionStatus`: `PENDING | VALIDATED | REJECTED | ESCALATED | EXECUTED`

## Annexe B - Scenarios D'Acceptation

1. Le fichier existe dans `docs/` avec les 15 sections obligatoires.
2. La page Notion est creee sous la page parent cible avec le bon titre.
3. La trame Notion est equivalent au fichier repo (sections, tableaux, annexes).
4. Les sections API/types/KPI/risques/pilote sont presentes et exploitables.
5. Les hypotheses et limites sont explicites (aucune ambiguite structurante).

## Annexe C - Hypotheses Et Defaults Retenus

- Parent Notion: `🔐 OSINT-SCOUT & SHIELD` (ID `2f47468a-fab5-80ec-9159-f8c66494f858`)
- Nom principal retenu: `BENIN CYBER SHIELD`
- Niveau documentaire: strategique haut + feuille de route operationnelle
- Le socle actuel est conserve et etendu de maniere progressive (pas de rewrite total)
- Decision legale finale: humaine, avec IA en support de priorisation et execution automatisee

## References Internes

- Page mere Notion: `https://www.notion.so/2f47468afab580ec9159f8c66494f858`
- Clarification structurelle: `https://www.notion.so/2f57468afab580088b6af459bef4f919`
- User-flow precedent: `https://www.notion.so/2f57468afab5809ab5f7cec88df4f5a3`
- IA dans le projet: `https://www.notion.so/2f57468afab580c4a1f7f1f3cd2d17d3`
- Cas realiste Benin: `https://www.notion.so/2f57468afab5807cb991e3f75dee559a`
