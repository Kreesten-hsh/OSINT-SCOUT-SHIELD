# BENIN CYBER SHIELD v3.0 - Guide de Demo Soutenance

## Objectif

Ce guide permet de rejouer la soutenance complete en conditions reelles:
carte vivante, verification citoyenne, campagne coordonnee, preservation
forensic, dossier CRIET et vue nationale analyste.

## Prerequis

- Docker Desktop demarre
- Ports libres: `8000`, `5173`, `6379`, `8080`
- Frontend et backend construits depuis la racine du projet
- Variables de demo presentes dans `.env`

Credentials de demo lus dans `.env`:

- Admin: `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD`
- Analyste: `AUTH_ANALYST_EMAIL` / `AUTH_ANALYST_PASSWORD`
- SME: `AUTH_SME_EMAIL` / `AUTH_SME_PASSWORD`

Valeurs locales actuellement configurees:

- Admin: `admin@osint.com` / `adminosint`
- Analyste: `analyst@osint.com` / `analystosint`
- SME: `sme@osint.com` / `smeosint`

## Demarrage J-1

```bash
# 1. Redemarrage complet et verification de base
bash backend/scripts/verify_cold_start.sh

# 2. Seed de 30 incidents repartis sur le Benin
cd backend
python scripts/seed_demo_data.py
cd ..

# 3. Faux site de phishing pour la demo U5
bash backend/scripts/serve_fake_site.sh
```

Ouvrir ensuite:

- Frontend public: `http://localhost:5173/verify`
- Carte vivante: `http://localhost:5173/live`
- Dashboard analyste: `http://localhost:5173/dashboard`
- Threat map: `http://localhost:5173/threat-map`
- Rapports: `http://localhost:5173/reports`

## Ce que fait le seed

Le script `backend/scripts/seed_demo_data.py` envoie exactement 30
signalements via `POST /api/v1/incidents/report`, avec les champs reels:

- `message`
- `phone`
- `channel`
- `url` si une URL est detectee dans le texte

Le script charge automatiquement le fichier `.env` a la racine du projet
avant de lire `AUTH_ADMIN_EMAIL` et `AUTH_ADMIN_PASSWORD`.

Ensuite il:

- se connecte via `POST /api/v1/auth/login` avec `username/password`
- confirme environ 35% des incidents via `PATCH /api/v1/incidents/{alert_uuid}/decision`
- declenche quelques actions SHIELD via `POST /api/v1/shield/actions/dispatch`

## Script de demo - 5 minutes

| Temps | Action | URL | Phrase cle |
|-------|--------|-----|------------|
| 0:00 | Projeter la carte vivante | `/live` | "Chaque point ici represente un signalement citoyen consolide au niveau national." |
| 0:40 | Coller le message MTN principal | `/verify` | "On part d'un simple SMS recu par un citoyen." |
| 1:05 | Montrer score, surlignages et conseils | `/verify` | "Le rouge signale les elements dangereux, et le systeme explique pourquoi." |
| 1:25 | Cliquer sur WhatsApp | `wa.me` | "En un clic, la victime potentielle peut prevenir sa famille." |
| 1:40 | Signaler le message | `/verify` | "Le citoyen alimente immediatement l'intelligence collective." |
| 2:00 | Revenir sur la carte | `/live` | "Le point apparait, la carte se met a jour." |
| 2:20 | Ouvrir la liste analyste | `/incidents-signales` | "Les analystes voient les incidents citoyens consolides." |
| 2:45 | Montrer le bandeau de campagne | `/dashboard` | "Quand 5 signaux convergent en 2 heures, une campagne coordonnee est detectee." |
| 3:05 | Confirmer un incident | `/incidents-signales` | "La validation SOC prend quelques secondes." |
| 3:25 | Montrer un dispatch SHIELD | `/dashboard` | "Le systeme peut pousser une action operateur simulee." |
| 3:45 | Telecharger le dossier CRIET | `/reports` | "Le bundle ZIP contient PDF, snapshot JSON et manifest d'integrite." |
| 4:10 | Basculer sur la threat map | `/threat-map` | "On change d'echelle: du cas individuel a la vision nationale." |
| 4:45 | Conclusion | - | "Du signal citoyen a la politique publique, sans rupture de chaine." |

## Messages de test a copier-coller

### Message 1 - MTN HIGH

