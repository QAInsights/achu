import { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut, shell, Tray, Menu, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { registerUpdaterHandlers } from './updater';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Default Settings
interface AppSettings {
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  lastConfig: {
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
    backgroundType: 'color' | 'gradient' | 'blur';
    backgroundValue: string;
    aspectRatio: string;
    canvasWidth: number;
    canvasHeight: number;
    paddingMode: 'fit' | 'fill';
    chromeStyle: 'mac' | 'windows' | 'none';
    watermarkEnabled: boolean;
    watermarkText: string;
    position: string;
  };
  presets: Array<{
    id: string;
    name: string;
    gradient?: string;
    color?: string;
    type: 'color' | 'gradient';
  }>;
}

const defaultSettings: AppSettings = {
  windowBounds: {
    width: 1200,
    height: 800,
  },
  lastConfig: {
    padding: 38,
    rounded: 20,
    shadow: 30,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowEnabled: true,
    inset: 0,
    insetColor: 'rgba(255, 255, 255, 0.2)',
    border: 0,
    borderColor: '#ffffff',
    scale: 100,
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    aspectRatio: 'Auto',
    canvasWidth: 800,
    canvasHeight: 600,
    paddingMode: 'fit',
    chromeStyle: 'mac',
    watermarkEnabled: false,
    watermarkText: 'achu',
    position: 'Middle center',
  },
  presets: [],
};

// Load settings from disk
function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return defaultSettings;
}

// Save settings to disk
function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

function createWindow(settings: AppSettings) {
  const { width, height, x, y } = settings.windowBounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0b0f19',
    show: false,
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'assets/icon.ico')
      : process.platform === 'darwin' ? path.join(__dirname, 'assets/icon.icns')
      : path.join(__dirname, 'assets/icon-256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' || process.platform === 'win32' ? 'hidden' : 'default',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#0b0f19',
      symbolColor: '#9699a3',
      height: 32
    } : false,
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Hide default menu bar by default, toggleable via Alt key
  mainWindow.setAutoHideMenuBar(true);
  mainWindow.setMenuBarVisibility(false);

  // Load URL
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window dimensions on close or resize
  const saveWindowBounds = () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    const currentSettings = loadSettings();
    currentSettings.windowBounds = bounds;
    saveSettings(currentSettings);
  };

  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('move', saveWindowBounds);

  mainWindow.on('closed', () => {
    mainWindow = null;
    tray = null;
  });

  // Minimize / close to tray on Windows & Linux
  if (process.platform === 'win32' || process.platform === 'linux') {
    mainWindow.on('minimize', () => {
      mainWindow?.hide();
      createTray();
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
        createTray();
      }
    });
  }
}

function getTrayIconPath(): string {
  return path.join(__dirname, 'assets/icon-16.png');
}

function createTray() {
  if (tray) return;
  tray = new Tray(getTrayIconPath());
  tray.setToolTip('achu');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show achu',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        if (mainWindow) mainWindow.destroy();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Handle clipboard screenshot capturing
function pasteFromClipboard() {
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    if (mainWindow) {
      mainWindow.webContents.send('hotkey:triggered', dataUrl);
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  }
}

app.whenReady().then(() => {
  const settings = loadSettings();
  createWindow(settings);

  // Build standard Application Menu to support zoom and typical electron shortcuts
  const template: any[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Register Global Hotkey (CommandOrControl+Alt+V)
  globalShortcut.register('CommandOrControl+Alt+V', () => {
    pasteFromClipboard();
  });

  // Register Auto-Updater IPC Handlers
  registerUpdaterHandlers(ipcMain, () => mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(loadSettings());
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (isQuitting) {
      app.quit();
    }
    // On Windows/Linux: window may be hidden to tray; don't quit automatically
  }
});

// IPC IPC Main Handlers
ipcMain.on('theme:changed', (_event, theme) => {
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
  return true;
});

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

ipcMain.on('url:open', (_event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('file:open-dialog', async () => {
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

  // Remove the base64 prefix if present
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Content, 'base64');
  
  fs.writeFileSync(result.filePath, buffer);
  return true;
});

ipcMain.handle('clipboard:copy-image', async (_event, base64Data) => {
  try {
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Create native image from buffer
    const nativeImage = require('electron').nativeImage.createFromBuffer(buffer);
    clipboard.writeImage(nativeImage);
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

// Trigger dev server restart after presets update
