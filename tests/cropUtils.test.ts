import { describe, expect, it, vi, afterEach } from 'vitest';
import { clampCrop, cropSnapshot, pixelCrop, renderCrop, resizeCrop, type CropHandle } from '../src/renderer/utils/cropUtils';
import { renderCanvas, type Annotation, type RenderConfig } from '../src/renderer/canvasRenderer';
import { baseConfig, makeMockCanvas, makeMockImage } from './shared';
import { getCurvedArrowPoints, getTaperedCurvedArrowPoints } from '../src/renderer/arrowUtils';

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
  it.each(['rect', 'filled-rect', 'circle', 'filled-circle', 'line', 'arrow', 'text', 'pen', 'emoji', 'image'] as Annotation['type'][])(
    'preserves %s source-pixel geometry, including rotation, through an unequal-axis crop', type => {
      const annotation: Annotation = {
        id: type, type, x: .2, y: .3, w: .3, h: .2, rotation: 37,
        color: '#ff0000', strokeWidth: 5, fontSize: 30, outlineWidth: 3,
        points: [{ x: .1, y: .4 }, { x: .9, y: .7 }],
      };
      const crop = { x: 80, y: 60, w: 400, h: 200 };
      const config = { ...baseConfig, annotationDisplayWidth: 1000, annotations: [annotation] };
      const after = cropSnapshot(config, size, crop, 'crop');
      const transformed = after.annotations![0];
      expect(after.annotationDisplayWidth).toBe(400);
      expect(transformed.strokeWidth).toBe(4);
      expect(transformed.fontSize).toBe(24);
      expect(transformed.outlineWidth).toBeCloseTo(2.4);
      expect(transformed.rotation).toBe(37);
      expect(transformed.points).toEqual(annotation.points);
      const point = (a: Annotation, width: number, height: number, u: number, v: number) => {
        const angle = (a.rotation || 0) * Math.PI / 180;
        const dx = (u - .5) * a.w * width;
        const dy = (v - .5) * a.h * height;
        return {
          x: (a.x + a.w / 2) * width + dx * Math.cos(angle) - dy * Math.sin(angle),
          y: (a.y + a.h / 2) * height + dx * Math.sin(angle) + dy * Math.cos(angle),
        };
      };
      for (const [u, v] of [[0, 0], [1, 1], [.1, .4], [.9, .7]]) {
        const beforePoint = point(annotation, size.width, size.height, u, v);
        const afterPoint = point(transformed, crop.w, crop.h, u, v);
        expect(afterPoint.x + crop.x).toBeCloseTo(beforePoint.x);
        expect(afterPoint.y + crop.y).toBeCloseTo(beforePoint.y);
      }
    },
  );
  it.each([33.3, 50, 100, 200].flatMap(scale => ['Auto', '1:1', '16:9'].flatMap(aspectRatio =>
    [0, 10].flatMap(border => [0, 8].map(inset => ({ scale, aspectRatio, border, inset }))))))(
    'preserves export styling at $scale percent, $aspectRatio aspect, $border border and $inset inset', ({ scale, aspectRatio, border, inset }) => {
    const measuredWidth = (width: number) => Math.round(aspectRatio === 'Auto'
      ? Math.min(width, width * scale / 100 - 2 * border) : width * scale / 100 - 2 * border);
    const annotations: Annotation[] = [
      { id: 'r', type: 'rect', x: .2, y: .2, w: .2, h: .2, color: '#f00', strokeWidth: 4 },
      { id: 't', type: 'text', x: .3, y: .3, w: .2, h: .1, color: '#f00', strokeWidth: 4,
        text: 'Crop', fontSize: 24, outlineEnabled: true, outlineWidth: 3 },
      { id: 'e', type: 'emoji', x: .4, y: .4, w: .1, h: .1, color: '#f00', strokeWidth: 4, text: '⭐' },
      { id: 'legacy', type: 'text', x: .2, y: .2, w: .1, h: .001, text: 'Tiny', color: '#f00', strokeWidth: 4, outlineEnabled: true },
      { id: 'legacy-large', type: 'text', x: .2, y: .2, w: .1, h: .1, text: 'Large', color: '#f00', strokeWidth: 4, outlineEnabled: true },
    ];
    const config = { ...baseConfig, scale, aspectRatio, border, inset, annotationDisplayWidth: measuredWidth(size.width), annotations };
    const cropped = cropSnapshot(config, size, { x: 80, y: 60, w: 400, h: 200 }, 'crop');
    expect(cropped.annotationDisplayWidth).toBe(measuredWidth(400));
    cropped.annotationDisplayWidth = measuredWidth(400);
    const draw = (cfg: RenderConfig, width: number, height: number) => {
      const { canvas, ctx } = makeMockCanvas();
      const styles: unknown[] = [];
      canvas.getContext = (() => new Proxy(ctx, { set(target, key, value) {
        if (key === 'font') {
          styles.push([key, String(value).replace(/[\d.]+px/, number => `${Number.parseFloat(number).toFixed(8)}px`)]);
        }
        if (key === 'lineWidth') styles.push([key, Number(value.toFixed(8))]);
        return Reflect.set(target, key, value);
      } })) as any;
      renderCanvas(canvas, makeMockImage(width, height), cfg);
      return styles;
    };
    expect(draw(cropped, 400, 200)).toEqual(draw(config, 800, 600));
  });
  it.each([getCurvedArrowPoints, getTaperedCurvedArrowPoints])('preserves curved arrow control points and head geometry', getPoints => {
    const annotation: Annotation = {
      id: 'arrow', type: 'arrow', x: .2, y: .2, w: .3, h: .2,
      color: '#f00', strokeWidth: 5,
    };
    const crop = { x: 80, y: 60, w: 400, h: 200 };
    const cropped = cropSnapshot({ ...baseConfig, annotationDisplayWidth: 1000, annotations: [annotation] }, size, crop, 'crop');
    const after = cropped.annotations![0];
    const beforePoints = getPoints(-annotation.w * 800 / 2, -annotation.h * 600 / 2,
      annotation.w * 800 / 2, annotation.h * 600 / 2, annotation.strokeWidth * 800 / 1000);
    const afterPoints = getPoints(-after.w * 400 / 2, -after.h * 200 / 2,
      after.w * 400 / 2, after.h * 200 / 2, after.strokeWidth * 400 / cropped.annotationDisplayWidth!);
    const rounded = (value: unknown) => JSON.stringify(value, (_key, n) => typeof n === 'number' ? Number(n.toFixed(8)) : n);
    expect(rounded(afterPoints)).toBe(rounded(beforePoints));
  });
  it('materializes legacy text defaults before changing display density', () => {
    const config = { ...baseConfig, annotationDisplayWidth: 1000, annotations: [{
      id: 'text', type: 'text', x: .2, y: .2, w: .2, h: .01,
      color: '#f00', strokeWidth: 4, outlineEnabled: true,
    }] } as RenderConfig;
    const text = cropSnapshot(config, size, rect, 'crop').annotations![0];
    expect(text.fontSize).toBeCloseTo(12);
    expect(text.outlineWidth).toBeCloseTo(2);
    expect(text.fontSize! * 400 / 400).toBe(12);
  });
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
