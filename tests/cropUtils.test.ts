import { describe, expect, it, vi, afterEach } from 'vitest';
import { clampCrop, cropSnapshot, pixelCrop, renderCrop, resizeCrop, type CropHandle } from '../src/renderer/utils/cropUtils';
import type { RenderConfig } from '../src/renderer/canvasRenderer';

const size = { width: 800, height: 600 };
const rect = { x: 100, y: 100, w: 400, h: 300 };

describe('crop geometry', () => {
  it('clamps bounds and minimum source size', () => {
    expect(clampCrop({ x: -50, y: 999, w: 0, h: 2 }, size)).toEqual({ x: 0, y: 584, w: 16, h: 16 });
    expect(clampCrop({ x: 20, y: 30, w: 900, h: 700 }, size)).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    expect(pixelCrop({ x: 100.4, y: 100.6, w: 300.2, h: 200.8 }, size)).toEqual({ x: 100, y: 101, w: 300, h: 201 });
  });
  it.each([1, 4 / 3, 16 / 9, 9 / 16])('constrains aspect %s without leaving bounds', ratio => {
    const crop = clampCrop({ x: 700, y: 500, w: 800, h: 600 }, size, ratio);
    expect(crop.w / crop.h).toBeCloseTo(ratio);
    expect(crop.x + crop.w).toBeLessThanOrEqual(800);
    expect(crop.y + crop.h).toBeLessThanOrEqual(600);
    const min = clampCrop({ ...rect, w: 1, h: 1 }, size, ratio);
    expect(min.w).toBeGreaterThanOrEqual(16);
    expect(min.h).toBeGreaterThanOrEqual(16);
  });
  it('moves inside bounds without changing size', () => {
    expect(resizeCrop(rect, 'move', 900, -200, size)).toEqual({ x: 400, y: 0, w: 400, h: 300 });
  });
  it.each(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as CropHandle[])('resizes %s with bounded handles and ratio', handle => {
    const crop = resizeCrop(rect, handle, 60, 30, size, 4 / 3);
    expect(crop.w / crop.h).toBeCloseTo(4 / 3);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.w).toBeLessThanOrEqual(size.width);
    expect(crop.y + crop.h).toBeLessThanOrEqual(size.height);
  });
  it('anchors opposite corner and prevents handles crossing', () => {
    expect(resizeCrop(rect, 'nw', 900, 900, size)).toEqual({ x: 484, y: 384, w: 16, h: 16 });
    expect(resizeCrop(rect, 'se', 900, 900, size)).toEqual({ x: 100, y: 100, w: 700, h: 500 });
    expect(resizeCrop(rect, 'n', 0, 50, size)).toEqual({ x: 100, y: 150, w: 400, h: 250 });
  });
});

describe('crop snapshot coordinate spaces', () => {
  it('translates normalized bounds while preserving box-relative pen points and rotation', () => {
    const config = { annotations: [{ id: 'a', type: 'pen', x: .25, y: .25, w: .5, h: .5, color: 'red', strokeWidth: 3, rotation: 30, textMinHeight: .1, points: [{ x: .1, y: .2 }] }] } as RenderConfig;
    const cropped = cropSnapshot(config, size, rect, 'cropped');
    expect(cropped.imageSrc).toBe('cropped');
    expect(cropped.annotations![0]).toMatchObject({ x: .25, y: 1 / 6, w: 1, h: 1, rotation: 30, textMinHeight: .2, points: [{ x: .1, y: .2 }] });
    expect(config.annotations![0].x).toBe(.25);
  });
  it('drops outside redactions and clips partial redactions', () => {
    const redaction = { id: 'r', text: 'secret', type: 'email', status: 'redacted', x: 0, y: 0, w: .25, h: .25 };
    const config = { redactions: [redaction, { ...redaction, id: 'outside', x: .9 }, { ...redaction, id: 'inside', x: .25, y: .25 }] } as RenderConfig;
    const cropped = cropSnapshot(config, size, rect, 'cropped');
    expect(cropped.redactions).toHaveLength(2);
    expect(cropped.redactions![0]).toMatchObject({ x: 0, y: 0, w: .25, h: 1 / 6, status: 'redacted' });
    expect(cropped.redactions![1]).toMatchObject({ x: .25, y: 1 / 6, w: .5, h: .5 });
    expect(cropped.issuePayload).toBeNull();
  });
  it('handles empty overlays', () => {
    expect(cropSnapshot({} as RenderConfig, size, rect, 'crop')).toMatchObject({ annotations: [], redactions: [] });
  });
});

describe('lossless source crop', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses decoded natural dimensions and PNG, not preview dimensions', async () => {
    vi.stubGlobal('Image', class { src = ''; naturalWidth = 800; naturalHeight = 600; decode = vi.fn().mockResolvedValue(undefined); });
    const drawImage = vi.fn();
    const ctx = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as any);
    const data = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cropped');
    const result = await renderCrop('source', rect);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 100, 100, 400, 300, 0, 0, 400, 300);
    expect(data).toHaveBeenCalledWith('image/png');
    expect(result.size).toEqual(size);
    ctx.mockRestore(); data.mockRestore();
  });
  it('rejects decode errors without producing a snapshot', async () => {
    vi.stubGlobal('Image', class { src = ''; decode = vi.fn().mockRejectedValue(new Error('decode failed')); });
    await expect(renderCrop('invalid', rect)).rejects.toThrow('decode failed');
  });
});
