# BENIN CYBER SHIELD - Android citoyen V1

Date: 2026-04-29
Statut: Validé
Périmètre: Application mobile Flutter Android, citoyen uniquement
Références visuelles: projet Stitch `Benin Cyber Shield` `projects/17115184682894888739`

## 1. Objectif produit

Livrer une application Android Flutter dédiée aux citoyens, cohérente avec le mémoire et avec les écrans déjà produits dans Stitch.

La V1 mobile doit reprendre le même flux que le portail citoyen web:

`Splash -> Onboarding -> Vérification -> Résultat -> Signalement formel -> Confirmation -> Partage WhatsApp`

La V1 inclut aussi:

- `Historique`
- `À propos`
- `Paramètres`

Hors périmètre de cette V1:

- lecture des notifications Android en arrière-plan
- scan Gmail / Outlook
- authentification PME

## 2. Décision d’architecture

L’application mobile sera un nouveau projet séparé sous `mobile/`.

Choix retenu:

- `Flutter`
- cible unique `Android`
- acteur unique `Citoyen`
- aucune authentification
- aucune logique de scoring locale
- toute l’intelligence métier reste côté API FastAPI

Pourquoi:

- cohérence stricte avec le mémoire
- continuité directe avec le futur lot Android natif de lecture des notifications
- réutilisation maximale du backend et du domaine métier déjà réalignés

## 3. Référence de design

Le design mobile doit suivre Stitch, pas le web responsive.

Projet Stitch confirmé:

- `projects/17115184682894888739`

Écrans de référence validés:

- `Screen 01: Splash Screen`
- `Screen 02/03/04/05: Onboarding`
- `Screen 06: Home / Vérification`
- `Screen 08: Loading State`
- `Screen 09/10/11: Résultat FAIBLE / MOYEN / ÉLEVÉ`
- `Screen 12: Signalement Formel`
- `Screen 13: Confirmation Signalement`
- `Screen 14: Historique`
- `Screen 16: À propos / Informations`
- `Screen 17: Paramètres / Configuration`
- `Screen 18: Notification Système Android` comme référence de style, pas comme feature V1
- `Screen 19: État Erreur`
- `Screen 20: Bottom Sheet : Partager sur WhatsApp`

Principes visuels:

- fond sombre compact
- surfaces superposées sans ombres
- bordures fines
- accent bleu
- `Inter` pour l’UI
- `JetBrains Mono` pour score, statuts, identifiants et métadonnées

## 4. Navigation mobile

Navigation principale recommandée:

- `Vérifier`
- `Historique`
- `À propos`
- `Paramètres`

Les écrans `Splash`, `Onboarding`, `Loading`, `Résultat`, `Signalement`, `Confirmation` et la feuille `Partager` vivent au-dessus du tab `Vérifier`.

## 5. Écrans V1

### 5.1 Splash

- branding BENIN CYBER SHIELD
- chargement court
- redirection vers onboarding ou application

### 5.2 Onboarding

- 3 à 4 écrans maximum
- message clair sur vérification, signalement et protection citoyenne
- bouton d’entrée unique vers l’app

### 5.3 Vérification

Champs:

- message suspect
- numéro suspect
- département
- URL optionnelle
- pièces jointes optionnelles

Actions:

- `Vérifier`

### 5.4 Loading

- état transitoire avec messages rotatifs
- aucune interaction superflue

### 5.5 Résultat

Contenu:

- score
- niveau de risque
- catégories détectées
- explications
- segments suspects
- recommandations
- alerte fon si applicable
- récidive du numéro
- département résolu

Actions:

- `Signaler`
- `Partager sur WhatsApp`
- retour pour corriger les données

### 5.6 Signalement formel

- reprise du message, du numéro et du résultat
- pièces jointes visibles
- confirmation explicite avant envoi

### 5.7 Confirmation

- `public_reference`
- statut initial
- confirmation du traitement
- lien rapide vers `Historique`

### 5.8 Historique

Source de vérité:

- backend, sans compte, via `device_install_id`

Affichage:

- liste de vérifications et signalements
- tri décroissant
- filtre `Tous / Vérifications / Signalements`
- numéro masqué
- score, niveau, catégorie, date
- référence publique si signalement

### 5.9 À propos

- mission
- finalité citoyenne
- confidentialité
- rôle des autorités

### 5.10 Paramètres

- langue
- réinitialiser l’onboarding
- vider le cache local
- afficher/copier le `device_install_id`
- version de l’app

## 6. Historique sans compte

Approche retenue:

- génération d’un `device_install_id` pseudonyme au premier lancement
- envoi systématique de cet identifiant sur tous les appels mobiles
- récupération d’historique depuis le backend avec ce même identifiant

