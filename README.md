# SnapFrame 📸✨

**SnapFrame** is a lightweight, high-performance Windows desktop application designed to beautify screenshots. Built using **Electron + React + TypeScript + Vanilla CSS**, it offers a fast startup time (< 2 seconds), minimal memory usage, and works completely offline with zero telemetry.

## Core Features

1. **Image Inputs**:
   - Drag and drop screenshots directly onto the application.
   - Paste images from the clipboard using standard shortcuts (`Ctrl+V`).
   - Manual file picker supporting `PNG`, `JPG`/`JPEG`, and `WebP`.
   - **Global Hotkey** (`Ctrl+Alt+V` / `Cmd+Alt+V`) to import your clipboard screenshot instantly and focus the application from anywhere.
2. **Flexible Canvas & Aspect Ratios**:
   - Aspect ratio presets: `Auto` (matches screenshot aspect), `1:1`, `4:3`, `16:9`, `3:2`, and `Custom` dimensions.
   - Align screenshot positioning (Middle Center, Top Center, Bottom Center, Middle Left, Middle Right).
   - Dynamic Padding modes (`Fit` or `Fill`).
3. **Container Mockups**:
   - **Browser Chrome Overlay**: macOS Title Bar (traffic lights) or Windows Title Bar.
   - **Inner Inset Borders**: Configurable thickness and color overlays.
   - **Drop Shadows**: Smooth container shadows with blur radius and color picking.
   - **Rounded Corners**: Slider for corner rounding (0px to 40px).
   - **Outer Borders**: Custom thickness and colors.
   - **Scale Slider**: Change image size relative to the frame.
4. **Vibrant Background Templates**:
   - Curated grid of **15 premium gradients** (warm sunset, cool ocean, neon flow, mesh auroras, etc.).
   - Solid brand colors (Tailwind-inspired swatches) and Custom Hex Color Pickers.
   - **Abstract blurred background**: Blurs the screenshot itself as the background at reduced opacity for a professional glassmorphic effect.
   - Custom Preset Saving: Save your designed background styles under unique names.
5. **Quality Exporting**:
   - Lossless `PNG` or adjustable-quality `JPG`/`JPEG`.
   - Copy beautified images back to clipboard for instant pasting.
   - Keyboard shortcut `Ctrl+Shift+S` to export instantly.
6. **Robust Under-the-hood**:
   - Canvas operations are executed at high-resolutions (up to 4K) using HTML5 Canvas rendering.
   - All settings (presets, window boundaries, configurations) are securely saved to a local `settings.json` file inside Electron's application directory.

---

## Directory Structure

```text
/assets       <- Curated gradient presets definition (presets.json)
/scripts      <- Custom build & hot-reload dev scripts (dev.js, build.js)
/src
  /main       <- Electron main process (main.ts)
  /preload    <- Electron contextBridge security script (preload.ts)
  /renderer   <- React + TS Frontend (App.tsx, main.tsx, index.css, index.html)
/tests        <- Unit tests (renderer.test.ts)
```

---

## Getting Started

### Prerequisites
- Node.js (v18.x or higher recommended)
- NPM

### 1. Installation
Install all developer and core dependencies:
```bash
npm install
```

### 2. Run in Development Mode
Starts the Vite React dev server, esbuild compiler for main/preload, and launches the Electron application with automatic hot-reloads:
```bash
npm run dev
```

### 3. Run Unit Tests
Verifies calculation math and dimension formulas using the lightweight Node-native test runner:
```bash
npm run test
```

### 4. Build Production Bundle
Compiles the React components and transpiles main/preload files:
```bash
npm run build
```

### 5. Package Portable EXE
Compiles a production build and packages the application into a single **portable Windows executable (.exe)** inside the `release/` directory:
```bash
npm run package
```

---

## Design Choices & Performance

- **Zero Heavy UI Libraries**: The entire user interface is styled using vanilla CSS, meaning faster styling, smaller build sizes, and instant responsiveness.
- **No Remote Module**: Utilizes secure `contextBridge` IPC communications.
- **Dynamic CSS Preview**: Sliders run CSS filters, transitions, and shadows at 60fps on the GPU in the DOM. High-resolution canvas rendering is executed only during export to maximize interactive performance.
