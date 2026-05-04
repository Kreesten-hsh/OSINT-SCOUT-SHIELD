# GEMINI_CONTEXT - BENIN CYBER SHIELD

Derniere mise a jour : 2026-05-04
Statut global : prototype de soutenance operationnel, web + mobile Android alignes

Ce fichier est la source de verite locale pour travailler sur ce depot sans repartir d'un etat obsolete.

## 1. Mission produit

BENIN CYBER SHIELD est une plateforme de detection et d'analyse de cyberfraude mobile avec quatre surfaces actives :

- portail citoyen web
- console administrateur
- espace PME
- application mobile Android Flutter

Objectif produit actuel :

`detecter rapidement un message suspect, permettre son signalement, produire un dossier exploitable, et exposer les cas a l'admin et aux PME concernees`

## 2. Etat reel du produit

### Web citoyen

- route principale : `/verify`
- verification sans authentification
- score sur 100
- niveau de risque : `FAIBLE`, `MOYEN`, `FORT`
- surlignage des segments suspects
- recommandations et alerte fon selon le cas
- signalement formel optionnel avec reference publique

### Web administrateur

Routes structurantes :

- `/admin/dashboard`
- `/admin/pme`
- `/admin/signalements`
- `/admin/dossiers`
- `/admin/transmissions`
- `/admin/exports`
- `/admin/settings`
- `/live`

Fonctions structurantes :

- supervision nationale
- suivi des signalements citoyens
- gestion des PME
- acces aux dossiers probatoires
- suivi des transmissions externes simulees

### Web PME

Routes structurantes :

- `/pme/dashboard`
- `/pme/alertes`
- `/pme/signalements`
- `/pme/dossiers`
- `/pme/profil`
- `/pme/register`

La PME de demonstration actuellement seedee est `Kreesten Technologies SARL`.

### Mobile Android

Le mobile n'est pas une simple vue du portail citoyen.

Fonctions reelles :

- ecoute native des notifications Android
- selection des applications surveillees
- analyse quasi temps reel via le backend
- historique local
- file locale en cas d'indisponibilite reseau ou API
- notification locale BCS
- ouverture contextuelle vers l'historique

Ecrans structurants :

- `Accueil`
- `Historique`
- `Parametres`

## 3. Stack technique de reference

- backend : FastAPI, SQLAlchemy async, Alembic, Pydantic
- frontend : React 19, TypeScript, Vite, TanStack Query, Recharts
- mobile : Flutter + Kotlin Android natif
- base de donnees : PostgreSQL 15
- queue : Redis
- worker de collecte : Playwright
- stockage local d'artefacts : `evidences_store`

## 4. Services locaux

Le `docker-compose.yml` expose :

- `api`
- `db`
- `redis`
- `scraper`
- `frontend`

Ports utiles :

- frontend : `5173`
- API : `8000`
- PostgreSQL : `5433`
- Redis : `6379`

## 5. Endpoints structurants

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

## 6. Conventions metier a respecter

- niveaux de risque cote produit : `FAIBLE`, `MOYEN`, `FORT`
- ne pas reintroduire `LOW`, `MEDIUM`, `HIGH` dans les textes visibles utilisateur
- le citoyen verifie sans compte
- le signalement formel est separe de la simple verification
- la decision finale et l'exploitation juridique restent humaines

## 7. RBAC reel

- `ADMIN` : console nationale complete
- `SME` : espace PME uniquement
- public : `/verify`

Les routes admin ne doivent pas etre exposees au role `SME`.

## 8. Demos et seeds

Le script de seed principal est :

```bash
docker compose exec -T api python scripts/seed_demo_data.py
```

Il remplit :

- incidents citoyens multi-departements
- confirmations SOC
- transmissions simulees
- incidents d'usurpation pour la PME de demonstration

## 9. Nettoyage et artefacts

Artefacts regenerables a considerer comme non source :

- `frontend/node_modules`
- `frontend/dist`
- `mobile/.dart_tool`
- `mobile/build`
- caches Python (`__pycache__`, `.pytest_cache`, `.cache`)
- dossiers temporaires `tmp`
- bundles generes dans `evidences_store/forensic_bundles`, `reports`, `screenshots`

Ne pas confondre ces artefacts avec :

- le code source
- les assets de marque
- les preuves metier conservees volontairement dans `citizen_uploads`

## 10. Priorites actuelles

1. stabilite de demonstration
2. coherence web + mobile
3. qualite des captures de soutenance
4. coherence documentaire

## 11. Definition de "pret pour soutenance"

Une version est consideree prete si :

- `/verify` analyse et signale sans erreur
- admin voit les signalements, dossiers et transmissions
- PME voit ses alertes, signalements et dossiers
- mobile intercepte, analyse, historise et alerte
- le branding BCS est coherent sur web et mobile
- les documents racine ne mentent pas sur l'etat du produit
