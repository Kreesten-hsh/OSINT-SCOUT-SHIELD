---
name: Obsidian Glass
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#c4c5d5'
  on-secondary: '#2d303c'
  secondary-container: '#434653'
  on-secondary-container: '#b2b4c4'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#e0e1f2'
  secondary-fixed-dim: '#c4c5d5'
  on-secondary-fixed: '#181b27'
  on-secondary-fixed-variant: '#434653'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  margin-page: 24px
  gutter: 16px
  padding-card: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built on the "Obsidian Glass" aesthetic, a high-fidelity visual language tailored for a premium Android security environment. The brand personality is authoritative yet ethereal, evoking the feeling of a high-tech digital vault. It targets a discerning audience that values both impenetrable security and a sophisticated, "quiet luxury" user experience.

The style is a disciplined evolution of **Glassmorphism** and **Minimalism**. It utilizes deep, obsidian-like layering to create perceived depth without clutter. The interface should feel expensive and breathable, leveraging wide margins and precise micro-interactions to signal 2025-2026 fintech trends. The emotional response is one of absolute calm and confidence—transforming complex security data into a refined, cinematic experience.

## Colors

The palette is anchored in a near-black "Obsidian" foundation to maximize contrast with glass elements. 

- **Foundation:** The `#07090F` background provides a deep, infinite canvas. Surface levels (L1-L3) are meticulously stepped to create structural hierarchy without the need for heavy shadows.
- **Accent:** Sapphire Blue (`#3B82F6`) is used sparingly for primary actions and critical focus states, acting as a "light in the dark."
- **Risk Palette:** Semantic colors use high-chroma tones for clarity. **Élevé** (Red) indicates immediate threats, **Moyen** (Amber) for warnings, and **Faible** (Emerald) for secure states.
- **Glass Specification:** Translucent surfaces use `rgba(14, 18, 30, 0.72)` with a 24px backdrop blur and 1.4 saturation boost to pull colors from the background through the pane.

## Typography

The typographic system prioritizes modern legibility with a technical edge. 

- **Primary Interface:** We use **Manrope** (selected for its premium, balanced proportions) for all core UI elements and body text. It provides a more contemporary fintech feel than standard grotesques.
- **Technical Data:** **JetBrains Mono** is strictly reserved for hashes, encryption keys, and security logs to emphasize the "under the hood" technical nature of the app.
- **Labels:** **Space Grotesk** is used for utility labels and eyebrow text in all-caps to provide a futuristic, scientific aesthetic.
- **Hierarchy:** Use tight tracking for headlines and generous leading for body copy to maintain the "breathable" feel.

## Layout & Spacing

This design system employs a **Fluid Grid** model optimized for Android's diverse aspect ratios. 

- **Rhythm:** A strict 4px baseline grid ensures vertical alignment. 
- **Margins:** 24px side margins provide a luxurious "frame" for content, preventing the UI from feeling cramped.
- **Density:** We prefer high-whitespace layouts. Information density is managed through the use of cards rather than tight lists. 
- **Containers:** Content should be grouped in logic-based clusters with a 32px vertical gap between major sections.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

- **The Base:** The #07090F background is the lowest level.
- **Floating Panes:** Primary interactive cards use the glass effect: `rgba(14, 18, 30, 0.72)` fill with a 1px `rgba(255,255,255,0.08)` inner border. This "stroke-as-light" technique defines the edge of the glass.
- **Active Elevation:** When an element is pressed or focused, the saturation increases to 1.8 and the border opacity increases to `0.16` to simulate the object moving closer to the user.
- **Blur Management:** Avoid stacking more than two layers of glass to maintain performance and visual clarity.

## Shapes

The shape language is defined by extreme softness and pill-inspired geometries, contrasting the "hard" obsidian theme with "soft" tactile edges.

- **Buttons & Chips:** Use the **Pill (999px)** radius for all primary actions and status indicators.
- **Main Containers:** Top-level cards and sheets use an **XL (28px)** radius.
- **Nested Elements:** Internal components within cards use a **Large (22px)** radius to create a nested, organic flow.
- **Consistency:** Never use sharp corners. Even "destructive" actions must follow the rounded aesthetic to maintain the premium, friendly-security feel.

## Components

- **Glass Cards:** The centerpiece of the UI. Features 24px padding and a subtle top-down 1px gradient stroke.
- **Sapphire Buttons:** Primary buttons are solid Sapphire Blue with white text, using the Pill shape. Secondary buttons are "Ghost Glass" (border only).
- **Security Scanners:** Circular progress indicators with a soft glow (box-shadow: 0 0 20px #3B82F6 at 0.3 opacity).
- **Status Chips:** Small pill-shaped badges for Élevé, Moyen, and Faible. These use a 12% opacity background of the semantic color with a 100% opacity text label for a "tinted glass" look.
- **Input Fields:** L1 Surface backgrounds with an XL (28px) radius. On focus, the 1px border transitions from 0.08 white to Sapphire Blue.
- **Bottom Navigation:** A floating glass bar with 32px bottom padding from the device edge, using a blurred backdrop to let content scroll elegantly behind it.