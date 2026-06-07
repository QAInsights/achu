export interface Annotation {
  id: string;
  type: 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji';
  x: number;          // 0 to 1 relative to screenshot width
  y: number;          // 0 to 1 relative to screenshot height
  w: number;          // width fraction
  h: number;          // height fraction
  text?: string;
  color: string;
  strokeWidth: number; // relative to 1000px viewBox
  points?: Array<{ x: number; y: number }>;
  rotation?: number;
  arrowStyle?: 'classic' | 'dashed' | 'tapered' | 'curved';
  fontFamily?: string;
  fontSize?: number;
  fontBold?: boolean;
  fontItalic?: boolean;
}

export interface RedactionItem {
  id: string;
  text: string;
  type: 'email' | 'api-key' | 'card' | 'phone' | 'ip' | 'address' | 'password';
  x: number; // 0 to 1 relative to screenshot width
  y: number; // 0 to 1 relative to screenshot height
  w: number; // width fraction
  h: number; // height fraction
  status: 'redacted' | 'visible';
}

import { drawArrowOnCanvas } from './arrowUtils';

const bgImageCache = new Map<string, HTMLImageElement>();

function setCrossOrigin(img: HTMLImageElement, url: string) {
  const isDataOrFile = url.startsWith('data:') || url.startsWith('file:') || url.startsWith('blob:');
  if (!isDataOrFile && window.location.protocol !== 'file:') {
    img.crossOrigin = 'anonymous';
  }
}

export function getBgImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  if (bgImageCache.has(url)) {
    const cached = bgImageCache.get(url)!;
    if (cached.complete && cached.naturalWidth === 0) {
      bgImageCache.delete(url);
    } else {
      return cached;
    }
  }
  const img = new Image();
  setCrossOrigin(img, url);
  img.src = url;
  bgImageCache.set(url, img);
  return img;
}

/** Pre-populates bgImageCache so the image is ready when renderCanvas runs. */
export function preloadBgImage(url: string, onDone: () => void): void {
  if (!url) { onDone(); return; }
  const existing = bgImageCache.get(url);
  if (existing) {
    if (existing.complete && existing.naturalWidth > 0) {
      onDone();
      return;
    }
    if (!existing.complete) {
      existing.addEventListener('load', () => { onDone(); }, { once: true });
      existing.addEventListener('error', () => { onDone(); }, { once: true });
      return;
    }
    bgImageCache.delete(url);
  }
  const img = new Image();
  setCrossOrigin(img, url);
  img.onload = () => { onDone(); };
  img.onerror = () => { onDone(); };
  img.src = url;
  bgImageCache.set(url, img);
}



export interface RenderConfig {
  padding: number;
  rounded: number;
  shadow: number;
  shadowColor: string;
  shadowEnabled: boolean;
  inset: number;
  insetColor: string;
  border: number;
  borderColor: string;
  scale: number;
  backgroundType: 'color' | 'gradient' | 'blur' | 'mesh';
  backgroundValue: string;
  aspectRatio: string; // "Auto" | "1:1" | "4:3" | "16:9" | "3:2" | "Custom"
  canvasWidth: number;
  canvasHeight: number;
  paddingMode: 'fit' | 'fill';
  chromeStyle: 'mac' | 'windows' | 'none';
  chromeTheme?: 'dark' | 'light';
  blurDensity?: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkSize?: number;
  watermarkPosition?: 'left' | 'middle' | 'right' | 'top left' | 'top middle' | 'top right';
  watermarkOpacity?: number;
  watermarkFont?: string;
  watermarkBold?: boolean;
  watermarkItalic?: boolean;
  annotationFont?: string;
  annotationFontSize?: number;
  annotationBold?: boolean;
  annotationItalic?: boolean;
  position: string; // "Middle center", "Top center", "Bottom center", "Middle left", "Middle right"
  annotations?: Annotation[];
  meshPoints?: Array<{ id: string; color: string; x: number; y: number; radius: number }>;
  meshBlur?: number;
  meshGrain?: number;
  meshOpacity?: number;
  meshSpread?: number;
  noImage?: boolean;
  selectedPreset?: string;
  showSafeZone?: boolean;
  redactions?: RedactionItem[];
  redactionStyle?: 'blur' | 'solid';
  issuePayload?: any;
  showComponentHighlights?: boolean;
  highlightedComponents?: string[];
  ocrWords?: any[];
  exportFormat?: 'png' | 'jpeg';
  jpegQuality?: number;
  sidebarPosition?: 'left' | 'right';
  bgGrain?: number;
  lightRaysStyle?: 'none' | 'diagonal' | 'spotlight' | 'aurora';
  lightRaysOpacity?: number;
  lightRaysAngle?: number;
  lightRaysCount?: number;
  lightRaysSourceX?: number;
  lightRaysSourceY?: number;
  autoImportCaptured?: boolean;
  captureShortcut?: string;
}

