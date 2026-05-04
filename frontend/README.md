# Frontend - BENIN CYBER SHIELD

Application React/TypeScript/Vite du produit BENIN CYBER SHIELD.

## Surfaces couvertes

- portail citoyen : `/verify`
- console administrateur : `/admin/*`
- espace PME : `/pme/*`
- carte live nationale : `/live`

## Commandes utiles

```bash
npm install
npm run dev
npm run build
```

## Structure utile

- `src/features/verify` : parcours citoyen
- `src/features/admin` : dashboard, PME, transmissions, exports
- `src/features/business` : espace PME
- `src/features/live` : carte nationale
- `src/components/layout` : sidebars, topbars, branding
- `src/types` : contrats types frontend

## Notes

- les niveaux de risque visibles sont `FAIBLE`, `MOYEN`, `FORT`
- le frontend appelle l'API via `src/api/client.ts`
- les routes historiques `/business/*` existent encore comme redirections vers `/pme/*`
