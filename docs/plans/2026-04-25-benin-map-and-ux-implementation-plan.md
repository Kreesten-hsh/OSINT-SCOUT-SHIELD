# Benin Map And UX Implementation Plan

**Goal:** Brancher la carte Benin sur le domaine memoire et simplifier les parcours admin/PME autour de cette vue territoriale.

**Architecture:** Le backend produit un read model cartographique par departement. Le frontend reutilise ce read model dans une mini-carte dashboard et une page `/live` complete. Les formulaires citoyens enrichissent les messages avec un departement explicite ou derive.

**Tech Stack:** FastAPI, SQLAlchemy Async, Alembic, React, TypeScript, TanStack Query, SVG inline, Vite

## Work Items

1. Ajouter `department` et `department_source` au domaine memoire
2. Etendre les schemas citizen verify/report
3. Ajouter le read model `admin/map/overview`
4. Ajouter la creation admin de PME
5. Construire les composants carte Benin cote frontend
6. Integrer la mini-carte dans le dashboard admin
7. Refaire `/live`
8. Ajouter les CTA `Verifier un message`
9. Ajouter `Ajouter une PME`
10. Verifier build et redemarrer le frontend
