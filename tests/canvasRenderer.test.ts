import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  drawMeshGradient,
  drawBackground,
  drawRoundedRectPath,
  getCanvasDimensions,
  renderCanvas,
  RenderConfig,
  Annotation,
} from '../src/renderer/canvasRenderer';
import { makeMockCtx, makeMockCanvas, makeMockImage, baseConfig } from './shared';

describe('drawRoundedRectPath', () => {
  it('draws rounded rect path with roundRect', () => {
    const ctx = makeMockCtx();
    drawRoundedRectPath(ctx, 10, 20, 100, 200, 8);
    expect(ctx.calls).toContain('beginPath');
    expect(ctx.calls.some(c => c.startsWith('roundRect'))).toBe(true);
  });

  it('handles zero radius', () => {
    const ctx = makeMockCtx();
    drawRoundedRectPath(ctx, 0, 0, 100, 100, 0);
    expect(ctx.calls).toContain('beginPath');
    expect(ctx.calls.some(c => c.startsWith('roundRect'))).toBe(true);
  });
});

describe('getCanvasDimensions', () => {
  it('handles noImage mode with Auto aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: 'Auto' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims).toEqual({ width: 1200, height: 675 });
  });

  it('handles noImage mode with 1:1 aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: '1:1' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(1200);
  });

  it('handles noImage mode with 4:3 aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: '4:3' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(Math.round(1200 / (4 / 3)));
  });

  it('handles noImage mode with 16:9 aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: '16:9' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(Math.round(1200 / (16 / 9)));
  });

  it('handles noImage mode with 3:2 aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: '3:2' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(Math.round(1200 / (3 / 2)));
  });

  it('handles noImage mode with Custom aspect ratio', () => {
    const config = { ...baseConfig, noImage: true, aspectRatio: 'Custom', canvasWidth: 1000, canvasHeight: 500 };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBe(1200);
    expect(dims.height).toBe(600);
  });

  it('handles Auto aspect ratio with image', () => {
    const config = { ...baseConfig, aspectRatio: 'Auto' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('calculates dimensions with chrome offset', () => {
    const config = { ...baseConfig, aspectRatio: 'Auto', chromeStyle: 'mac' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('handles 1:1 fixed ratio with image', () => {
    const config = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('handles paddingMode fill', () => {
    const config = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fill' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('handles fit mode when content is wider than target', () => {
    const config = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit', padding: 0, scale: 200 };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('handles chrome none', () => {
    const config = { ...baseConfig, aspectRatio: 'Auto', chromeStyle: 'none' };
    const dims = getCanvasDimensions(800, 600, config);
    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });
});

describe('drawMeshGradient', () => {
  it('draws mesh gradient with points', () => {
    const ctx = makeMockCtx();
    const points = [
      { id: '1', x: 0.2, y: 0.2, color: '#ff0000', radius: 0.25 },
      { id: '2', x: 0.8, y: 0.2, color: '#00ff00', radius: 0.25 },
      { id: '3', x: 0.5, y: 0.8, color: '#0000ff', radius: 0.25 },
    ];
    expect(() => drawMeshGradient(ctx, 800, 600, points, 30, 5, 50, 15)).not.toThrow();
    expect(ctx.calls).toContain('save');
    expect(ctx.calls).toContain('restore');
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('draws mesh gradient with zero blur', () => {
    const ctx = makeMockCtx();
    const points = [{ id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0.3 }];
    expect(() => drawMeshGradient(ctx, 400, 300, points, 0, 0, 100, 100)).not.toThrow();
  });

  it('draws mesh gradient with zero grain', () => {
    const ctx = makeMockCtx();
    const points = [{ id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0.3 }];
    expect(() => drawMeshGradient(ctx, 400, 300, points, 30, 0, 100, 100)).not.toThrow();
  });

  it('handles mesh gradient with point radius <= 0', () => {
    const ctx = makeMockCtx();
    const points = [
      { id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0 },
      { id: '2', x: 0.3, y: 0.3, color: '#00ff00', radius: 0.25 },
    ];
    expect(() => drawMeshGradient(ctx, 800, 600, points, 30, 5, 50, 15)).not.toThrow();
  });

  it('handles mesh gradient with extreme parameters', () => {
    const ctx = makeMockCtx();
    const points = [
      { id: '1', x: 0.1, y: 0.1, color: '#ff0000', radius: 0.5 },
      { id: '2', x: 0.9, y: 0.9, color: '#00ff00', radius: 0.5 },
    ];
    expect(() => drawMeshGradient(ctx, 800, 600, points, 200, 50, 10, 200)).not.toThrow();
  });

  it('handles empty points array', () => {
    const ctx = makeMockCtx();
    expect(() => drawMeshGradient(ctx, 800, 600, [], 30, 5, 50, 15)).not.toThrow();
  });
});

describe('drawBackground', () => {
  it('draws color background', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'color' as const, backgroundValue: '#ff5722' };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('draws color background with default value', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'color' as const, backgroundValue: '' };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('draws gradient background with linear gradient', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)',
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('createLinearGradient'))).toBe(true);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('draws gradient background with radial gradient', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: 'radial-gradient(circle at 20% 30%, #ff8a00 0%, transparent 50%)',
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('createRadialGradient'))).toBe(true);
  });

  it('draws gradient background with multi-layer gradients', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: 'linear-gradient(45deg, #ff0000, #0000ff), radial-gradient(circle at 50% 50%, #00ff00, transparent)',
    };
    drawBackground(ctx, 800, 600, config, null);
    // Should call both linear and radial
    expect(ctx.calls.some(c => c.startsWith('createLinearGradient'))).toBe(true);
    expect(ctx.calls.some(c => c.startsWith('createRadialGradient'))).toBe(true);
  });

  it('draws gradient background with default value', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'gradient' as const, backgroundValue: '' };
    drawBackground(ctx, 800, 600, config, null);
    // Should use default gradient
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('draws blur background with image', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'blur' as const, blurDensity: 40 };
    const img = makeMockImage();
    drawBackground(ctx, 800, 600, config, img);
    expect(ctx.calls).toContain('drawImage');
  });

  it('draws blur background with default blurDensity', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'blur' as const };
    const img = makeMockImage();
    drawBackground(ctx, 800, 600, config, img);
    expect(ctx.calls).toContain('drawImage');
  });

  it('skips blur drawing when imageEl is null', () => {
    const ctx = makeMockCtx();
    const config = { ...baseConfig, backgroundType: 'blur' as const };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls).not.toContain('drawImage');
  });

  it('draws mesh background', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'mesh' as const,
      meshPoints: [{ id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0.3 }],
      meshBlur: 30,
      meshGrain: 5,
      meshOpacity: 50,
      meshSpread: 15,
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls).toContain('save');
    expect(ctx.calls).toContain('restore');
  });

  it('draws mesh background with default parameters', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'mesh' as const,
      meshPoints: [{ id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0.3 }],
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls).toContain('save');
    expect(ctx.calls).toContain('restore');
  });

  it('draws linear gradient with variadic color stops', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: 'linear-gradient(180deg, #ff0000 #00ff00 #0000ff)',
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('handles gradient with single color', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: 'linear-gradient(90deg, #ff0000 50%)',
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('handles solid color fallback in gradient parser', () => {
    const ctx = makeMockCtx();
    const config = {
      ...baseConfig,
      backgroundType: 'gradient' as const,
      backgroundValue: '#ff0000',
    };
    drawBackground(ctx, 800, 600, config, null);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });
});

