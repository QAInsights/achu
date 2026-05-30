import { describe, it, expect } from 'vitest';
import { getCanvasDimensions } from '../src/renderer/canvasRenderer';
import { baseConfig } from './shared';

describe('Canvas Dimensions', () => {
  it('calculates Auto aspect ratio', () => {
    const dims = getCanvasDimensions(800, 600, baseConfig);
    expect(dims.width).toBe(876);
    expect(dims.height).toBe(708);
  });

  it('calculates Auto ratio with 50% scale', () => {
    const dims = getCanvasDimensions(800, 600, { ...baseConfig, scale: 50 });
    expect(dims.width).toBe(476);
    expect(dims.height).toBe(392);
  });

  it('calculates 16:9 fixed ratio', () => {
    const cfg = { ...baseConfig, aspectRatio: '16:9', paddingMode: 'fit' as const };
    const dims = getCanvasDimensions(1920, 1080, cfg);
    expect(dims.height).toBe(1188);
    expect(dims.width).toBe(2112);
  });

  it('calculates 1:1 fixed ratio', () => {
    const cfg = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit' as const };
    const dims = getCanvasDimensions(800, 600, cfg);
    expect(dims.width).toBe(876);
    expect(dims.height).toBe(876);
  });

  it('calculates no-image dimensions', () => {
    const auto = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: 'Auto' });
    expect(auto.width).toBe(1200);
    expect(auto.height).toBe(675);

    const sq = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '1:1' });
    expect(sq.width).toBe(1200);
    expect(sq.height).toBe(1200);

    const custom = getCanvasDimensions(0, 0, {
      ...baseConfig, noImage: true, aspectRatio: 'Custom', canvasWidth: 800, canvasHeight: 600
    });
    expect(custom.width).toBe(1200);
    expect(custom.height).toBe(900);
  });

  it('calculates chromeStyle=none dimensions', () => {
    const cfg = { ...baseConfig, chromeStyle: 'none' as const };
    const dims = getCanvasDimensions(800, 600, cfg);
    expect(dims.width).toBe(876);
    expect(dims.height).toBe(676);
  });

  it('calculates 4:3 fixed ratio', () => {
    const cfg = { ...baseConfig, aspectRatio: '4:3', paddingMode: 'fit' as const };
    const dims = getCanvasDimensions(800, 600, cfg);
    expect(dims.height).toBe(708);
    expect(dims.width).toBe(Math.round(708 * (4 / 3)));
  });

  it('calculates 3:2 fixed ratio', () => {
    const cfg = { ...baseConfig, aspectRatio: '3:2', paddingMode: 'fit' as const };
    const dims = getCanvasDimensions(1200, 800, cfg);
    const expectedH = 908;
    const expectedW = Math.round(908 * (3 / 2));
    expect(dims.height).toBe(expectedH);
    expect(dims.width).toBe(expectedW);
  });

  it('calculates Custom aspect ratio', () => {
    const cfg = {
      ...baseConfig,
      aspectRatio: 'Custom',
      canvasWidth: 1920,
      canvasHeight: 1080,
      paddingMode: 'fit' as const
    };
    const dims = getCanvasDimensions(800, 600, cfg);
    const targetRatio = 1920 / 1080;
    expect(Math.abs(dims.width / dims.height - targetRatio)).toBeLessThan(0.01);
  });

  it('calculates paddingMode=fill', () => {
    const cfg = {
      ...baseConfig,
      aspectRatio: '16:9',
      paddingMode: 'fill' as const
    };
    const dims = getCanvasDimensions(800, 600, cfg);
    expect(dims.width).toBeGreaterThanOrEqual(800);
    const ratio = dims.width / dims.height;
    expect(Math.abs(ratio - 16 / 9)).toBeLessThan(0.01);
  });

  it('calculates no-image ratios', () => {
    const r43 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '4:3' });
    expect(r43.width).toBe(1200);
    expect(r43.height).toBe(900);

    const r32 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '3:2' });
    expect(r32.width).toBe(1200);
    expect(r32.height).toBe(800);

    const r169 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '16:9' });
    expect(r169.width).toBe(1200);
    expect(r169.height).toBe(675);
  });
});
