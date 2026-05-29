# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-29

### Changed
- Complete visual redesign to "Editorial Dark Studio" aesthetic (Linear/Figma/Raycast inspired).
- Replaced cold navy/purple gradient palette with warm-tinted charcoal neutrals + electric lime accent (`oklch`).
- Migrated typography from Inter (Google Fonts) to self-hosted Geist Sans + Geist Mono for offline-first guarantee.
- Rebuilt sidebar as a collapsible "Inspector" with animated `grid-template-rows` expand/collapse sections.
- Replaced top toolbar with a floating segmented tool dock using accent-pill active states.
- Replaced canvas dot-grid with a subtle large-scale vignette spotlight.
- Added floating zoom control cluster (bottom-right of canvas) replacing the `<select>` dropdown.
- Redesigned export bar with format segmented control and progressively revealed quality slider.
- Removed placeholder Share button with `alert()` from export bar.
- Redesigned empty state with `kbd` chip hotkey hints and refined CTA.
- Restyled PromptModal to use design-system tokens and classes.
- Unified button hierarchy: one true primary (lime), ghost/secondary for the rest.
- Added orchestrated app-load stagger animations and section entrance motion.
- Added `prefers-reduced-motion` respect across all transitions.

### Fixed
- Replaced scattered inline styles in `WorkspaceToolbar.tsx` and `WorkspaceFooter.tsx` with maintainable classed styles.
- Consistent focus-visible rings and hover/active/disabled states on all interactive surfaces.

## [1.0.0] - 2026-05-20

### Added
- Initial release of SnapFrame.
- Screenshot beautifier with padding, rounded corners, shadows, borders, and inset effects.
- Background presets: solid colors, gradients, blurred image, and mesh gradients.
- Browser chrome mockups (macOS and Windows styles).
- Annotation tools: rectangle, circle, line, arrow, text, pen, emoji.
- Undo/redo with history stack.
- Custom preset save/load.
- Export to PNG/JPG with quality control.
- Copy to clipboard.
- Drag & drop and paste support.
- Global hotkey (`Ctrl+Alt+V`) for clipboard snap.
- Light/dark theme toggle.
