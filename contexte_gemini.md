# CONTEXTE GLOBAL DU PROJET : OSINT-SCOUT & SHIELD

> **Dernière mise à jour :** 27 Janvier 2026
> **Statut :** Phase de Développement (Module de Collecte)
> **Philosophie :** "Mode Absolu" - Rigueur Ingénieur & Innovation Contextuelle.

## 1. VISION & OBJECTIF RÉEL (VERSION RENFORCÉE)

Le projet ne vise pas l'arrestation directe, mais la création d'un **renseignement cyber structuré et exploitable**.
Il transforme une lutte fragmentée en un système capable de **détecter, qualifier, documenter et prouver**.

*   **Problème Fondamental :** Absence de qualification, de traçabilité et de preuve standardisée des arnaques au Bénin.
*   **Objectif :** Passer de témoignages isolés à un signalement formel et mutualisé.

## 2. ARCHITECTURE FONCTIONNELLE (LA CHAÎNE DE LUTTE)

Le système implémente une chaîne de valeur complète :

1.  **Collecte OSINT :** Scraping web/réseaux sociaux (Playwright/Scrapy).
2.  **Analyse Automatisée :** Règles heuristiques + NLP localisé (Lexique béninois) + Scoring ML.
3.  **Qualification :** Typologie des arnaques et validation par Patterns.
4.  **Preuve Forensique :** Horodatage + Hashage SHA-256 (Traçabilité complète).
5.  **Signalement Structuré :** Génération de rapports PDF/JSON exploitables juridiquement.
6.  **Mutualisation :** Registre centralisé des menaces et tendances nationales.

## 3. STACK TECHNIQUE & INFRASTRUCTURE

*   **Backend :** Python 3.12+ (FastAPI) + Pydantic (Validation).
*   **Frontend :** React + TypeScript (Vite) + Tailwind/Shadcn.
*   **Data :** PostgreSQL (Persistance) + Redis (Broker/Queue).
*   **Asynchronisme :** Celery Workers (Scraping/NLP en arrière-plan).
*   **DevOps :** Docker Compose (Environnement iso-prod).

## 4. CIBLE ET MODÈLE (B2B/B2G)

Pas de B2C. Le système s'adresse aux professionnels :
*   Analystes Cybersécurité / SOC.
*   Cellules IT des PME & Opérateurs Mobile Money.
*   ONG Cyber & Institutions (CNIN).

## 5. ÉTAT D'AVANCEMENT

### ✅ Phase 1 : Infrastructure
- [x] Architecture Micro-services simulés validée.
- [x] Environnement Docker (API, DB, Redis, Front) opérationnel.

### ✅ Phase 2 : Modélisation
- [x] Diagrammes UML (Cas d'utilisation, Séquence, Classes) validés.

### 🔄 Phase 3 : Développement Collecte (EN COURS)
- [ ] Création du Scraper Base.
- [ ] Implémentation de la collecte Facebook/Web.

## 6. DIRECTIVES DE TRAVAIL
-   **Rigueur :** Code typé, testé et documenté.
-   **Innovation :** Focus sur le NLP local (Béninois) et la preuve forensique.
