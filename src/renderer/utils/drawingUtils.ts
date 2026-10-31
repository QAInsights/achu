import type { Annotation } from '../canvasRenderer';

export function constrainDrawingDimensions(
  type: Annotation['type'], w: number, h: number, dimensions: { width: number; height: number },
): { w: number; h: number } | null {
  const { width, height } = dimensions;
  if (![width, height, w, h].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const dx = w * width;
  const dy = h * height;
  if (type === 'line' || type === 'arrow') {
    const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const length = Math.hypot(dx, dy);
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    return { w: Math.abs(x) < 1e-10 ? 0 : x / width, h: Math.abs(y) < 1e-10 ? 0 : y / height };
  }
  if (type === 'rect' || type === 'filled-rect' || type === 'circle' || type === 'filled-circle') {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return { w: (dx < 0 ? -size : size) / width, h: (dy < 0 ? -size : size) / height };
  }
  return null;
}

export function getArrowAngle(w: number, h: number) {
  return Math.atan2(h, w);
}

export function getArrowheadLength(strokeWidth: number) {
  return Math.max(12, strokeWidth * 3);
}

export function calculateArrowheadPositions(w: number, h: number, headLen: number) {
  const angle = Math.atan2(h, w);
  const endX = w / 2;
  const endY = h / 2;
  const arrow1X = endX - headLen * Math.cos(angle - Math.PI / 6);
  const arrow1Y = endY - headLen * Math.sin(angle - Math.PI / 6);
  const arrow2X = endX - headLen * Math.cos(angle + Math.PI / 6);
  const arrow2Y = endY - headLen * Math.sin(angle + Math.PI / 6);
  return { endX, endY, arrow1X, arrow1Y, arrow2X, arrow2Y, angle };
}

export function getTextFontSize(rectH: number) {
  return Math.max(12, rectH * 0.7);
}

export function getTextStrokeWidth(fontSize: number) {
  return Math.max(2, fontSize * 0.15);
}

export function getEmojiFontSize(rectW: number, rectH: number) {
  return Math.min(rectW, rectH);
}

export function getFilledRectCornerRadius(rectW: number, rectH: number) {
  return Math.min(8, rectW * 0.1, rectH * 0.1);
}

export function getTextBorderRadius(rectH: number) {
  return rectH * 0.15;
}

export function generatePenPath(points: Array<{ x: number; y: number }>, w: number, h: number) {
  if (points.length === 0) return '';
  const pathData = `M ${-w / 2 + points[0].x * w} ${-h / 2 + points[0].y * h} ` +
    points.slice(1).map(p => `L ${-w / 2 + p.x * w} ${-h / 2 + p.y * h}`).join(' ');
  return pathData;
}

export function getDashedLinePattern(strokeWidth: number, isDashed: boolean) {
  return isDashed ? `${strokeWidth * 2} ${strokeWidth * 1.5}` : undefined;
}
