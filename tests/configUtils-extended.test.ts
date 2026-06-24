import { describe, it, expect, vi } from 'vitest';
import { applyMeshPalette, generateRandomPalette, getCurrentConfig, applyConfig, DEFAULT_MESH_POINTS, BACKGROUND_TYPES, ACTIVE_TOOLS, ARROW_STYLES } from '../src/renderer/utils/configUtils';

describe('configUtils - Extended', () => {
  describe('applyMeshPalette', () => {
    it('applies colors to mesh points cyclically', () => {
      const result = applyMeshPalette(DEFAULT_MESH_POINTS, ['#ff0000', '#00ff00']);
      expect(result.map(p => p.color)).toEqual(['#ff0000', '#00ff00', '#ff0000', '#00ff00']);
    });

    it('handles single color', () => {
      const result = applyMeshPalette(DEFAULT_MESH_POINTS, ['#ff0000']);
      expect(result.every(p => p.color === '#ff0000')).toBe(true);
    });

    it('preserves point positions', () => {
      const result = applyMeshPalette(DEFAULT_MESH_POINTS, ['#ff0000', '#00ff00']);
      result.forEach((pt, i) => {
        expect(pt.x).toBe(DEFAULT_MESH_POINTS[i].x);
        expect(pt.y).toBe(DEFAULT_MESH_POINTS[i].y);
        expect(pt.radius).toBe(DEFAULT_MESH_POINTS[i].radius);
      });
    });

    it('handles empty points array', () => {
      const result = applyMeshPalette([], ['#ff0000']);
      expect(result).toEqual([]);
    });

    it('handles empty colors array (undefined colors)', () => {
      const result = applyMeshPalette(DEFAULT_MESH_POINTS, []);
      result.forEach(pt => {
        expect(pt.color).toBeUndefined();
      });
    });
  });

  describe('generateRandomPalette', () => {
    it('generates random hex colors', () => {
      const result = generateRandomPalette(DEFAULT_MESH_POINTS);
      expect(result).toHaveLength(DEFAULT_MESH_POINTS.length);
      result.forEach(pt => {
        expect(pt.color).toMatch(/^#[0-9a-f]{6}$/);
      });
    });

    it('randomizes positions within valid range', () => {
      const result = generateRandomPalette(DEFAULT_MESH_POINTS);
      result.forEach(pt => {
        expect(pt.x).toBeGreaterThanOrEqual(0.1);
        expect(pt.x).toBeLessThanOrEqual(0.9);
        expect(pt.y).toBeGreaterThanOrEqual(0.1);
        expect(pt.y).toBeLessThanOrEqual(0.9);
      });
    });

    it('preserves ids', () => {
      const result = generateRandomPalette(DEFAULT_MESH_POINTS);
      result.forEach((pt, i) => {
        expect(pt.id).toBe(DEFAULT_MESH_POINTS[i].id);
      });
    });
  });

  describe('getCurrentConfig', () => {
    const mockState = {
      padding: 38, rounded: 20, shadow: 30,
      shadowColor: 'rgba(0,0,0,0.4)', shadowEnabled: true,
      inset: 5, insetColor: 'rgba(255,255,255,0.2)',
      border: 3, borderColor: '#fff',
      scale: 100, backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(...)',
      aspectRatio: 'Auto', canvasWidth: 800, canvasHeight: 600,
      paddingMode: 'fit',
      chromeStyle: 'mac', chromeTheme: 'dark',
      blurDensity: 40,
      watermarkEnabled: false, watermarkText: 'Made using achu.app', watermarkSize: 20,
      watermarkPosition: 'middle', watermarkOpacity: 0.45,
      watermarkFont: 'sans-serif', watermarkBold: false, watermarkItalic: false,
      annotationFont: 'sans-serif', annotationFontSize: 24,
      annotationBold: true, annotationItalic: false,
      annotationOutlineEnabled: false, annotationOutlineColor: '#000000', annotationOutlineWidth: 3,
      position: 'Middle center', annotations: [],
      meshPoints: DEFAULT_MESH_POINTS,
      meshBlur: 60, meshGrain: 15, meshOpacity: 100, meshSpread: 100,
      noImageMode: false,
    };

    it('maps state to RenderConfig', () => {
      const config = getCurrentConfig(mockState as any);
      expect(config.padding).toBe(38);
      expect(config.backgroundType).toBe('gradient');
      expect(config.noImage).toBe(false);
      expect(config.annotations).toEqual([]);
    });

    it('includes optional export format', () => {
      const config = getCurrentConfig({ ...mockState, exportFormat: 'jpeg', jpegQuality: 75 } as any);
      expect(config.exportFormat).toBe('jpeg');
      expect(config.jpegQuality).toBe(75);
    });

    it('maps mesh fields correctly', () => {
      const config = getCurrentConfig(mockState as any);
      expect(config.meshPoints).toEqual(DEFAULT_MESH_POINTS);
      expect(config.meshBlur).toBe(60);
      expect(config.meshGrain).toBe(15);
      expect(config.meshOpacity).toBe(100);
      expect(config.meshSpread).toBe(100);
    });
  });

  describe('applyConfig', () => {
    it('applies all config values', () => {
      const setters = {
        setPadding: vi.fn(), setRounded: vi.fn(), setShadow: vi.fn(),
        setShadowColor: vi.fn(), setShadowEnabled: vi.fn(),
        setInset: vi.fn(), setInsetColor: vi.fn(),
        setBorder: vi.fn(), setBorderColor: vi.fn(),
        setScale: vi.fn(), setBackgroundType: vi.fn(), setBackgroundValue: vi.fn(),
        setAspectRatio: vi.fn(), setCanvasWidth: vi.fn(), setCanvasHeight: vi.fn(),
        setPaddingMode: vi.fn(), setChromeStyle: vi.fn(), setChromeTheme: vi.fn(),
        setBlurDensity: vi.fn(), setWatermarkEnabled: vi.fn(), setWatermarkText: vi.fn(),
        setWatermarkSize: vi.fn(), setWatermarkPosition: vi.fn(), setWatermarkOpacity: vi.fn(),
        setWatermarkFont: vi.fn(), setWatermarkBold: vi.fn(), setWatermarkItalic: vi.fn(),
        setAnnotationFont: vi.fn(), setAnnotationFontSize: vi.fn(), setAnnotationBold: vi.fn(), setAnnotationItalic: vi.fn(), setAnnotationOutlineEnabled: vi.fn(), setAnnotationOutlineColor: vi.fn(), setAnnotationOutlineWidth: vi.fn(),
        setPosition: vi.fn(), setAnnotations: vi.fn(), setMeshPoints: vi.fn(),
        setMeshBlur: vi.fn(), setMeshGrain: vi.fn(), setMeshOpacity: vi.fn(),
        setMeshSpread: vi.fn(), setNoImageMode: vi.fn(),
      };

      const config: any = {
        padding: 50, rounded: 30, shadow: 40, shadowColor: '#000', shadowEnabled: false,
        inset: 10, insetColor: '#fff', border: 5, borderColor: '#000',
        scale: 80, backgroundType: 'color', backgroundValue: '#fff',
        aspectRatio: '1:1', canvasWidth: 600, canvasHeight: 600,
        paddingMode: 'fill', chromeStyle: 'windows', chromeTheme: 'light',
        blurDensity: 60, watermarkEnabled: true, watermarkText: 'test',
        watermarkSize: 24, watermarkPosition: 'top', watermarkOpacity: 0.8,
        position: 'Top left', annotations: [{ id: '1' }], 
        meshPoints: [], meshBlur: 30, meshGrain: 10, meshOpacity: 80, meshSpread: 50,
        noImage: true,
      };

      applyConfig(config, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(50);
      expect(setters.setRounded).toHaveBeenCalledWith(30);
      expect(setters.setShadow).toHaveBeenCalledWith(40);
    });

    it('does nothing when config is null', () => {
      const setters = { setPadding: vi.fn(), setRounded: vi.fn() };
      applyConfig(null, setters as any);
      expect(setters.setPadding).not.toHaveBeenCalled();
    });

    it('uses defaults for missing config fields', () => {
      const setters = {
        setPadding: vi.fn(), setRounded: vi.fn(), setShadow: vi.fn(),
        setShadowColor: vi.fn(), setShadowEnabled: vi.fn(),
        setInset: vi.fn(), setInsetColor: vi.fn(),
        setBorder: vi.fn(), setBorderColor: vi.fn(),
        setScale: vi.fn(), setBackgroundType: vi.fn(), setBackgroundValue: vi.fn(),
        setAspectRatio: vi.fn(), setCanvasWidth: vi.fn(), setCanvasHeight: vi.fn(),
        setPaddingMode: vi.fn(), setChromeStyle: vi.fn(), setChromeTheme: vi.fn(),
        setBlurDensity: vi.fn(), setWatermarkEnabled: vi.fn(), setWatermarkText: vi.fn(),
        setWatermarkSize: vi.fn(), setWatermarkPosition: vi.fn(), setWatermarkOpacity: vi.fn(),
        setWatermarkFont: vi.fn(), setWatermarkBold: vi.fn(), setWatermarkItalic: vi.fn(),
        setAnnotationFont: vi.fn(), setAnnotationFontSize: vi.fn(), setAnnotationBold: vi.fn(), setAnnotationItalic: vi.fn(), setAnnotationOutlineEnabled: vi.fn(), setAnnotationOutlineColor: vi.fn(), setAnnotationOutlineWidth: vi.fn(),
        setPosition: vi.fn(), setAnnotations: vi.fn(), setMeshPoints: vi.fn(),
        setMeshBlur: vi.fn(), setMeshGrain: vi.fn(), setMeshOpacity: vi.fn(),
        setMeshSpread: vi.fn(), setNoImageMode: vi.fn(),
      };

      applyConfig({} as any, setters);

      expect(setters.setPadding).toHaveBeenCalledWith(38);
      expect(setters.setRounded).toHaveBeenCalledWith(20);
      expect(setters.setShadow).toHaveBeenCalledWith(30);
      expect(setters.setNoImageMode).toHaveBeenCalledWith(false);
    });

    it('sets optional fields when provided in config', () => {
      const setters = {
        setPadding: vi.fn(), setRounded: vi.fn(), setShadow: vi.fn(),
        setShadowColor: vi.fn(), setShadowEnabled: vi.fn(),
        setInset: vi.fn(), setInsetColor: vi.fn(),
        setBorder: vi.fn(), setBorderColor: vi.fn(),
        setScale: vi.fn(), setBackgroundType: vi.fn(), setBackgroundValue: vi.fn(),
        setAspectRatio: vi.fn(), setCanvasWidth: vi.fn(), setCanvasHeight: vi.fn(),
        setPaddingMode: vi.fn(), setChromeStyle: vi.fn(), setChromeTheme: vi.fn(),
        setBlurDensity: vi.fn(), setWatermarkEnabled: vi.fn(), setWatermarkText: vi.fn(),
        setWatermarkSize: vi.fn(), setWatermarkPosition: vi.fn(), setWatermarkOpacity: vi.fn(),
        setWatermarkFont: vi.fn(), setWatermarkBold: vi.fn(), setWatermarkItalic: vi.fn(),
        setAnnotationFont: vi.fn(), setAnnotationFontSize: vi.fn(), setAnnotationBold: vi.fn(), setAnnotationItalic: vi.fn(), setAnnotationOutlineEnabled: vi.fn(), setAnnotationOutlineColor: vi.fn(), setAnnotationOutlineWidth: vi.fn(),
        setPosition: vi.fn(), setAnnotations: vi.fn(), setMeshPoints: vi.fn(),
        setMeshBlur: vi.fn(), setMeshGrain: vi.fn(), setMeshOpacity: vi.fn(),
        setMeshSpread: vi.fn(), setNoImageMode: vi.fn(),
        setExportFormat: vi.fn(), setJpegQuality: vi.fn(), setSidebarPosition: vi.fn(),
      };

      applyConfig({ exportFormat: 'jpeg', jpegQuality: 75, sidebarPosition: 'right' } as any, setters);

      expect(setters.setExportFormat).toHaveBeenCalledWith('jpeg');
      expect(setters.setJpegQuality).toHaveBeenCalledWith(75);
      expect(setters.setSidebarPosition).toHaveBeenCalledWith('right');
    });
  });

  describe('Constants', () => {
    it('exports all background types', () => {
      expect(BACKGROUND_TYPES).toEqual(['gradient', 'color', 'blur', 'mesh']);
    });

    it('exports all active tools', () => {
      expect(ACTIVE_TOOLS).toEqual([
        'pointer', 'rect', 'filled-rect', 'circle', 'filled-circle',
        'line', 'arrow', 'text', 'pen', 'emoji',
      ]);
    });

    it('exports all arrow styles', () => {
      expect(ARROW_STYLES).toEqual(['classic', 'dashed', 'tapered', 'curved']);
    });
  });
});
