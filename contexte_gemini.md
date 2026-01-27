# CONTEXTE GLOBAL DU PROJET : OSINT-SCOUT & SHIELD

> **Dernière mise à jour :** 27 Janvier 2026
> **Statut :** Phase d'Initialisation (Configuration de l'infrastructure)

## 1. IDENTIFICATION ET VISION

*   **Projet :** OSINT-SCOUT & SHIELD
*   **Objectif Académique :** Soutenance de Licence 3 (Système Informatique et Logiciels).
*   **Mention Visée :** Excellente.
*   **Vision :** Passer d'une cybersécurité réactive à une défense proactive contre les fraudes numériques (Mobile Money, Usurpation) au Bénin.
*   **Innovation Clé :**
    *   **NLP Localisé :** Détection du lexique argotique béninois (Gongon, Kpayo, etc.).
    *   **Preuve Forensique :** Scellement cryptographique (SHA-256) des preuves collectées.
    *   **Souveraineté :** Architecture indépendante alignée sur les besoins du CNIN.

## 2. ARCHITECTURE TECHNIQUE TARGÉTÉE

Le système est une application web distribuée (Micro-services simulés).

### A. Frontend (Interface Utilisateur)
*   **Technologie :** React + TypeScript (Vite).
*   **Design :** Tailwind CSS + Shadcn/UI.
*   **Rôle :** Tableau de bord de supervision, visualisation des alertes, export de rapports PDF.

### B. Backend (API & Logique)
*   **Technologie :** Python 3.12+ avec FastAPI.
*   **Architecture :** DDD simplifiée (Api, Services, Models, Schemas).
*   **Base de données :** PostgreSQL (Géré avec Alembic pour les migrations).
*   **File d'attente :** Redis (Message Broker).
*   **Workers :** Celery/Arq pour le traitement asynchrone des tâches lourdes (Scraping).
*   **ORM :** SQLAlchemy (Async).

### C. Qualité & DevOps
*   **Tests :** Pytest (Backend), Vitest (Frontend).
*   **Linting :** Ruff (Python), ESLint (TS).
*   **CI/CD :** (À définir).


### C. Collecte & Analyse (Workers)
*   **Scrapers :** Scrapy (Web statique), Playwright (Web dynamique/Social).
*   **NLP :** Spacy/NLTK (Analyse sémantique et détection d'entités nommées).

### D. Infrastructure (DevOps)
*   **Conteneurisation :** Docker & Docker Compose.
*   **CI/CD :** (À définir ultérieurement).

## 3. ÉTAT D'AVANCEMENT

### Tâches Réalisées
- [x] Définition de la roadmap et du périmètre (`task.md`).
- [x] Plan d'implémentation technique (`implementation_plan.md`).

### Tâches En Cours
- [ ] Création de la structure des dossiers.
- [ ] Initialisation de la configuration Docker (`docker-compose.yml`).
- [ ] Initialisation du Backend (FastAPI).
- [ ] Initialisation du Frontend (React).

## 4. DIRECTIVES DE TRAVAIL
-   **Excellence du Code :** Typage strict (TypeScript/Python Type Hints), Documentation (Docstrings), Tests unitaires.
-   **Approche :** TDD (Test Driven Development) si possible.
-   **Mise à jour :** Ce fichier doit être relu et mis à jour avant chaque nouvelle tâche majeure.
