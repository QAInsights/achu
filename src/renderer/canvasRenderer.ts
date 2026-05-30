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
}

import { drawArrowOnCanvas } from './arrowUtils';


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
  position: string; // "Middle center", "Top center", "Bottom center", "Middle left", "Middle right"
  annotations?: Annotation[];
  meshPoints?: Array<{ id: string; color: string; x: number; y: number; radius: number }>;
  meshBlur?: number;
  meshGrain?: number;
  meshOpacity?: number;
  meshSpread?: number;
  noImage?: boolean;
}

interface ColorStop {
  color: string;
  stop: number;
}

// Parse colors and stops from CSS gradient parts
function parseColorStops(partStr: string): ColorStop[] {
  const stops: ColorStop[] = [];
  // Regex to match colors (hex, rgb/rgba, or standard words) and optional percentages
  const regex = /(rgba?\(.+?\)|#[0-9a-fA-F]+|[a-zA-Z]+)\s*(\d+%)?/g;
  let match;
  const matches: { color: string; stopStr?: string }[] = [];

  while ((match = regex.exec(partStr)) !== null) {
    matches.push({ color: match[1], stopStr: match[2] });
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

  const centerMatch = cssStr.match(/circle\s+at\s+(\d+)%\s+(\d+)%/);
  if (centerMatch) {
    cx = (parseInt(centerMatch[1], 10) / 100) * w;
    cy = (parseInt(centerMatch[2], 10) / 100) * h;
  }

  // Parse radius percentage if any, or default to max of w or h
  let radius = Math.max(w, h);
  const radiusMatch = cssStr.match(/transparent\s+(\d+)%/);
  if (radiusMatch) {
    radius = (parseInt(radiusMatch[1], 10) / 100) * Math.max(w, h);
  } else {
    // Look for any percentage at the end of the stops
    const stopsMatch = cssStr.match(/(\d+)%\s*\)$/);
    if (stopsMatch) {
      radius = (parseInt(stopsMatch[1], 10) / 100) * Math.max(w, h);
    }
  }

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
    const val = Math.floor(Math.random() * 255);
    data[i] = val;     // R
    data[i+1] = val;   // G
    data[i+2] = val;   // B
    data[i+3] = Math.floor(intensity * 2.55); // Alpha mapped 0-100 to 0-255
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
    const layers = val.split(/,(?![^(]*\))/);
    layers.forEach((layer) => {
      const trimmed = layer.trim();
      if (trimmed.startsWith('radial-gradient')) {
        drawRadialGradient(ctx, w, h, trimmed);
      } else if (trimmed.startsWith('linear-gradient')) {
        drawLinearGradient(ctx, w, h, trimmed);
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

  // If noImage is true, skip drawing screenshot container/decorations
  if (config.noImage) {
    if (config.watermarkEnabled && config.watermarkText) {
      ctx.save();
      const fontSize = Math.max(14, Math.round(dims.width * 0.018));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'center';
      const textY = dims.height - (config.padding / 2) + (fontSize / 3);
      ctx.fillText(config.watermarkText, dims.width / 2, textY);
      ctx.restore();
    }
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

  ctx.fillStyle = '#1e1e24';
  ctx.fillRect(contentX, contentY, contentW, contentH);

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
  }

  // Draw Annotations
  if (config.annotations && config.annotations.length > 0) {
    ctx.save();
    // Clip to image area so annotations don't bleed outside the screenshot
    ctx.beginPath();
    ctx.rect(contentX, contentY + scaledChromeHeight, contentW, imgH * scale);
    ctx.clip();

    config.annotations.forEach((ann) => {
      ctx.save();
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      
      const strokeW = (ann.strokeWidth / 1000) * contentW;
      ctx.lineWidth = Math.max(1, strokeW);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate absolute center and dimensions on canvas
      const cx = contentX + (ann.x + ann.w / 2) * contentW;
      const cy = contentY + scaledChromeHeight + (ann.y + ann.h / 2) * (imgH * scale);
      const canvasW = ann.w * contentW;
      const canvasH = ann.h * (imgH * scale);

      // Translate and rotate
      ctx.translate(cx, cy);
      if (ann.rotation) {
        ctx.rotate((ann.rotation * Math.PI) / 180);
      }

      // Draw centered at (0, 0)
      const halfW = canvasW / 2;
      const halfH = canvasH / 2;

      if (ann.type === 'rect') {
        ctx.strokeRect(-halfW, -halfH, canvasW, canvasH);
      } else if (ann.type === 'filled-rect') {
        ctx.beginPath();
        const r = Math.min(8 * scale, Math.abs(canvasW) * 0.1, Math.abs(canvasH) * 0.1);
        ctx.roundRect ? ctx.roundRect(-halfW, -halfH, canvasW, canvasH, r) : ctx.rect(-halfW, -halfH, canvasW, canvasH);
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
        const fontSize = Math.max(12, Math.abs(canvasH) * 0.7);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Render background box matching the annotation bounds
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        const r = Math.abs(canvasH) * 0.15;
        ctx.roundRect ? ctx.roundRect(-halfW, -halfH, canvasW, canvasH, r) : ctx.rect(-halfW, -halfH, canvasW, canvasH);
        ctx.fill();
        ctx.restore();

        // Draw outline stroke
        ctx.save();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(2, fontSize * 0.15);
        ctx.lineJoin = 'round';
        ctx.strokeText(ann.text, 0, 0);
        ctx.restore();

        ctx.fillText(ann.text, 0, 0);
      } else if (ann.type === 'emoji' && ann.text) {
        const fontSize = Math.min(Math.abs(canvasW), Math.abs(canvasH));
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ann.text, 0, 0);
      } else if (ann.type === 'pen' && ann.points) {
        ctx.beginPath();
        ann.points.forEach((p, idx) => {
          const ptX = -halfW + p.x * contentW;
          const ptY = -halfH + p.y * (imgH * scale);
          if (idx === 0) ctx.moveTo(ptX, ptY);
          else ctx.lineTo(ptX, ptY);
        });
        ctx.stroke();
      }
      ctx.restore();
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
  if (config.watermarkEnabled && config.watermarkText) {
    ctx.save();
    // Font size relative to canvas width
    const fontSize = Math.max(14, Math.round(dims.width * 0.018));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.textAlign = 'center';
    
    // Draw watermark text at the bottom center
    const textY = dims.height - (config.padding / 2) + (fontSize / 3);
    ctx.fillText(config.watermarkText, dims.width / 2, textY);
    ctx.restore();
  }
}
