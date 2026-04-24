# BENIN CYBER SHIELD - Design de réalignement produit

Date: 2026-04-25
Statut: Validé
Référence fonctionnelle: mémoire de licence

## 1. Décision produit

Le mémoire devient la source de vérité stricte du produit.

Le projet cible doit désormais couvrir le flux suivant:

`vérification citoyenne -> signalement formel -> détection d'usurpation PME -> dossier forensique -> transmission automatique ANSSI/OCRC et opérateurs`

Le dépôt actuel contient encore une logique héritée orientée `SOC / OSINT / SHIELD` qui ne correspond plus à cette cible. Cette logique doit être retirée progressivement du produit final.

## 2. Approche retenue

Approche choisie: `migration strangler`.

Principe:

- réutiliser ce qui est déjà bon dans l'existant
- introduire un nouveau domaine métier conforme au mémoire
- basculer les routes et écrans vers ce nouveau domaine
- supprimer ensuite les modules hérités

Pourquoi ce choix:

- plus propre qu'un refactor cosmétique
- moins risqué qu'une réécriture complète
- permet de conserver le moteur de détection, une partie du flux citoyen, l'auth JWT et la génération de preuves

## 3. Périmètre du lot web 1

Le lot immédiat couvre uniquement:

- `Citoyen` public
- `PME`
- `Admin`

Hors lot immédiat:

- `Android natif`
- `scan Gmail / Outlook via OAuth`

Ces deux chantiers doivent exister dans l'architecture cible, mais ne sont pas livrés dans le premier lot web.

## 4. Rôles et espaces applicatifs

Rôles conservés:

- `ADMIN`
- `SME`

Rôles supprimés du produit cible:

- `ANALYST`

Espaces applicatifs cibles:

- espace public `Citoyen`
- espace privé `PME`
- espace privé `Admin`

## 5. Fonctionnalités cibles du lot web 1

### 5.1 Citoyen

- vérifier un message suspect sans compte
- obtenir un score de risque
- voir les éléments suspects surlignés
- lire des conseils pratiques
- voir l'alerte en langue fon si applicable
- partager une alerte via WhatsApp
- signaler formellement un message
- alimenter la détection de récidive sur les numéros suspects

### 5.2 PME

- s'inscrire sur la plateforme
- rester en attente tant que l'admin ne valide pas le compte
- se connecter après validation
- voir les alertes d'usurpation liées à son identité
- consulter les signalements liés
- consulter un tableau de bord PME
- télécharger des dossiers probatoires

### 5.3 Admin

- valider, rejeter ou désactiver les comptes PME
- gérer les comptes utilisateurs
- consulter le tableau de bord national
- consulter les signalements
- consulter les dossiers forensiques
- superviser les transmissions externes
- exporter les données CSV et STIX-lite

### 5.4 Transmission externe

La logique du mémoire est conservée dès le lot web 1:

- détection automatique des seuils
- mise en file des transmissions
- retries automatiques
- endpoints externes simulés mais branchables

## 6. Choix de sécurité validés

Les numéros suspects sont stockés en:

- `phone_ciphertext`
- `phone_hash`

Objectif:

- utiliser `phone_hash` pour la déduplication, les seuils et les recherches internes
- utiliser `phone_ciphertext` pour les transmissions autorisées ANSSI/OCRC et opérateurs

Conséquences:

- pas de numéro en clair dans les listes usuelles ni dans les logs
- conservation d'une capacité de transmission réelle

## 7. Modèle de données cible

### 7.1 Entités principales

- `users`
- `business_profiles`
- `messages`
- `analyses`
- `suspect_numbers`
- `formal_reports`
- `impersonation_incidents`
- `evidence_items`
- `forensic_bundles`
- `external_transmissions`

### 7.2 Description des entités

#### `users`

- rôles `ADMIN` ou `SME`
- statut `PENDING_APPROVAL | ACTIVE | REJECTED | DISABLED`

#### `business_profiles`

- profil PME lié à un `user`
- nom officiel
- mots-clés
- numéros légitimes
- statut de validation
- admin validateur et date de validation

#### `messages`

- contenu soumis par le citoyen
- canal `WEB_PORTAL | MOBILE_APP`
- date d'analyse
- éventuelle URL suspecte

#### `analyses`

- score de risque
- niveau de risque
- catégories détectées
- règles détectées
- recommandations
- surlignages
- alerte fon

#### `suspect_numbers`

- numéro chiffré
- hash dérivé
- compteur de signalements
- première détection
- dernière détection

#### `formal_reports`

- référence publique de signalement
- horodatage
- statut
- liens vers message, analyse et numéro suspect

#### `impersonation_incidents`

- incident d'usurpation lié à une PME
- déclenché automatiquement depuis un signalement

#### `evidence_items`

- preuves unitaires
- captures, HTML, JSON, images citoyennes
- hash individuel

#### `forensic_bundles`

- dossier probatoire généré
- hash SHA-256 global
- manifeste
- chemins ZIP, PDF, JSON
- statut de transmission

#### `external_transmissions`