interface ColorStop {
  color: string;
  stop: number;
}

const IGNORED_WORDS = new Set([
  'circle', 'at', 'ellipse', 'to', 'deg', 'rad', 'grad', 'turn',
  'closest-side', 'farthest-side', 'closest-corner', 'farthest-corner',
  'left', 'right', 'top', 'bottom', 'center',
  'closest', 'farthest', 'side', 'corner',
  'px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'ch', 'ex', 'cm', 'mm', 'in', 'pt', 'pc'
]);

// Parse colors and stops from CSS gradient parts
function parseColorStops(partStr: string): ColorStop[] {
  const stops: ColorStop[] = [];
  // Regex to match colors (hex, rgb/rgba, or standard words) and optional percentages
  const regex = /(rgba?\(.+?\)|#[0-9a-fA-F]+|[a-zA-Z]+)\s*(\d+%)?/g;
  let match;
  const matches: { color: string; stopStr?: string }[] = [];

  while ((match = regex.exec(partStr)) !== null) {
    const val = match[1];
    if (!IGNORED_WORDS.has(val.toLowerCase())) {
      matches.push({ color: val, stopStr: match[2] });
    }
  }

  matches.forEach((item, index) => {
    let stop = 0;
    if (item.stopStr) {
      stop = parseFloat(item.stopStr) / 100;
    } else {
      stop = matches.length > 1 ? index / (matches.length - 1) : 0;
    }
    stops.push({ color: item.color, stop });
  });

  return stops;
}


// Draw linear gradient
function drawLinearGradient(ctx: CanvasRenderingContext2D, w: number, h: number, cssStr: string) {
  // Example: linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)
  const angleMatch = cssStr.match(/(\d+)deg/);
  let angle = 180; // default top-to-bottom
  if (angleMatch) {
    angle = parseInt(angleMatch[1], 10);
  }

  // Calculate start/end points using trigonometry
  const angleRad = ((angle - 90) * Math.PI) / 180;
  const r = Math.sqrt(w * w + h * h) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const x0 = cx - Math.cos(angleRad) * r;
  const y0 = cy - Math.sin(angleRad) * r;
  const x1 = cx + Math.cos(angleRad) * r;
  const y1 = cy + Math.sin(angleRad) * r;

  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  const content = cssStr.substring(cssStr.indexOf('(') + 1, cssStr.lastIndexOf(')'));
  const stops = parseColorStops(content);

  stops.forEach((s) => {
    try {
      grad.addColorStop(s.stop, s.color);
    } catch (e) {
      console.warn('Invalid color stop:', s);
    }
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// Draw radial gradient
function drawRadialGradient(ctx: CanvasRenderingContext2D, w: number, h: number, cssStr: string) {
  // Example: radial-gradient(circle at 20% 20%, #ff8a00 0%, transparent 50%)
  let cx = w / 2;
  let cy = h / 2;

  const centerMatch = cssStr.match(/(?:circle|ellipse)?\s*at\s+(\d+)%\s+(\d+)%/);
  if (centerMatch) {
    cx = (parseInt(centerMatch[1], 10) / 100) * w;
    cy = (parseInt(centerMatch[2], 10) / 100) * h;
  }

  // Calculate farthest-corner radius to match standard CSS spec behavior
  const d1 = Math.sqrt(cx * cx + cy * cy);
  const d2 = Math.sqrt((w - cx) * (w - cx) + cy * cy);
  const d3 = Math.sqrt(cx * cx + (h - cy) * (h - cy));
  const d4 = Math.sqrt((w - cx) * (w - cx) + (h - cy) * (h - cy));
  const radius = Math.max(d1, d2, d3, d4);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const content = cssStr.substring(cssStr.indexOf('(') + 1, cssStr.lastIndexOf(')'));
  const stops = parseColorStops(content);

  stops.forEach((s) => {
    try {
      grad.addColorStop(s.stop, s.color);
    } catch (e) {
      console.warn('Invalid color stop:', s);
    }
  });

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// Draw grain noise overlay
function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  if (intensity <= 0) return;
  
  // Create a small offscreen canvas for noise pattern
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const noiseCtx = noiseCanvas.getContext('2d');
  if (!noiseCtx) return;
  
  const imgData = noiseCtx.createImageData(128, 128);
  const data = imgData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Average three independent random values to simulate the CSS feColorMatrix variance reduction
    const r = Math.random() * 255;
    const g = Math.random() * 255;
    const b = Math.random() * 255;
    const val = Math.floor(0.33 * r + 0.33 * g + 0.33 * b);
    data[i] = val;     // R
    data[i+1] = val;   // G
    data[i+2] = val;   // B
    data[i+3] = Math.floor(intensity * 2.55 * Math.random()); // Alpha mapped 0-100 to 0-255 with random turbulence factor
  }
  
  noiseCtx.putImageData(imgData, 0, 0);
  
  ctx.save();
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// Draw mesh aurora gradient with radial color spots and filters
export function drawMeshGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: Array<{ id: string; color: string; x: number; y: number; radius: number }>,
  blur: number,
  grain: number,
  opacity: number,
  spread: number
) {
  ctx.save();
  
  // Base dark background
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, w, h);
  
  // Apply layer opacity
  ctx.globalAlpha = opacity / 100;
  
  // Offscreen canvas to render spots and apply blur filter as a single layer
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const oCtx = offscreen.getContext('2d');
  if (oCtx) {
    points.forEach((pt) => {
      const px = pt.x * w;
      const py = pt.y * h;
      const baseRadius = pt.radius || 100;
      const r = baseRadius * (spread / 100) * (Math.max(w, h) / 500);
      
      if (r <= 0) return;
      
      const grad = oCtx.createRadialGradient(px, py, 0, px, py, r);
      grad.addColorStop(0, pt.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      oCtx.save();
      oCtx.globalCompositeOperation = 'screen';
      oCtx.fillStyle = grad;
      oCtx.fillRect(0, 0, w, h);
      oCtx.restore();
    });
    
    ctx.save();
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }
    ctx.drawImage(offscreen, 0, 0);
    ctx.restore();
  }
  
  ctx.restore(); // Restore opacity before drawing grain
  
  if (grain > 0) {
    drawGrain(ctx, w, h, grain);
  }
}

// Helper to create linear gradients supporting negative/extended percentage stops like CSS
function createExtendedLinearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: { pct: number; color: string }[]
): CanvasGradient {
  if (stops.length === 0) {
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'transparent');
    return grad;
  }
  const pcts = stops.map((s) => s.pct);
  const minPct = Math.min(...pcts);
  const maxPct = Math.max(...pcts);
  const pStart = Math.min(0, minPct);
  const pEnd = Math.max(100, maxPct);
  const pRange = pEnd - pStart;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const newX0 = x0 + (pStart / 100) * dx;
  const newY0 = y0 + (pStart / 100) * dy;
  const newX1 = x0 + (pEnd / 100) * dx;
  const newY1 = y0 + (pEnd / 100) * dy;
  const grad = ctx.createLinearGradient(newX0, newY0, newX1, newY1);
  const sortedStops = [...stops].sort((a, b) => a.pct - b.pct);
  sortedStops.forEach((stop) => {
    const offset = pRange > 0 ? (stop.pct - pStart) / pRange : 0;
    const clampedOffset = Math.max(0, Math.min(1, offset));
    grad.addColorStop(clampedOffset, stop.color);
  });
  return grad;
}

