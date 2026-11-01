export interface StitchSample {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface OverlapEstimate {
  rows: number;
  score: number;
  confident: boolean;
}

export const STITCH_MAX_IMAGES = 6;
export const STITCH_MAX_SOURCE_WIDTH = 16_384;
export const STITCH_MAX_SOURCE_HEIGHT = 32_767;
export const STITCH_MAX_SOURCE_PIXELS = 40_000_000;
export const STITCH_MEMORY_BUDGET = 512 * 1024 * 1024;
export const STITCH_MAX_FILE_BYTES = STITCH_MEMORY_BUDGET / 4;
export const STITCH_SAMPLE_WIDTH = 128;
export const STITCH_MAX_OUTPUT_PIXELS = 20_000_000;
export const STITCH_MAX_OUTPUT_HEIGHT = 16_000;

export interface StitchSize {
  width: number;
  height: number;
}

export interface StitchSourceSize extends StitchSize {
  bytes: number;
}

export interface StitchSourcePlan {
  scale: number;
  width: number;
  heights: number[];
  reduced: boolean;
  estimatedBytes: number;
}

export interface StitchOutputPlan extends StitchSize {
  scale: number;
  reduced: boolean;
}

export function validateStitchSourceDimensions({ width, height }: StitchSize) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 3 ||
      width > STITCH_MAX_SOURCE_WIDTH || height > STITCH_MAX_SOURCE_HEIGHT || width * height > STITCH_MAX_SOURCE_PIXELS) {
    throw new Error('Use screenshots at least 3px high and up to 40 megapixels, 16,384px wide and 32,767px high.');
  }
}

export function validateStitchFileBudget(bytes: number) {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > STITCH_MAX_FILE_BYTES) {
    throw new Error('This selection contains too much file data to prepare safely. Choose fewer screenshots or export smaller files.');
  }
}

export function planStitchOutput({ width, height }: StitchSize): StitchOutputPlan {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error('The combined image must have valid pixel dimensions.');
  }
  const scale = Math.min(1, Math.sqrt(STITCH_MAX_OUTPUT_PIXELS / (width * height)), STITCH_MAX_OUTPUT_HEIGHT / height);
  if (scale >= 1) return { width, height, scale: 1, reduced: false };
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale, reduced: true };
}

export function planStitchSources(sources: readonly StitchSourceSize[]): StitchSourcePlan {
  if (sources.length < 2 || sources.length > STITCH_MAX_IMAGES) throw new Error('Choose 2–6 screenshots in reading order.');
  sources.forEach(source => {
    validateStitchSourceDimensions(source);
    validateStitchFileBudget(source.bytes);
  });
  const width = sources[0].width;
  if (sources.some(source => source.width !== width)) {
    throw new Error('Screenshots must have the same pixel width. Capture them at the same window size.');
  }
  const fileBytes = sources.reduce((sum, source) => sum + source.bytes, 0);
  validateStitchFileBudget(fileBytes);
  const largestSourcePixels = Math.max(...sources.map(source => source.width * source.height));

  const atWidth = (targetWidth: number): StitchSourcePlan => {
    const scale = targetWidth / width;
    const heights = sources.map(source => Math.max(1, Math.floor(source.height * scale)));
    const totalHeight = heights.reduce((sum, height) => sum + height, 0);
    const outputPixels = Math.min(STITCH_MAX_OUTPUT_PIXELS, targetWidth * Math.min(totalHeight, STITCH_MAX_OUTPUT_HEIGHT));
    // Reserve file buffers, a full-size decode scratch buffer, samples/canvases,
    // and encoding/preview headroom in addition to the retained source bitmaps.
    const estimatedBytes = fileBytes * 2 + largestSourcePixels * 4 + targetWidth * totalHeight * 4 +
      STITCH_SAMPLE_WIDTH * totalHeight * 8 + outputPixels * 8 + 128 * 1024 * 1024;
    return { scale, width: targetWidth, heights, reduced: targetWidth !== width, estimatedBytes };
  };

  const plan = atWidth(width);
  if (plan.estimatedBytes <= STITCH_MEMORY_BUDGET) return plan;
  let lower = 1;
  let upper = width - 1;
  let smaller: StitchSourcePlan | null = null;
  while (lower <= upper) {
    const candidate = atWidth(Math.floor((lower + upper) / 2));
    if (candidate.estimatedBytes <= STITCH_MEMORY_BUDGET) {
      smaller = candidate;
      lower = candidate.width + 1;
    } else upper = candidate.width - 1;
  }
  if (!smaller || smaller.heights.some(height => height < 3)) {
    throw new Error('These screenshots cannot fit safely even as a smaller copy. Choose fewer screenshots or export smaller files.');
  }
  return smaller;
}

