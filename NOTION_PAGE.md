# 🛡️ PROJET OSINT-SCOUT & SHIELD

> **Mention Visée :** Excellente
> **Cible :** Soutenance L3 - Mai 2026

---

## 1. 🎯 RÉSUMÉ EXÉCUTIF (VISION RENFORCÉE)

**OSINT-SCOUT & SHIELD** est un système de veille automatisé conçu pour structurer la lutte contre la cyber-arnaque au Bénin.
Le projet opère un changement de paradigme : passer de **témoignages isolés** à du **renseignement cyber exploitable**.

### Le Problème Réel
Ce n’est pas l’absence de victimes, mais l'absence de :
*   **Qualification** technique des menaces.
*   **Traçabilité** des preuves numériques.
*   **Vision globale** des campagnes de fraude (Mobile Money, Usurpation).

### Notre Solution
Une application web distribuée capable de **détecter**, **documenter**, **prouver** et **mutualiser** les menaces numériques.

---

## 2. ⚙️ ARCHITECTURE FONCTIONNELLE (La Chaîne de Lutte)

Le système implémente 6 étapes clés :

1.  **Collecte OSINT 🕵️‍♂️** : Ingestion automatique de contenus suspects (Web, Réseaux Sociaux) via Scrapers.
2.  **Analyse Automatisée 🧠** : Filtrage par Règles Heuristiques + NLP localisé (Lexique "Gongon", "Kpayo").
3.  **Qualification 🏷️** : Attribution d'un score de risque et typologie de l'arnaque.
4.  **Preuve Forensique ⚖️** : Scellement cryptographique immédiat (SHA-256 + Timestamp) pour garantir l'intégrité.
5.  **Signalement Structuré 📄** : Génération de dossiers de preuve (PDF/JSON) conformes aux exigences juridiques.
6.  **Mutualisation 🌐** : Création d'un registre national des menaces pour identifier les récidives.

---

## 3. 💻 STACK TECHNIQUE (Niveau Ingénieur)

Architecture **Micro-services Simulés** pour garantir performance et scalabilité.

| Composant | Technologie | Justification |
| :--- | :--- | :--- |
| **Backend** | **FastAPI (Python)** | Performance asynchrone, standard actuel des API modernes. |
| **Frontend** | **React + TypeScript** | Robustesse du typage, interface professionnelle (Shadcn/UI). |
| **Orchestration** | **Redis + Celery** | Gestion de files d'attente pour le scraping intensif (Message Broker). |
| **Données** | **PostgreSQL** | Fiabilité relationnelle pour le stockage des preuves. |
| **Infrastructure**| **Docker** | Portabilité totale et environnement iso-prod. |

---

## 4. 👥 CIBLE & MODÈLE (B2B / B2G)

Le projet est conçu comme un outil professionnel (SaaS) :

*   **Analystes Cybersécurité (SOC)**
*   **Institutions (CNIN, ASIN)**
*   **Opérateurs Mobile Money & Banques**

*Note : Les particuliers ne sont pas la cible directe.*

---

## 5. 💎 VALEUR AJOUTÉE & FACTEURS D'EXCELLENCE

1.  **Innovation Contextuelle :** Utilisation d'un modèle NLP entraîné sur l'argot béninois.
2.  **Rigueur Forensique :** La sécurité de la preuve est "Built-in" (intégrée dès la conception).
3.  **Maturité Technique :** Architecture asynchrone complexe maîtrisée (Workers, Queues, WebSocket).

---

## 6. 📅 ROADMAP (Stage 3 Mois)

- **Mois 1 : Infrastructure & Modélisation (Terminé ✅)**
    - Mise en place Docker, FastAPI, React.
    - Diagrammes UML (Cas d'utilisation, Séquence).
- **Mois 2 : Cœur du Réacteur (À Venir 🚧)**
    - Développement des Scrapers (Playwright).
    - Moteur NLP & Hachage des preuves.
- **Mois 3 : Restitution & Finalisation**
    - Tableau de bord React.
    - Rédaction du Mémoire & Tests.
