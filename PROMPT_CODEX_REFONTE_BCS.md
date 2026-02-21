# PROMPT CODEX — REFONTE BENIN CYBER SHIELD
> Agent cible : Codex GPT-5.3 | Projet : OSINT-SCOUT & SHIELD | Version : v2.0-refonte

---

## 🎭 RÔLE & MISSION

Tu es un ingénieur logiciel senior fullstack (FastAPI + React TypeScript) travaillant sur le projet **BENIN CYBER SHIELD** (OSINT-SCOUT & SHIELD). Tu connais déjà l'intégralité du codebase. Ta mission dans cette session est d'exécuter une **refonte architecturale frontend ciblée** pour aligner l'application sur les vrais besoins de ses trois acteurs réels.

Tu n'inventes rien. Tu ne réécris pas ce qui fonctionne. Tu **redistribues, protèges par rôle, et complètes** ce qui existe.

---

## 📌 CONTEXTE DE LA REFONTE

### Problème actuel
L'app React actuelle est une **single app mélangée** : un seul `RequireAuth` sans distinction de rôle, toutes les pages accessibles à tout utilisateur connecté. Cela ne correspond pas aux trois acteurs réels du système.

### Les trois acteurs réels et leurs espaces

| Acteur | Rôle JWT | Espace | Accès |
|---|---|---|---|
| Citoyen | Aucun (public) | `/verify` | Sans login |
| Agent ANSSI/OCRC | `ANALYST` ou `ADMIN` | `/dashboard` et sous-pages | Après login |
| PME | `SME` | `/business/*` | Après login |

### Règle fondamentale
> **Ne jamais casser les routes backend existantes.** Toute évolution est frontend-only sauf pour les tâches P0 backend explicitement listées.

---

## ✅ CE QUI EXISTE DÉJÀ — NE PAS TOUCHER

```
/verify                          → public, citoyen ✅
/login                           → public ✅
/dashboard                       → analyste ✅
/incidents-signales              → analyste ✅
/incidents-signales/:id          → analyste ✅
/alerts + /alerts/:id            → analyste ✅
/monitoring + /monitoring/:id    → analyste ✅
/ingestion                       → analyste ✅
/analyse                         → analyste ✅
/reports + /reports/:id          → analyste ✅
/evidence                        → analyste ✅
/settings                        → analyste ✅
```

Backend API — contrat à ne pas modifier :
```
POST /api/v1/signals/verify
POST /api/v1/incidents/report
GET  /api/v1/incidents/citizen
GET  /api/v1/incidents/citizen/:id
PATCH /api/v1/incidents/:id/decision
POST /api/v1/shield/actions/dispatch
GET  /api/v1/sources
GET  /api/v1/alerts
GET  /api/v1/reports
```

---

## 🎯 TÂCHES À EXÉCUTER — DANS L'ORDRE STRICT

---

### P0 — TÂCHE 1 : Ajouter le rôle dans le JWT (Backend)

**Fichier cible :** `backend/app/api/v1/endpoints/auth.py`

**Instruction :**
Au moment du login, le token JWT retourné doit inclure le champ `role` de l'utilisateur.

**Contraintes :**
- Ne pas modifier le schéma de la table `users` si le champ `role` existe déjà
- Si le champ `role` n'existe pas, créer une migration Alembic : valeurs possibles `ADMIN`, `ANALYST`, `SME`
- Valeur par défaut : `ANALYST`

**Output attendu :**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "agent@anssi.bj",
    "role": "ANALYST"
  }
}
```

**Validation :** `POST /api/v1/auth/login` retourne bien le `role` dans la réponse.

---

### P0 — TÂCHE 2 : Mettre à jour le store Auth frontend

**Fichier cible :** `frontend/src/store/auth-store.ts`

**Instruction :**
Le store Zustand doit stocker et exposer le `role` de l'utilisateur connecté.

**Contraintes :**
- Typer le rôle : `type UserRole = 'ADMIN' | 'ANALYST' | 'SME'`
- Le role doit persister dans le store comme `user.role`
- Ne pas modifier la logique de login existante, juste étendre le type `User`

**Output attendu :**
```typescript
interface User {
  id: number;
  email: string;
  role: UserRole;
}
```

---

### P0 — TÂCHE 3 : Créer les guards de routes dans App.tsx

**Fichier cible :** `frontend/src/App.tsx`

**Instruction :**
Remplacer le `RequireAuth` générique actuel par deux guards distincts.

**Code exact à implémenter :**

```tsx
// Guard Analyste/Admin
const RequireAnalyst = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'SME') return <Navigate to="/business/verify" replace />;
  return <DashboardLayout />;
};