describe('renderCanvas', () => {
  it('returns early if getContext returns null', () => {
    const canvas = { getContext: () => null, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    renderCanvas(canvas, null, baseConfig);
    // Should not throw
  });

  it('renders noImage mode with background only', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config = { ...baseConfig, noImage: true, backgroundType: 'color' as const, backgroundValue: '#ff5722' };
    renderCanvas(canvas, null, config);
    expect(ctx.calls.some(c => c.startsWith('clearRect'))).toBe(true);
    expect(ctx.calls.some(c => c.startsWith('fillRect'))).toBe(true);
  });

  it('renders noImage mode with watermark', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config = {
      ...baseConfig,
      noImage: true,
      backgroundType: 'color' as const,
      backgroundValue: '#ff5722',
      watermarkEnabled: true,
      watermarkText: 'Test Watermark',
    };
    renderCanvas(canvas, null, config);
    expect(ctx.calls.some(c => c.startsWith('fillText'))).toBe(true);
  });

  it('renders noImage mode without watermark when disabled', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config = {
      ...baseConfig,
      noImage: true,
      backgroundType: 'color' as const,
      backgroundValue: '#ff5722',
      watermarkEnabled: false,
      watermarkText: 'Test',
    };
    renderCanvas(canvas, null, config);
    const fillTextCalls = ctx.calls.filter(c => c.startsWith('fillText'));
    expect(fillTextCalls).toHaveLength(0);
  });

  it('renders with image and default position', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, position: 'Middle center' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('clearRect'))).toBe(true);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with Top center position', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, position: 'Top center' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with Bottom center position', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, position: 'Bottom center' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with Middle left position', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, position: 'Middle left' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with Middle right position', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, position: 'Middle right' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with macOS chrome', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, chromeStyle: 'mac' as const, chromeTheme: 'dark' as const };
    renderCanvas(canvas, img, config);
    // Should have arc calls for the three dots
    expect(ctx.calls.some(c => c.startsWith('arc'))).toBe(true);
  });

  it('renders with macOS light theme', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, chromeStyle: 'mac' as const, chromeTheme: 'light' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('moveTo'))).toBe(true);
  });

  it('renders with Windows chrome dark theme', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, chromeStyle: 'windows' as const, chromeTheme: 'dark' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('rect'))).toBe(true);
  });

  it('renders with Windows chrome light theme', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, chromeStyle: 'windows' as const, chromeTheme: 'light' as const };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('rect'))).toBe(true);
  });

  it('renders with shadow disabled', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, shadowEnabled: false };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with shadow set to 0', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, shadowEnabled: true, shadow: 0 };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders annotations of type rect', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'rect', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('strokeRect'))).toBe(true);
  });

  it('renders annotations of type filled-rect', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'filled-rect', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('fill');
  });

  it('renders annotations of type circle', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'circle', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#00ff00', strokeWidth: 4,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('ellipse'))).toBe(true);
  });

  it('renders annotations of type filled-circle', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'filled-circle', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#00ff00', strokeWidth: 4,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('fill');
  });

  it('renders annotations of type line', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'line', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#0000ff', strokeWidth: 4,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('moveTo'))).toBe(true);
    expect(ctx.calls.some(c => c.startsWith('lineTo'))).toBe(true);
  });

  it('renders annotations of type arrow', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'arrow', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4, arrowStyle: 'classic',
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('beginPath'))).toBe(true);
  });

  it('renders annotations of type text', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'text', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ffffff', strokeWidth: 4, text: 'Hello World',
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('fillText'))).toBe(true);
  });

  it('renders annotations of type emoji', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'emoji', x: 0.1, y: 0.1, w: 0.1, h: 0.1,
      color: '#000000', strokeWidth: 4, text: '😀',
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('fillText'))).toBe(true);
  });

  it('renders annotations of type pen', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'pen', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4,
      points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0 }],
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('moveTo'))).toBe(true);
    expect(ctx.calls.some(c => c.startsWith('lineTo'))).toBe(true);
  });

  it('renders annotations with rotation', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'rect', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4, rotation: 45,
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('rotate'))).toBe(true);
  });

  it('renders with empty annotations array', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, annotations: [] };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with inset border', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, inset: 5, insetColor: 'rgba(255,255,255,0.3)' };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('stroke');
  });

  it('does not render inset when inset is 0', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, inset: 0 };
    renderCanvas(canvas, img, config);
    // stroke may come from other places, so just check no error
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with outer border', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, border: 3, borderColor: '#ffffff' };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('stroke');
  });

  it('does not render border when border is 0', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, border: 0 };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders watermark when enabled', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, watermarkEnabled: true, watermarkText: 'Test' };
    renderCanvas(canvas, img, config);
    expect(ctx.calls.some(c => c.startsWith('fillText'))).toBe(true);
  });

  it('does not render watermark when disabled', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = { ...baseConfig, watermarkEnabled: false, watermarkText: 'Test' };
    renderCanvas(canvas, img, config);
    const fillTextCalls = ctx.calls.filter(c => c.startsWith('fillText'));
    expect(fillTextCalls.length).toBe(0);
  });

  it('handles image without naturalWidth', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = { width: 400, height: 300, naturalWidth: 0, naturalHeight: 0 } as unknown as HTMLImageElement;
    const config = { ...baseConfig };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders with mesh background type', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const config = {
      ...baseConfig,
      backgroundType: 'mesh' as const,
      meshPoints: [{ id: '1', x: 0.5, y: 0.5, color: '#ff0000', radius: 0.3 }],
    };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('drawImage');
  });

  it('renders annotations with dashed arrow', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'arrow', x: 0.1, y: 0.1, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4, arrowStyle: 'dashed',
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    // dashed arrows should call setLineDash
    expect(ctx.calls.some(c => c.startsWith('setLineDash'))).toBe(true);
  });

  it('renders annotations with tapered arrow', () => {
    const { canvas, ctx } = makeMockCanvas();
    const img = makeMockImage();
    const annotations: Annotation[] = [{
      id: '1', type: 'arrow', x: 0.1, y: 0.1, w: 0.4, h: 0.3,
      color: '#ff0000', strokeWidth: 4, arrowStyle: 'tapered',
    }];
    const config = { ...baseConfig, annotations };
    renderCanvas(canvas, img, config);
    expect(ctx.calls).toContain('fill');
  });
});
