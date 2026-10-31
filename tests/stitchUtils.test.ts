import { describe, expect, it, vi } from 'vitest';
import {
  drawStitchedImages, estimateOverlap, estimateOverlapAsync, overlapRange, planStitchOutput, planStitchSources, stitchedHeight,
  validateStitchFileBudget, validateStitchSourceDimensions, STITCH_MAX_FILE_BYTES, STITCH_MAX_OUTPUT_HEIGHT,
  STITCH_MAX_OUTPUT_PIXELS, STITCH_MEMORY_BUDGET, type StitchSample,
} from '../src/renderer/utils/stitchUtils';

describe('stitch resolution planning', () => {
  it.each([
    { width: 5000, height: 3000 }, { width: 100, height: 20_000 },
    { width: 16_384, height: 100 }, { width: 100, height: 32_767 },
  ])('accepts larger and taller sources within the hard ceiling: %o', size => {
    expect(() => validateStitchSourceDimensions(size)).not.toThrow();
  });

  it.each([
    { width: 0, height: 100 }, { width: 100, height: 2 }, { width: 1.5, height: 100 },
    { width: NaN, height: 100 }, { width: 16_385, height: 100 }, { width: 100, height: 32_768 },
    { width: 8000, height: 5001 },
  ])('rejects invalid or excessive source dimensions: %o', size => {
    expect(() => validateStitchSourceDimensions(size)).toThrow('40 megapixels');
  });

  it('keeps source resolution when the complete working set fits', () => {
    const plan = planStitchSources(Array.from({ length: 2 }, () => ({ width: 5000, height: 3000, bytes: 1000 })));
    expect(plan).toMatchObject({ reduced: false, scale: 1, width: 5000, heights: [3000, 3000] });
    expect(plan.estimatedBytes).toBeLessThanOrEqual(STITCH_MEMORY_BUDGET);
  });

  it('plans one shared scale for a large selection without changing source metadata', () => {
    const sources = Array.from({ length: 6 }, (_, index) => Object.freeze({ width: 5000, height: 3000 - index * 100, bytes: 1000 }));
    const plan = planStitchSources(sources);
    expect(plan.reduced).toBe(true);
    expect(plan.scale).toBeGreaterThan(0);
    expect(plan.scale).toBeLessThan(1);
    expect(plan.width).toBe(Math.floor(5000 * plan.scale));
    expect(plan.heights).toEqual(sources.map(source => Math.floor(source.height * plan.scale)));
    expect(plan.estimatedBytes).toBeLessThanOrEqual(STITCH_MEMORY_BUDGET);
    expect(sources[0]).toEqual({ width: 5000, height: 3000, bytes: 1000 });
  });

  it('budgets file buffers rather than relying on a per-file compressed-size cap', () => {
    const smallFiles = Array.from({ length: 2 }, () => ({ width: 5000, height: 3000, bytes: 1000 }));
    expect(planStitchSources(smallFiles).reduced).toBe(false);
    expect(planStitchSources(smallFiles.map(source => ({ ...source, bytes: 30_000_000 }))).reduced).toBe(true);
    expect(planStitchSources(smallFiles.map(source => ({ ...source, width: 100, height: 100, bytes: 12_000_000 }))).reduced).toBe(false);
  });

  it('accounts for native-height samples and the full decoder scratch buffer for tall sources', () => {
    const sources = Array.from({ length: 6 }, () => ({ width: 1000, height: 32_767, bytes: 10_000 }));
    const plan = planStitchSources(sources);
    expect(plan.reduced).toBe(true);
    const totalHeight = plan.heights.reduce((sum, height) => sum + height, 0);
    const maximumOutputPixels = Math.min(STITCH_MAX_OUTPUT_PIXELS, plan.width * Math.min(totalHeight, STITCH_MAX_OUTPUT_HEIGHT));
    expect(plan.estimatedBytes).toBe(sources.length * 10_000 * 2 + 1000 * 32_767 * 4 +
      plan.width * totalHeight * 4 + 128 * totalHeight * 8 + maximumOutputPixels * 8 + 128 * 1024 * 1024);
    expect(plan.estimatedBytes).toBeLessThanOrEqual(STITCH_MEMORY_BUDGET);
  });

  it('rejects a selection whose files and decode scratch space cannot fit even at reduced resolution', () => {
    expect(() => planStitchSources(Array.from({ length: 2 }, () => ({ width: 8000, height: 5000, bytes: 64_000_000 })))).toThrow('even as a smaller copy');
  });

  it('rejects a reduction that would leave a source too short to align', () => {
    expect(() => planStitchSources([
      { width: 8000, height: 3, bytes: 1000 }, { width: 8000, height: 5000, bytes: 1000 },
    ])).toThrow('even as a smaller copy');
  });

  it.each([0, 1, 7])(
    'rejects an invalid count of %i sources', count => {
      const sources = Array.from({ length: count }, () => ({ width: 100, height: 100, bytes: 1 }));
      expect(() => planStitchSources(sources)).toThrow('2–6 screenshots');
    },
  );

  it('requires matching original widths even if downscaling would round them to the same size', () => {
    expect(() => planStitchSources([
      { width: 6000, height: 5000, bytes: 1 }, { width: 6001, height: 5000, bytes: 1 },
    ])).toThrow('same pixel width');
  });

  it.each([-1, 0.5, Infinity, STITCH_MAX_FILE_BYTES + 1])('rejects an unsafe file-data budget of %s bytes', bytes => {
    expect(() => validateStitchFileBudget(bytes)).toThrow('too much file data');
  });

  it('checks the aggregate file-data budget as well as individual sizes', () => {
    expect(() => validateStitchFileBudget(STITCH_MAX_FILE_BYTES)).not.toThrow();
    expect(() => planStitchSources(Array.from({ length: 2 }, () => ({ width: 100, height: 100, bytes: STITCH_MAX_FILE_BYTES / 2 + 1 })))).toThrow('too much file data');
  });

  it.each([{ width: 3840, height: 5000 }, { width: 1250, height: 16_000 }])('preserves a safe output at original resolution: %o', size => {
    expect(planStitchOutput(size)).toEqual({ ...size, scale: 1, reduced: false });
  });

  it.each([{ width: 3840, height: 9000 }, { width: 100, height: 60_000 }, { width: 8000, height: 30_000 }])(
    'uniformly fits a large output inside pixel and height limits: %o', size => {
      const output = planStitchOutput(size);
      expect(output.reduced).toBe(true);
      expect(output.width * output.height).toBeLessThanOrEqual(STITCH_MAX_OUTPUT_PIXELS);
      expect(output.height).toBeLessThanOrEqual(STITCH_MAX_OUTPUT_HEIGHT);
      expect(output.width).toBe(Math.floor(size.width * output.scale));
      expect(output.height).toBe(Math.floor(size.height * output.scale));
    },
  );

  it.each([{ width: 0, height: 100 }, { width: 100, height: Infinity }, { width: 100, height: 0.5 }])('rejects invalid output dimensions: %o', size => {
    expect(() => planStitchOutput(size)).toThrow('valid pixel dimensions');
  });

  it('draws a reduced output all the way to its separately rounded width and height', () => {
    const ctx = { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D;
    const images = [{ width: 100, height: 100 }, { width: 100, height: 80 }] as ImageBitmap[];
    const scaleY = 74 / 150;
    drawStitchedImages(ctx, images, [30], { x: 0.37, y: scaleY });
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, images[0], 0, 0, 100, 100, 0, 0, 37, 100 * scaleY);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, images[1], 0, 30, 100, 50, 0, 100 * scaleY, 37, 50 * scaleY);
  });
});

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
    vi.stubGlobal('scheduler', undefined);
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
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('prefers scheduler yields to avoid clamped background timers when available', async () => {
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now += 10);
    const yieldTask = vi.fn(async () => {});
    vi.stubGlobal('scheduler', { yield: yieldTask });
    try {
      const first = screenshot(0);
      const second = screenshot(35);
      expect(await estimateOverlapAsync(first, second, () => true)).toEqual(estimateOverlap(first, second));
      expect(yieldTask).toHaveBeenCalled();
    } finally {
      clock.mockRestore();
      vi.unstubAllGlobals();
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
