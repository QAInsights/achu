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
      watermarkText: 'achu',
      watermarkSize: 20,
      watermarkPosition: 'middle',
      watermarkOpacity: 0.45,
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
      const config = getCurrentConfig(minimalState);
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
      expect(config.watermarkText).toBe('achu');
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
      const config = getCurrentConfig({ ...minimalState, noImageMode: true });
      expect(config.noImage).toBe(true);
    });

    it('handles alternate background types', () => {
      const state = { ...minimalState, backgroundType: 'color' as const, backgroundValue: '#ff0000' };
      const config = getCurrentConfig(state);
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
      setPosition: vi.fn(),
      setAnnotations: vi.fn(),
      setMeshPoints: vi.fn(),
      setMeshBlur: vi.fn(),
      setMeshGrain: vi.fn(),
      setMeshOpacity: vi.fn(),
      setMeshSpread: vi.fn(),
      setNoImageMode: vi.fn(),
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
        watermarkPosition: 'top-left',
        watermarkOpacity: 0.5,
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
      expect(setters.setWatermarkPosition).toHaveBeenCalledWith('top-left');
      expect(setters.setWatermarkOpacity).toHaveBeenCalledWith(0.5);
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
        watermarkPosition: 'top-right',
        watermarkOpacity: 0.6,
        position: 'Top right',
        annotations: [],
        meshPoints: DEFAULT_MESH_POINTS,
        meshBlur: 70,
        meshGrain: 10,
        meshOpacity: 90,
        meshSpread: 110,
        noImageMode: false,
      };

      const config = getCurrentConfig(state);
      const setters = makeSetters();
      applyConfig(config, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(60);
      expect(setters.setShadowColor).toHaveBeenCalledWith('#123456');
      expect(setters.setScale).toHaveBeenCalledWith(90);
      expect(setters.setMeshBlur).toHaveBeenCalledWith(70);
      expect(setters.setNoImageMode).toHaveBeenCalledWith(false);
    });
  });

  describe('constant arrays', () => {
    it('BACKGROUND_TYPES has correct values', () => {
      expect(BACKGROUND_TYPES).toEqual(['gradient', 'color', 'blur', 'mesh']);
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
});
