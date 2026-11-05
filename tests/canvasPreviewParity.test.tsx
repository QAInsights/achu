import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import CanvasPreview from '../src/renderer/components/CanvasPreview';
import AnnotationShape from '../src/renderer/components/annotations/AnnotationShape';
import { renderCanvas, type Annotation } from '../src/renderer/canvasRenderer';
import { stepFontSize, stepNumbers, stepTextColor, STEP_FONT } from '../src/renderer/utils/stepUtils';
import { baseConfig, makeMockCanvas, makeMockImage } from './shared';

// Mock AppContext
vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockContext: any = {};

describe('step badge preview/export parity', () => {
  it.each([50, 100, 200])('matches labels, circles, colors and type at %s percent export scale', scale => {
    const steps: Annotation[] = [
      { id: 'third', type: 'step', stepOrder: 3, x: .3, y: .2, w: .05, h: .1, color: 'rgba(244, 63, 94, 1)', strokeWidth: 4 },
      { id: 'first', type: 'step', stepOrder: 1, x: .1, y: .2, w: .05, h: .1, color: 'hsl(60, 100%, 50%)', strokeWidth: 4 },
    ];
    const numbers = stepNumbers(steps);
    const measurement = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      measureText: () => ({ actualBoundingBoxAscent: 15, actualBoundingBoxDescent: 3 }),
    } as any);
    const { container } = render(<svg>{steps.map(ann => <AnnotationShape key={ann.id} ann={ann}
      dimensions={{ width: 800, height: 400 }} rectW={40} rectH={40} w={40} h={40}
      strokeW={4} editingTextId={null} stepNumber={numbers.get(ann.id)} />)}</svg>);
    measurement.mockRestore();
    const badges = [...container.querySelectorAll('[data-step-number]')];
    expect(badges.map(b => b.textContent)).toEqual(['2', '1']);
    const { canvas, ctx } = makeMockCanvas();
    const fills: string[] = [];
    const fonts: string[] = [];
    const labels = vi.fn();
    const labelColors = new Map<string, string>();
    const tracked = new Proxy(ctx, { get(target, key) {
      if (key === 'measureText') return () => {
        const fontSize = parseFloat(fonts.at(-1)?.split(' ')[1] || '20');
        return { width: 10, actualBoundingBoxAscent: fontSize * .75, actualBoundingBoxDescent: fontSize * .15 };
      };
      return key === 'fillText' ? (label: string, x: number, y: number) => {
        labelColors.set(label, fills.at(-1)!);
        labels(label, x, y);
      } : Reflect.get(target, key);
    }, set(target, key, value) {
      if (key === 'fillStyle') fills.push(value);
      if (key === 'font') fonts.push(value);
      return Reflect.set(target, key, value);
    } });
    canvas.getContext = (() => tracked) as any;
    renderCanvas(canvas, makeMockImage(800, 400), { ...baseConfig, backgroundType: 'color', backgroundValue: '#eeeeee', scale, annotations: steps });
    const diameter = 40 * scale / 100;
    steps.forEach((ann, i) => {
      const circle = badges[i].querySelector('circle')!;
      const text = badges[i].querySelector('text')!;
      const label = numbers.get(ann.id)!;
      expect(Number(circle.getAttribute('r')) * scale / 100).toBe(diameter / 2);
      expect(circle.getAttribute('fill')).toBe(ann.color);
      expect(text.getAttribute('fill')).toBe(stepTextColor(ann.color));
      expect(text.getAttribute('font-family')).toBe(STEP_FONT);
      expect(ctx.calls).toContain(`arc(0,0,${diameter / 2},0,${Math.PI * 2})`);
      expect(text.getAttribute('y')).toBe('6');
      expect(labels).toHaveBeenCalledWith(String(label), 0, stepFontSize(diameter, label) * .3);
      expect(labelColors.get(String(label))).toBe(text.getAttribute('fill'));
      expect(fills).toContain(ann.color);
      expect(fills).toContain(stepTextColor(ann.color));
      expect(fonts).toContain(`700 ${stepFontSize(diameter, label)}px ${STEP_FONT}`);
    });
  });
});

beforeEach(() => {
  mockContext = {
    padding: 40,
    rounded: 16,
    shadow: 25,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowEnabled: true,
    inset: 0,
    insetColor: 'rgba(255, 255, 255, 0.1)',
    border: 0,
    borderColor: '#ffffff',
    scale: 100,
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    aspectRatio: 'Auto',
    canvasWidth: 800,
    canvasHeight: 600,
    paddingMode: 'fit',
    chromeStyle: 'none',
    chromeTheme: 'dark',
    blurDensity: 30,
    noImageMode: false,
    meshPoints: [],
    meshDataUrl: '',
    activePointIdx: 0,
    watermarkEnabled: false,
    watermarkText: 'Made using achu.app',
    watermarkSize: 20,
    watermarkPosition: 'middle',
    watermarkOpacity: 0.4,
    position: 'Middle center',
    annotations: [],
    setAnnotations: vi.fn(),
    setAnnotationDisplayWidth: vi.fn(),
    imageSrc: 'data:image/png;base64,mock',
    zoomLevel: 'Zoom to fit',
    setZoomLevel: vi.fn(),
    getZoomStyle: vi.fn(() => ({})),
    customPrompt: vi.fn(),
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    getCurrentConfig: vi.fn(() => mockContext),
    pushHistory: vi.fn(),
  };
});