```text
URGENT MTN: Transfert errone de 45.000 FCFA detecte.
Renvoyez le code 7829 au 66441122 sous 30 minutes.
Sinon votre compte sera bloque. Agent MTN Benin.
```

Attendu:

- `HIGH`
- `MM_FRAUD`
- surlignages rouge/orange
- bouton WhatsApp visible

### Message 2 - Emploi fictif

```text
Felicitations! Vous etes selectionne pour un poste a Dubai.
Envoyez 75.000 FCFA de frais de visa au 96112233.
Repondez sur WhatsApp.
```

Attendu:

- `HIGH`
- `FAKE_RECRUITMENT`
- `fcfa_amount_in_message`
- `whatsapp_number`

### Message 3 - Phishing bancaire avec preservation forensic

```text
Compte UBA bloque. Verifiez sur http://localhost:8080
dans les 2 heures. Service Securite UBA Benin.
```

Attendu:

- `HIGH`
- `PHISHING_BANCAIRE`
- `suspicious_url`
- push automatique dans `osint_to_scan`

### Message 4 - Fausse loterie

```text
Samsung Galaxy S24 vous attend! Frais livraison
25.000 FCFA au 66778899 MTN. Reclamez dans 24h.
```

Attendu:

- `HIGH`
- `FAKE_LOTTERY`

### Message 5 - Message sain

```text
Bonjour, votre colis est disponible au bureau
de poste. Merci de vous presenter avec une piece
d'identite.
```

Attendu:

- `LOW`
- aucune alerte forte

## Ordre operatoire pendant la demo

1. Ouvrir `/live` avant de parler.
2. Garder un deuxieme onglet sur `/verify`.
3. Connecter l'analyste dans un troisieme onglet sur `/dashboard`.
4. Quand le message 3 est signale, laisser tourner le faux site `http://localhost:8080`.
5. Apres le signalement, verifier:
   - la presence du point sur `/live`
   - la presence du bandeau campagne sur `/dashboard`
   - la presence du dossier CRIET sur `/reports`
6. Finir sur `/threat-map`.

## Plan B

| Probleme | Solution immediate |
|----------|--------------------|
| `/live` ne charge pas | Basculer sur `/threat-map` pour montrer les aggregations |
| Playwright timeout | Montrer le faux site puis expliquer que le job est pousse en file Redis |
| Docker lent | Ouvrir directement `/verify`, puis `/reports`, puis `/threat-map` |
| Carte Leaflet vide | Montrer les graphiques Recharts de `/threat-map` |
| ZIP CRIET indisponible | Generer le PDF seul puis montrer le manifest en expliquant la structure du bundle |
| API indisponible | Utiliser le seed, les logs et la demonstration pre-enregistree si elle a ete preparee |

## Checklist finale J-1

- [ ] `bash backend/scripts/verify_cold_start.sh`
- [ ] `cd backend && python scripts/seed_demo_data.py`
- [ ] `pytest -q --tb=short`
- [ ] `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit`
- [ ] `cd frontend && npm run build`
- [ ] `/health` retourne `db=ok` et `redis=ok`
- [ ] `/live` affiche des points
- [ ] `/verify` retourne un score `HIGH` pour le message 1
- [ ] le bouton WhatsApp est visible pour `HIGH` ou `MEDIUM`
- [ ] `/dashboard` montre le bandeau campagne si le seuil est atteint
- [ ] `/reports` permet le telechargement du dossier CRIET
- [ ] `/threat-map` affiche des graphiques non vides
- [ ] export CSV disponible depuis `/threat-map`
- [ ] repetition complete x3 en moins de 5 min 30

## Endpoints utiles pour la soutenance

- Login JSON: `POST /api/v1/auth/login`
- Rapport citoyen: `POST /api/v1/incidents/report`
- Decision SOC: `PATCH /api/v1/incidents/{alert_uuid}/decision`
- Dispatch SHIELD: `POST /api/v1/shield/actions/dispatch`
- Heatmap publique: `GET /api/v1/map/heatmap`
- Dashboard threat intel: `GET /api/v1/threat-intel/dashboard`

## Fichiers de demo

- `backend/scripts/seed_demo_data.py`
- `backend/scripts/verify_cold_start.sh`
- `backend/scripts/serve_fake_site.sh`
- `backend/scripts/fake_phishing_site/index.html`
