import type { RenderConfig } from '../canvasRenderer';

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface ImageSize {
  width: number;
  height: number;
}
export type CropHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'move';
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function clampCrop(rect: CropRect, size: ImageSize, ratio?: number): CropRect {
  let w = clamp(rect.w, Math.min(16, size.width), size.width);
  let h = clamp(rect.h, Math.min(16, size.height), size.height);
  if (ratio && ratio > 0) {
    const minW = Math.min(Math.max(16, 16 * ratio), size.width, size.height * ratio);
    w = clamp(w, minW, Math.min(size.width, size.height * ratio));
    h = w / ratio;
  }
  return {
    x: clamp(rect.x, 0, size.width - w),
    y: clamp(rect.y, 0, size.height - h),
    w,
    h,
  };
}

export function resizeCrop(rect: CropRect, handle: CropHandle, dx: number, dy: number, size: ImageSize, ratio?: number): CropRect {
  if (handle === 'move') {
    return clampCrop({ ...rect, x: rect.x + dx, y: rect.y + dy }, size);
  }
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const ax = west ? rect.x + rect.w : east ? rect.x : rect.x + rect.w / 2;
  const ay = north ? rect.y + rect.h : south ? rect.y : rect.y + rect.h / 2;
  let w = west ? rect.w - dx : east ? rect.w + dx : rect.w;
  let h = north ? rect.h - dy : south ? rect.h + dy : rect.h;
  const maxW = west ? ax : east ? size.width - ax : 2 * Math.min(ax, size.width - ax);
  const maxH = north ? ay : south ? size.height - ay : 2 * Math.min(ay, size.height - ay);
  if (ratio) {
    if (!west && !east) w = h * ratio;
    else if ((north || south) && Math.abs(dy) > Math.abs(dx) / ratio) w = h * ratio;
    w = clamp(w, Math.min(Math.max(16, 16 * ratio), maxW, maxH * ratio), Math.min(maxW, maxH * ratio));
    h = w / ratio;
  } else {
    w = clamp(w, Math.min(16, maxW), maxW);
    h = clamp(h, Math.min(16, maxH), maxH);
  }
  return {
    x: west ? ax - w : east ? ax : ax - w / 2,
    y: north ? ay - h : south ? ay : ay - h / 2,
    w,
    h,
  };
}

export function pixelCrop(rect: CropRect, size: ImageSize): CropRect {
  return clampCrop({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.round(rect.w),
    h: Math.round(rect.h),
  }, size);
}

export function cropSnapshot(config: RenderConfig, size: ImageSize, crop: CropRect, imageSrc: string): RenderConfig {
  const sx = size.width / crop.w;
  const sy = size.height / crop.h;
  const scale = (config.scale ?? 100) / 100;
  // Auto uses an intrinsic-size image capped by its container; fixed aspects
  // stretch the image to the content width. Zoom is a parent CSS transform.
  const displayScale = !config.aspectRatio || config.aspectRatio === 'Auto' ? Math.min(1, scale) : scale;
  const displayWidth = crop.w * displayScale;
  const oldDisplayWidth = config.annotationDisplayWidth || size.width;
  const styleScale = displayScale * size.width / oldDisplayWidth;
  return {
    ...config,
    imageSrc,
    issuePayload: null,
    annotationDisplayWidth: displayWidth,
    annotations: (config.annotations || []).map(a => {
      const fontSize = a.type === 'text'
        ? a.fontSize || Math.max(12, Math.abs(a.h) * size.height * oldDisplayWidth / size.width * 0.7)
        : a.fontSize;
      const outlineWidth = a.outlineWidth ?? (a.type === 'text' && a.outlineEnabled
        ? Math.max(2, (fontSize || 0) * 0.15)
        : undefined);
      return {
        ...a,
        x: (a.x * size.width - crop.x) / crop.w,
        y: (a.y * size.height - crop.y) / crop.h,
        w: a.w * sx,
        h: a.h * sy,
        strokeWidth: a.strokeWidth * styleScale,
        fontSize: fontSize === undefined ? undefined : fontSize * styleScale,
        outlineWidth: outlineWidth === undefined ? undefined : outlineWidth * styleScale,
        textMinHeight: a.textMinHeight === undefined ? undefined : a.textMinHeight * sy,
      };
    }),
    redactions: (config.redactions || []).flatMap(r => {
      const x = Math.max(r.x * size.width, crop.x);
      const y = Math.max(r.y * size.height, crop.y);
      const right = Math.min((r.x + r.w) * size.width, crop.x + crop.w);
      const bottom = Math.min((r.y + r.h) * size.height, crop.y + crop.h);
      if (right <= x || bottom <= y) return [];
      return [{
        ...r,
        x: (x - crop.x) / crop.w,
        y: (y - crop.y) / crop.h,
        w: (right - x) / crop.w,
        h: (bottom - y) / crop.h,
      }];
    }),
  };
}

export async function renderCrop(src: string, rect: CropRect): Promise<{ imageSrc: string; size: ImageSize; crop: CropRect }> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const size = { width: img.naturalWidth, height: img.naturalHeight };
  const crop = pixelCrop(rect, size);
  const canvas = document.createElement('canvas');
  canvas.width = crop.w;
  canvas.height = crop.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable');
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  return { imageSrc: canvas.toDataURL('image/png'), size, crop };
}
