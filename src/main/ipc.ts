import { ipcMain, dialog, safeStorage, clipboard, shell, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { loadSettings, saveSettings } from './settings';
import { triggerOSScreenCapture, setIgnoreNextClipboardImage, updateCaptureConfigurations } from './capture';

export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  // Theme Changed
  ipcMain.on('theme:changed', (_event, theme) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (process.platform === 'win32' && typeof (mainWindow as any).setTitleBarOverlay === 'function') {
      const isDark = theme === 'dark';
      (mainWindow as any).setTitleBarOverlay({
        color: isDark ? '#0b0f19' : '#f7f7f7',
        symbolColor: isDark ? '#9699a3' : '#454953',
        height: 32
      });
    }
  });

  // Settings API
  ipcMain.handle('settings:get', () => {
    return loadSettings();
  });

  ipcMain.handle('settings:set', (_event, newSettings) => {
    const current = loadSettings();
    const merged = {
      ...newSettings,
      githubToken: (current as any).githubToken,
      secureKeys: (current as any).secureKeys
    };
    saveSettings(merged);
    
    // Update capture configurations dynamically
    updateCaptureConfigurations(merged, getMainWindow());
    
    return true;
  });

  // GitHub token APIs
  ipcMain.handle('set-github-token', (_event, token: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this platform.');
      }
      const encrypted = safeStorage.encryptString(token);
      const currentSettings = loadSettings();
      (currentSettings as any).githubToken = encrypted.toString('base64');
      saveSettings(currentSettings);
      return true;
    } catch (error) {
      console.error('Failed to set github token:', error);
      return false;
    }
  });

  ipcMain.handle('get-github-token', () => {
    try {
      const currentSettings = loadSettings();
      const raw = (currentSettings as any).githubToken;
      if (!raw) return null;
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this platform.');
      }
      const buf = Buffer.from(raw, 'base64');
      return safeStorage.decryptString(buf);
    } catch (error) {
      console.error('Failed to get github token:', error);
      return null;
    }
  });

  // Secure keys storage (OpenAI, Gemini, Claude)
  ipcMain.handle('set-secure-key', (_event, keyName: string, keyValue: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this platform.');
      }
      const encrypted = safeStorage.encryptString(keyValue);
      const currentSettings = loadSettings();
      if (!(currentSettings as any).secureKeys) {
        (currentSettings as any).secureKeys = {};
      }
      (currentSettings as any).secureKeys[keyName] = encrypted.toString('base64');
      saveSettings(currentSettings);
      return true;
    } catch (error) {
      console.error(`Failed to set secure key ${keyName}:`, error);
      return false;
    }
  });

  ipcMain.handle('get-secure-key', (_event, keyName: string) => {
    try {
      const currentSettings = loadSettings();
      const raw = (currentSettings as any).secureKeys?.[keyName];
      if (!raw) return null;
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this platform.');
      }
      const buf = Buffer.from(raw, 'base64');
      return safeStorage.decryptString(buf);
    } catch (error) {
      console.error(`Failed to get secure key ${keyName}:`, error);
      return null;
    }
  });

  // LLM Services
  ipcMain.handle('llm:check-health', async (_event, { provider, endpoint }) => {
    try {
      let apiKey = '';
      if (provider !== 'ollama') {
        const currentSettings = loadSettings();
        const raw = (currentSettings as any).secureKeys?.[provider];
        if (raw && safeStorage.isEncryptionAvailable()) {
          const buf = Buffer.from(raw, 'base64');
          apiKey = safeStorage.decryptString(buf);
        } else {
          console.warn(`[IPC] No encrypted key found in settings for provider "${provider}" or encryption unavailable.`);
        }
      }
      const { checkAIHealth } = require('./aiService');
      return await checkAIHealth(provider, endpoint, apiKey);
    } catch (error) {
      console.error('[IPC] Failed checking AI health:', error);
      return false;
    }
  });

  ipcMain.handle('llm:generate-issue', async (_event, { provider, model, prompt, imageBase64, endpoint }) => {
    try {
      let apiKey = '';
      if (provider !== 'ollama') {
        const currentSettings = loadSettings();
        const raw = (currentSettings as any).secureKeys?.[provider];
        if (raw && safeStorage.isEncryptionAvailable()) {
          const buf = Buffer.from(raw, 'base64');
          apiKey = safeStorage.decryptString(buf);
        }
      }
      const { generateAIResponse } = require('./aiService');
      return await generateAIResponse(provider, model, prompt, imageBase64, endpoint, apiKey);
    } catch (error) {
      console.error('Failed generating AI response:', error);
      throw error;
    }
  });

  // External URL
  ipcMain.on('url:open', (_event, url) => {
    shell.openExternal(url);
  });

  // Screen capture trigger from renderer
  ipcMain.on('capture:trigger', () => {
    triggerOSScreenCapture();
  });

  // File APIs
  ipcMain.handle('file:open-dialog', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';

    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  });

  ipcMain.handle('file:save-dialog', async (_event, { base64Data, type }) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return false;

    const ext = type === 'jpeg' ? 'jpg' : 'png';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Beautified Screenshot',
      defaultPath: `achu-export.${ext}`,
      filters: [
        { name: type === 'jpeg' ? 'JPEG Image' : 'PNG Image', extensions: [ext] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    
    fs.writeFileSync(result.filePath, buffer);
    return true;
  });

  // Clipboard APIs
  ipcMain.handle('clipboard:copy-image', async (_event, base64Data) => {
    try {
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');
      
      const nativeImage = require('electron').nativeImage.createFromBuffer(buffer);
      clipboard.writeImage(nativeImage);

      // Read back immediately to get the exact OS-converted bitmap bytes
      const readBackImage = clipboard.readImage();
      if (!readBackImage.isEmpty()) {
        setIgnoreNextClipboardImage(readBackImage.getBitmap());
      }
      
      return true;
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
      return false;
    }
  });

  ipcMain.handle('clipboard:read-image', () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) return null;
    return image.toDataURL();
  });
}
