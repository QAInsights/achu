import type { Annotation } from '../canvasRenderer';

export const STEP_FONT = 'system-ui, sans-serif';

export function nextStepOrder(annotations: Annotation[]): number {
  return Math.max(0, ...annotations.filter(a => a.type === 'step').map(a => a.stepOrder ?? 0)) + 1;
}

export function stepNumbers(annotations: Annotation[]): Map<string, number> {
  return new Map(annotations.filter(a => a.type === 'step')
    .sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0) || a.id.localeCompare(b.id))
    .map((a, index) => [a.id, index + 1]));
}

export function assignStepOrder(annotation: Annotation, annotations: Annotation[]): Annotation {
  return annotation.type === 'step' ? { ...annotation, stepOrder: nextStepOrder(annotations) } : annotation;
}

export function stepTextColor(color: string): string {
  const hex = color.replace('#', '');
  const expanded = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  if (!/^[a-f\d]{6}$/i.test(expanded)) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map(i => {
    const v = parseInt(expanded.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * r + .7152 * g + .0722 * b;
  return luminance > .179 ? '#111827' : '#ffffff';
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
  const x = handle.includes('l') ? start.x + start.w - w : handle.includes('r') ? start.x : start.x + (start.w - w) / 2;
  const y = handle.includes('t') ? start.y + start.h - h : handle.includes('b') ? start.y : start.y + (start.h - h) / 2;
  return { x, y, w, h };
}
