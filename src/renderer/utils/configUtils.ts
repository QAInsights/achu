import type { RenderConfig, Annotation } from '../canvasRenderer';

export const DEFAULT_MESH_POINTS = [
  { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
  { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
  { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
  { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
];

export function applyMeshPalette(
  meshPoints: Array<{ id: string; color: string; x: number; y: number; radius: number }>,
  colors: string[]
) {
  return meshPoints.map((pt, idx) => ({
    ...pt,
    color: colors[idx % colors.length],
  }));
}

export function generateRandomPalette(
  meshPoints: Array<{ id: string; color: string; x: number; y: number; radius: number }>
) {
  const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  return meshPoints.map((pt) => ({
    ...pt,
    color: randomHex(),
    x: Math.random() * 0.8 + 0.1,
    y: Math.random() * 0.8 + 0.1,
  }));
}

export function getCurrentConfig(state: {
  padding: number;
  rounded: number;
  shadow: number;
  shadowColor: string;
  shadowEnabled: boolean;
  inset: number;
  insetColor: string;
  border: number;
  borderColor: string;
  scale: number;
  backgroundType: 'gradient' | 'color' | 'blur' | 'mesh';
  backgroundValue: string;
  aspectRatio: string;
  canvasWidth: number;
  canvasHeight: number;
  paddingMode: 'fit' | 'fill';
  chromeStyle: 'mac' | 'windows' | 'none';
  chromeTheme: 'dark' | 'light';
  blurDensity: number;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkSize: number;
  watermarkPosition: string;
  watermarkOpacity: number;
  position: string;
  annotations: Annotation[];
  meshPoints: Array<{ id: string; color: string; x: number; y: number; radius: number }>;
  meshBlur: number;
  meshGrain: number;
  meshOpacity: number;
  meshSpread: number;
  noImageMode: boolean;
  exportFormat?: 'png' | 'jpeg';
  jpegQuality?: number;
  sidebarPosition?: 'left' | 'right';
}): RenderConfig {
  return {
    padding: state.padding,
    rounded: state.rounded,
    shadow: state.shadow,
    shadowColor: state.shadowColor,
    shadowEnabled: state.shadowEnabled,
    inset: state.inset,
    insetColor: state.insetColor,
    border: state.border,
    borderColor: state.borderColor,
    scale: state.scale,
    backgroundType: state.backgroundType,
    backgroundValue: state.backgroundValue,
    aspectRatio: state.aspectRatio,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    paddingMode: state.paddingMode,
    chromeStyle: state.chromeStyle,
    chromeTheme: state.chromeTheme,
    blurDensity: state.blurDensity,
    watermarkEnabled: state.watermarkEnabled,
    watermarkText: state.watermarkText,
    watermarkSize: state.watermarkSize,
    watermarkPosition: state.watermarkPosition,
    watermarkOpacity: state.watermarkOpacity,
    position: state.position,
    annotations: state.annotations,
    meshPoints: state.meshPoints,
    meshBlur: state.meshBlur,
    meshGrain: state.meshGrain,
    meshOpacity: state.meshOpacity,
    meshSpread: state.meshSpread,
    noImage: state.noImageMode,
    exportFormat: state.exportFormat,
    jpegQuality: state.jpegQuality,
    sidebarPosition: state.sidebarPosition,
  };
}

export function applyConfig(
  config: RenderConfig | null,
  setters: {
    setPadding: (v: number) => void;
    setRounded: (v: number) => void;
    setShadow: (v: number) => void;
    setShadowColor: (v: string) => void;
    setShadowEnabled: (v: boolean) => void;
    setInset: (v: number) => void;
    setInsetColor: (v: string) => void;
    setBorder: (v: number) => void;
    setBorderColor: (v: string) => void;
    setScale: (v: number) => void;
    setBackgroundType: (v: 'gradient' | 'color' | 'blur' | 'mesh') => void;
    setBackgroundValue: (v: string) => void;
    setAspectRatio: (v: string) => void;
    setCanvasWidth: (v: number) => void;
    setCanvasHeight: (v: number) => void;
    setPaddingMode: (v: 'fit' | 'fill') => void;
    setChromeStyle: (v: 'mac' | 'windows' | 'none') => void;
    setChromeTheme: (v: 'dark' | 'light') => void;
    setBlurDensity: (v: number) => void;
    setWatermarkEnabled: (v: boolean) => void;
    setWatermarkText: (v: string) => void;
    setWatermarkSize: (v: number) => void;
    setWatermarkPosition: (v: string) => void;
    setWatermarkOpacity: (v: number) => void;
    setPosition: (v: string) => void;
    setAnnotations: (v: Annotation[]) => void;
    setMeshPoints: (v: Array<{ id: string; color: string; x: number; y: number; radius: number }>) => void;
    setMeshBlur: (v: number) => void;
    setMeshGrain: (v: number) => void;
    setMeshOpacity: (v: number) => void;
    setMeshSpread: (v: number) => void;
    setNoImageMode: (v: boolean) => void;
    setExportFormat?: (v: 'png' | 'jpeg') => void;
    setJpegQuality?: (v: number) => void;
    setSidebarPosition?: (v: 'left' | 'right') => void;
  }
) {
  if (!config) return;
  setters.setPadding(config.padding ?? 38);
  setters.setRounded(config.rounded ?? 20);
  setters.setShadow(config.shadow ?? 30);
  setters.setShadowColor(config.shadowColor ?? 'rgba(0, 0, 0, 0.45)');
  setters.setShadowEnabled(config.shadowEnabled ?? true);
  setters.setInset(config.inset ?? 0);
  setters.setInsetColor(config.insetColor ?? 'rgba(255, 255, 255, 0.25)');
  setters.setBorder(config.border ?? 0);
  setters.setBorderColor(config.borderColor ?? '#ffffff');
  setters.setScale(config.scale ?? 100);
  setters.setBackgroundType(config.backgroundType ?? 'gradient');
  setters.setBackgroundValue(config.backgroundValue ?? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
  setters.setAspectRatio(config.aspectRatio ?? 'Auto');
  setters.setCanvasWidth(config.canvasWidth ?? 800);
  setters.setCanvasHeight(config.canvasHeight ?? 600);
  setters.setPaddingMode(config.paddingMode ?? 'fit');
  setters.setChromeStyle(config.chromeStyle ?? 'mac');
  setters.setChromeTheme(config.chromeTheme ?? 'dark');
  setters.setBlurDensity(config.blurDensity ?? 40);
  setters.setWatermarkEnabled(config.watermarkEnabled ?? false);
  setters.setWatermarkText(config.watermarkText ?? 'Achu');
  setters.setWatermarkSize(config.watermarkSize ?? 20);
  setters.setWatermarkPosition(config.watermarkPosition ?? 'middle');
  setters.setWatermarkOpacity(config.watermarkOpacity ?? 0.45);
  setters.setPosition(config.position ?? 'Middle center');
  setters.setAnnotations(config.annotations ?? []);
  setters.setMeshPoints(config.meshPoints ?? DEFAULT_MESH_POINTS);
  setters.setMeshBlur(config.meshBlur ?? 60);
  setters.setMeshGrain(config.meshGrain ?? 15);
  setters.setMeshOpacity(config.meshOpacity ?? 100);
  setters.setMeshSpread(config.meshSpread ?? 100);
  setters.setNoImageMode(config.noImage ?? false);
  if (config.exportFormat && setters.setExportFormat) setters.setExportFormat(config.exportFormat);
  if (config.jpegQuality !== undefined && setters.setJpegQuality) setters.setJpegQuality(config.jpegQuality);
  if (config.sidebarPosition && setters.setSidebarPosition) setters.setSidebarPosition(config.sidebarPosition);
}

export const BACKGROUND_TYPES = ['gradient', 'color', 'blur', 'mesh'] as const;
export const PADDING_MODES = ['fit', 'fill'] as const;
export const CHROME_STYLES = ['mac', 'windows', 'none'] as const;
export const CHROME_THEMES = ['dark', 'light'] as const;
export const ACTIVE_TOOLS = ['pointer', 'rect', 'filled-rect', 'circle', 'filled-circle', 'line', 'arrow', 'text', 'pen', 'emoji'] as const;
export const ARROW_STYLES = ['classic', 'dashed', 'tapered', 'curved'] as const;
export const GRADIENT_CATEGORIES = ['classic', 'disney', 'marvel', 'hollywood'] as const;
export const APP_THEMES = ['dark', 'light'] as const;
export const EXPORT_FORMATS = ['png', 'jpeg'] as const;
