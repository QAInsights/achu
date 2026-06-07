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
import { getUserDefault } from '../src/renderer/utils/storageUtils';
import { getZoomStyle } from '../src/renderer/utils/layoutUtils';

describe('AppContext', () => {
  describe('getUserDefault', () => {
    it('returns saved value from localStorage', () => {
      const storage: Record<string, string> = {
        'snapframe-user-defaults': JSON.stringify({
          padding: 50,
          rounded: 30,
          shadow: 40,
          watermarkEnabled: true,
          watermarkText: 'Custom',
        }),
      };

      const mockLocalStorage = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, value: string) => { storage[key] = value; },
      };

      vi.stubGlobal('localStorage', mockLocalStorage);

      expect(getUserDefault('padding', 38)).toBe(50);
      expect(getUserDefault('rounded', 20)).toBe(30);
      expect(getUserDefault('shadow', 30)).toBe(40);
      expect(getUserDefault('watermarkEnabled', false)).toBe(true);
      expect(getUserDefault('watermarkText', 'Made using achu.app')).toBe('Custom');
      expect(getUserDefault('scale', 100)).toBe(100);
      expect(getUserDefault('nonexistent', 'default')).toBe('default');
    });

    it('returns fallback on invalid JSON', () => {
      const storage: Record<string, string> = {
        'snapframe-user-defaults': 'invalid json {',
      };

      const mockLocalStorage = {
        getItem: (key: string) => storage[key] || null,
      };

      vi.stubGlobal('localStorage', mockLocalStorage);

      expect(getUserDefault('padding', 38)).toBe(38);
    });

    it('returns fallback when no saved settings exist', () => {
      const mockLocalStorage = {
        getItem: () => null,
      };

      vi.stubGlobal('localStorage', mockLocalStorage);

      expect(getUserDefault('padding', 38)).toBe(38);
      expect(getUserDefault('rounded', 20)).toBe(20);
    });
  });

  describe('default mesh points', () => {
    it('has valid structure', () => {
      expect(DEFAULT_MESH_POINTS.length).toBe(4);

      for (const pt of DEFAULT_MESH_POINTS) {
        expect(pt.id).toBeTruthy();
        expect(pt.color.startsWith('#')).toBe(true);
        expect(pt.x >= 0 && pt.x <= 1).toBe(true);
        expect(pt.y >= 0 && pt.y <= 1).toBe(true);
        expect(pt.radius).toBeGreaterThan(0);
      }

      expect(DEFAULT_MESH_POINTS[0].x < 0.5 && DEFAULT_MESH_POINTS[0].y < 0.5).toBe(true);
      expect(DEFAULT_MESH_POINTS[1].x > 0.5 && DEFAULT_MESH_POINTS[1].y < 0.5).toBe(true);
      expect(DEFAULT_MESH_POINTS[2].x < 0.5 && DEFAULT_MESH_POINTS[2].y > 0.5).toBe(true);
      expect(DEFAULT_MESH_POINTS[3].x > 0.5 && DEFAULT_MESH_POINTS[3].y > 0.5).toBe(true);
    });
  });

  describe('getZoomStyle', () => {
    it('returns correct transform styles', () => {
      expect(getZoomStyle('Zoom to fit')).toEqual({});
      expect(getZoomStyle('100%')).toEqual({ transform: 'scale(1)' });
      expect(getZoomStyle('150%')).toEqual({ transform: 'scale(1.5)' });
      expect(getZoomStyle('50%')).toEqual({ transform: 'scale(0.5)' });
      expect(getZoomStyle('200%')).toEqual({ transform: 'scale(2)' });
      expect(getZoomStyle('invalid')).toEqual({});
    });
  });

  describe('applyMeshPalette', () => {
    it('applies colors to mesh points', () => {
      const meshPoints = [
        { id: '1', color: '#000000', x: 0.2, y: 0.2, radius: 180 },
        { id: '2', color: '#000000', x: 0.8, y: 0.2, radius: 220 },
        { id: '3', color: '#000000', x: 0.2, y: 0.8, radius: 200 },
        { id: '4', color: '#000000', x: 0.8, y: 0.8, radius: 240 },
      ];

      const colors = ['#ff0000', '#00ff00', '#0000ff'];
      const updated = applyMeshPalette(meshPoints, colors);

      expect(updated[0].color).toBe('#ff0000');
      expect(updated[1].color).toBe('#00ff00');
      expect(updated[2].color).toBe('#0000ff');
      expect(updated[3].color).toBe('#ff0000');
      expect(updated[0].x).toBe(0.2);
      expect(updated[0].y).toBe(0.2);
      expect(updated[0].radius).toBe(180);
    });
  });

  describe('generateRandomPalette', () => {
    it('generates random colors and positions', () => {
      const meshPoints = [
        { id: '1', color: '#000000', x: 0.5, y: 0.5, radius: 180 },
        { id: '2', color: '#000000', x: 0.5, y: 0.5, radius: 220 },
        { id: '3', color: '#000000', x: 0.5, y: 0.5, radius: 200 },
      ];

      const updated = generateRandomPalette(meshPoints);

      for (let i = 0; i < updated.length; i++) {
        const pt = updated[i];
        expect(pt.color.startsWith('#')).toBe(true);
        expect(pt.color.length).toBe(7);
        expect(/^[0-9a-f]{6}$/i.test(pt.color.slice(1))).toBe(true);
        expect(pt.x >= 0.1 && pt.x <= 0.9).toBe(true);
        expect(pt.y >= 0.1 && pt.y <= 0.9).toBe(true);
        expect(pt.radius).toBe(meshPoints[i].radius);
        expect(pt.id).toBe(meshPoints[i].id);
      }

      const colors = updated.map(pt => pt.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getCurrentConfig', () => {
    it('returns config with all required fields', () => {
      const state = {
        padding: 38,
        rounded: 20,
        shadow: 30,
        shadowColor: 'rgba(0, 0, 0, 0.45)',
        shadowEnabled: true,
        inset: 0,
        insetColor: 'rgba(255, 255, 255, 0.25)',
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
        position: 'Middle center',
        annotations: [],
        meshPoints: [
          { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
        ],
        meshBlur: 60,
        meshGrain: 15,
        meshOpacity: 100,
        meshSpread: 100,
        noImageMode: false,
      };

      const config = getCurrentConfig(state);

      const requiredFields = [
        'padding', 'rounded', 'shadow', 'shadowColor', 'shadowEnabled',
        'inset', 'insetColor', 'border', 'borderColor', 'scale',
        'backgroundType', 'backgroundValue', 'aspectRatio', 'canvasWidth', 'canvasHeight',
        'paddingMode', 'chromeStyle', 'chromeTheme', 'blurDensity',
        'watermarkEnabled', 'watermarkText', 'watermarkSize', 'position', 'annotations',
        'meshPoints', 'meshBlur', 'meshGrain', 'meshOpacity', 'meshSpread', 'noImage'
      ];

      for (const field of requiredFields) {
        expect(field in config).toBe(true);
      }
    });
  });

  describe('applyConfig', () => {
    it('applies full config', () => {
      const state: Record<string, any> = {};
      const setters = {
        setPadding: (v: number) => { state.padding = v; },
        setRounded: (v: number) => { state.rounded = v; },
        setShadow: (v: number) => { state.shadow = v; },
        setShadowColor: (v: string) => { state.shadowColor = v; },
        setShadowEnabled: (v: boolean) => { state.shadowEnabled = v; },
        setInset: (v: number) => { state.inset = v; },
        setInsetColor: (v: string) => { state.insetColor = v; },
        setBorder: (v: number) => { state.border = v; },
        setBorderColor: (v: string) => { state.borderColor = v; },
        setScale: (v: number) => { state.scale = v; },
        setBackgroundType: (v: 'gradient' | 'color' | 'blur' | 'mesh') => { state.backgroundType = v; },
        setBackgroundValue: (v: string) => { state.backgroundValue = v; },
        setAspectRatio: (v: string) => { state.aspectRatio = v; },
        setCanvasWidth: (v: number) => { state.canvasWidth = v; },
        setCanvasHeight: (v: number) => { state.canvasHeight = v; },
        setPaddingMode: (v: 'fit' | 'fill') => { state.paddingMode = v; },
        setChromeStyle: (v: 'mac' | 'windows' | 'none') => { state.chromeStyle = v; },
        setChromeTheme: (v: 'dark' | 'light') => { state.chromeTheme = v; },
        setBlurDensity: (v: number) => { state.blurDensity = v; },
        setWatermarkEnabled: (v: boolean) => { state.watermarkEnabled = v; },
        setWatermarkText: (v: string) => { state.watermarkText = v; },
        setWatermarkSize: (v: number) => { state.watermarkSize = v; },
        setWatermarkPosition: (v: string) => { state.watermarkPosition = v; },
        setWatermarkOpacity: (v: number) => { state.watermarkOpacity = v; },
        setWatermarkFont: (v: string) => { state.watermarkFont = v; },
        setWatermarkBold: (v: boolean) => { state.watermarkBold = v; },
        setWatermarkItalic: (v: boolean) => { state.watermarkItalic = v; },
        setAnnotationFont: (v: string) => { state.annotationFont = v; },
        setAnnotationFontSize: (v: number) => { state.annotationFontSize = v; },
        setAnnotationBold: (v: boolean) => { state.annotationBold = v; },
        setAnnotationItalic: (v: boolean) => { state.annotationItalic = v; },
        setPosition: (v: string) => { state.position = v; },
        setAnnotations: (v: any[]) => { state.annotations = v; },
        setMeshPoints: (v: any[]) => { state.meshPoints = v; },
        setMeshBlur: (v: number) => { state.meshBlur = v; },
        setMeshGrain: (v: number) => { state.meshGrain = v; },
        setMeshOpacity: (v: number) => { state.meshOpacity = v; },
        setMeshSpread: (v: number) => { state.meshSpread = v; },
        setNoImageMode: (v: boolean) => { state.noImageMode = v; },
      };

      const fullConfig = {
        padding: 50,
        rounded: 30,
        shadow: 40,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowEnabled: false,
        inset: 5,
        insetColor: 'rgba(255, 255, 255, 0.3)',
        border: 2,
        borderColor: '#000000',
        scale: 150,
        backgroundType: 'color' as const,
        backgroundValue: '#ff0000',
        aspectRatio: '16:9',
        canvasWidth: 1920,
        canvasHeight: 1080,
        paddingMode: 'fill' as const,
        chromeStyle: 'windows' as const,
        chromeTheme: 'light' as const,
        blurDensity: 60,
        watermarkEnabled: true,
        watermarkText: 'Test',
        watermarkSize: 35,
        watermarkPosition: 'right',
        watermarkOpacity: 0.8,
        position: 'Top left',
        annotations: [{ id: '1', type: 'rect' }],
        meshPoints: [{ id: '1', color: '#000000', x: 0.5, y: 0.5, radius: 100 }],
        meshBlur: 80,
        meshGrain: 20,
        meshOpacity: 90,
        meshSpread: 120,
        noImage: true,
      };

      applyConfig(fullConfig, setters);

      expect(state.padding).toBe(50);
      expect(state.rounded).toBe(30);
      expect(state.shadow).toBe(40);
      expect(state.scale).toBe(150);
      expect(state.backgroundType).toBe('color');
      expect(state.backgroundValue).toBe('#ff0000');
      expect(state.aspectRatio).toBe('16:9');
      expect(state.watermarkEnabled).toBe(true);
      expect(state.watermarkText).toBe('Test');
      expect(state.watermarkSize).toBe(35);
      expect(state.watermarkPosition).toBe('right');
      expect(state.watermarkOpacity).toBe(0.8);
      expect(state.chromeStyle).toBe('windows');
      expect(state.meshBlur).toBe(80);
      expect(state.noImageMode).toBe(true);

      const partialConfig = { padding: 60 };
      applyConfig(partialConfig, setters);

      expect(state.padding).toBe(60);
      expect(state.rounded).toBe(20);
      expect(state.shadow).toBe(30);

      const beforeNull = { ...state };
      applyConfig(null, setters);
      expect(state).toEqual(beforeNull);
    });
  });

  describe('type constraints', () => {
    it('has correct enum values', () => {
      expect(BACKGROUND_TYPES.length).toBe(4);
      expect(PADDING_MODES.length).toBe(2);
      expect(CHROME_STYLES.length).toBe(3);
      expect(CHROME_THEMES.length).toBe(2);
      expect(ACTIVE_TOOLS.length).toBe(10);
      expect(ARROW_STYLES.length).toBe(4);
      expect(GRADIENT_CATEGORIES.length).toBe(4);
      expect(APP_THEMES.length).toBe(2);
      expect(EXPORT_FORMATS.length).toBe(2);
    });
  });
});
