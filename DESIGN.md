 
# SnapFrame Redesign Plan — "Editorial Dark Studio"

Direction locked: a **pro-grade dark workspace** in the spirit of Linear / Figma / Raycast — warm-tinted neutrals, one sharp accent, strong typographic hierarchy, and a content-first canvas. The goal is to kill every "AI-default" fingerprint currently in the app and replace it with intentional, premium detail.

**Locked decisions:** Accent = **electric lime**. Typeface = **Geist** (self-hosted for offline). Theme = dark-first (light kept as secondary mapping).

## What's making it look "traditional" today

These are the exact tells in the current code, and what each becomes:

- **Cold navy + purple→indigo gradients** (`--bg-main: #060913`, `--color-primary: #8b5cf6` → `--color-secondary: #4f46e5`) → the most recognizable AI palette. Replace with warm-tinted charcoal + a single confident accent.
- **Gradient text logo** (`.sidebar-title` clip-text) → flat, crisp wordmark with a real glyph.
- **Inter font** → distinctive display/body pairing.
- **Uniform identical control cards** stacked at equal `1.5rem` gaps → varied rhythm, grouped sections, progressive disclosure.
- **Glassmorphism + generic drop shadows everywhere** → purposeful, layered elevation only where it earns focus.
- **Inline styles scattered across components** (toolbar/footer) → a real token + utility system so the look is consistent and maintainable.

---

## 1. Design Tokens (foundation — [index.css](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/index.css:0:0-0:0) `:root`)

Replace the palette wholesale. Warm-tinted neutrals (hint of the accent hue mixed into greys, never pure `#000`), single accent.

All values in `oklch()` so neutrals can share the accent hue and tints derive via `color-mix()`. The lime hue (`~125`) is mixed in at ~2–4% into every neutral so the greys read warm/green-charcoal, never the old cold navy. Never pure `#000`/`#fff`.

**Neutrals (green-charcoal ramp, dark theme):**
```css
--surface-0: oklch(0.16 0.012 130);  /* app background, deepest */
--surface-1: oklch(0.20 0.013 130);  /* sidebar / footer */
--surface-2: oklch(0.24 0.014 130);  /* raised panels, inputs */
--surface-3: oklch(0.29 0.015 130);  /* hover / popovers */
--border:    oklch(0.32 0.016 130);
--border-strong: oklch(0.40 0.018 130);
```

**Accent — electric lime (single accent, no gradients):**
```css
--accent:        oklch(0.86 0.21 128);   /* electric lime */
--accent-hover:  oklch(0.90 0.21 128);
--accent-press:  oklch(0.80 0.20 128);
--accent-soft:   color-mix(in oklch, var(--accent) 14%, transparent); /* tints/rings */
--on-accent:     oklch(0.18 0.03 128);   /* dark text on lime — lime is bright, so text is dark */
```
Lime is a high-luminance accent, so it carries dark text on top (the primary button is lime with near-black label) — this is the key move that reads "premium" rather than "glowing neon on dark."

**Text (tinted, never flat grey):**
```css
--text-primary:   oklch(0.96 0.008 130);
--text-secondary: oklch(0.76 0.010 130);
--text-tertiary:  oklch(0.60 0.012 130);
```

**Elevation (layered, low-opacity, used sparingly):** `--elev-1/2/3`.

**Radii / spacing / motion:** `--radius-sm:6px / -md:10px / -lg:14px`; 8px spacing scale with `clamp()` fluid values; motion tokens `--ease-out-quint: cubic-bezier(0.22,1,0.36,1)` + durations (`--dur-fast:120ms`, `--dur:200ms`, `--dur-slow:320ms`).

`light-theme` block remaps the same token names (light green-tinted neutrals, slightly darker lime `oklch(0.74 0.19 128)` for AA contrast on white). Dark is the hero.

## 2. Typography

- **Family:** **Geist Sans** for all UI + wordmark, **Geist Mono** for numeric readouts. Self-hosted as `woff2` under `src/renderer/fonts/` and loaded via `@font-face` (the current Google-Fonts `@import` of Inter breaks the offline-first guarantee — it gets removed).
- **Weights shipped:** 400 / 500 / 600 / 700 (subset to latin to keep bundle small).
- **Numeric/values:** Geist Mono with `font-variant-numeric: tabular-nums` for `px`/`%` readouts so values don't jitter as sliders move.
- **Scale:** real modular scale via tokens — `--fs-label:0.78rem`, `--fs-body:0.875rem`, `--fs-section:0.7rem` (section eyebrow), `--fs-title:1.05rem`, `--fs-display:1.25rem`. Hierarchy comes from **weight + color**, not the dated `text-transform: uppercase` + letterspacing on every label (removed).

## 3. Layout Restructure

Current: fixed 320px sidebar + header toolbar + centered canvas + footer bar. Keep the skeleton ([App.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/App.tsx:0:0-0:0)) but elevate each region.

- **Left sidebar → "Inspector" panel:** collapsible *sections* (Layout, Background, Frame, Extras) with smooth `grid-template-rows` expand/collapse and section headers, replacing the flat scroll of equal cards. Tighten internal rhythm (grouped controls, dividers only where meaningful — not a card around everything).
- **Top toolbar → floating tool dock:** the annotation tools (currently a dense row of identical `btn-secondary`) become a segmented, icon-first dock with clear active state (accent pill + subtle glow), tooltips, and logical grouping with hairline separators. Undo/redo and view controls split to the edges.
- **Canvas → the star:** remove the busy 20px dot grid in favor of a subtle, large-scale vignette/spotlight so the user's artwork pops. Add a soft floating zoom/pan control cluster (bottom-right) instead of a `<select>`.
- **Footer → export bar:** turn into a refined action bar with a primary "Export" affordance, format segmented control, and quality control revealed progressively. Drop the placeholder `alert()` Share into a real menu or remove.

