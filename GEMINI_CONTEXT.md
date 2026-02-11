# CONTEXTE GLOBAL DU PROJET : OSINT-SCOUT & SHIELD

> **Dernière mise à jour :** 10 Février 2026
> **Statut :** LOT 4 TERMINÉ (Backend/Scraping Validé) → Prochain : LOT 5 (UI/Settings/Rapports).
> **Philosophie :** "Mode Absolu" - Rigueur Ingénieur & Innovation Contextuelle.
> **Alignement :** Zéro Fake Data / 100% Rule-Based / 0% IA Décisionnelle.

## 1. VISION & OBJECTIF RÉEL (CONFIRMÉ)

Le projet est une **Infrastructure de Renseignement & Preuve** souveraine pour le Bénin.
Il ne vise pas à "hacker" ou "arrêter", mais à **documenter techniquement** pour permettre l'action judiciaire.

- **Le Besoin :** Transformer une plainte orale ("On m'a volé") en dossier technique ("Voici la preuve hachée").
- **Les Cibles :** Arnaques Mobile Money, Faux profils Institutionnels (Douanes, Banques), Usurpation d'Identité.
- **L'Approche :** Détection automatique (Radar) + Validation Humaine (Expert) + Scellement (Preuve).

## 2. ARCHITECTURE FONCTIONNELLE (LOT 4 VALIDÉ)

Le pipeline de données est désormais complet et opérationnel :

1.  **DÉTECTION (Radar Automatique) :**
    - Surveillance de sources configurées (URL + Fréquence).
    - Moteur : `Playwright` 1.58.0 (Dockerisé).
    - Mode : "Discovery" (Scan récurrent).

2.  **ANALYSE (Cerveau Local) :**
    - Moteur : `FraudAnalyzer` (Python/Spacy).
    - Logique : 100% Déterministe (Mots-clés + Regex + Règles Locales).
    - **Zéro IA Boîte Noire.**

3.  **SCELLEMENT (Preuve Forensique) :**
    - Capture d'écran intégrale (Full Page).
    - Hashing SHA-256 immédiat.
    - Timestamp UTC irrévocable.

4.  **INGESTION MANUELLE (Besoin PME) :**
    - Soumission directe d'URLs par l'analyste.
    - Traitement identique au mode automatique (Même rigueur de preuve).

## 3. STACK TECHNIQUE & INFRASTRUCTURE

- **Backend :** Python 3.12 (FastAPI) + Pydantic v2 (`SettingsConfigDict`) + SQLAlchemy 2.0 (Async).
- **Database :** PostgreSQL 15 (Données) + Redis 7 (Queue `osint_to_scan`).
- **Workers :** Orchestration par files `Redis` natives (Architecture découplée). Pas de Celery.
- **Frontend :** React 19 + TypeScript 5.9 + Vite 7.
  - **UI :** Tailwind CSS v3 (Thème "Deep Void Enterprise") + Shadcn/ui + Lucide React.
  - **Data :** TanStack Query (server state) + Zustand (UI state).
  - **Tables :** TanStack Table. **Charts :** Recharts.
- **Déploiement :** 100% Docker Compose (Souveraineté Locale) avec healthchecks et restart policies.

## 4. ÉTAT D'AVANCEMENT DÉTAILLÉ

### ✅ LOT 1, 2, 3 (Socle & Interface de Base)

- [x] Architecture Micro-services simulés.
- [x] Authentification (JWT).
- [x] Dashboard Analyste (Layout, Charts).
- [x] Gestion des Alertes (Table, Filtres).

### ✅ LOT 4 (Moteur de Scraping Automatique) - TERMINÉ

- [x] **Pipeline Complet :** Scheduler -> Worker -> DB.
- [x] **Mise à jour Critique :** Playwright 1.58.0.
- [x] **Validation :** Scripts `verify_pipeline.py` et `test_auto_scraping.py` (Succès).
- [x] **Conformité :** Nettoyage des fausses données. Seules les vraies données entrent.

### 🔄 LOT 5 (Finalisation & Polissage) - PROCHAINE ÉTAPE

- [ ] **Page Sources/Settings :** Interface pour configurer le Scraping Automatique (Ajouter/Supprimer URL).
- [ ] **Génération Rapport :** PDF final pour les autorités.
- [ ] **Enrichissement Règles :** Peupler `rules.json` avec le vrai argot béninois.

## 5. AGENT RULES & WORKFLOWS

### Rules (`.agent/rules/`)

9 règles spécialisées, toutes `trigger: always`, alignées sur la stack réelle :
`back.md` · `front.md` · `design.md` · `devops.md` · `qa.md` · `legal.md` · `product.md` · `security.md` · `data-integrity.md`

### Workflows (`.gemini/antigravity/global_workflows/`)

5 workflows exécutables avec support `// turbo-all` :

- `/osint-scout-feature` — Pipeline complet feature delivery
- `/osint-scout-scraper-update` — Mise à jour règles & pipeline evidence
- `/build-feature` — Construction feature générique
- `/docker-ops` — Lifecycle Docker Compose
- `/debug-pipeline` — Diagnostic scraper pipeline

## 6. RÈGLES D'OR (NE JAMAIS ENFREINDRE)

1.  **Zéro Fake Data :** Interdiction d'utiliser Faker/Seeds. On teste avec du réel ou rien.
2.  **Visual Excellence :** Le Frontend doit être "Premium" (Wow Effect).
3.  **Souveraineté :** Pas d'appel API vers des services tiers opaques (OpenAI, Google Vision). Tout est local.
4.  **Rigueur :** Typage strict, Code propre, Architecture explicable.

---

**Fichier de référence unique pour l'IA.**
