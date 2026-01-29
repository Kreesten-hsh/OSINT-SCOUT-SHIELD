# 🧠 CONTEXTE PROJET : OSINT-SCOUT & SHIELD (GEMINI MEMORY)

Fichier de contexte vivant pour maintenir la cohérence entre les sessions.
**Dernière mise à jour :** 29/01/2026

---

## 🏗️ ARCHITECTURE GLOBALE

### Backend (`/backend`)
*   **Techno :** FastAPI (Python 3.12)
*   **Base de données :** PostgreSQL (via SQLAlchemy + Alembic)
*   **Task Queue :** Redis (pour les scrapers et tâches de fond)
*   **NLP :** Spacy (Modèle `en_core_web_sm` / `fr_core_news_sm`) pour l'analyse d'entités et détection de fraude.
*   **Architecture :** Clean Architecture simplifiée (`api` -> `schemas` -> `services` -> `models`).
*   **Authentification :** Placeholder actuellement (OAuth2 prévu).
*   **Endpoints Clés :**
    *   `GET /api/v1/alerts` : Liste paginée avec filtres.
    *   `POST /api/v1/alerts` : Ingestion (Webhooks/Scrapers).
    *   `PATCH /api/v1/alerts/{uuid}` : Changement de statut (Analyste).
    *   `GET /api/v1/evidence/{path}` : Serveur de fichiers statiques (Preuves).

### Frontend (`/frontend`)
*   **Techno :** React 19 + TypeScript + Vite.
*   **Design System :** "Premium Cyber-SOC" (Dark Mode par défaut).
*   **UI Libs :** TailwindCSS, Lucide Icons, Recharts, Framer Motion.
*   **State :** TanStack Query (Server State).
*   **Layout :** `DashboardLayout` avec Sidebar fixe et Topbar système.
*   **Pages :**
    *   `/dashboard` : Command Center (KPIs, Charts).
    *   `/alerts/:uuid` : Détails investigation (Preuve + NLP).

### Infrastructure (`docker-compose.yml`)
*   5 Services : `api` (8000), `frontend` (5173), `db` (5433), `redis` (6379), `scraper`.
*   **Volume :** Persistance DB `postgres_data`.

---

## 📝 ÉTAT D'AVANCEMENT

### ✅ TERMINÉ
1.  **Backend Core :** API fonctionnelle, Models, Migrations DB, Dockerisation.
2.  **Scrapers :** Architecture de base (Playwright/Scrapy).
3.  **NLP Engine :** Détection de mots-clés et calcul de risque.
4.  **Frontend V1 :** 
    *   Refonte complète du design (Dark Mode Enterprise).
    *   Intégration API de base (Listing, Détail).
    *   Gestion des dépendances (`--legacy-peer-deps` pour compatibilité React 19).

### 🚧 EN COURS / À FAIRE
1.  **Frontend Polish :**
    *   Finaliser la page `AlertDetailPage` avec le nouveau design card.
    *   Implémenter la page `Investigation` (Split View).
2.  **Scrapers :** Connecter les scrapers réels à l'API d'ingestion.
3.  **Rapports :** Génération PDF.

---

## ⚠️ POINTS D'ATTENTION (RÈGLES CRITIQUES)
1.  **Frontend Types :** TOUJOURS utiliser `import type { Alert }` pour les interfaces, sinon Vite crash au runtime.
2.  **Docker Frontend :** Toujours build avec `npm install --legacy-peer-deps` à cause du conflit `react@19` / `lucide-react`.
3.  **Backend :** Ne jamais laisser de metadata SQL (commentaires `-- Active: ...`) en haut des fichiers Python.

---
