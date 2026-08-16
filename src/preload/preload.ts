import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC channels to the renderer process
contextBridge.exposeInMainWorld('snapFrameAPI', {
  platform: process.platform,
  osInfo: `${process.platform || 'Unknown OS'} ${process.arch || ''}`.trim(),
  versions: {
    electron: process.versions.electron || 'N/A',
    chrome: process.versions.chrome || 'N/A',
    node: process.versions.node || 'N/A',
    v8: process.versions.v8 || 'N/A',
  },
  setTheme: (theme: 'dark' | 'light') => ipcRenderer.send('theme:changed', theme),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),

  // File API
  openFile: () => ipcRenderer.invoke('file:open-dialog'),
  saveFile: (base64Data: string, type: 'png' | 'jpeg' | 'webp', quality?: number, compressionMode?: 'original' | 'balanced' | 'small') => 
    ipcRenderer.invoke('file:save-dialog', { base64Data, type, quality, compressionMode }),

  // Screen Capture API
  triggerScreenCapture: () => ipcRenderer.send('capture:trigger'),

  // Clipboard API
  copyImageToClipboard: (base64Data: string, text?: string) => ipcRenderer.invoke('clipboard:copy-image', base64Data, text),
  readImageFromClipboard: () => ipcRenderer.invoke('clipboard:read-image'),
  copyTextToClipboard: (text: string) => ipcRenderer.invoke('clipboard:copy-text', text),
  openURL: (url: string) => ipcRenderer.send('url:open', url),

  // GitHub token APIs
  getGitHubToken: () => ipcRenderer.invoke('get-github-token'),
  setGitHubToken: (token: string) => ipcRenderer.invoke('set-github-token', token),

  // Secure key storage APIs (for OpenAI, Google, Claude, etc.)
  getSecureKey: (keyName: string) => ipcRenderer.invoke('get-secure-key', keyName),
  setSecureKey: (keyName: string, keyValue: string) => ipcRenderer.invoke('set-secure-key', keyName, keyValue),
  checkAIHealth: (provider: string, endpoint: string) => ipcRenderer.invoke('llm:check-health', { provider, endpoint }),
  generateAIResponse: (payload: { provider: string; model: string; prompt: string; imageBase64: string; endpoint: string }) =>
    ipcRenderer.invoke('llm:generate-issue', payload),

  // Event listener for global hotkey
  onGlobalHotkeyTriggered: (callback: (imageUrl: string, isCaptureInitiated?: boolean) => void) => {
    const subscription = (_event: any, imageUrl: string, isCaptureInitiated?: boolean) => callback(imageUrl, isCaptureInitiated);
    ipcRenderer.on('hotkey:triggered', subscription);
    return () => {
      ipcRenderer.removeListener('hotkey:triggered', subscription);
    };
  },

  // Update check APIs
  checkForUpdates: (force?: boolean) => ipcRenderer.invoke('update:check', force),
  startUpdate: (downloadUrl: string | null, expectedSize?: number) => ipcRenderer.invoke('update:start', downloadUrl, expectedSize),
  onUpdateProgress: (callback: (progress: number) => void) => {
    const subscription = (_event: any, progress: number) => callback(progress);
    ipcRenderer.on('update:progress', subscription);
    return () => {
      ipcRenderer.removeListener('update:progress', subscription);
    };
  },
  onUpdateAvailable: (callback: (info: { version: string; releaseUrl: string }) => void) => {
    const subscription = (_event: any, info: { version: string; releaseUrl: string }) => callback(info);
    ipcRenderer.on('update:available', subscription);
    return () => {
      ipcRenderer.removeListener('update:available', subscription);
    };
  },
  openReleasePage: () => ipcRenderer.invoke('update:open-release-page'),

  // Gallery APIs
  ensureGalleryDir: () => ipcRenderer.invoke('gallery:ensure-dir'),
  getGalleryFolder: () => ipcRenderer.invoke('gallery:get-folder'),
  setGalleryFolder: (folderPath: string) => ipcRenderer.invoke('gallery:set-folder', folderPath),
  chooseGalleryFolder: () => ipcRenderer.invoke('gallery:choose-folder'),
  listGallery: () => ipcRenderer.invoke('gallery:list'),
  saveToGallery: (
    base64Data: string,
    type: 'png' | 'jpeg' | 'webp',
    quality?: number,
    compressionMode?: 'original' | 'balanced' | 'small',
    documentName?: string,
    projectConfig?: Record<string, unknown>,
    sourceImageSrc?: string | null
  ) =>
    ipcRenderer.invoke('gallery:save', { base64Data, type, quality, compressionMode, documentName, projectConfig, sourceImageSrc }),
  deleteGalleryItem: (filePath: string) => ipcRenderer.invoke('gallery:delete', filePath),
  openInExplorer: (filePath: string) => ipcRenderer.invoke('gallery:open-in-explorer', filePath),
  openGalleryFolder: () => ipcRenderer.invoke('gallery:open-folder'),
  readGalleryFile: (filePath: string) => ipcRenderer.invoke('gallery:read-file', filePath),
  readGalleryProject: (filePath: string) => ipcRenderer.invoke('gallery:read-project', filePath),
  getGalleryThumbnail: (filePath: string, width?: number) => ipcRenderer.invoke('gallery:thumbnail', filePath, width),
  copyGalleryToClipboard: (filePath: string) => ipcRenderer.invoke('gallery:copy-to-clipboard', filePath),
  saveBurstPack: (payload: any) => ipcRenderer.invoke('burst:save', payload),
});
