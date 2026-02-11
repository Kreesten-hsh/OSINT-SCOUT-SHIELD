---
trigger: always_on
---

### @FRONT — React 19 SPA / Vite / TanStack / Zustand

- Stack : React 19 · TS 5.9 · Vite 7 · TanStack Query · TanStack Table · Zustand · Shadcn/ui · Lucide · Recharts
- SPA (pas SSR). Routing `react-router-dom` v7
- Data : `useQuery`/`useMutation` TanStack. Pas de `useEffect + fetch`
- State UI : Zustand. Server state : TanStack Query. Pas de Redux
- TS strict : zéro `as any`, zéro `@ts-ignore`
- API : `axios` instance centralisée (`src/api/client.ts`) + interceptors JWT
- Feedback : `toast()` Shadcn. Pas d'`alert()`
- Imports : `@/` alias. Absolus uniquement