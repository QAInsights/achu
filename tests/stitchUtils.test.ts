import { describe, expect, it, vi } from 'vitest';
import { drawStitchedImages, estimateOverlap, overlapRange, stitchedHeight, type StitchSample } from '../src/renderer/utils/stitchUtils';

function screenshot(start: number, rows = 65, width = 24): StitchSample {
  const data = new Uint8ClampedArray(rows * width * 4);
  for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
    const pixel = (y * width + x) * 4;
    data[pixel] = ((start + y) * 37 + x * 11) % 256;
    data[pixel + 1] = ((start + y) * 53 + x * 19) % 256;
    data[pixel + 2] = ((start + y) * 91 + x * 7) % 256;
    data[pixel + 3] = 255;
  }
  return { width, height: rows, data };
}

describe('screenshot stitching', () => {
  it.each([8, 20, 40, 56])('recognizes an exact %s-row overlap', rows => {
    const first = screenshot(0);
    const second = screenshot(65 - rows);
    const match = estimateOverlap(first, second);
    expect(match).toMatchObject({ rows, score: 0, confident: true });
  });

  it('requires manual review for repeated/featureless or unrelated images', () => {
    const blank = new Uint8ClampedArray(24 * 65 * 4);
    expect(estimateOverlap({ width: 24, height: 65, data: blank }, { width: 24, height: 65, data: blank }).confident).toBe(false);
    expect(estimateOverlap(screenshot(0), screenshot(150)).confident).toBe(false);
  });

  it('rejects mismatched widths and samples too short to align', () => {
    expect(() => estimateOverlap(screenshot(0), screenshot(0, 65, 32))).toThrow('matching widths');
    expect(() => estimateOverlap(screenshot(0, 2), screenshot(0))).toThrow('enough image content');
  });

  it('calculates output height, overlap limits and preserves the first capture at each join', () => {
    expect(overlapRange(100, 80)).toEqual({ min: 6, max: 72 });
    expect(stitchedHeight([100, 80, 70], [30, 25])).toBe(195);
    const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    const images = [{ width: 100, height: 100 }, { width: 100, height: 80 }, { width: 100, height: 70 }] as ImageBitmap[];
    drawStitchedImages(ctx, images, [30, 25]);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, images[0], 0, 0, 100, 100, 0, 0, 100, 100);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, images[1], 0, 30, 100, 50, 0, 100, 100, 50);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(3, images[2], 0, 25, 100, 45, 0, 150, 100, 45);
  });
});
