# BENIN CYBER SHIELD - Plan d'implémentation

Date: 2026-04-25
Statut: prêt à exécuter
Base de référence: `docs/plans/2026-04-25-benin-cyber-shield-realignment-design.md`

## Objectif

Réaligner le dépôt avec le mémoire en faisant disparaître le paradigme `SOC / OSINT / SHIELD` au profit d'une plateforme web cohérente avec trois espaces:

- `Citoyen`
- `PME`
- `Admin`

## Stratégie générale

La migration se fait par couches:

1. fondations métier
2. flux citoyen
3. espace PME
4. espace Admin
5. dossier forensique
6. transmission automatique
7. suppression de l'héritage

## Lot 1 - Fondations métier

### Backend

- introduire les enums et statuts cibles pour `users`
- ajouter les nouveaux modèles métier
- préparer les schémas Pydantic cibles
- créer les migrations Alembic correspondantes
- maintenir temporairement l'existant tant que le nouveau domaine n'est pas branché

### Frontend

- préparer le routage cible `pme` et `admin`
- isoler les pages héritées pour future suppression
- garder `/verify` opérationnel pendant la transition

### Critère de sortie

- le dépôt peut contenir en parallèle ancien et nouveau domaine sans collision

## Lot 2 - Flux citoyen

### Backend

- remplacer `alerts` comme pivot du flux citoyen
- brancher `/api/v1/analysis/verify`
- brancher `/api/v1/signalements`
- brancher `/api/v1/signalements/with-media`
- stocker le numéro suspect en `ciphertext + hash`
- calculer score, récurrence, catégories, surlignages et conseils

### Frontend

- faire pointer `VerifySignalPanel` sur les nouvelles routes
- conserver partage WhatsApp, alerte fon, pièces jointes et confirmation de signalement

### Critère de sortie

- le parcours `verify -> signalement` fonctionne sans dépendre du domaine `alerts`

## Lot 3 - PME

### Backend

- inscription PME avec statut `PENDING_APPROVAL`
- activation uniquement après validation admin
- endpoints profil PME, dashboard, incidents, signalements, dossiers

### Frontend

- pages `/pme/register`, `/pme/dashboard`, `/pme/alertes`, `/pme/signalements`, `/pme/dossiers`, `/pme/profil`
- remplacement progressif de `/business/*`

### Critère de sortie

- une PME validée voit uniquement ses propres données

## Lot 4 - Admin

### Backend

- endpoints tableau de bord national
- validation, rejet et désactivation des PME
- listing signalements, incidents, dossiers, transmissions
- exports CSV et STIX-lite

### Frontend

- pages `/admin/dashboard`, `/admin/pme`, `/admin/signalements`, `/admin/dossiers`, `/admin/transmissions`, `/admin/exports`

### Critère de sortie

- l'admin peut piloter le système sans aucun écran `ANALYST`

## Lot 5 - Dossier forensique

- lier preuves unitaires et bundle global
- produire ZIP, JSON et PDF
- calculer hash SHA-256 global
- exposer le téléchargement PME et admin

## Lot 6 - Transmission automatique

- déclencher sur seuils mémoire
- utiliser Redis pour la file et les retries
- journaliser `PENDING`, `QUEUED`, `SENT`, `FAILED`, `RETRYING`, `DELIVERED`
- fournir deux endpoints externes simulés et signés

## Lot 7 - Suppression de l'héritage

### Backend

- supprimer `shield`
- supprimer `sources`
- supprimer `ingestion`
- supprimer `threat_intel`
- supprimer la logique `ANALYST`
- supprimer les routes héritées non réutilisées

### Frontend

- supprimer `/dashboard` analyste
- supprimer `/alerts`
- supprimer `/monitoring`
- supprimer `/ingestion`
- supprimer `/analyse`
- supprimer `/threat-map`
- supprimer `/live`
- supprimer les pages d'investigation SOC

## Vérifications minimales à chaque lot

- tests unitaires ciblés
- tests d'intégration API pour les nouvelles routes
- build frontend
- non-régression sur l'auth et `/verify` tant que la bascule n'est pas terminée

## Premier chantier à exécuter

Le premier chantier effectif doit être:

- poser les fondations du nouveau domaine métier
- préparer la bascule du rôle utilisateur vers `ADMIN` et `SME`
- supprimer la dépendance logique au rôle `ANALYST` dans le routage cible

## Risques

- coexistence trop longue entre ancien et nouveau domaine
- duplication de logique métier pendant la transition
- confusion des routes frontend si `/business` et `/pme` restent toutes deux exposées trop longtemps

## Discipline d'exécution

- chaque étape doit rester testable isolément
- éviter les renommages massifs sans route de migration
- supprimer les modules hérités dès qu'ils ne sont plus sur le chemin critique
