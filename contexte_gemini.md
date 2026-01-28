# CONTEXTE GLOBAL DU PROJET : OSINT-SCOUT & SHIELD

> **Dernière mise à jour :** 28 Janvier 2026
> **Statut :** Fin Phase 3 (Moteurs Validés) → Début Phase 4 (Persistance & API)
> **Philosophie :** "Mode Absolu" - Rigueur Ingénieur & Innovation Contextuelle.

## 1. VISION & OBJECTIF RÉEL (VERSION RENFORCÉE)

Le projet ne vise pas l'arrestation directe, mais la création d'un **renseignement cyber structuré et exploitable**.
Il transforme une lutte fragmentée en un système capable de **détecter, qualifier, documenter et prouver**.

*   **Problème Fondamental :** Absence de qualification, de traçabilité et de preuve standardisée des arnaques au Bénin.
*   **Objectif :** Passer de témoignages isolés à un signalement formel et mutualisé.

## 2. ARCHITECTURE FONCTIONNELLE (LA CHAÎNE DE LUTTE)

Le système implémente une chaîne de valeur complète, dont le cœur est désormais opérationnel :

1.  **Collecte OSINT (✅) :** Ingestion automatique via Playwright (Scraper isolé dans Docker).
2.  **Analyse Automatisée (✅) :** NLP localisé (Spacy FR) + Règles Heuristiques (Gongon, Kpayo).
3.  **Preuve Forensique (✅) :** Scellement cryptographique (SHA-256) des captures d'écran.
4.  **Signalement Structuré :** (Prochaine étape : Persistance & PDF).
5.  **Mutualisation :** (Prochaine étape : Dashboard).

## 3. STACK TECHNIQUE & INFRASTRUCTURE

*   **Backend :** Python 3.12+ (FastAPI) + Pydantic (Validation).
*   **Frontend :** React + TypeScript (Vite) + Tailwind/Shadcn.
*   **Moteur OSINT (Worker) :**
    *   **Scraper :** Playwright (Navigation furtive).
    *   **Orchestration :** Redis (Queue `osint_to_scan` → `osint_results`).
    *   **Analyse :** Spacy (NLP) + Regex.
*   **DevOps :** Docker Compose (Services orchestrés).

## 4. ÉTAT D'AVANCEMENT

### ✅ Phase 1 : Infrastructure
- [x] Architecture Micro-services simulés validée.
- [x] Environnement Docker (API, DB, Redis, Front, Scraper) opérationnel.

### ✅ Phase 2 : Modélisation
- [x] Diagrammes UML (Cas d'utilisation, Séquence, Classes) validés.

### ✅ Phase 3 : Moteur de Collecte & Analyse (CŒUR DU SYSTÈME)
- [x] Scraper Playwright (Navigation + Capture Preuve).
- [x] Moteur NLP (Détection Mots-clés + Scoring Risque).
- [x] Worker d'Orchestration (Lien Redis <-> Scraper <-> NLP).
- [x] Test de bout en bout validé (`trigger_test.py`).

### 🔄 Phase 4 : Interface & Persistance (À VENIR)
- [ ] Création du modèle de données (PostgreSQL/SQLAlchemy).
- [ ] API pour consommer les résultats Redis.
- [ ] Dashboard Frontend (Affichage des alertes).

## 5. DIRECTIVES DE TRAVAIL
-   **Prochain Focus :** Connecter le Cerveau (Worker) à la Mémoire (Base de données).
-   **Rigueur :** Maintenir la qualité du code (Typage strict, Gestion d'erreurs).
