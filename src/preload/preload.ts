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
  saveFile: (base64Data: string, type: 'png' | 'jpeg', quality?: number) => 
    ipcRenderer.invoke('file:save-dialog', { base64Data, type, quality }),

  // Clipboard API
  copyImageToClipboard: (base64Data: string) => ipcRenderer.invoke('clipboard:copy-image', base64Data),
  readImageFromClipboard: () => ipcRenderer.invoke('clipboard:read-image'),
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
  onGlobalHotkeyTriggered: (callback: (imageUrl: string) => void) => {
    const subscription = (_event: any, imageUrl: string) => callback(imageUrl);
    ipcRenderer.on('hotkey:triggered', subscription);
    return () => {
      ipcRenderer.removeListener('hotkey:triggered', subscription);
    };
  }
});
