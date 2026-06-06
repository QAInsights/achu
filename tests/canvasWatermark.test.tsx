import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import CanvasWatermark from '../src/renderer/components/CanvasWatermark';

describe('CanvasWatermark', () => {
  it('renders nothing when watermarkEnabled is false', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={false}
        watermarkText="Test"
        padding={38}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when watermarkText is empty', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText=""
        padding={38}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders watermark text when enabled', () => {
    render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="My Brand"
        padding={38}
      />
    );
    expect(screen.getByText('My Brand')).toBeTruthy();
  });

  // Regression: opacity was incorrectly divided by 100 (0.45 became 0.0045)
  it('applies opacity directly without dividing by 100 (regression)', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkOpacity={0.45}
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    // Opacity must be 0.45, NOT 0.0045
    expect(el.style.opacity).toBe('0.45');
  });

  it('opacity 0.15 renders as 0.15, not 0.0015', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkOpacity={0.15}
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(parseFloat(el.style.opacity)).toBeCloseTo(0.15, 3);
    expect(parseFloat(el.style.opacity)).toBeGreaterThan(0.01);
  });

  it('uses default opacity 0.45 when watermarkOpacity is undefined', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(parseFloat(el.style.opacity)).toBeCloseTo(0.45, 3);
  });

  it('applies correct font size', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkSize={32}
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.fontSize).toBe('32px');
  });

  it('positions at bottom-center by default', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="middle"
        padding={60}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.bottom).toBe('20px');
    expect(el.style.left).toBe('50%');
  });

  it('positions at top-left correctly', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="top left"
        padding={60}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.top).toBe('20px');
    expect(el.style.left).toBe('20px');
  });

  it('positions at top-right correctly', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="top right"
        padding={60}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.top).toBe('20px');
    expect(el.style.right).toBe('20px');
  });

  it('positions at bottom-right correctly', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="right"
        padding={60}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.bottom).toBe('20px');
    expect(el.style.right).toBe('20px');
  });

  // Regression: with zero/small padding, safe inset must be at least fontSize*0.5
  // to prevent text from being clipped by card border-radius overflow:hidden
  it('uses fontSize*0.5 safe inset when padding is 0', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="left"
        watermarkSize={20}
        padding={0}
      />
    );
    const el = container.firstChild as HTMLElement;
    // safeInset = max(0/3, 20*0.5) = max(0, 10) = 10px
    expect(el.style.left).toBe('10px');
    expect(el.style.bottom).toBe('10px');
  });

  it('uses padding/3 when it exceeds fontSize*0.5', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="top left"
        watermarkSize={20}
        padding={90}
      />
    );
    const el = container.firstChild as HTMLElement;
    // safeInset = max(90/3, 20*0.5) = max(30, 10) = 30px
    expect(el.style.left).toBe('30px');
    expect(el.style.top).toBe('30px');
  });

  it('safeInset matches drawWatermark canvas inset formula for same inputs', () => {
    // Both CSS and canvas use: Math.round(Math.max(padding/3, fontSize*0.5))
    // padding=38, fontSize=20 → round(max(12.67, 10)) = 13
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="left"
        watermarkSize={20}
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    const cssInset = parseFloat(el.style.left);
    const canvasInset = Math.round(Math.max(38 / 3, 20 * 0.5)); // 13
    expect(cssInset).toBeCloseTo(canvasInset, 1);
  });

  // Regression: .preview-watermark CSS class sets left:50% transform:translateX(-50%)
  // For right/left positions the inline styles must explicitly reset these to prevent
  // the CSS class from shifting text outside the card (clipping) or stretching to center.
  it('right position sets right and explicitly clears left and transform', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="right"
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.right).not.toBe('');
    // left must be 'auto' to prevent CSS-class left:50% from making text appear centered
    expect(el.style.left).toBe('auto');
    // transform must be 'none' to prevent CSS-class translateX(-50%) from shifting text off-screen
    expect(el.style.transform).toBe('none');
  });

  it('top right position sets right/top and clears left and transform', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="top right"
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.right).not.toBe('');
    expect(el.style.top).not.toBe('');
    expect(el.style.left).toBe('auto');
    expect(el.style.transform).toBe('none');
  });

  it('left position sets left and clears transform to prevent CSS-class translateX shift', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="left"
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.left).not.toBe('auto');
    // transform must be 'none' so text is not shifted -50% of its width outside the card
    expect(el.style.transform).toBe('none');
    expect(el.style.right).toBe('auto');
  });

  it('center position sets left:50% and transform:translateX(-50%)', () => {
    const { container } = render(
      <CanvasWatermark
        watermarkEnabled={true}
        watermarkText="Brand"
        watermarkPosition="middle"
        padding={38}
      />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.left).toBe('50%');
    expect(el.style.transform).toBe('translateX(-50%)');
    expect(el.style.right).toBe('auto');
  });
});

// Regression: canvas renderer drawWatermark must also use opacity as-is (0–1)
import { drawBackground, renderCanvas, RenderConfig } from '../src/renderer/canvasRenderer';
import { makeMockCanvas, baseConfig } from './shared';

describe('drawWatermark canvas opacity parity', () => {
  it('globalAlpha uses watermarkOpacity directly as 0-1, matching CanvasWatermark CSS', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config: RenderConfig = {
      ...baseConfig,
      watermarkEnabled: true,
      watermarkText: 'Brand',
      watermarkOpacity: 0.45,
    };
    renderCanvas(canvas, null, { ...config, noImage: true });
    expect(ctx._state.globalAlpha).toBe(0.45);
    expect(ctx._state.fillStyle).toBe('#ffffff');
  });

  it('watermark is invisible (fillText skipped) when watermarkEnabled is false', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config: RenderConfig = {
      ...baseConfig,
      watermarkEnabled: false,
      watermarkText: 'Brand',
      watermarkOpacity: 0.45,
    };
    renderCanvas(canvas, null, { ...config, noImage: true });
    expect(ctx.calls.some((c: string) => c.startsWith('fillText'))).toBe(false);
  });

  it('watermark is visible (fillText called) when watermarkEnabled is true', () => {
    const { canvas, ctx } = makeMockCanvas();
    const config: RenderConfig = {
      ...baseConfig,
      watermarkEnabled: true,
      watermarkText: 'Brand',
      watermarkOpacity: 0.45,
    };
    renderCanvas(canvas, null, { ...config, noImage: true });
    expect(ctx.calls.some((c: string) => c.startsWith('fillText'))).toBe(true);
  });
});

describe('Watermark CSS color parity', () => {
  it('index.css has .preview-watermark color: #ffffff to prevent double-applied opacity', () => {
    const cssPath = path.resolve(__dirname, '../src/renderer/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const ruleMatch = cssContent.match(/\.preview-watermark\s*\{([^}]+)\}/);
    expect(ruleMatch).not.toBeNull();
    const ruleBody = ruleMatch![1];
    expect(ruleBody).toContain('color: #ffffff');
  });
});