- cible `ANSSI_OCRC` ou `OPERATORS`
- payload transmis
- statut
- nombre de tentatives
- accusé de réception
- prochaine tentative

## 8. Stratégie de migration

Ordre retenu:

1. créer le nouveau schéma de données
2. brancher les nouveaux services métier
3. basculer le flux citoyen
4. construire les espaces PME et Admin
5. brancher les dossiers forensiques
6. brancher la transmission automatique
7. supprimer les modules hérités

Décision importante:

- le nouveau domaine métier devient la vraie source de vérité
- l'ancien domaine `alerts / SOC / SHIELD / monitoring` n'est pas conservé comme pivot long terme

## 9. Architecture applicative cible

### 9.1 Frontend

- `/verify`
- `/login`
- `/pme/register`
- `/pme/dashboard`
- `/pme/alertes`
- `/pme/signalements`
- `/pme/dossiers`
- `/pme/profil`
- `/admin/dashboard`
- `/admin/pme`
- `/admin/signalements`
- `/admin/dossiers`
- `/admin/transmissions`
- `/admin/exports`

### 9.2 Backend API

#### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

#### Citoyen

- `POST /api/v1/analysis/verify`
- `POST /api/v1/signalements`
- `POST /api/v1/signalements/with-media`

#### PME

- `POST /api/v1/pme/register`
- `GET /api/v1/pme/dashboard`
- `GET /api/v1/pme/incidents`
- `GET /api/v1/pme/signalements`
- `GET /api/v1/pme/dossiers`
- `GET /api/v1/pme/profile`
- `PATCH /api/v1/pme/profile`

#### Admin

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/pme`
- `PATCH /api/v1/admin/pme/{id}/approve`
- `PATCH /api/v1/admin/pme/{id}/reject`
- `PATCH /api/v1/admin/pme/{id}/disable`
- `GET /api/v1/admin/signalements`
- `GET /api/v1/admin/incidents`
- `GET /api/v1/admin/dossiers`
- `GET /api/v1/admin/transmissions`
- `POST /api/v1/admin/exports/csv`
- `POST /api/v1/admin/exports/stix-lite`

#### Externe

- `POST /api/v1/external/anssi-ocrc/receive`
- `POST /api/v1/external/operators/receive`

### 9.3 Services métier

- `detection_service`
- `reporting_service`
- `impersonation_service`
- `forensic_bundle_service`
- `transmission_service`
- `retry_worker`

### 9.4 Infrastructure

- `PostgreSQL` pour les données métier
- `Redis` pour files d'attente, retries et fenêtres de seuil

## 10. Modules hérités à supprimer

### Backend

- `shield`
- `operators` callback actuel
- `sources`
- `ingestion`
- `alerts` comme pivot métier
- `threat_intel`
- logique `SOC`
- logique `monitoring_sources / scraping_runs`

### Frontend

- `/dashboard` analyste actuel
- `/alerts`
- `/monitoring`
- `/ingestion`
- `/analyse`
- `/threat-map`
- `/live`
- écrans `investigation`
- blocs `SOC / SHIELD`

## 11. Réutilisation ciblée

Éléments à conserver et recâbler:

- moteur de détection
- panneau de vérification citoyen
- uploads d'images citoyennes
- génération PDF/JSON/ZIP
- auth JWT
- Redis pour file d'attente et retries

## 12. Sécurité, erreurs et qualité

### 12.1 Sécurité

- JWT obligatoire sur les espaces privés
- contrôle de rôle et de périmètre
- HMAC ou secret partagé pour endpoints externes simulés
- hash global SHA-256 sur chaque dossier forensique
- traçabilité des actions sensibles
- aucun secret ni numéro en clair dans les logs

### 12.2 Gestion des erreurs

- une panne externe ne doit jamais casser le web
- les transmissions doivent être idempotentes
- les uploads doivent être bornés par type, taille et nombre
- les statuts doivent rester explicites

Statuts cibles pour les transmissions:

- `PENDING`
- `QUEUED`
- `SENT`
- `FAILED`
- `RETRYING`
- `DELIVERED`

### 12.3 Tests

Tests requis:

- unitaires sur détection, chiffrement, matching PME, seuils, bundles et retries
- intégration API sur parcours citoyen, admin et PME
- E2E frontend sur les trois parcours principaux
- non-régression sur les modules conservés

## 13. Ordre d'implémentation validé

1. nouveau schéma de données
2. nouvelle API citoyenne
3. auth et inscription PME avec validation admin
4. espaces web PME et Admin
5. branchement des dossiers forensiques
6. transmission automatique avec Redis et endpoints simulés
7. suppression des modules hérités
8. stabilisation démo, tests et documentation
9. ouverture des lots `Android natif` puis `Gmail / Outlook OAuth`

## 14. Décision finale

Le produit doit sortir du paradigme `SOC / OSINT / SHIELD` et devenir une plateforme cohérente avec le mémoire:

- citoyen
- PME
- admin
- preuve forensique
- transmission externe

Le lot web 1 doit livrer cette cohérence avant toute extension Android ou email.
