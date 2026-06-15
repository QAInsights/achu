export function getPlatformId(): string {
  if (typeof window !== 'undefined' && window.snapFrameAPI?.platform) {
    return window.snapFrameAPI.platform;
  }
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    return 'darwin';
  }
  return 'win32';
}

/** Primary modifier label: ⌘ on macOS, Ctrl on Windows and Linux. */
export function getModKeyLabel(): string {
  return getPlatformId() === 'darwin' ? '⌘' : 'Ctrl';
}

export function formatModShortcut(key: string): string {
  return `${getModKeyLabel()} + ${key}`;
}