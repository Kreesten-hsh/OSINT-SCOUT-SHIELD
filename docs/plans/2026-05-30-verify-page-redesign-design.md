# Verify Page Redesign Design

## Objectif

Refondre la page publique `/verify` pour obtenir une experience citoyenne moderne, lisible en mode clair et credible en demonstration de soutenance.

## Direction retenue

La page devient un portail operationnel, pas une landing page. L'utilisateur doit comprendre en quelques secondes qu'il peut coller un SMS, un message WhatsApp ou un lien suspect, obtenir un score lisible, puis creer un signalement formel.

## Principes UI

- Header compact avec retour accueil, telechargement Android et bascule clair/sombre.
- Hero asymetrique : explication a gauche, chaine de traitement visuelle a droite.
- Formulaire structure en zone principale et colonne de contexte.
- Ecran de chargement sous forme de progression d'analyse, sans overlay lourd.
- Resultat avec score, niveau de risque, message analyse tres lisible et actions recommandees.
- Mode clair prioritaire pour les captures du memoire.

## Fichiers concernes

- `frontend/src/features/verify/VerifyPage.tsx`
- `frontend/src/features/verify/VerifySignalPanel.tsx`
- `frontend/src/features/verify/HighlightedMessage.tsx`

## Verification

- Compiler avec `npm.cmd run build` dans `frontend`.
- Tester visuellement `/verify` en mode clair et sombre.
- Tester un message suspect avec numero beninois valide.
