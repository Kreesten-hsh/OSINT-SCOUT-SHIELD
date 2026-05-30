# Checklist operationnelle pour la soutenance BCS

## Verite technique a retenir

La plateforme publique Vercel + Render permet de presenter le portail, l'analyse, les comptes, l'inscription PME, la validation par l'administrateur et les alertes PME issues des signalements.

La capture OSINT complete du lien suspect depend du service `bcs-scraper` Playwright. Dans `render.yaml`, `ENABLE_FORENSIC_CAPTURE` est active et un worker Render dedie est declare. En production, le flux attendu est donc : API Render -> Redis Upstash -> worker `bcs-scraper` -> Redis Upstash -> API Render.

Point de vigilance : le worker est configure en plan `free` pour eviter une facturation automatique. Si Render arrete le worker par manque de memoire pendant Playwright/Chromium, il faudra passer uniquement `bcs-scraper` sur un plan avec plus de RAM.

## Verification production avant le jour J

1. Pousser `render.yaml` sur la branche deployee par Render.
2. Dans Render, verifier que deux services existent :

- `bcs-api`
- `bcs-scraper`

3. Dans `bcs-api`, verifier :

- `ENABLE_FORENSIC_CAPTURE=true`
- `ENABLE_RESULT_CONSUMER=true`
- `REDIS_URL` pointe vers Upstash

4. Dans `bcs-scraper`, verifier :

- `REDIS_URL` pointe vers le meme Upstash
- le dernier deploy est termine
- les logs affichent `Waiting for tasks on 'osint_to_scan'`

5. Soumettre un message avec lien depuis `https://osint-scout-shield.vercel.app/verify`, puis creer le signalement formel.
6. Lire les logs de `bcs-scraper` : le worker doit afficher `Processing task` puis `Report queued`.
7. Lire les logs de `bcs-api` : le result consumer doit traiter un message venant de `osint_results`.

## Plan de secours local le jour J

1. Lancer Docker Desktop avant la soutenance.
2. Demarrer la plateforme locale :

```powershell
cd "C:\Users\AGBOTON\OneDrive\Bureau\OSINT-SCOUT & SHIELD"
docker.exe compose up -d --build
```

3. Verifier que les services sont actifs :

```powershell
docker.exe compose ps
```

Services attendus :

- `osint_api`
- `osint_db`
- `osint_redis`
- `osint_scraper`
- `osint_frontend`

4. Ouvrir l'application web locale :

```text
http://localhost:5173/verify
```

5. Tester un message suspect avec lien :

```text
Vous avez gagne 250000 FCFA. Cliquez vite sur https://mtn-bonus-client.com et saisissez votre PIN MoMo pour recevoir le retrait.
```

6. Creer le signalement formel apres l'analyse.
7. Verifier que le scraper consomme la file OSINT :

```powershell
docker.exe compose logs scraper --tail=80
```

8. Verifier que l'API recoit les resultats OSINT :

```powershell
docker.exe compose logs api --tail=120
```

## Demo PME

1. Creer une PME depuis la page d'inscription PME.
2. Se connecter comme administrateur.
3. Aller dans la console PME et accepter la PME.
4. Se connecter avec le compte PME.
5. Depuis le portail citoyen, soumettre un message contenant un mot-cle de la PME validee.
6. Creer le signalement formel.
7. Revenir sur le tableau de bord PME : les pages `dashboard`, `alertes`, `signalements` et `dossiers` se rafraichissent automatiquement toutes les 5 secondes.

## Formulation sure pour l'oral

Dire :

> Lorsque le service OSINT est active, la plateforme place le lien suspect dans une file de traitement. Un worker Playwright ouvre alors la page dans un environnement automatise, capture une image, recupere le contenu de la page et conserve une empreinte du code source. Le resultat revient ensuite vers l'API pour enrichir l'alerte.

Eviter de dire que cette capture est forcement active sur le deploiement public gratuit tant que le worker scraper n'est pas deploye comme service permanent.