## 4. Component-level changes

- **Buttons:** establish hierarchy — one true primary (accent), ghost/secondary for the rest. Today nearly everything is `btn-primary` gradient or identical `btn-secondary`; that flatness reads as templated.
- **Sliders:** custom track with accent-filled progress (not a flat grey bar), refined thumb, value bubble on drag. Applies to all `input[type=range]` in Layout/Extra/Footer.
- **Toggles & color pickers:** unify the switch + swatch styling into polished tokens; the color-row pattern repeats in [LayoutSettings](cci:1://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/LayoutSettings.tsx:2:0-225:1)/[ExtraSettings](cci:1://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/ExtraSettings.tsx:2:0-146:1) and should become one reusable component style.
- **Preset swatches:** the gradient grid is a strength — make it the visual hero of the Background section with better hover/active (scale + ring in accent), labels on hover.
- **Empty state / dropzone:** redesign `.empty-state` into a teaching empty state (icon, primary CTA, keyboard hints styled as real `kbd` chips) that demonstrates the hotkeys instead of a plain dashed box.
- **PromptModal:** restyle to match (the skill discourages modals; keep it since it's a name-input, but make it feel native).

## 5. Motion (high-impact, restrained)

- One orchestrated **app-load stagger** (sidebar sections + toolbar fade/slide in).
- Section expand/collapse via `grid-template-rows` (not `height`), `ease-out-quint`.
- Tool/preset selection: fast accent transitions on `transform`/`opacity` only; no bounce/elastic.
- Slider drag value bubble, button press states. Respect `prefers-reduced-motion`.

## 6. Polish & hardening pass

- Replace scattered inline styles in [WorkspaceToolbar.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/WorkspaceToolbar.tsx:0:0-0:0) / [WorkspaceFooter.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/WorkspaceFooter.tsx:0:0-0:0) with classed styles.
- Consistent focus-visible rings (accessibility), hover/active/disabled states for every interactive surface.
- Verify contrast on the new dark palette (WCAG AA for text).
- Keep the existing `light-theme` working with the new token names.

---

## Execution Roadmap (when you greenlight build)

1. **Tokens + typography** — rewrite `:root`/`light-theme`, add fonts. (Foundation; everything inherits.)
2. **Primitives** — buttons, sliders, toggles, inputs, color-row, `kbd` chips.
3. **Sidebar/Inspector** — collapsible sections + rhythm ([Sidebar.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/Sidebar.tsx:0:0-0:0), [LayoutSettings.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/LayoutSettings.tsx:0:0-0:0), [BackgroundSettings.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/BackgroundSettings.tsx:0:0-0:0), [ExtraSettings.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/ExtraSettings.tsx:0:0-0:0)).
4. **Toolbar dock** ([WorkspaceToolbar.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/WorkspaceToolbar.tsx:0:0-0:0)) + **canvas backdrop/zoom cluster** ([CanvasPreview.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/CanvasPreview.tsx:0:0-0:0)).
5. **Export bar** ([WorkspaceFooter.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/components/WorkspaceFooter.tsx:0:0-0:0)) + **empty state** + **PromptModal**.
6. **Motion + polish + a11y/contrast pass.**

Scope is **CSS + JSX class/structure changes only** — no changes to canvas rendering, IPC, or app logic ([AppContext.tsx](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/AppContext.tsx:0:0-0:0), [canvasRenderer.ts](cci:7://file:///c:/Users/Navee/gits/screenshot-beaut/src/renderer/canvasRenderer.ts:0:0-0:0), [main](cci:9://file:///c:/Users/Navee/gits/screenshot-beaut/src/main:0:0-0:0), [preload](cci:9://file:///c:/Users/Navee/gits/screenshot-beaut/src/preload:0:0-0:0) untouched), so functionality and the <2s startup/perf goals stay intact.

---

## Self-hosting Geist (offline-first)

1. Add `geist` font files (or download `Geist` + `Geist Mono` `woff2` from the official release) into `src/renderer/fonts/`.
2. Declare `@font-face` for each weight at the top of `index.css`; remove the `@import url('...fonts.googleapis.com...Inter...')` line.
3. Set `--font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;` and `--font-mono: 'Geist Mono', ui-monospace, monospace;`.
4. Confirm Vite copies the fonts into the bundle (they're imported relative to `index.css`, so esbuild/Vite will fingerprint and emit them).

## Locked summary

| Decision | Value |
| --- | --- |
| Aesthetic | Editorial Dark Studio (Linear/Figma/Raycast) |
| Accent | Electric lime `oklch(0.86 0.21 128)`, dark text on accent |
| Neutrals | Green-charcoal ramp (lime hue mixed ~2–4%) |
| Typeface | Geist Sans + Geist Mono, self-hosted |
| Theme | Dark-first, light as secondary token mapping |
| Scope | CSS + JSX class/structure only; app logic untouched |

Ready to build on greenlight — start at Roadmap step 1 (tokens + self-hosted Geist).