// Draw glowing linear/radial light ray overlays using screen composite mode
function drawLightRaysCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: 'none' | 'diagonal' | 'spotlight' | 'aurora',
  opacity: number,
  angle: number = 135,
  count: number = 4,
  sourceX: number = 50,
  sourceY: number = 0
) {
  if (style === 'none' || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity / 100;
  ctx.globalCompositeOperation = 'screen';

  if (style === 'diagonal') {
    // 1. Calculate gradient angle and bounds
    const angleRad = ((angle - 90) * Math.PI) / 180;
    const r = Math.sqrt(w * w + h * h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const x0 = cx - Math.cos(angleRad) * r;
    const y0 = cy - Math.sin(angleRad) * r;
    const x1 = cx + Math.cos(angleRad) * r;
    const y1 = cy + Math.sin(angleRad) * r;

    // 2. Project sourceX/sourceY onto the gradient line
    const dx = (sourceX / 100) - 0.5;
    const dy = (sourceY / 100) - 0.5;
    const gx = Math.cos(angleRad);
    const gy = Math.sin(angleRad);
    const proj = dx * gx + dy * gy;
    const maxProj = 0.5 * (Math.abs(gx) + Math.abs(gy));
    const cFraction = 0.5 + (maxProj > 0 ? proj / (maxProj * 2) : 0);
    const C = Math.max(0, Math.min(100, cFraction * 100));

    // 3. Render streaks up to count using the BEAM_TEMPLATES structure
    const BEAM_TEMPLATES = [
      { offset: 0, width: 2, opacity: 0.8 },
      { offset: 2.5, width: 6, opacity: 0.35 },
      { offset: -7, width: 1.5, opacity: 0.4 },
      { offset: 16, width: 1, opacity: 0.25 },
      { offset: 19, width: 0.8, opacity: 0.15 },
      { offset: 22, width: 1.2, opacity: 0.2 },
      { offset: -14, width: 0.8, opacity: 0.18 },
      { offset: 25, width: 0.7, opacity: 0.12 },
      { offset: -20, width: 1.5, opacity: 0.1 },
      { offset: 30, width: 1, opacity: 0.08 },
    ];

    const limit = Math.max(1, Math.min(10, count));
    for (let i = 0; i < limit; i++) {
      const beam = BEAM_TEMPLATES[i];
      const mid = C + beam.offset;
      const stops = [
        { pct: mid - beam.width, color: 'rgba(255, 255, 255, 0)' },
        { pct: mid, color: `rgba(255, 255, 255, ${beam.opacity})` },
        { pct: mid + beam.width, color: 'rgba(255, 255, 255, 0)' },
      ];
      const grad = createExtendedLinearGradient(ctx, x0, y0, x1, y1, stops);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // 4. Accent perpendicular purple/blue color sweep
    const perpAngleRad = ((angle - 90 + 90) * Math.PI) / 180;
    const ax0 = cx - Math.cos(perpAngleRad) * r;
    const ay0 = cy - Math.sin(perpAngleRad) * r;
    const ax1 = cx + Math.cos(perpAngleRad) * r;
    const ay1 = cy + Math.sin(perpAngleRad) * r;
    const accentGrad = ctx.createLinearGradient(ax0, ay0, ax1, ay1);
    accentGrad.addColorStop(0, 'rgba(147, 51, 234, 0)');
    accentGrad.addColorStop(0.3, 'rgba(147, 51, 234, 0.2)');
    accentGrad.addColorStop(0.55, 'rgba(59, 130, 246, 0.25)');
    accentGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.2)');
    accentGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, w, h);

  } else if (style === 'spotlight') {
    // Spotlight source radiating dynamically from coordinates to match CSS farthest-corner behavior
    const sx = (sourceX / 100) * w;
    const sy = (sourceY / 100) * h;
    const d1 = Math.sqrt(sx * sx + sy * sy);
    const d2 = Math.sqrt((w - sx) * (w - sx) + sy * sy);
    const d3 = Math.sqrt(sx * sx + (h - sy) * (h - sy));
    const d4 = Math.sqrt((w - sx) * (w - sx) + (h - sy) * (h - sy));
    const maxR = Math.max(d1, d2, d3, d4);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, maxR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

  } else if (style === 'aurora') {
    // Vertical aurora style soft bands offset by custom angle & source position
    const angleRad = ((angle - 90) * Math.PI) / 180;
    const r = Math.sqrt(w * w + h * h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const x0 = cx - Math.cos(angleRad) * r;
    const y0 = cy - Math.sin(angleRad) * r;
    const x1 = cx + Math.cos(angleRad) * r;
    const y1 = cy + Math.sin(angleRad) * r;

    const dx = (sourceX / 100) - 0.5;
    const dy = (sourceY / 100) - 0.5;
    const gx = Math.cos(angleRad);
    const gy = Math.sin(angleRad);
    const proj = dx * gx + dy * gy;
    const maxProj = 0.5 * (Math.abs(gx) + Math.abs(gy));
    const cFraction = 0.5 + (maxProj > 0 ? proj / (maxProj * 2) : 0);
    const C = Math.max(0, Math.min(100, cFraction * 100));

    const stops = [
      { pct: C - 50, color: 'rgba(59, 130, 246, 0)' },
      { pct: C - 30, color: 'rgba(59, 130, 246, 0.2)' },
      { pct: C - 10, color: 'rgba(147, 51, 234, 0.25)' },
      { pct: C + 10, color: 'rgba(6, 182, 212, 0.2)' },
      { pct: C + 30, color: 'rgba(59, 130, 246, 0.1)' },
      { pct: C + 50, color: 'rgba(59, 130, 246, 0)' },
    ];
    const grad = createExtendedLinearGradient(ctx, x0, y0, x1, y1, stops);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Diagonal sweep overlay
    const perpAngleRad = ((angle - 90 + 90) * Math.PI) / 180;
    const ax0 = cx - Math.cos(perpAngleRad) * r;
    const ay0 = cy - Math.sin(perpAngleRad) * r;
    const ax1 = cx + Math.cos(perpAngleRad) * r;
    const ay1 = cy + Math.sin(perpAngleRad) * r;
    const sweep = ctx.createLinearGradient(ax0, ay0, ax1, ay1);
    sweep.addColorStop(0.2, 'rgba(255, 255, 255, 0)');
    sweep.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    sweep.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
}

// Helper to split multi-layered background gradients correctly, tracking parenthesis depth
function splitGradientLayers(val: string): string[] {
  const layers: string[] = [];
  let currentLayer = '';
  let depth = 0;
  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char === '(') {
      depth++;
      currentLayer += char;
    } else if (char === ')') {
      depth--;
      currentLayer += char;
    } else if (char === ',' && depth === 0) {
      layers.push(currentLayer.trim());
      currentLayer = '';
    } else {
      currentLayer += char;
    }
  }
  if (currentLayer.trim()) {
    layers.push(currentLayer.trim());
  }
  return layers;
}

// Main background drawing orchestrator
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: RenderConfig,
  imageEl: HTMLImageElement | null
) {
  ctx.save();

  if (config.backgroundType === 'color') {
    ctx.fillStyle = config.backgroundValue || '#0b0f19';
    ctx.fillRect(0, 0, w, h);
  } else if (config.backgroundType === 'blur' && imageEl) {
    // Draw stretched image
    ctx.drawImage(imageEl, 0, 0, w, h);
    
    // Draw blur filter with customizable blur density
    ctx.save();
    const blurPx = config.blurDensity !== undefined ? config.blurDensity : 40;
    ctx.filter = `blur(${blurPx}px) saturate(1.4)`;
    // Redraw to apply blur
    ctx.drawImage(imageEl, -100, -100, w + 200, h + 200);
    ctx.restore();

    // Dark semi-transparent overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, w, h);
  } else if (config.backgroundType === 'gradient') {
    const val = config.backgroundValue || 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)';
    const layers = splitGradientLayers(val);
    [...layers].reverse().forEach((layer) => {
      const trimmed = layer.trim();
      if (trimmed.startsWith('radial-gradient')) {
        drawRadialGradient(ctx, w, h, trimmed);
      } else if (trimmed.startsWith('linear-gradient')) {
        drawLinearGradient(ctx, w, h, trimmed);
      } else if (trimmed.startsWith('url(')) {
        const match = trimmed.match(/url\(['"]?([^'"()]+)['"]?\)/);
        if (match) {
          const imgUrl = match[1];
          const img = getBgImage(imgUrl);
          if (img && img.complete && img.naturalWidth > 0) {
            // Match CSS background-size: cover; background-position: center
            const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
            const sw = img.naturalWidth * scale;
            const sh = img.naturalHeight * scale;
            const sx = (w - sw) / 2;
            const sy = (h - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh);
          } else if (img) {
            ctx.fillStyle = '#0b0f19';
            ctx.fillRect(0, 0, w, h);
          }
        }
      } else {
        ctx.fillStyle = trimmed;
        ctx.fillRect(0, 0, w, h);
      }
    });
  } else if (config.backgroundType === 'mesh') {
    const pts = config.meshPoints || [];
    const bl = config.meshBlur !== undefined ? config.meshBlur : 60;
    const gr = config.meshGrain !== undefined ? config.meshGrain : 15;
    const op = config.meshOpacity !== undefined ? config.meshOpacity : 100;
    const sp = config.meshSpread !== undefined ? config.meshSpread : 100;
    drawMeshGradient(ctx, w, h, pts, bl, gr, op, sp);
  }

  // Draw Light Rays if configured
  if (config.lightRaysStyle && config.lightRaysStyle !== 'none') {
    const raysOpacity = config.lightRaysOpacity ?? 30;
    const raysAngle = config.lightRaysAngle ?? 135;
    const raysCount = config.lightRaysCount ?? 4;
    const raysSourceX = config.lightRaysSourceX ?? 50;
    const raysSourceY = config.lightRaysSourceY ?? 0;
    drawLightRaysCanvas(ctx, w, h, config.lightRaysStyle, raysOpacity, raysAngle, raysCount, raysSourceX, raysSourceY);
  }

  // Draw Grain if configured
  if (config.bgGrain && config.bgGrain > 0) {
    drawGrain(ctx, w, h, config.bgGrain);
  }

  ctx.restore();
}

