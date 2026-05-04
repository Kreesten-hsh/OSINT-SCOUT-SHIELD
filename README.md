# BENIN CYBER SHIELD

Plateforme de detection et d'analyse de cyberfraude mobile couvrant quatre surfaces reelles :

- portail citoyen web pour verifier et signaler un message suspect
- console administrateur pour la supervision nationale
- espace PME pour suivre les cas d'usurpation lies a une entreprise
- application mobile Android Flutter de surveillance passive des notifications

## Etat actuel

Le depot est un prototype de demonstration operationnel centre sur le flux suivant :

`notification ou message suspect -> analyse -> signalement formel -> supervision admin / PME -> dossier probatoire -> transmission simulee`

Les niveaux de risque affiches dans le produit sont :

- `FAIBLE`
- `MOYEN`
- `FORT`

## Architecture

- `backend/` : API FastAPI, logique metier, RBAC, generation de dossiers, seed de demonstration
- `frontend/` : application React/Vite pour les espaces citoyen, admin et PME
- `mobile/` : application Flutter Android avec listener natif de notifications, historique local et alertes locales
- `scrapers/` : worker Playwright branche sur Redis
- `evidences_store/` : artefacts probatoires generes localement

## Services Docker

`docker-compose.yml` demarre :

- `api`
- `db`
- `redis`
- `scraper`
- `frontend`

## Parcours web livres

### Citoyen

- `/verify`
- verification d'un message suspect sans authentification
- affichage du score, du niveau de risque, des segments suspects, des recommandations et de l'alerte fon si applicable
- possibilite de creer un signalement formel avec reference publique

### Administrateur

- `/admin/dashboard`
- `/admin/pme`
- `/admin/signalements`
- `/admin/dossiers`
- `/admin/transmissions`
- `/admin/exports`
- `/admin/settings`
- `/live`

Fonctions cles :

- supervision nationale par departement
- gestion des PME
- consultation des signalements citoyens
- consultation et telechargement des dossiers probatoires
- suivi des transmissions externes simulees

### PME

- `/pme/dashboard`
- `/pme/alertes`
- `/pme/signalements`
- `/pme/dossiers`
- `/pme/profil`
- `/pme/register`

Fonctions cles :

- consultation des incidents d'usurpation lies a la PME
- suivi des signalements associes
- acces aux dossiers probatoires
- mise a jour du profil PME

La PME de demonstration utilisee dans les seeds actuels est `Kreesten Technologies SARL`.

## Application mobile Android

L'application mobile n'est pas un clone du portail web.

Elle fonctionne comme un bouclier passif :

- surveillance des notifications Android
- ciblage des applications selectionnees par l'utilisateur
- analyse quasi temps reel des messages recus
- historique local des alertes
- file locale de reprise si l'API est temporairement indisponible
- notification locale BCS lorsque le niveau atteint le seuil configure

Ecrans principaux :

- `Accueil`
- `Historique`
- `Parametres`

## Endpoints cles

### Public

- `POST /api/v1/analysis/verify`
- `POST /api/v1/incidents/report`
- `POST /api/v1/incidents/report-with-media`
- `GET /api/v1/map/overview`
- `GET /health`

### Mobile

- `GET /api/v1/mobile/bootstrap`
- `GET /api/v1/mobile/history`

### Authentifies

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/pme`
- `GET /api/v1/pme/dashboard`
- `GET /api/v1/reports`
- `POST /api/v1/shield/actions/dispatch`

## Donnees de demonstration

Le script :

```bash
docker compose exec -T api python scripts/seed_demo_data.py
```

injecte des donnees de soutenance :

- signalements citoyens multi-departements
- confirmations SOC
- transmissions simulees
- incidents d'usurpation PME

## Demarrage local

### 1. Preparer l'environnement

```bash
cp .env.example .env
```

### 2. Lancer la stack

```bash
docker compose up -d --build
```

### 3. Verifier la sante

```bash
docker compose ps
curl http://localhost:8000/health
```

### 4. URLs utiles

- frontend : `http://localhost:5173`
- citoyen : `http://localhost:5173/verify`
- admin : `http://localhost:5173/admin/dashboard`
- PME : `http://localhost:5173/pme/dashboard`
- API docs : `http://localhost:8000/docs`

## Variables utiles

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_SME_EMAIL`
- `AUTH_SME_PASSWORD`
- `VITE_API_URL`
- `REDIS_URL`
- `DATABASE_URL`

## Nettoyage local

Le depot produit localement des artefacts regenerables :

- caches Python
- caches Node et Flutter
- artefacts temporaires de build
- bundles probatoires generes dans `evidences_store`

Ils peuvent etre supprimes sans impact sur le code source.

## References internes

- `GEMINI_CONTEXT.md`
- `frontend/README.md`
- `mobile/README.md`

## Statut

Prototype academique avance, oriente soutenance, avec web admin/PME/citoyen et application mobile Android connectes au meme backend.
