import { contextBridge, ipcRenderer } from 'electron';
import os from 'os';

// Expose safe IPC channels to the renderer process
contextBridge.exposeInMainWorld('snapFrameAPI', {
  platform: process.platform,
  osInfo: `${os.type ? os.type() : 'Unknown OS'} ${os.arch ? os.arch() : ''} ${os.release ? os.release() : ''}`.trim(),
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

  // Event listener for global hotkey
  onGlobalHotkeyTriggered: (callback: (imageUrl: string) => void) => {
    const subscription = (_event: any, imageUrl: string) => callback(imageUrl);
    ipcRenderer.on('hotkey:triggered', subscription);
    return () => {
      ipcRenderer.removeListener('hotkey:triggered', subscription);
    };
  }
});
