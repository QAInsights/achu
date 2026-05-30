import { describe, it, expect } from 'vitest';
import { drawRoundedRectPath } from '../src/renderer/canvasRenderer';
import { makeMockCtx } from './shared';

describe('Canvas Drawing', () => {
  it('draws rounded rect path with roundRect available', () => {
    const ctx = makeMockCtx();
    expect(() => drawRoundedRectPath(ctx, 0, 0, 100, 100, 10)).not.toThrow();
  });

  it('draws rounded rect path with manual fallback', () => {
    const ctx = makeMockCtx();
    (ctx as any).roundRect = undefined;
    expect(() => drawRoundedRectPath(ctx, 0, 0, 100, 100, 10)).not.toThrow();
  });
});
