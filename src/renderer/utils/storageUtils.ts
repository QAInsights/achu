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
  exportFormat: 'png' as const,
  jpegQuality: 90,
  compressionMode: 'balanced' as const,
  sidebarPosition: 'left' as const,
  secondarySidebarVisible: true,
  secondarySidebarPosition: 'right' as const,
  autoImportCaptured: true,
  captureShortcut: 'PrintScreen',
  galleryFolder: '',
};
