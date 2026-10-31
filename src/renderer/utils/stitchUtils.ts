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
export const STITCH_MAX_SOURCE_PIXELS = 12_000_000;
export const STITCH_MAX_OUTPUT_PIXELS = 20_000_000;
export const STITCH_MAX_OUTPUT_HEIGHT = 16_000;

export function validateStitchSourceDimensions({ width, height }: { width: number; height: number }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 3 || width > 8192 || height > 8192 ||
      height / width > 12 || width * height > STITCH_MAX_SOURCE_PIXELS) {
    throw new Error('Use screenshots at least 3px high and up to 12 megapixels, 8192px per side and a 12:1 height-to-width ratio.');
  }
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
  let deadline = performance.now() + 8;
  for (const score of scoreOverlaps(first, second)) {
    if (!isCurrent()) return null;
    scores.push(score);
    if (performance.now() >= deadline) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      deadline = performance.now() + 8;
    }
  }
  return isCurrent() ? selectOverlap(scores) : null;
}

export function stitchedHeight(heights: number[], overlaps: number[]) {
  return heights.reduce((total, height, index) => total + height - (index ? overlaps[index - 1] : 0), 0);
}

export function drawStitchedImages(
  context: CanvasRenderingContext2D, images: readonly ImageBitmap[], overlaps: number[], scale = 1,
) {
  let top = 0;
  images.forEach((image, index) => {
    const overlap = index ? overlaps[index - 1] : 0;
    const remaining = image.height - overlap;
    if (remaining <= 0) return;
    context.drawImage(image, 0, overlap, image.width, remaining,
      0, top * scale, image.width * scale, remaining * scale);
    top += remaining;
  });
}
