import { drawRoundedRectPath } from '../src/renderer/canvasRenderer';
import { makeMockCtx } from './shared';

export function testDrawRoundedRectPath() {
  console.log('Testing drawRoundedRectPath...');
  const ctx = makeMockCtx();
  drawRoundedRectPath(ctx, 0, 0, 100, 100, 10);

  const ctxNoRoundRect = makeMockCtx();
  (ctxNoRoundRect as any).roundRect = undefined;
  drawRoundedRectPath(ctxNoRoundRect, 0, 0, 100, 100, 10);
  console.log('✓ drawRoundedRectPath (both code paths)');
}

export function runCanvasDrawingTests() {
  testDrawRoundedRectPath();
}
