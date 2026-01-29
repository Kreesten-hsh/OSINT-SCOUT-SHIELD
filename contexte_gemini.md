# CONTEXTE GLOBAL DU PROJET : OSINT-SCOUT & SHIELD

> **Dernière mise à jour :** 29 Janvier 2026
> **Statut :** Backend (API/DB) Validé → Frontend (Batch 1) Terminé.
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
4.  **Signalement Structuré (✅) :** API & Base de données (PostgreSQL) opérationnelles.
5.  **Restitution (🔄) :** Nouveau Dashboard React en cours de construction.

## 3. STACK TECHNIQUE & INFRASTRUCTURE

*   **Backend :** Python 3.12+ (FastAPI) + Pydantic + SQLAlchemy (Async).
*   **Database :** PostgreSQL 15 (Données) + Redis 7 (Cache/Queue).
*   **Frontend :** React 19 + TypeScript + Vite.
    *   **UI :** Tailwind CSS v3 (Deep Void Theme) + Shadcn/ui.
    *   **State :** Zustand + TanStack Query.
*   **Orchestration :** Docker Compose (Workflow Obligatoire).

## 4. ÉTAT D'AVANCEMENT

### ✅ Phase 1, 2, 3 : Socle, Modélisation & Moteur
- Infrastructure, UML, Scraper, NLP, Workers : **VALIDÉS**.

### ✅ Phase 4 : Interface & Persistance (Backend)
- [x] Modèles de données (PostgreSQL/SQLAlchemy).
- [x] API Endpoints (Auth, Alerts, Stats).
- [x] Service de Preuves (Filesystem sécurisé).

### 🔄 Phase 5 : Reconstruction Frontend (En Cours)
- [x] **Hard Reset :** Base saine et propre.
- [x] **Batch 1 (Fondations) :**
    - [x] Auth (Login Page, Guard, Store).
    - [x] Dashboard (Layout, KPI, Charts, Sidebar, Topbar).
    - [x] Alerts List (Table, Filtres, Pagination).
    - [x] Design System (Theme Dark "Deep Void").
- [ ] **Batch 2 (Investigation) :** Vue détaillée, Preuves, Rapports PDF.
- [ ] **Batch 3 (Settings) :** Gestion utilisateurs, Configuration Scrapers.

## 5. DIRECTIVES DE TRAVAIL
-   **Prochain Focus :** Entamer le **Batch 2** (Page Détail Alerte & Preuves).
-   **Workflow Docker :**
    -   Le développement se fait sur l'hôte (Windows/VSCode) pour le confort.
    -   Les changements sont répercutés via Volumes Docker.
    -   ⚠️ **IMPORTANT :** Après tout changement de dépendances (`npm install` sur l'hôte), il faut **rebuilder le conteneur** : `docker-compose up -d --build frontend`.
-   **Rigueur :** Typage strict (TypeScript), Pas de `any`, Gestion d'erreurs UI.
