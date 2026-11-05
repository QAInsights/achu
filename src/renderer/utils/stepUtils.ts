import type { Annotation } from '../canvasRenderer';

export const STEP_FONT = 'system-ui, sans-serif';

export function nextStepOrder(annotations: Annotation[]): number {
  const orders = annotations.filter(a => a.type === 'step').map(a => a.stepOrder ?? 0);
  return Math.max(0, ...orders) + 1;
}

export function stepNumbers(annotations: Annotation[]): Map<string, number> {
  const steps = annotations.filter(a => a.type === 'step');
  steps.sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0) || a.id.localeCompare(b.id));
  return new Map(steps.map((a, index) => [a.id, index + 1]));
}

export function assignStepOrder(annotation: Annotation, annotations: Annotation[]): Annotation {
  return annotation.type === 'step' ? { ...annotation, stepOrder: nextStepOrder(annotations) } : annotation;
}

export function stepTextColor(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  if (!probe.style.color) return '#ffffff';
  probe.hidden = true;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const channels = resolved.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[,\s/]+/).filter(Boolean);
  if (!channels || channels.length < 3) return '#ffffff';
  const [r, g, b] = channels.slice(0, 3).map(channel => {
    const v = parseFloat(channel) / (channel.endsWith('%') ? 100 : 255);
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  return luminance > .45 ? '#111827' : '#ffffff';
}

export function stepTextBaseline(metrics: TextMetrics, fontSize: number): number {
  const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = metrics;
  return Number.isFinite(ascent) && Number.isFinite(descent) ? (ascent - descent) / 2 : fontSize * .35;
}

export function sizeStep(annotation: Annotation, diameter: number, dimensions: { width: number; height: number }): Annotation {
  const w = diameter / dimensions.width;
  const h = diameter / dimensions.height;
  return {
    ...annotation,
    x: annotation.x + (annotation.w - w) / 2,
    y: annotation.y + (annotation.h - h) / 2,
    w,
    h,
  };
}

export function stepFontSize(diameter: number, number: number): number {
  return diameter * Math.min(.5, .95 / String(number).length);
}

export function resizeStep(
  start: { x: number; y: number; w: number; h: number },
  proposedW: number, proposedH: number, handle: string,
  dimensions: { width: number; height: number },
) {
  const horizontal = handle.includes('l') || handle.includes('r');
  const diameter = Math.max(16, horizontal ? proposedW * dimensions.width : proposedH * dimensions.height);
  const w = diameter / dimensions.width;
  const h = diameter / dimensions.height;
  const x = handle.includes('l') ? start.x + start.w - w
    : handle.includes('r') ? start.x : start.x + (start.w - w) / 2;
  const y = handle.includes('t') ? start.y + start.h - h
    : handle.includes('b') ? start.y : start.y + (start.h - h) / 2;
  return { x, y, w, h };
}
