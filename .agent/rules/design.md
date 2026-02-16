### @DESIGN — Thème "Void Nebula" (v2 — Évolution de Deep Void Enterprise)

## Fondation

- Dark-mode first. Background : layered gradients, JAMAIS une couleur plate
- Base : `#020617` → `#0f172a` gradient + aurora radial-gradients (indigo/violet/blue à 8-15% opacité) + grain texture overlay SVG
- Surfaces : `bg-slate-900/60 backdrop-blur-xl saturate-150` + border gradient subtil (`border-slate-700/20`)
- Élévation = lumière : plus un élément est élevé hiérarchiquement, plus il glow (box-shadow indigo/violet)

## Palette

- Primary : gradient `indigo-500 → violet-500` avec glow `shadow-indigo-500/20`
- Accent : `violet-400` highlights · `cyan-400` data/status · `rose-400` pour alerts
- Text : `slate-50` headings / `slate-300` body / `slate-500` muted
- Success `emerald-400` / Danger `rose-400` / Warning `amber-400` (toujours 400, jamais 500 saturé)
- INTERDIT : couleurs brutes à 100% opacité sur fond sombre. Toujours atténuer ou grader

## Typographie

- Font : Inter (body) + Geist ou Satoshi pour display headings si pertinent
- H1 : `text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent` — gradient text pour hero
- H2 : `text-2xl md:text-3xl font-semibold text-slate-50`
- Body : `text-base font-normal leading-relaxed text-slate-300`
- Muted : `text-sm text-slate-500`
- Mono : `font-mono text-sm text-indigo-400` pour code/données
- Contraste weight obligatoire heading vs body ≥ 2 niveaux (bold vs normal)

## Layout

- Bento grid pour features : `grid-cols-4 md:grid-cols-12` avec cellules de tailles variées
- Max-width : `max-w-7xl mx-auto` pour contenu, full-bleed backgrounds pour impact
- Whitespace intentionnel : `py-24 lg:py-32` entre sections majeures, pas `py-6` uniforme
- Héros asymétriques : texte d'un côté, visuel/gradient de l'autre
- Espacement système 8pt (multiples de 8px : 8, 16, 24, 32, 48, 64, 96, 128)

## Composants

- Cards : glass (`bg-slate-900/60 backdrop-blur-xl`) + gradient border pseudo-element + hover: `translateY(-4px) + glow shadow`
- Buttons primary : `bg-gradient-to-r from-indigo-500 to-violet-500` + `shadow-lg shadow-indigo-500/25` + hover: glow intensifié + scale 1.02
- Buttons secondary : `bg-transparent border border-slate-700` + hover: `border-indigo-500/50 bg-indigo-500/5`
- Inputs : `bg-slate-900/40 border-slate-700/50` + focus: `ring-2 ring-indigo-500/30 border-indigo-500/50`
- Tables denses : header sticky `bg-slate-900/80 backdrop-blur` + row hover `bg-indigo-500/5 transition-colors`
- Dividers : `h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent` — JAMAIS `border-b border-slate-800`
- Badges/Tags : `bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full`

## Animations & Motion

- Easing : `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out) par défaut. INTERDIT `linear`
- Micro-interactions : `duration-300`, transitions majeures `duration-500`, reveals `duration-700`
- Hover cards : `transition-all duration-300` → translateY(-4px) + shadow shift + border glow
- Page load : stagger animation (éléments séquentiels, 100ms delay entre chaque, Framer Motion `staggerChildren`)
- Scroll reveals : `fade-in-up` via Intersection Observer ou Framer Motion `useInView`
- INTERDIT : animation sans purpose, durée > 1s, `transition-all` sans spécifier les propriétés

## Effets Premium (Au moins 3 par page)

1. **Grain overlay** : texture SVG noise sur les backgrounds principaux, opacity 0.03-0.05
2. **Aurora mesh** : radial-gradients indigo/violet/blue sur hero sections
3. **Glow dividers** : gradient lines entre les sections
4. **Spotlight** : cursor-follow radial-gradient sur zones interactives majeures (JS requis)
5. **Gradient borders** : via pseudo-element `::before` avec mask-composite sur les cards featured
6. **Text gradients** : `bg-gradient-to-r bg-clip-text text-transparent` sur les headings hero
7. **Animated gradients** : `animate-pulse` subtil ou `background-position` animation sur les backgrounds

## Anti-Patterns (VIOLATIONS = REFAIRE)

- ❌ Fond plat monochrome (`bg-slate-950` seul, sans gradient ni texture)
- ❌ Cards rectangulaires basiques (juste `bg-slate-900 border border-slate-800 rounded-lg`)
- ❌ Couleurs primaires brutes (`red-500`, `blue-500`, `green-500` non atténuées)
- ❌ Espacement uniforme partout (`p-4` ou `p-6` sans hiérarchie)
- ❌ Typographie sans contraste (même weight heading/body)
- ❌ Hover = juste changement de couleur (sans translate, shadow, ou border transition)
- ❌ Layout 100% symétrique grille uniforme (3 cards identiques alignées)
- ❌ Dividers `border-b border-slate-800` (utiliser glow gradient lines)
- ❌ Boutons plats sans shadow ni gradient
- ❌ Sections sans whitespace (`py-8` entre sections majeures)