Pourquoi:

- meilleure UX qu’un historique purement local
- pas de compte à créer
- l’historique suit l’installation de l’application

Limite acceptée:

- l’historique est lié à l’installation, pas à une identité personnelle

## 7. Adaptations backend requises

Le backend actuel sait vérifier et signaler, mais il ne conserve pas encore un historique de vérification mobile exploitable sans compte.

Les adaptations nécessaires sont les suivantes.

### 7.1 Persister les vérifications mobiles

Quand `channel = MOBILE_APP` et qu’un `device_install_id` est fourni:

- créer un `CitizenMessage`
- créer un `MessageAnalysis`
- attacher l’événement à l’installation mobile

Cette persistance doit se faire même si l’utilisateur ne signale pas formellement.

### 7.2 Éviter les doublons au moment du signalement

Le signalement mobile ne doit pas recréer un deuxième couple `message + analyse` si l’utilisateur signale juste après la vérification.

Le design retenu:

- la réponse `verify` mobile retourne un identifiant technique de vérification
- la requête `report` mobile le renvoie
- le backend transforme cette vérification existante en `FormalReport`

### 7.3 Étendre le modèle de données

Impact recommandé sur le domaine mémoire:

- ajouter `device_install_id` nullable et indexé à `messages`
- ajouter un indicateur permettant de distinguer une simple vérification mobile d’un signalement déjà promu

Le domaine métier principal reste inchangé:

- `messages`
- `analyses`
- `formal_reports`

### 7.4 Nouveaux endpoints

À ajouter:

- `GET /api/v1/mobile/bootstrap`
- `GET /api/v1/mobile/history`

À étendre:

- `POST /api/v1/analysis/verify`
- `POST /api/v1/signalements/with-media`

## 8. Contrat API mobile

### 8.1 Verify

`POST /api/v1/analysis/verify`

Payload mobile:

- `message`
- `phone`
- `channel = MOBILE_APP`
- `department`
- `url`
- `device_install_id`

Réponse attendue:

- score
- niveau
- explications
- catégories
- surlignages
- conseils
- alerte fon
- département résolu
- récidive
- identifiant de vérification réutilisable pour le signalement

### 8.2 Report with media

`POST /api/v1/signalements/with-media`

Multipart:

- `message`
- `phone`
- `channel = MOBILE_APP`
- `department`
- `url`
- `device_install_id`
- `verification`
- identifiant de vérification issu de `verify`
- `screenshots[]`

Réponse:

- `report_uuid`
- `public_reference`
- `status`
- `queued_for_osint`

### 8.3 Bootstrap

`GET /api/v1/mobile/bootstrap`

Doit retourner au minimum:

- départements du Bénin
- version minimale supportée
- options légères d’affichage

### 8.4 History

`GET /api/v1/mobile/history?device_install_id=...`

Doit retourner:

- liste chronologique des vérifications et signalements
- pagination simple
- type d’entrée `VERIFY` ou `REPORT`
- score, niveau, catégorie
- numéro masqué
- référence publique si présente

## 9. Données locales et confidentialité

Stockage local minimal:

- `device_install_id`
- état onboarding
- préférences simples
- dernier cache de l’historique

Règles:

- pas de numéro en clair dans l’historique local
- purge des pièces jointes temporaires après envoi
- bouton utilisateur pour vider les données locales
- pas de logs de contenu sensible en production

## 10. Stack Flutter recommandée

- `flutter_riverpod`
- `go_router`
- `dio`
- `freezed`
- `json_serializable`
- `flutter_secure_storage`
- `shared_preferences`
- `image_picker`
- `share_plus`
- `intl`

## 11. Critères d’acceptation

La V1 mobile est prête si:

- un citoyen peut vérifier un message sans compte
- le résultat expose toutes les données utiles du moteur d’analyse
- le signalement avec médias fonctionne
- la confirmation affiche une référence publique
- le partage WhatsApp fonctionne
- l’historique remonte depuis le backend sans compte via `device_install_id`
- le dernier historique reste visible hors ligne
- le design suit Stitch et reste lisible sur petit écran Android

## 12. Risques et arbitrages

Risque principal:

- l’historique mobile sans compte exige une petite extension propre du domaine backend

Arbitrage retenu:

- pas de surcouche métier parallèle
- réutilisation du domaine `messages / analyses / formal_reports`
- persistance des vérifications mobiles directement dans ce domaine

## 13. Découpage de livraison

### V1-A

- scaffold Flutter
- thème Stitch
- splash
- onboarding
- écran `Vérifier`
- intégration `verify`
- écrans de résultat

### V1-B

- signalement avec médias
- confirmation
- historique backend
- à propos
- paramètres
- finitions Android
