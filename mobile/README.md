# Mobile - BENIN CYBER SHIELD

Application Flutter Android connectee au backend BENIN CYBER SHIELD.

## Role dans le produit

L'application mobile agit comme un bouclier passif :

- lecture des notifications surveillees
- analyse via l'API
- historique local
- alertes locales BCS
- reprise des analyses en attente

## Ecrans

- `Accueil`
- `Historique`
- `Parametres`

## Lancement local

```bash
flutter run --dart-define=BCS_API_BASE_URL=http://<IP_DU_PC>:8000/api/v1
```

Le telephone et le PC doivent etre sur le meme reseau pour les tests reels.

## Dependances fonctionnelles

- autorisation d'acces aux notifications
- backend API joignable
- applications surveillees activees dans les parametres de l'app

## Notes

- l'historique affiche dans l'app provient du stockage local et du backend mobile
- l'ouverture d'une alerte BCS redirige vers l'onglet Historique
- le niveau de risque affiche est `FAIBLE`, `MOYEN` ou `FORT`
