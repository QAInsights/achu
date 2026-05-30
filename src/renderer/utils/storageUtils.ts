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
  watermarkText: 'Achu',
  watermarkSize: 20,
  exportFormat: 'png' as const,
  jpegQuality: 90,
};
