# 🛡️ PROJET OSINT-SCOUT & SHIELD

## 1. 🆔 IDENTIFICATION DU PROJET

- **Intitulé Officiel :** Conception et implémentation d’une architecture micro-services de veille OSINT proactive pour la détection forensique des fraudes numériques.
- **Contexte Académique :** Soutenance de Fin de Cycle - Licence 3 (Systèmes Informatiques et Logiciels).
- **Objectif de Mention :** **Excellente** (Cible : Innovation Contextuelle & Complexité Architecturale).

---

## 2. 🌍 ANALYSE CONTEXTUELLE & VISION

Le projet opère un changement de paradigme : passer d'une cybersécurité **réactive** (post-incident) à une défense **proactive** (neutralisation préventive).

### 🇧🇯 Problématique Locale (Bénin)
- **Sophistication des Menaces :** Usurpation massive d'identité d'institutions (Douanes, Banques) et arnaques Mobile Money structurées.
- **Angle Mort Technologique :** Les solutions standards (Recorded Future, ZeroFox) échouent à détecter les menaces utilisant l'argot local ("Gongon", "Kpayo") ou les canaux spécifiques (Groupes WhatsApp/Facebook locaux).
- **Vide Forensique :** L'absence de preuves numériques scellées cryptographiquement rend les poursuites judiciaires difficiles (conforme au Code du Numérique 2018).

---

## 3. 🚀 FACTEURS D'INNOVATION

1.  **Intelligence Artificielle Localisée (NLP) 🧠**
    - Entraînement de modèles sur des datasets de dialectes et argot béninois pour minimiser les faux négatifs.
2.  **Intégrité de la Preuve (Forensique) ⚖️**
    - Système de "Scellement Numérique" : Capture du DOM + Timestamp + Hachage SHA-256 immédiat pour garantir la non-répudiation.
3.  **Architecture Distribuée & Souveraine 🏗️**
    - Conception modulaire réduisant la dette technique et la dépendance aux API étrangères.

---

## 4. 💻 ARCHITECTURE TECHNIQUE (État de l'Art)

Le système repose sur une architecture **Micro-services Simulés**, garantissant scalabilité et maintenabilité.

### ⚙️ Backend (Cœur du Système)
- **Framework :** **FastAPI** (Python 3.12+) - *Performance asynchrone native.*
- **Architecture :** Domain-Driven Design (DDD) simplifié.
- **Validation :** **Pydantic** (Schemas stricts).
- **Migrations :** **Alembic** (Gestion versionnée de la BDD pour éviter la perte de données).

### 🖥️ Frontend (Interface de Commandement)
- **Framework :** **React** + **Vite** (SPA optimisée).
- **Langage :** **TypeScript** (Sécurité du typage statique, indispensable pour des projets d'envergure).
- **Design System :** **Tailwind CSS** + **Shadcn/UI** (Interface moderne, accessible et professionnelle).
- **Visualisation :** **Recharts** (Tableaux de bord analytiques dynamiques).

### 💾 Data & Asynchronisme
- **Persistance :** **PostgreSQL** (Données relationnelles critiques).
- **Message Broker :** **Redis** (File d'attente haute performance).
- **Workers :** **Celery** (Orchestration des tâches de scraping lourdes en arrière-plan sans bloquer l'API).

### 🕷️ Collecte (Ingestion)
- **Web Statique :** **Scrapy** (Extraction massive à haute vitesse).
- **Web Dynamique/Social :** **Playwright** (Simulation comportementale humaine pour contourner les protections).

### 🛠️ Qualité & DevOps
- **Tests Automatisés :** Pytest (Backend) & Vitest (Frontend) pour garantir la fiabilité.
- **Qualité Code :** Ruff (Linter Python) & ESLint (Standardisation).
- **Conteneurisation :** **Docker Compose** (Environnement iso-prod reproductible).

---

## 5. 🔄 FLUX DE DONNÉES ET FONCTIONNEMENT

| Phase | Technologie | Description Technique |
| :--- | :--- | :--- |
| **1. Ciblage** | *Dictionary-based* | Injection de mots-clés "risqués" (lexique béninois) dans la file d'attente **Redis**. |
| **2. Ingestion** | **Celery Workers** | Des agents autonomes (**Playwright**) dépilent les tâches et extraient le contenu suspect. |
| **3. Analyse** | **Spacy NLP** | Nettoyage, Tokenisation et Scoring de risque (0-100) du contenu textuel. |
| **4. Scellement** | **SHA-256** | Génération d'une empreinte cryptographique unique du contenu brut + métadonnées. |
| **5. Restitution**| **React Dashboard** | Affichage temps réel des alertes pour les analystes du SOC (Security Operations Center). |

---

## 6. 📈 POTENTIEL DE VALORISATION (Post-Soutenance)

Le projet est conçu comme un **MVP (Minimum Viable Product)** commercialisable (SaaS).

1.  **B2G (Souveraineté) :** Protection de l'espace numérique de l'État (.bj) - Partenariat potentiel CNIN/ASIN.
2.  **B2B (Corporate) :** Brand Protection pour les banques et opérateurs mobiles.
3.  **Modèle Économique :** Abonnement SaaS avec intégration API.

---

## 7. 🎓 JUSTIFICATION DU NIVEAU "EXCELLENT"

Ce projet dépasse le cadre du développement web classique par :

1.  **La maturité architecturale :** Séparation stricte Frontend/Backend/Workers (Pattern Micro-services).
2.  **L'ingénierie logicielle :** Usage de TypeScript, Tests automatisés, Migrations BDD (Alembic).
3.  **La complexité systémique :** Gestion de la concurrence et de l'asynchronisme (Redis/Celery).
4.  **L'impact réel :** Réponse technique concrète et innovante à un problème de sécurité nationale.

---

## 8. 📅 ROADMAP TECHNIQUE

- **Phase 1 : Infrastructure (Terminé) ✅**
    - Dockerisation complète, Architecture Clean (Backend/Frontend), CI/CD setup.
- **Phase 2 : Modélisation (En cours) 🔄**
    - UML 2.5 (Diagrammes de Cas d'utilisation, Séquence, Classes).
- **Phase 3 : Core Development**
    - Implémentation des pipelines de Scraping et du Moteur d'Analyse.
- **Phase 4 : Frontend & UX**
    - Développement du Dashboard Analyste avec visualisation temps réel.
- **Phase 5 : Validation & Soutenance**
    - Tests de charge, Validation forensique et Rédaction du mémoire.
