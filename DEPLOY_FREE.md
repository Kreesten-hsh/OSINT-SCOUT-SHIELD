# Deploiement gratuit

Ce depot peut etre publie gratuitement, mais pas avec une parite parfaite par rapport a la stack locale Docker complete.

Le meilleur montage gratuit pour ce projet est :

- `frontend` sur `Vercel Hobby`
- `backend` sur `Render Free Web Service`
- `PostgreSQL` sur `Supabase Free`
- `Redis` sur `Upstash Redis Free`

Le composant qui ne rentre pas proprement dans un hebergement 100% gratuit est le worker `scrapers/` Playwright. Pour cette raison, le deploiement gratuit desactive la capture forensique automatisee via `ENABLE_FORENSIC_CAPTURE=false`.

Le produit reste exploitable pour :

- portail citoyen web
- authentification admin / PME
- verification et signalement
- dashboard admin
- dashboard PME
- historique mobile et synchronisation
- transmissions externes simulees

Limites du mode gratuit :

- `Render Free` endort le backend apres 15 minutes d'inactivite
- `Render Free` ne garantit pas un service toujours chaud
- `Supabase Free` peut etre mis en pause en cas de faible activite
- `Upstash Free` a des quotas
- la capture Playwright automatisee n'est pas activee
- les artefacts locaux ne doivent pas etre consideres comme persistants en mode gratuit

## 1. Frontend Vercel

Projet : `frontend/`

Variables :

- `VITE_API_URL=https://<ton-backend-render>/api/v1`

Le fichier [vercel.json](/abs/c:/Users/AGBOTON/OneDrive/Bureau/OSINT-SCOUT%20&%20SHIELD/frontend/vercel.json) force le bon comportement SPA pour React Router.

## 2. Backend Render

Utilise [render.yaml](/abs/c:/Users/AGBOTON/OneDrive/Bureau/OSINT-SCOUT%20&%20SHIELD/render.yaml) ou cree le service manuellement.

Service :

- type : `Web Service`
- runtime : `Docker`
- plan : `Free`
- dockerfile : `backend/Dockerfile`
- context : `backend`

Variables Render a renseigner :

- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`
- `PHONE_ENCRYPTION_SECRET`
- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_SME_EMAIL`
- `AUTH_SME_PASSWORD`
- `BACKEND_CORS_ORIGINS`
- `EXTERNAL_TRANSMISSION_SHARED_SECRET`
- `EXTERNAL_ANSSI_RECEIVER_URL`
- `EXTERNAL_OPERATORS_RECEIVER_URL`

Variables recommandees :

- `ENABLE_FORENSIC_CAPTURE=false`
- `ENABLE_RESULT_CONSUMER=true`
- `ENABLE_EXTERNAL_TRANSMISSION_CONSUMER=true`

### Valeurs conseillees

`BACKEND_CORS_ORIGINS`

```json
["https://<ton-frontend-vercel>.vercel.app"]
```

`EXTERNAL_ANSSI_RECEIVER_URL`

```text
https://<ton-backend-render>/api/v1/external/anssi-ocrc/receive
```

`EXTERNAL_OPERATORS_RECEIVER_URL`

```text
https://<ton-backend-render>/api/v1/external/operators/receive
```

## 3. Base PostgreSQL Supabase

Recupere la chaine Postgres publique de ton projet Supabase et affecte-la a `DATABASE_URL`.

Exemple :

```text
postgresql+asyncpg://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

## 4. Redis Upstash

Creer une base Redis gratuite Upstash et injecter l'URL dans `REDIS_URL`.

Exemple :

```text
redis://default:<password>@<region>.upstash.io:6379
```

## 5. Mobile

L'application mobile n'est pas "hebergee" comme le web.

Pour la connecter au backend public :

```powershell
flutter build apk --release --dart-define=BCS_API_BASE_URL=https://<ton-backend-render>/api/v1 --dart-define=BCS_CITIZEN_PORTAL_URL=https://<ton-frontend-vercel>.vercel.app/verify
```

## 6. Verdict

Ce montage gratuit est le meilleur compromis praticable.

Il n'est pas equivalent a une vraie production payante, mais il suffit pour :

- soutenance
- demonstration publique
- acces distant stable a faible trafic
- tests fonctionnels hors local
