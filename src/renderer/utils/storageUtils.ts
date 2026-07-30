import {
  ACHU_BRAND_WATERMARK,
  ACHU_DEFAULT_WATERMARK_ENABLED,
  ACHU_DEFAULT_WATERMARK_OPACITY,
  ACHU_DEFAULT_WATERMARK_POSITION,
} from '../../shared/branding';

export function getUserDefault<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem('snapframe-user-defaults');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[key] !== undefined) return parsed[key];
    }
  } catch (e) {}
  return fallback;
}

export function updateUserDefault(key: string, value: any) {
  try {
    const saved = localStorage.getItem('snapframe-user-defaults');
    const parsed = saved ? JSON.parse(saved) : {};
    parsed[key] = value;
    localStorage.setItem('snapframe-user-defaults', JSON.stringify(parsed));
  } catch (e) {}
}

export function clearUserDefaults() {
  try {
    localStorage.removeItem('snapframe-user-defaults');
  } catch (e) {}
}

export const DEFAULT_SETTINGS = {
  padding: 38,
  rounded: 20,
  shadow: 30,
  watermarkEnabled: ACHU_DEFAULT_WATERMARK_ENABLED,
  watermarkText: ACHU_BRAND_WATERMARK,
  watermarkSize: 20,
  watermarkPosition: ACHU_DEFAULT_WATERMARK_POSITION,
  watermarkOpacity: ACHU_DEFAULT_WATERMARK_OPACITY,
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
  exportFormat: 'png' as const,
  jpegQuality: 90,
  compressionMode: 'balanced' as const,
  sidebarPosition: 'right' as const,
  secondarySidebarVisible: true,
  secondarySidebarPosition: 'left' as const,
  autoImportCaptured: true,
  captureShortcut: 'PrintScreen',
  galleryFolder: '',
};