// Draw window chrome buttons (macOS or Windows style, light or dark theme)
function drawChrome(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  _h: number,
  style: 'mac' | 'windows',
  theme: 'dark' | 'light',
  scaleFactor: number
) {
  ctx.save();
  const chromeHeight = 32 * scaleFactor;

  // Background for title bar
  if (style === 'mac') {
    ctx.fillStyle = theme === 'light' ? '#f3f3f3' : '#21252b';
  } else {
    ctx.fillStyle = theme === 'light' ? '#ffffff' : '#1e1e1e';
  }
  
  ctx.beginPath();
  const radius = 8 * scaleFactor;
  ctx.roundRect ? ctx.roundRect(x, y, w, chromeHeight, [radius, radius, 0, 0]) : ctx.rect(x, y, w, chromeHeight);
  ctx.fill();

  // Draw divider for light theme
  if (theme === 'light') {
    ctx.save();
    ctx.strokeStyle = style === 'mac' ? '#e1e1e1' : '#e5e5e5';
    ctx.lineWidth = 1 * scaleFactor;
    ctx.beginPath();
    ctx.moveTo(x, y + chromeHeight);
    ctx.lineTo(x + w, y + chromeHeight);
    ctx.stroke();
    ctx.restore();
  }

  if (style === 'mac') {
    // Draw macOS red, yellow, green buttons
    const dotRadius = 5 * scaleFactor;
    const dotSpacing = 16 * scaleFactor;
    const startX = x + 16 * scaleFactor;
    const dotY = y + chromeHeight / 2;

    const colors = ['#ff5f56', '#ffbd2e', '#27c93f'];
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (style === 'windows') {
    // Draw Windows minimize, maximize, close icons on the right
    const iconSize = 10 * scaleFactor;
    const rightMargin = x + w - 24 * scaleFactor;
    const dotY = y + chromeHeight / 2;
    const spacing = 20 * scaleFactor;

    ctx.strokeStyle = theme === 'light' ? '#333333' : '#cccccc';
    ctx.lineWidth = 1 * scaleFactor;

    // Minimize (line)
    ctx.beginPath();
    ctx.moveTo(rightMargin - spacing * 2 - iconSize / 2, dotY);
    ctx.lineTo(rightMargin - spacing * 2 + iconSize / 2, dotY);
    ctx.stroke();

    // Maximize (square)
    ctx.beginPath();
    ctx.rect(rightMargin - spacing - iconSize / 2, dotY - iconSize / 2, iconSize, iconSize);
    ctx.stroke();

    // Close (X)
    ctx.beginPath();
    ctx.moveTo(rightMargin - iconSize / 2, dotY - iconSize / 2);
    ctx.lineTo(rightMargin + iconSize / 2, dotY + iconSize / 2);
    ctx.moveTo(rightMargin + iconSize / 2, dotY - iconSize / 2);
    ctx.lineTo(rightMargin - iconSize / 2, dotY + iconSize / 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw a path of a rounded rectangle
export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Calculate sizes for export or rendering
export function getCanvasDimensions(
  imgWidth: number,
  imgHeight: number,
  config: RenderConfig
): { width: number; height: number } {
  // If noImage is true, default to a standard size or target ratio
  if (config.noImage) {
    const baseWidth = 1200;
    let targetRatio = 16 / 9;
    if (config.aspectRatio === '1:1') targetRatio = 1;
    else if (config.aspectRatio === '4:3') targetRatio = 4 / 3;
    else if (config.aspectRatio === '16:9') targetRatio = 16 / 9;
    else if (config.aspectRatio === '3:2') targetRatio = 3 / 2;
    else if (config.aspectRatio === 'Custom') {
      targetRatio = config.canvasWidth / config.canvasHeight;
    }
    
    if (config.aspectRatio === 'Auto') {
      return { width: 1200, height: 675 };
    }
    
    return {
      width: baseWidth,
      height: Math.round(baseWidth / targetRatio)
    };
  }

  // If Auto, size is determined by image + padding
  if (config.aspectRatio === 'Auto') {
    const scale = config.scale / 100;
    const paddingX = config.padding * 2;
    const paddingY = config.padding * 2;
    const chromeOffset = config.chromeStyle !== 'none' ? 32 : 0;
    
    return {
      width: Math.round(imgWidth * scale + paddingX),
      height: Math.round((imgHeight + chromeOffset) * scale + paddingY),
    };
  }

  // Fixed Aspect Ratio mode
  let targetRatio = 1;
  if (config.aspectRatio === '1:1') targetRatio = 1;
  else if (config.aspectRatio === '4:3') targetRatio = 4 / 3;
  else if (config.aspectRatio === '16:9') targetRatio = 16 / 9;
  else if (config.aspectRatio === '3:2') targetRatio = 3 / 2;
  else if (config.aspectRatio === 'Custom') {
    targetRatio = config.canvasWidth / config.canvasHeight;
  }

  // Calculate size containing the image
  const paddingX = config.padding * 2;
  const paddingY = config.padding * 2;
  const chromeOffset = config.chromeStyle !== 'none' ? 32 : 0;
  
  const contentWidth = imgWidth * (config.scale / 100);
  const contentHeight = (imgHeight + chromeOffset) * (config.scale / 100);

  if (config.paddingMode === 'fit') {
    const currentRatio = (contentWidth + paddingX) / (contentHeight + paddingY);
    if (currentRatio > targetRatio) {
      const canvasWidth = contentWidth + paddingX;
      return {
        width: Math.round(canvasWidth),
        height: Math.round(canvasWidth / targetRatio),
      };
    } else {
      const canvasHeight = contentHeight + paddingY;
      return {
        width: Math.round(canvasHeight * targetRatio),
        height: Math.round(canvasHeight),
      };
    }
  } else {
    const baseWidth = Math.max(800, imgWidth);
    return {
      width: Math.round(baseWidth),
      height: Math.round(baseWidth / targetRatio),
    };
  }
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: RenderConfig
) {
  if (!config.watermarkEnabled || !config.watermarkText) return;
  ctx.save();
  const fontSize = config.watermarkSize || 20;
  const style = config.watermarkItalic ? 'italic' : 'normal';
  const weight = config.watermarkBold ? 'bold' : '500';
  ctx.font = `${style} ${weight} ${fontSize}px ${config.watermarkFont || 'sans-serif'}`;
  
  const opacity = config.watermarkOpacity !== undefined ? config.watermarkOpacity : 0.45;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = '#ffffff';
  
  const position = config.watermarkPosition || 'middle';
  // Safe inset: at least half a font-height from each edge to avoid overflow
  const inset = Math.round(Math.max(config.padding / 3, fontSize * 0.5));
  const isTop = position.startsWith('top');

  let x = width / 2;
  let y: number;
  let align: CanvasTextAlign = 'center';

  // Use textBaseline so text never overflows: 'bottom' anchors at inset from canvas bottom,
  // 'top' anchors at inset from canvas top.
  ctx.textBaseline = isTop ? 'top' : 'bottom';
  y = isTop ? inset : height - inset;

  if (position === 'left' || position === 'top left') {
    x = inset;
    align = 'left';
  } else if (position === 'right' || position === 'top right') {
    x = width - inset;
    align = 'right';
  } else if (position === 'middle' || position === 'top middle') {
    x = width / 2;
    align = 'center';
  }

  ctx.textAlign = align;
  ctx.fillText(config.watermarkText, x, y);
  ctx.restore();
}

// Primary Render function
export function renderCanvas(
  canvas: HTMLCanvasElement,
  imageEl: HTMLImageElement | null,
  config: RenderConfig
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imgW = (imageEl && !config.noImage) ? (imageEl.naturalWidth || imageEl.width) : 800;
  const imgH = (imageEl && !config.noImage) ? (imageEl.naturalHeight || imageEl.height) : 600;

  // 1. Get correct dimensions
  const dims = getCanvasDimensions(imgW, imgH, config);
  canvas.width = dims.width;
  canvas.height = dims.height;

  // 2. Clear canvas
  ctx.clearRect(0, 0, dims.width, dims.height);

  // 3. Draw Background
  drawBackground(ctx, dims.width, dims.height, config, imageEl);

  // If noImage is true, draw annotations directly on the background
  if (config.noImage) {
    if (config.annotations && config.annotations.length > 0) {
      drawAnnotationsOnCanvas(ctx, dims.width, dims.height, config.annotations);
    }
    drawWatermark(ctx, dims.width, dims.height, config);
    return;
  }

  // 4. Calculate content dimensions & scaling factor
  const scale = config.scale / 100;
  const chromeHeight = config.chromeStyle !== 'none' ? 32 : 0;
  const contentW = imgW * scale;
  const contentH = (imgH + chromeHeight) * scale;

  // Define position-based coordinates
  let contentX = (dims.width - contentW) / 2;
  let contentY = (dims.height - contentH) / 2;

  if (config.position === 'Top center') {
    contentX = (dims.width - contentW) / 2;
    contentY = config.padding;
  } else if (config.position === 'Bottom center') {
    contentX = (dims.width - contentW) / 2;
    contentY = dims.height - contentH - config.padding;
  } else if (config.position === 'Middle left') {
    contentX = config.padding;
    contentY = (dims.height - contentH) / 2;
  } else if (config.position === 'Middle right') {
    contentX = dims.width - contentW - config.padding;
    contentY = (dims.height - contentH) / 2;
  }

  // 5. Draw container shadow
  if (config.shadowEnabled && config.shadow > 0) {
    ctx.save();
    ctx.shadowColor = config.shadowColor || 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = config.shadow * 1.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = config.shadow * 0.8;

    ctx.fillStyle = '#ffffff';
    drawRoundedRectPath(ctx, contentX, contentY, contentW, contentH, config.rounded);
    ctx.fill();
    ctx.restore();
  }

  // 6. Draw main screenshot container
  ctx.save();

  drawRoundedRectPath(ctx, contentX, contentY, contentW, contentH, config.rounded);
  ctx.clip();

  if (config.chromeStyle !== 'none') {
    ctx.fillStyle = config.chromeTheme === 'light' ? '#ffffff' : '#1e1e24';
    ctx.fillRect(contentX, contentY, contentW, contentH);
  }

  const scaledChromeHeight = chromeHeight * scale;
  if (config.chromeStyle !== 'none') {
    drawChrome(
      ctx,
      contentX,
      contentY,
      contentW,
      contentH,
      config.chromeStyle,
      config.chromeTheme || 'dark',
      scale
    );
  }

  if (imageEl) {
    ctx.drawImage(
      imageEl,
      contentX,
      contentY + scaledChromeHeight,
      contentW,
      imgH * scale
    );

    // Apply active redactions destructively
    if (config.redactions) {
      config.redactions.forEach((item) => {
        if (item.status === 'redacted') {
          const rx = contentX + item.x * contentW;
          const ry = contentY + scaledChromeHeight + item.y * imgH * scale;
          const rw = item.w * contentW;
          const rh = item.h * imgH * scale;

          if (config.redactionStyle === 'blur') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(rx, ry, rw, rh);
            ctx.clip();

            ctx.filter = 'blur(20px)'; // strong secure blur
            ctx.drawImage(
              imageEl,
              contentX,
              contentY + scaledChromeHeight,
              contentW,
              imgH * scale
            );
            ctx.restore();
          } else {
            // Opaque solid block redaction
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(rx, ry, rw, rh);
          }
        }
      });
    }
  }

function drawAnnotationsOnCanvas(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  annotations: Annotation[],
  originX?: number,
  originY?: number,
  scaleFactor?: number
) {
  const ox = originX ?? 0;
  const oy = originY ?? 0;
  const sf = scaleFactor ?? 1;

  annotations.forEach((ann) => {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;

    const strokeW = (ann.strokeWidth / 1000) * canvasW;
    ctx.lineWidth = Math.max(1, strokeW);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = ox + (ann.x + ann.w / 2) * canvasW;
    const cy = oy + (ann.y + ann.h / 2) * canvasH;
    const w = ann.w * canvasW;
    const h = ann.h * canvasH;

    ctx.translate(cx, cy);
    if (ann.rotation) {
      ctx.rotate((ann.rotation * Math.PI) / 180);
    }

    const halfW = w / 2;
    const halfH = h / 2;

    if (ann.type === 'rect') {
      ctx.strokeRect(-halfW, -halfH, w, h);
    } else if (ann.type === 'filled-rect') {
      ctx.beginPath();
      const r = Math.min(8 * sf, Math.abs(w) * 0.1, Math.abs(h) * 0.1);
      ctx.roundRect ? ctx.roundRect(-halfW, -halfH, w, h, r) : ctx.rect(-halfW, -halfH, w, h);
      ctx.fill();
    } else if (ann.type === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(halfW), Math.abs(halfH), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (ann.type === 'filled-circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(halfW), Math.abs(halfH), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (ann.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(-halfW, -halfH);
      ctx.lineTo(halfW, halfH);
      ctx.stroke();
    } else if (ann.type === 'arrow') {
      drawArrowOnCanvas(ctx, ann, halfW, halfH, strokeW);
    } else if (ann.type === 'text' && ann.text) {
      const fontSize = ann.fontSize ? ann.fontSize * sf : Math.max(12, Math.abs(h) * 0.7);
      const style = ann.fontItalic ? 'italic' : 'normal';
      const weight = ann.fontBold ? 'bold' : 'normal';
      ctx.font = `${style} ${weight} ${fontSize}px ${ann.fontFamily || 'sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
 
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, fontSize * 0.15);
      ctx.lineJoin = 'round';
      ctx.strokeText(ann.text, 0, 0);
      ctx.restore();
 
      ctx.fillText(ann.text, 0, 0);
    } else if (ann.type === 'emoji' && ann.text) {
      const fontSize = Math.min(Math.abs(w), Math.abs(h));
      ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ann.text, 0, 0);
    } else if (ann.type === 'pen' && ann.points) {
      ctx.beginPath();
      ann.points.forEach((p, idx) => {
        const ptX = -halfW + p.x * w;
        const ptY = -halfH + p.y * h;
        if (idx === 0) ctx.moveTo(ptX, ptY);
        else ctx.lineTo(ptX, ptY);
      });
      ctx.stroke();
    }
    ctx.restore();
  });
}

  // Draw Annotations on the screenshot image area
  if (config.annotations && config.annotations.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY + scaledChromeHeight, contentW, imgH * scale);
    ctx.clip();
    drawAnnotationsOnCanvas(ctx, contentW, imgH * scale, config.annotations, contentX, contentY + scaledChromeHeight, scale);
    ctx.restore();
  }

  // Draw component highlights on the screenshot image area
  if (config.showComponentHighlights && config.ocrWords && config.highlightedComponents && config.highlightedComponents.length > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY + scaledChromeHeight, contentW, imgH * scale);
    ctx.clip();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.05)';

    config.ocrWords.forEach((word: any) => {
      const isMatch = config.highlightedComponents!.some((comp: string) =>
        comp.toLowerCase().includes(word.text.toLowerCase()) ||
        word.text.toLowerCase().includes(comp.toLowerCase())
      );
      if (isMatch) {
        const wx = contentX + word.x * contentW;
        const wy = contentY + scaledChromeHeight + word.y * imgH * scale;
        const ww = word.w * contentW;
        const wh = word.h * imgH * scale;

        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeRect(wx, wy, ww, wh);
      }
    });

    ctx.restore();
  }

  // Draw inset border (inner border)
  if (config.inset > 0) {
    ctx.save();
    ctx.strokeStyle = config.insetColor || 'rgba(255,255,255,0.2)';
    ctx.lineWidth = config.inset * scale * 2; // draw double, center-stroke will clip outer half
    drawRoundedRectPath(ctx, contentX, contentY, contentW, contentH, config.rounded);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // remove clip

  // 7. Draw outer container border
  if (config.border > 0) {
    ctx.save();
    ctx.strokeStyle = config.borderColor || '#ffffff';
    ctx.lineWidth = config.border * scale;
    drawRoundedRectPath(ctx, contentX, contentY, contentW, contentH, config.rounded);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Draw Watermark
  drawWatermark(ctx, dims.width, dims.height, config);
}
