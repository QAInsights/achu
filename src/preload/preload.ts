import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC channels to the renderer process
contextBridge.exposeInMainWorld('snapFrameAPI', {
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

  // Event listener for global hotkey
  onGlobalHotkeyTriggered: (callback: (imageUrl: string) => void) => {
    const subscription = (_event: any, imageUrl: string) => callback(imageUrl);
    ipcRenderer.on('hotkey:triggered', subscription);
    return () => {
      ipcRenderer.removeListener('hotkey:triggered', subscription);
    };
  }
});