export function overlapRange(firstHeight: number, secondHeight: number) {
  const shortest = Math.min(firstHeight, secondHeight);
  return { min: Math.max(1, Math.floor(shortest * 0.08)), max: Math.max(1, Math.floor(shortest * 0.9)) };
}

interface OverlapScore {
  rows: number;
  score: number;
}

function* scoreOverlaps(first: StitchSample, second: StitchSample) {
  if (first.width !== second.width || first.width < 1 || Math.min(first.height, second.height) < 3) {
    throw new Error('Screenshots must have matching widths and enough image content.');
  }
  const { min, max } = overlapRange(first.height, second.height);
  for (let rows = min; rows <= max; rows++) {
    let sum = 0;
    let count = 0;
    const sampleRows = Math.min(rows, 96);
    for (let index = 0; index < sampleRows; index++) {
      // Irregular sampling avoids repeatedly hitting the gaps between text lines.
      const jitter = rows <= sampleRows ? 0 : (index * 0.61803398875) % 1;
      const y = Math.floor((index + jitter) * rows / sampleRows);
      for (let x = 0; x < first.width; x += 2) {
        const a = ((first.height - rows + y) * first.width + x) * 4;
        const b = (y * second.width + x) * 4;
        sum += Math.abs(first.data[a] - second.data[b]);
        sum += Math.abs(first.data[a + 1] - second.data[b + 1]);
        sum += Math.abs(first.data[a + 2] - second.data[b + 2]);
        count += 3;
      }
    }
    yield { rows, score: sum / count };
  }
}

function selectOverlap(scores: OverlapScore[]): OverlapEstimate {
  scores.sort((a, b) => a.score - b.score);
  const best = scores[0];
  const alternative = scores.find(result => Math.abs(result.rows - best.rows) > 2);
  const confident = best.score < 14 && (!alternative || alternative.score > best.score * 1.35 + 2);
  return { rows: best.rows, score: best.score, confident };
}

export function estimateOverlap(first: StitchSample, second: StitchSample): OverlapEstimate {
  return selectOverlap([...scoreOverlaps(first, second)]);
}

export async function estimateOverlapAsync(first: StitchSample, second: StitchSample, isCurrent: () => boolean): Promise<OverlapEstimate | null> {
  const scores: OverlapScore[] = [];
  const scheduler = (globalThis as typeof globalThis & { scheduler?: { yield: () => Promise<void> } }).scheduler;
  let deadline = performance.now() + 8;
  for (const score of scoreOverlaps(first, second)) {
    if (!isCurrent()) return null;
    scores.push(score);
    if (performance.now() >= deadline) {
      if (scheduler?.yield) await scheduler.yield();
      else await new Promise<void>(resolve => setTimeout(resolve, 0));
      deadline = performance.now() + 8;
    }
  }
  return isCurrent() ? selectOverlap(scores) : null;
}

export function stitchedHeight(heights: number[], overlaps: number[]) {
  return heights.reduce((total, height, index) => total + height - (index ? overlaps[index - 1] : 0), 0);
}

export function drawStitchedImages(
  context: CanvasRenderingContext2D, images: readonly ImageBitmap[], overlaps: number[], scale: number | { x: number; y: number } = 1,
) {
  const { x: scaleX, y: scaleY } = typeof scale === 'number' ? { x: scale, y: scale } : scale;
  let top = 0;
  images.forEach((image, index) => {
    const overlap = index ? overlaps[index - 1] : 0;
    const remaining = image.height - overlap;
    if (remaining <= 0) return;
    context.drawImage(image, 0, overlap, image.width, remaining,
      0, top * scaleY, image.width * scaleX, remaining * scaleY);
    top += remaining;
  });
}
