import { describe, expect, it, vi } from 'vitest';
import { drawStitchedImages, estimateOverlap, estimateOverlapAsync, overlapRange, stitchedHeight, type StitchSample } from '../src/renderer/utils/stitchUtils';

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

function textPage(line: number, period: number, fill: number, seed: number) {
  const width = 128;
  const data = new Uint8ClampedArray(2400 * width * 4).fill(255);
  let state = seed;
  const next = () => { state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff; return state / 0x7fffffff; };
  for (let y = 0; y < 2400; y++) for (let x = 0; x < width; x++) {
    const value = y % period < line && next() < fill ? 20 : 255;
    const index = (y * width + x) * 4;
    data[index] = data[index + 1] = data[index + 2] = value;
  }
  return { width, data };
}

function crop(page: { width: number; data: Uint8ClampedArray }, top: number, height = 1000): StitchSample {
  return { width: page.width, height, data: page.data.slice(top * page.width * 4, (top + height) * page.width * 4) };
}

describe('screenshot stitching', () => {
  it('uses the same overlap scoring for interactive and synchronous matching', async () => {
    const first = screenshot(0);
    const second = screenshot(35);
    expect(await estimateOverlapAsync(first, second, () => true)).toEqual(estimateOverlap(first, second));
  });

  it('yields during a single pair so cancellation can stop the remaining candidates', async () => {
    vi.useFakeTimers();
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now += 10);
    try {
      let current = true;
      const pending = estimateOverlapAsync(screenshot(0), screenshot(35), () => current);
      expect(vi.getTimerCount()).toBe(1);
      current = false;
      await vi.runAllTimersAsync();
      expect(await pending).toBeNull();
    } finally {
      clock.mockRestore();
      vi.useRealTimers();
    }
  });

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

  it('tolerates small compression differences in an otherwise matching region', () => {
    const second = screenshot(35);
    for (let i = 0; i < second.data.length; i++) if (i % 4 !== 3) second.data[i] += i % 3 - 1;
    expect(estimateOverlap(screenshot(0), second)).toMatchObject({ rows: 30, confident: true });
  });

  it('rejects mismatched widths and samples too short to align', () => {
    expect(() => estimateOverlap(screenshot(0), screenshot(0, 65, 32))).toThrow('matching widths');
    expect(() => estimateOverlap(screenshot(0, 2), screenshot(0))).toThrow('enough image content');
  });

  it.each([
    [14, 48, 0.25, 7, 90], [14, 48, 0.25, 7, 500],
    [10, 24, 0.25, 11, 150], [10, 24, 0.25, 11, 700],
    [8, 64, 0.15, 5, 300],
  ])('aligns sparse text with line height %i/%i and fill %s, seed %i, overlap %i', (line, period, fill, seed, overlap) => {
    const page = textPage(line, period, fill, seed);
    const first = crop(page, 0);
    const second = crop(page, 1000 - overlap);
    expect(estimateOverlap(first, second)).toMatchObject({ rows: overlap, confident: true });
    for (let i = 0; i < second.data.length; i++) if (i % 4 !== 3) second.data[i] += i % 9 - 4;
    expect(estimateOverlap(first, second)).toMatchObject({ rows: overlap, confident: true });
  });

  it.each([90, 300])('keeps very sparse ambiguous blocks uncertain at %i-row overlap', overlap => {
    const page = textPage(10, 400, 0.25, 9);
    expect(estimateOverlap(crop(page, 0), crop(page, 1000 - overlap)).confident).toBe(false);
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