describe('CanvasPreview Parity & Layout Tests', () => {
  it('shows the actual fitted percentage and steps from that scale', () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 664, height: 504, x: 0, y: 0, top: 0, left: 0, right: 664, bottom: 504, toJSON: () => ({}),
    });
    try {
      const { container } = render(<CanvasPreview />);
      const img = screen.getByAltText('Screenshot');
      Object.defineProperty(img, 'naturalWidth', { value: 1120, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 720, configurable: true });
      fireEvent.load(img);

      expect(screen.getByRole('region', { name: 'Canvas preview' })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('button', { name: 'Fit canvas to window' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Actual size (100%)' })).toHaveTextContent('50%');
      expect(container.querySelector('.preview-card-wrapper')).toHaveStyle({ width: '600px', height: '400px' });

      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(mockContext.setZoomLevel).toHaveBeenLastCalledWith('60%');
      fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
      expect(mockContext.setZoomLevel).toHaveBeenLastCalledWith('40%');
    } finally {
      rect.mockRestore();
    }
  });

  it('computes correct card dimensions in Auto aspect ratio with padding', () => {
    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 600, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 400, configurable: true });
      fireEvent.load(img);
    }

    const card = container.querySelector('.preview-background-card');
    // imgW (600) * scale (1.0) + paddingX (40*2) = 680
    // imgH (400) * scale (1.0) + paddingY (40*2) = 480
    expect(card).toHaveStyle({ width: '680px' });
    expect(card).toHaveStyle({ height: '480px' });
  });

  it('constrains a document name to the viewport rather than expanding the scroll area', () => {
    mockContext.documentName = 'A long screenshot name that should not expand a narrow canvas viewport';
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 400, height: 600, x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 600, toJSON: () => ({}),
    });
    try {
      render(<CanvasPreview />);
      expect(screen.getByTitle(mockContext.documentName)).toHaveStyle({ maxWidth: '336px' });
    } finally {
      rect.mockRestore();
    }
  });

  it('handles fixed aspect ratio 1:1 in fit padding mode', () => {
    mockContext.aspectRatio = '1:1';
    mockContext.paddingMode = 'fit';

    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 800, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 600, configurable: true });
      fireEvent.load(img);
    }

    const card = container.querySelector('.preview-background-card');
    // contentW (800) + padX (80) = 880 width.
    // contentH (600) + padY (80) = 680.
    // Ratio = 880 / 680 = 1.29 > 1 (target ratio).
    // Width is bound, so height is calculated as width / targetRatio = 880 / 1 = 880
    // Width = 880px, Height = 880px
    expect(card).toHaveStyle({ width: '880px' });
    expect(card).toHaveStyle({ height: '880px' });
  });

  it('handles fixed aspect ratio 16:9 in fill padding mode', () => {
    mockContext.aspectRatio = '16:9';
    mockContext.paddingMode = 'fill';

    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 960, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 540, configurable: true });
      fireEvent.load(img);
    }

    const card = container.querySelector('.preview-background-card');
    // baseWidth = Max(800, 960) = 960
    // height = baseWidth / (16/9) = 540
    expect(card).toHaveStyle({ width: '960px' });
    expect(card).toHaveStyle({ height: '540px' });
  });

  it('computes scale factor correctly for numeric zoom levels', () => {
    mockContext.zoomLevel = '150%';

    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 500, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 300, configurable: true });
      fireEvent.load(img);
    }

    const wrapper = container.querySelector('.preview-card-wrapper');
    const card = container.querySelector('.preview-background-card');

    // dims: width = 500 + 80 = 580; height = 300 + 80 = 380
    // scale factor is 1.5
    // Reserve the transformed footprint so every edge is reachable by scrolling.
    expect(wrapper).toHaveStyle({ width: '870px', height: '570px' });
    expect(card).toHaveStyle({ width: '580px' });
    expect(card).toHaveStyle({ height: '380px' });
    expect(card).toHaveStyle({ transform: 'scale(1.5)' });
    expect(card).toHaveStyle({ transformOrigin: 'top left', left: '0px', top: '0px' });
  });

  it('calculates content size with chrome height for macOS style', () => {
    mockContext.chromeStyle = 'mac';
    mockContext.scale = 100;

    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 800, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 600, configurable: true });
      fireEvent.load(img);
    }

    const box = container.querySelector('.preview-container-box');
    // imgH (600) + chromeOffset (32) = 632px
    expect(box).toHaveStyle({ width: '800px' });
    expect(box).toHaveStyle({ height: '632px' });
  });

  it('calculates content size with chrome height for Windows style', () => {
    mockContext.chromeStyle = 'windows';
    mockContext.scale = 80;

    const { container } = render(<CanvasPreview />);
    const img = container.querySelector('img[alt="Screenshot"]') as HTMLImageElement;
    if (img) {
      Object.defineProperty(img, 'naturalWidth', { value: 1000, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 500, configurable: true });
      fireEvent.load(img);
    }

    const box = container.querySelector('.preview-container-box');
    // contentW = 1000 * 0.8 = 800px
    // contentH = (500 + 32) * 0.8 = 532 * 0.8 = 425.6px -> 425.6px or ~426px style height depending on round
    expect(box).toHaveStyle({ width: '800px' });
    expect(box).toHaveStyle({ height: '425.6px' });
  });

  it('applies correct position styles in fixed aspect ratio mode', () => {
    mockContext.aspectRatio = '16:9';
    mockContext.position = 'Bottom center';
    mockContext.padding = 24;

    const { container } = render(<CanvasPreview />);
    const box = container.querySelector('.preview-container-box');
    expect(box).toHaveStyle({
      position: 'absolute',
      left: '176px',
      top: '24px',
    });
  });
});
