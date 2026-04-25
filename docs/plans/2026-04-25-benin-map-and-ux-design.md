# Benin Map And UX Design

## Goal

Rendre la carte du Benin utile au produit BENIN CYBER SHIELD en la branchant sur le domaine memoire, puis simplifier les parcours admin et PME autour de cette veille territoriale.

## Product Direction

- La carte devient une vue nationale par `12 departements`.
- La source de verite est le domaine memoire `messages -> analyses -> formal_reports`.
- Le dashboard admin affiche une mini-carte cliquable a la place de `Statuts des signalements`.
- La page `/live` devient une vraie page de veille nationale avec carte, filtres et insights utiles.
- Les espaces admin et PME exposent un acces direct a `Verifier un message`.
- La gestion PME permet aussi une creation directe par l admin.

## Data Model

- Ajouter `department` sur `messages`
- Ajouter `department_source` sur `messages`
- Fallback automatique depuis le prefixe du numero si l utilisateur ne choisit pas de departement
- Valeurs de `department_source`:
  - `USER_SELECTED`
  - `PHONE_DERIVED`
  - `UNKNOWN`

## API

- Etendre `POST /api/v1/analysis/verify` avec `department`
- Etendre `POST /api/v1/signalements/with-media` avec `department`
- Ajouter `GET /api/v1/admin/map/overview`
- Ajouter `POST /api/v1/admin/pme`

## UI

- `AdminDashboardPage`
  - mini-carte Benin cliquable
  - conserve le fond sombre
  - affiche l intensite par departement
- `LivePage`
  - carte Benin plein ecran utile
  - filtres periode / risque / categorie
  - panneau lateral d insights
- `Topbar`
  - `Tester canal citoyen` devient `Verifier un message`
- `BusinessVerifyPage`
  - ajout du bouton `Verifier un message`
- `AdminBusinessesPage`
  - ajout du bouton `Ajouter une PME`

## UX Constraints

- interface lisible sans surcharge
- priorite visuelle a la carte
- responsive mobile / tablette / desktop
- zero retour au jargon SOC legacy dans les libelles visibles
