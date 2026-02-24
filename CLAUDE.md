# Armando Diaz — Personal Site Design System

## Project Identity
Personal website for Armando Diaz, Business & Data Engineering professional
based in Lafayette, LA. The site communicates: precision, curiosity,
and a journey from marketing to data. Tone is warm-editorial — authoritative
but human. NOT cold and terminal-like. NOT a corporate portfolio.

The brand story in one sentence:
"Someone who understands business deeply AND can build the data infrastructure
behind it — rare, valuable, and worth knowing."

---

## Color System (USE THESE EXACT VALUES — CSS variables everywhere)

:root {
  --bg-primary:    #312f2f;   /* Dark warm brown-black — main background */
  --bg-secondary:  #3d3a3a;   /* Slightly lifted surface — cards, nav */
  --bg-tertiary:   #4a4646;   /* Hover states, elevated elements */
  --accent-warm:   #d7907b;   /* Terracotta/salmon — primary accent, CTAs */
  --accent-cream:  #f3f9d2;   /* Soft cream-yellow — headlines, highlights */
  --text-primary:  #f3f9d2;   /* Cream — main body text */
  --text-secondary:#c4b8b8;   /* Muted warm white — secondary labels */
  --text-tertiary: #7a6f6f;   /* Ghosted — section numbers, dividers */
  --border:        #4a4646;   /* Subtle warm border lines */
  --glow-warm:     rgba(215, 144, 123, 0.15); /* Terracotta glow for hover */
  --glow-cream:    rgba(243, 249, 210, 0.08); /* Cream glow, subtle */
}

Color rules:
- --accent-warm (terracotta) = CTAs, active states, highlights, hover borders
- --accent-cream (cream) = Hero headlines, most important text on screen
- Never use both accents at full opacity in the same component — one leads
- Background must have a very subtle warm grain texture (SVG noise, 4-6% opacity)
- No purple. No blue gradients. No cold tones anywhere.

---

## Typography Rules

Display font: "Playfair Display" (serif, editorial weight — use for headlines)
Body/UI font: "IBM Plex Mono" (technical monospace — use for body text, tags, labels)

Pairing philosophy: The serif gives warmth and authority. The mono gives
precision and credibility. Together they say "business mind + data engineer."

Scale rules:
- Hero/display: 80px–120px desktop, 48px–64px mobile
- Section titles: 48px–64px
- Body: 16px–18px, line-height 1.7
- Labels/tags: 12px–13px, letter-spacing 0.08em, uppercase

NEVER use: Inter, Roboto, Arial, Open Sans, Space Grotesk, system fonts.

---

## Motion & Animation Rules

Page load: Staggered entrance — opacity 0→1, translateY(24px)→0
Delay each element: 100ms apart. Total sequence should complete in ~600ms.

Hover:
- Buttons: background shifts, subtle scale(1.02), border → --accent-warm
- Cards: translateY(-4px), box-shadow uses --glow-warm
- Links: underline slides in from left (scaleX transform)

Scroll-triggered: Use IntersectionObserver for section entries.
Stats/numbers: Count up animation on scroll-enter (requestAnimationFrame).
Typewriter effect: See hero section — this is the signature interaction.

Keep it CSS-first. Only use JS for: typewriter, counters, scroll triggers.
No looping particle systems. No excessive motion. Purposeful only.

---

## Layout & Composition Rules

- CSS Grid everywhere. Intentionally asymmetric where possible.
- Navigation: fixed top, minimal, name left + links right
  Background: rgba(49,47,47,0.92), backdrop-filter: blur(12px)
  Bottom border: 1px solid var(--border)
- Buttons: border-radius: 8px (slightly rounded — not pill, not sharp)
  This is specified by the design — honor it.
- Cards: border-radius: 8px, border: 1px solid var(--border)
- Section numbers: oversized, color: var(--text-tertiary), position absolute or relative
- Sections alternate between --bg-primary and --bg-secondary for rhythm

NEVER: pill buttons (border-radius > 12px), pure square corners,
Bootstrap-uniform grids, centered avatar hero, purple-to-blue gradients.

---

## Site Architecture

Pages to build (in this order):
1. index.html     — Home / Typewriter Hero
2. about.html     — About / Story
3. projects.html  — Projects / Work
4. thoughts.html  — Field Notes / Blog
5. contact.html   — Contact

All pages share: same nav, same footer, same CSS variables, same font imports.
Each page must have a DISTINCT layout — never repeat the same section structure.

Shared nav links: About · Projects · Thoughts · Contact
Footer: "Armando Diaz © 2025" + GitHub + LinkedIn links (--text-tertiary)
