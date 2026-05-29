import { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const isDev = process.env.NODE_ENV === 'development';
let mainWindow: BrowserWindow | null = null;
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
    watermarkText: 'SnapFrame.app',
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
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
  });
}

// Handle clipboard screenshot capturing
function pasteFromClipboard() {
  const image = clipboard.readImage();
  if (!image.isEmpty()) {
    const dataUrl = image.toDataURL();
    if (mainWindow) {
      mainWindow.webContents.send('hotkey:triggered', dataUrl);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  }
}

app.whenReady().then(() => {
  const settings = loadSettings();
  createWindow(settings);

  // Register Global Hotkey (CommandOrControl+Alt+V)
  globalShortcut.register('CommandOrControl+Alt+V', () => {
    pasteFromClipboard();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(loadSettings());
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC IPC Main Handlers
ipcMain.handle('settings:get', () => {
  return loadSettings();
});

ipcMain.handle('settings:set', (_event, newSettings) => {
  saveSettings(newSettings);
  return true;
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

ipcMain.handle('file:save-dialog', async (_event, { base64Data, type, quality }) => {
  if (!mainWindow) return false;

  const ext = type === 'jpeg' ? 'jpg' : 'png';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Beautified Screenshot',
    defaultPath: `snapframe-export.${ext}`,
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
