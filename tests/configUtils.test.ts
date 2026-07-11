import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_MESH_POINTS,
  applyMeshPalette,
  generateRandomPalette,
  getCurrentConfig,
  applyConfig,
  BACKGROUND_TYPES,
  PADDING_MODES,
  CHROME_STYLES,
  CHROME_THEMES,
  ACTIVE_TOOLS,
  ARROW_STYLES,
  GRADIENT_CATEGORIES,
  APP_THEMES,
  EXPORT_FORMATS,
  createGalleryImportConfig,
  normalizeRestoredGalleryConfig,
} from '../src/renderer/utils/configUtils';
import type { RenderConfig } from '../src/renderer/canvasRenderer';

describe('configUtils', () => {
  describe('DEFAULT_MESH_POINTS', () => {
    it('has 4 default points', () => {
      expect(DEFAULT_MESH_POINTS).toHaveLength(4);
    });

    it('each point has required properties', () => {
      DEFAULT_MESH_POINTS.forEach((pt) => {
        expect(pt).toHaveProperty('id');
        expect(pt).toHaveProperty('color');
        expect(pt).toHaveProperty('x');
        expect(pt).toHaveProperty('y');
        expect(pt).toHaveProperty('radius');
      });
    });

    it('points have unique ids', () => {
      const ids = DEFAULT_MESH_POINTS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('points have valid hex colors', () => {
      DEFAULT_MESH_POINTS.forEach((pt) => {
        expect(pt.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  describe('applyMeshPalette', () => {
    const meshPoints = [
      { id: '1', color: '#ff0000', x: 0.2, y: 0.2, radius: 180 },
      { id: '2', color: '#00ff00', x: 0.8, y: 0.2, radius: 220 },
      { id: '3', color: '#0000ff', x: 0.5, y: 0.5, radius: 200 },
    ];

    it('maps colors onto mesh points cyclically', () => {
      const colors = ['#111111', '#222222', '#333333'];
      const result = applyMeshPalette(meshPoints, colors);
      expect(result[0].color).toBe('#111111');
      expect(result[1].color).toBe('#222222');
      expect(result[2].color).toBe('#333333');
    });

    it('cycles colors when fewer colors than points', () => {
      const colors = ['#aaa', '#bbb'];
      const result = applyMeshPalette(meshPoints, colors);
      expect(result[0].color).toBe('#aaa');
      expect(result[1].color).toBe('#bbb');
      expect(result[2].color).toBe('#aaa'); // cycles back
    });

    it('uses only first N colors when more colors than points', () => {
      const colors = ['#111', '#222', '#333', '#444', '#555'];
      const result = applyMeshPalette(meshPoints, colors);
      expect(result).toHaveLength(3);
      expect(result[0].color).toBe('#111');
      expect(result[1].color).toBe('#222');
      expect(result[2].color).toBe('#333');
    });

    it('preserves non-color properties', () => {
      const colors = ['#abcdef'];
      const result = applyMeshPalette(meshPoints, colors);
      expect(result[0].id).toBe('1');
      expect(result[0].x).toBe(0.2);
      expect(result[0].y).toBe(0.2);
      expect(result[0].radius).toBe(180);
    });

    it('handles empty colors array gracefully', () => {
      const result = applyMeshPalette(meshPoints, []);
      expect(result).toHaveLength(3);
      // modulo by 0 would be NaN, index would be undefined
      // This tests that the implementation handles this edge case
      result.forEach((pt) => {
        expect(pt).toHaveProperty('color');
      });
    });

    it('returns empty array for empty meshPoints', () => {
      expect(applyMeshPalette([], ['#fff'])).toEqual([]);
    });
  });

  describe('generateRandomPalette', () => {
    const meshPoints = [
      { id: '1', color: '#ff0000', x: 0.5, y: 0.5, radius: 180 },
      { id: '2', color: '#00ff00', x: 0.5, y: 0.5, radius: 220 },
    ];

    it('returns same number of points', () => {
      const result = generateRandomPalette(meshPoints);
      expect(result).toHaveLength(2);
    });

    it('generates valid hex colors', () => {
      const result = generateRandomPalette(meshPoints);
      result.forEach((pt) => {
        expect(pt.color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('keeps x values in [0.1, 0.9] range', () => {
      // Test multiple runs due to randomness
      for (let i = 0; i < 10; i++) {
        const result = generateRandomPalette(meshPoints);
        result.forEach((pt) => {
          expect(pt.x).toBeGreaterThanOrEqual(0.1);
          expect(pt.x).toBeLessThanOrEqual(0.9);
        });
      }
    });

    it('keeps y values in [0.1, 0.9] range', () => {
      for (let i = 0; i < 10; i++) {
        const result = generateRandomPalette(meshPoints);
        result.forEach((pt) => {
          expect(pt.y).toBeGreaterThanOrEqual(0.1);
          expect(pt.y).toBeLessThanOrEqual(0.9);
        });
      }
    });

    it('preserves ids', () => {
      const result = generateRandomPalette(meshPoints);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('returns empty for empty input', () => {
      expect(generateRandomPalette([])).toEqual([]);
    });
  });

  describe('getCurrentConfig', () => {
    const minimalState = {
      padding: 38,
      rounded: 20,
      shadow: 30,
      shadowColor: 'rgba(0,0,0,0.45)',
      shadowEnabled: true,
      inset: 0,
      insetColor: 'rgba(255,255,255,0.25)',
      border: 0,
      borderColor: '#ffffff',
      scale: 100,
      backgroundType: 'gradient' as const,
      backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      aspectRatio: 'Auto',
      canvasWidth: 800,
      canvasHeight: 600,
      paddingMode: 'fit' as const,
      chromeStyle: 'mac' as const,
      chromeTheme: 'dark' as const,
      blurDensity: 40,
      watermarkEnabled: false,
      watermarkText: 'Made using achu.app',
      watermarkSize: 20,
      watermarkPosition: 'middle',
      watermarkOpacity: 0.45,
      watermarkFont: 'sans-serif',
      watermarkBold: false,
      watermarkItalic: false,
      annotationFont: 'sans-serif',
      annotationFontSize: 24,
      annotationBold: true,
      annotationItalic: false,
      annotationOutlineEnabled: false,
      annotationOutlineColor: '#000000',
      annotationOutlineWidth: 3,
      position: 'Middle center',
      annotations: [],
      meshPoints: [
        { id: '1', color: '#ff0000', x: 0.2, y: 0.2, radius: 180 },
      ],
      meshBlur: 60,
      meshGrain: 15,
      meshOpacity: 100,
      meshSpread: 100,
      noImageMode: false,
    };

    it('maps all state fields to RenderConfig', () => {
      const config = getCurrentConfig(minimalState as any);
      expect(config.padding).toBe(38);
      expect(config.rounded).toBe(20);
      expect(config.shadow).toBe(30);
      expect(config.shadowColor).toBe('rgba(0,0,0,0.45)');
      expect(config.shadowEnabled).toBe(true);
      expect(config.inset).toBe(0);
      expect(config.insetColor).toBe('rgba(255,255,255,0.25)');
      expect(config.border).toBe(0);
      expect(config.borderColor).toBe('#ffffff');
      expect(config.scale).toBe(100);
      expect(config.backgroundType).toBe('gradient');
      expect(config.backgroundValue).toBe('linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
      expect(config.aspectRatio).toBe('Auto');
      expect(config.canvasWidth).toBe(800);
      expect(config.canvasHeight).toBe(600);
      expect(config.paddingMode).toBe('fit');
      expect(config.chromeStyle).toBe('mac');
      expect(config.chromeTheme).toBe('dark');
      expect(config.blurDensity).toBe(40);
      expect(config.watermarkEnabled).toBe(false);
      expect(config.watermarkText).toBe('Made using achu.app');
      expect(config.watermarkSize).toBe(20);
      expect(config.watermarkPosition).toBe('middle');
      expect(config.watermarkOpacity).toBe(0.45);
      expect(config.position).toBe('Middle center');
      expect(config.annotations).toEqual([]);
      expect(config.meshPoints).toEqual(minimalState.meshPoints);
      expect(config.meshBlur).toBe(60);
      expect(config.meshGrain).toBe(15);
      expect(config.meshOpacity).toBe(100);
      expect(config.meshSpread).toBe(100);
      expect(config.noImage).toBe(false);
    });

    it('maps noImageMode to noImage', () => {
      const config = getCurrentConfig({ ...minimalState, noImageMode: true } as any);
      expect(config.noImage).toBe(true);
    });

    it('handles alternate background types', () => {
      const state = { ...minimalState, backgroundType: 'color' as const, backgroundValue: '#ff0000' };
      const config = getCurrentConfig(state as any);
      expect(config.backgroundType).toBe('color');
      expect(config.backgroundValue).toBe('#ff0000');
    });
  });

  describe('applyConfig', () => {
    const makeSetters = () => ({
      setPadding: vi.fn(),
      setRounded: vi.fn(),
      setShadow: vi.fn(),
      setShadowColor: vi.fn(),
      setShadowEnabled: vi.fn(),
      setInset: vi.fn(),
      setInsetColor: vi.fn(),
      setBorder: vi.fn(),
      setBorderColor: vi.fn(),
      setScale: vi.fn(),
      setBackgroundType: vi.fn(),
      setBackgroundValue: vi.fn(),
      setAspectRatio: vi.fn(),
      setCanvasWidth: vi.fn(),
      setCanvasHeight: vi.fn(),
      setPaddingMode: vi.fn(),
      setChromeStyle: vi.fn(),
      setChromeTheme: vi.fn(),
      setBlurDensity: vi.fn(),
      setWatermarkEnabled: vi.fn(),
      setWatermarkText: vi.fn(),
      setWatermarkSize: vi.fn(),
      setWatermarkPosition: vi.fn(),
      setWatermarkOpacity: vi.fn(),
      setWatermarkFont: vi.fn(),
      setWatermarkBold: vi.fn(),
      setWatermarkItalic: vi.fn(),
      setAnnotationFont: vi.fn(),
      setAnnotationFontSize: vi.fn(),
      setAnnotationBold: vi.fn(),
      setAnnotationItalic: vi.fn(),
      setAnnotationOutlineEnabled: vi.fn(),
      setAnnotationOutlineColor: vi.fn(),
      setAnnotationOutlineWidth: vi.fn(),
      setPosition: vi.fn(),
      setAnnotations: vi.fn(),
      setMeshPoints: vi.fn(),
      setMeshBlur: vi.fn(),
      setMeshGrain: vi.fn(),
      setMeshOpacity: vi.fn(),
      setMeshSpread: vi.fn(),
      setNoImageMode: vi.fn(),
      setExportFormat: vi.fn() as any,
      setJpegQuality: vi.fn() as any,
      setSidebarPosition: vi.fn() as any,
    });

    it('is a no-op when config is null', () => {
      const setters = makeSetters();
      applyConfig(null, setters);
      Object.values(setters).forEach(fn => {
        expect(fn).not.toHaveBeenCalled();
      });
    });

    it('calls all setters with config values', () => {
      const setters = makeSetters();
      const config: RenderConfig = {
        padding: 50,
        rounded: 30,
        shadow: 40,
        shadowColor: '#000',
        shadowEnabled: false,
        inset: 10,
        insetColor: '#fff',
        border: 5,
        borderColor: '#ccc',
        scale: 80,
        backgroundType: 'color',
        backgroundValue: '#ff0000',
        aspectRatio: '1:1',
        canvasWidth: 600,
        canvasHeight: 600,
        paddingMode: 'fill',
        chromeStyle: 'windows',
        chromeTheme: 'light',
        blurDensity: 60,
        watermarkEnabled: true,
        watermarkText: 'Test',
        watermarkSize: 30,
        watermarkPosition: 'top left',
        watermarkOpacity: 0.5,
        watermarkFont: 'Arial',
        watermarkBold: true,
        watermarkItalic: true,
        annotationFont: 'Courier',
        annotationFontSize: 30,
        annotationBold: false,
        annotationItalic: true,
        annotationOutlineEnabled: true,
        annotationOutlineColor: '#ff0000',
        annotationOutlineWidth: 5,
        position: 'Top left',
        annotations: [],
        meshPoints: DEFAULT_MESH_POINTS,
        meshBlur: 80,
        meshGrain: 20,
        meshOpacity: 80,
        meshSpread: 120,
        noImage: true,
      };
      applyConfig(config, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(50);
      expect(setters.setRounded).toHaveBeenCalledWith(30);
      expect(setters.setShadow).toHaveBeenCalledWith(40);
      expect(setters.setShadowColor).toHaveBeenCalledWith('#000');
      expect(setters.setShadowEnabled).toHaveBeenCalledWith(false);
      expect(setters.setInset).toHaveBeenCalledWith(10);
      expect(setters.setInsetColor).toHaveBeenCalledWith('#fff');
      expect(setters.setBorder).toHaveBeenCalledWith(5);
      expect(setters.setBorderColor).toHaveBeenCalledWith('#ccc');
      expect(setters.setScale).toHaveBeenCalledWith(80);
      expect(setters.setBackgroundType).toHaveBeenCalledWith('color');
      expect(setters.setBackgroundValue).toHaveBeenCalledWith('#ff0000');
      expect(setters.setAspectRatio).toHaveBeenCalledWith('1:1');
      expect(setters.setCanvasWidth).toHaveBeenCalledWith(600);
      expect(setters.setCanvasHeight).toHaveBeenCalledWith(600);
      expect(setters.setPaddingMode).toHaveBeenCalledWith('fill');
      expect(setters.setChromeStyle).toHaveBeenCalledWith('windows');
      expect(setters.setChromeTheme).toHaveBeenCalledWith('light');
      expect(setters.setBlurDensity).toHaveBeenCalledWith(60);
      expect(setters.setWatermarkEnabled).toHaveBeenCalledWith(true);
      expect(setters.setWatermarkText).toHaveBeenCalledWith('Test');
      expect(setters.setWatermarkSize).toHaveBeenCalledWith(30);
      expect(setters.setWatermarkPosition).toHaveBeenCalledWith('top left');
      expect(setters.setWatermarkOpacity).toHaveBeenCalledWith(0.5);
      expect(setters.setWatermarkFont).toHaveBeenCalledWith('Arial');
      expect(setters.setWatermarkBold).toHaveBeenCalledWith(true);
      expect(setters.setWatermarkItalic).toHaveBeenCalledWith(true);
      expect(setters.setAnnotationFont).toHaveBeenCalledWith('Courier');
      expect(setters.setAnnotationFontSize).toHaveBeenCalledWith(30);
      expect(setters.setAnnotationBold).toHaveBeenCalledWith(false);
      expect(setters.setAnnotationItalic).toHaveBeenCalledWith(true);
      expect(setters.setAnnotationOutlineEnabled).toHaveBeenCalledWith(true);
      expect(setters.setAnnotationOutlineColor).toHaveBeenCalledWith('#ff0000');
      expect(setters.setAnnotationOutlineWidth).toHaveBeenCalledWith(5);
      expect(setters.setPosition).toHaveBeenCalledWith('Top left');
      expect(setters.setAnnotations).toHaveBeenCalledWith([]);
      expect(setters.setMeshBlur).toHaveBeenCalledWith(80);
      expect(setters.setMeshGrain).toHaveBeenCalledWith(20);
      expect(setters.setMeshOpacity).toHaveBeenCalledWith(80);
      expect(setters.setMeshSpread).toHaveBeenCalledWith(120);
      expect(setters.setNoImageMode).toHaveBeenCalledWith(true);
    });

    it('uses defaults for missing config properties', () => {
      const setters = makeSetters();
      const partialConfig = { padding: 100 } as unknown as RenderConfig;
      applyConfig(partialConfig, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(100);
      expect(setters.setRounded).toHaveBeenCalledWith(20);
      expect(setters.setShadow).toHaveBeenCalledWith(30);
      expect(setters.setShadowColor).toHaveBeenCalledWith('rgba(0, 0, 0, 0.45)');
      expect(setters.setShadowEnabled).toHaveBeenCalledWith(true);
    });

    it('round-trips: getCurrentConfig then applyConfig', () => {
      const state = {
        padding: 60,
        rounded: 15,
        shadow: 25,
        shadowColor: '#123456',
        shadowEnabled: true,
        inset: 5,
        insetColor: '#abcdef',
        border: 3,
        borderColor: '#fedcba',
        scale: 90,
        backgroundType: 'mesh' as const,
        backgroundValue: 'mesh-gradient',
        aspectRatio: '16:9',
        canvasWidth: 1280,
        canvasHeight: 720,
        paddingMode: 'fit' as const,
        chromeStyle: 'none' as const,
        chromeTheme: 'dark' as const,
        blurDensity: 50,
        watermarkEnabled: true,
        watermarkText: 'MyMark',
        watermarkSize: 24,
        watermarkPosition: 'top right',
        watermarkOpacity: 0.6,
        watermarkFont: 'monospace',
        watermarkBold: true,
        watermarkItalic: false,
        annotationFont: 'serif',
        annotationFontSize: 18,
        annotationBold: false,
        annotationItalic: true,
        annotationOutlineEnabled: false,
        annotationOutlineColor: '#000000',
        annotationOutlineWidth: 3,
        position: 'Top right',
        annotations: [],
        meshPoints: DEFAULT_MESH_POINTS,
        meshBlur: 70,
        meshGrain: 10,
        meshOpacity: 90,
        meshSpread: 110,
        noImageMode: false,
      };

      const config = getCurrentConfig(state as any);
      const setters = makeSetters();
      applyConfig(config, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(60);
      expect(setters.setShadowColor).toHaveBeenCalledWith('#123456');
      expect(setters.setScale).toHaveBeenCalledWith(90);
      expect(setters.setMeshBlur).toHaveBeenCalledWith(70);
      expect(setters.setNoImageMode).toHaveBeenCalledWith(false);
      expect(setters.setWatermarkFont).toHaveBeenCalledWith('monospace');
      expect(setters.setWatermarkBold).toHaveBeenCalledWith(true);
      expect(setters.setWatermarkItalic).toHaveBeenCalledWith(false);
      expect(setters.setAnnotationFont).toHaveBeenCalledWith('serif');
      expect(setters.setAnnotationFontSize).toHaveBeenCalledWith(18);
      expect(setters.setAnnotationBold).toHaveBeenCalledWith(false);
      expect(setters.setAnnotationItalic).toHaveBeenCalledWith(true);
    });

    it('calls optional exportFormat/jpegQuality/sidebarPosition setters when present', () => {
      const setters = makeSetters();
      const config: RenderConfig = {
        padding: 50,
        rounded: 20,
        shadow: 30,
        shadowColor: '#000',
        shadowEnabled: false,
        inset: 0,
        insetColor: '#fff',
        border: 0,
        borderColor: '#ccc',
        scale: 100,
        backgroundType: 'gradient',
        backgroundValue: 'linear-gradient(...)',
        aspectRatio: 'Auto',
        canvasWidth: 800,
        canvasHeight: 600,
        paddingMode: 'fit',
        chromeStyle: 'mac',
        chromeTheme: 'dark',
        blurDensity: 40,
        watermarkEnabled: false,
        watermarkText: 'Made using achu.app',
        watermarkSize: 20,
        watermarkPosition: 'middle',
        watermarkOpacity: 0.45,
        position: 'Middle center',
        annotations: [],
        meshPoints: DEFAULT_MESH_POINTS,
        meshBlur: 60,
        meshGrain: 15,
        meshOpacity: 100,
        meshSpread: 100,
        noImage: false,
        exportFormat: 'jpeg',
        jpegQuality: 75,
        sidebarPosition: 'right',
      };
      applyConfig(config, setters);

      expect(setters.setExportFormat).toHaveBeenCalledWith('jpeg');
      expect(setters.setJpegQuality).toHaveBeenCalledWith(75);
      expect(setters.setSidebarPosition).toHaveBeenCalledWith('right');
    });

    it('does not call optional setters when config values are falsy', () => {
      const setters = makeSetters();
      const config = {
        padding: 50,
        exportFormat: undefined as any,
        jpegQuality: undefined as any,
        sidebarPosition: undefined as any,
      } as unknown as RenderConfig;
      applyConfig(config, setters);

      expect(setters.setExportFormat).not.toHaveBeenCalled();
      expect(setters.setJpegQuality).not.toHaveBeenCalled();
      expect(setters.setSidebarPosition).not.toHaveBeenCalled();
    });
  });

  describe('constant arrays', () => {
    it('BACKGROUND_TYPES has correct values', () => {
      expect(BACKGROUND_TYPES).toEqual(['gradient', 'color', 'blur', 'mesh', 'shader']);
    });

    it('PADDING_MODES has correct values', () => {
      expect(PADDING_MODES).toEqual(['fit', 'fill']);
    });

    it('CHROME_STYLES has correct values', () => {
      expect(CHROME_STYLES).toEqual(['mac', 'windows', 'none']);
    });

    it('CHROME_THEMES has correct values', () => {
      expect(CHROME_THEMES).toEqual(['dark', 'light']);
    });

    it('ACTIVE_TOOLS has all expected tools', () => {
      expect(ACTIVE_TOOLS).toEqual([
        'pointer', 'rect', 'filled-rect', 'circle', 'filled-circle',
        'line', 'arrow', 'text', 'pen', 'emoji',
      ]);
    });

    it('ARROW_STYLES has correct values', () => {
      expect(ARROW_STYLES).toEqual(['classic', 'dashed', 'tapered', 'curved']);
    });

    it('GRADIENT_CATEGORIES has correct values', () => {
      expect(GRADIENT_CATEGORIES).toEqual(['classic', 'disney', 'marvel', 'hollywood']);
    });

    it('APP_THEMES has correct values', () => {
      expect(APP_THEMES).toEqual(['dark', 'light']);
    });

    it('EXPORT_FORMATS has correct values', () => {
      expect(EXPORT_FORMATS).toEqual(['png', 'jpeg']);
    });
  });

  describe('gallery import helpers', () => {
    it('createGalleryImportConfig clears annotations and uses flat display settings', () => {
      const config = createGalleryImportConfig('data:image/png;base64,abc');
      expect(config.imageSrc).toBe('data:image/png;base64,abc');
      expect(config.annotations).toEqual([]);
      expect(config.redactions).toEqual([]);
      expect(config.padding).toBe(0);
      expect(config.chromeStyle).toBe('none');
    });

    it('normalizeRestoredGalleryConfig defaults missing layer arrays to empty', () => {
      const restored = normalizeRestoredGalleryConfig(
        { padding: 12, backgroundType: 'color', backgroundValue: '#000000' },
        'data:image/png;base64,src'
      );
      expect(restored.imageSrc).toBe('data:image/png;base64,src');
      expect(restored.annotations).toEqual([]);
      expect(restored.redactions).toEqual([]);
    });

    it('normalizeRestoredGalleryConfig preserves saved annotations', () => {
      const annotations = [{ id: 'ann-1', type: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.2 }];
      const restored = normalizeRestoredGalleryConfig(
        { annotations, padding: 20 },
        'data:image/png;base64,src'
      );
      expect(restored.annotations).toEqual(annotations);
    });
  });
});