// Guard PME
const RequireSME = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'SME') return <Navigate to="/dashboard" replace />;
  return <BusinessLayout />;
};
```

**Contraintes :**
- `RequireAnalyst` protège toutes les routes existantes du dashboard
- `RequireSME` protège les nouvelles routes `/business/*`
- Le `RequireAuth` existant peut être supprimé ou remplacé
- Ne pas toucher aux routes `/verify` et `/login` (déjà publiques)

---

### P1 — TÂCHE 4 : Créer BusinessLayout

**Fichier à créer :** `frontend/src/layouts/BusinessLayout.tsx`

**Instruction :**
Créer un layout simplifié pour les PME, inspiré du `DashboardLayout` existant mais avec une sidebar réduite à **4 liens seulement**.

**Sidebar PME — 4 liens exactement :**
```
1. Vérification          → /business/verify
2. Surveillance          → /business/monitoring
3. Mes alertes           → /business/alerts
4. Mes rapports          → /business/reports
```

**Contraintes :**
- Réutiliser les composants UI existants (Topbar, style Tailwind/Shadcn)
- Le titre dans la Topbar doit afficher **"Espace PME"**
- Ajouter un badge visible `PME` dans la sidebar pour différencier visuellement
- Structure identique à `DashboardLayout` : Sidebar + Topbar + `<Outlet />`

---

### P1 — TÂCHE 5 : Créer les 4 pages Business (vues filtrées)

**Fichiers à créer :**
```
frontend/src/features/business/BusinessVerifyPage.tsx
frontend/src/features/business/BusinessMonitoringPage.tsx
frontend/src/features/business/BusinessAlertsPage.tsx
frontend/src/features/business/BusinessReportsPage.tsx
```

**Instructions page par page :**

#### `BusinessVerifyPage.tsx`
- **Réutiliser** le composant de vérification existant de `VerifyPage`
- Ajouter l'historique des vérifications précédentes (appel à `GET /api/v1/incidents/citizen` filtré par l'utilisateur connecté)
- Différence avec `/verify` public : l'utilisateur est connecté, l'historique est sauvegardé

#### `BusinessMonitoringPage.tsx`
- **Réutiliser** les composants de `MonitoringPage` existante
- Filtrer les sources affichées : `GET /api/v1/sources?owner=me` (ou équivalent selon le contrat API actuel)
- La PME ne voit que **ses propres sources** configurées
- Conserver le bouton "Ajouter une source" pour qu'elle puisse monitorer son nom d'entreprise

#### `BusinessAlertsPage.tsx`
- **Réutiliser** les composants de `AlertsPage` existante
- Filtrer les alertes : uniquement celles liées aux sources de cette PME
- Vue lecture seule : la PME **consulte** ses alertes, elle ne les traite pas
- Pas d'actions SHIELD, pas de transition de statut depuis cet espace

#### `BusinessReportsPage.tsx`
- **Réutiliser** les composants de `ReportsListPage` existante
- Filtrer les rapports : uniquement ceux liés aux incidents de cette PME
- Conserver le bouton de téléchargement PDF
- Ajouter une mention visible sur chaque rapport : **"Ce rapport est transmissible à bjCSIRT / OCRC"**

**Contrainte globale pour toutes les pages Business :**
> Les composants PME sont des **vues filtrées** des composants analyste — pas des refontes complètes. Réutiliser au maximum, ne recréer que ce qui est strictement nécessaire.

---

### P1 — TÂCHE 6 : Mettre à jour App.tsx avec les nouvelles routes

**Fichier cible :** `frontend/src/App.tsx`

**Instruction :**
Ajouter les imports et routes `/business/*` en utilisant `RequireSME`.

**Routes à ajouter :**
```tsx
import BusinessLayout from '@/layouts/BusinessLayout';
import BusinessVerifyPage from '@/features/business/BusinessVerifyPage';
import BusinessMonitoringPage from '@/features/business/BusinessMonitoringPage';
import BusinessAlertsPage from '@/features/business/BusinessAlertsPage';
import BusinessReportsPage from '@/features/business/BusinessReportsPage';

// Dans <Routes> :
<Route element={<RequireSME />}>
  <Route path="/business/verify" element={<BusinessVerifyPage />} />
  <Route path="/business/monitoring" element={<BusinessMonitoringPage />} />
  <Route path="/business/alerts" element={<BusinessAlertsPage />} />
  <Route path="/business/reports" element={<BusinessReportsPage />} />
  <Route path="/business" element={<Navigate to="/business/verify" replace />} />
</Route>
```

**Remplacer également** toutes les occurrences de `<Route element={<RequireAuth />}>` par `<Route element={<RequireAnalyst />}>`.

---

### P2 — TÂCHE 7 : Renommer les labels dans la Sidebar analyste

**Fichier cible :** `frontend/src/components/layout/Sidebar.tsx`

**Tableau de renommage exact :**

| Route | Ancien label | Nouveau label |
|---|---|---|
| `/ingestion` | "Ingestion" | "Investigation manuelle" |
| `/monitoring` | "Monitoring" | "Surveillance continue" |
| `/incidents-signales` | "Incidents signalés" | "Signalements citoyens" |
| `/alerts` | "Alertes" | "Alertes de surveillance" |
| `/dashboard` | "Dashboard" | "Pilotage SOC" |

**Contrainte :** Changer uniquement les labels affichés. Ne pas modifier les routes ni les imports.

---

### P2 — TÂCHE 8 : Ajouter le compteur de récidive sur /verify

**Fichiers cibles :**
- Backend : `backend/app/api/v1/endpoints/signals.py`
- Frontend : `frontend/src/features/verify/VerifyPage.tsx`

**Backend — Instruction :**
Dans la réponse de `POST /api/v1/signals/verify`, ajouter le champ `recurrence_count` : nombre d'incidents existants en base qui contiennent ce même numéro de téléphone.

```python
# Exemple de logique à ajouter dans le service de vérification
recurrence_count = await db.scalar(
    select(func.count(Alert.id)).where(Alert.phone_number == numero_suspect)
)
```

**Frontend — Instruction :**
Si `recurrence_count > 0`, afficher sous le score IA un bandeau d'avertissement :

```tsx
{result.recurrence_count > 0 && (
  <div className="text-amber-400 text-sm font-medium">
    ⚠️ Ce numéro a déjà été signalé {result.recurrence_count} fois par d'autres utilisateurs.
  </div>
)}
```

---

## 🚫 CONTRAINTES ABSOLUES

Ces règles s'appliquent à **chaque tâche sans exception** :

1. **Zéro régression** — aucune route existante ne doit casser
2. **Zéro secret hardcodé** — pas de valeurs sensibles dans le code
3. **TypeScript strict** — pas de `any`, types explicites partout
4. **Migrations Alembic obligatoires** si changement de schéma DB
5. **Vérification build** après chaque tâche P0 : `npx tsc --noEmit`
6. **Pas de refonte visuelle** — conserver le design system Shadcn/Tailwind existant
7. **Pas de nouvelle dépendance npm** sans justification explicite

---

## 📋 CHECKLIST DE VALIDATION FINALE

Avant de considérer la refonte terminée, valider **chaque point** :

```
[ ] POST /api/v1/auth/login retourne le champ `role`
[ ] Un utilisateur SME connecté est redirigé vers /business/verify
[ ] Un utilisateur ANALYST connecté accède à /dashboard
[ ] /verify reste accessible sans login
[ ] BusinessLayout s'affiche avec sidebar 4 liens uniquement
[ ] Les pages /business/* affichent des données filtrées (pas toutes les données)
[ ] La sidebar analyste affiche les nouveaux labels
[ ] Le compteur de récidive s'affiche si > 0 sur /verify
[ ] build frontend valide : `npm run build` sans erreur
[ ] /health API au vert : db=ok, redis=ok
[ ] Aucune route existante ne retourne 404 ou erreur
```

---

## 💬 FORMAT DE RÉPONSE ATTENDU

Pour chaque tâche exécutée, fournir dans cet ordre :
1. **Nom de la tâche** (ex: "P0 — TÂCHE 1")
2. **Fichiers modifiés ou créés** (chemins complets)
3. **Code complet** du fichier (pas de snippets partiels pour les fichiers critiques)
4. **Vérification** : commande à exécuter pour valider

Si une tâche révèle un problème bloquant non anticipé, **stopper et décrire le problème** avant de continuer. Ne pas improviser de solution sans validation.

---

*Prompt version 1.0 — Généré le 20 février 2026 — BENIN CYBER SHIELD Refonte v2.0*
