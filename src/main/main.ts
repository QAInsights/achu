import { app, BrowserWindow, ipcMain, dialog, clipboard, globalShortcut, shell, Tray, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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
    watermarkText: 'Achu',
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

// Generate a minimal 16x16 solid-color PNG for the tray icon
function createSolidPng(w: number, h: number, r: number, g: number, b: number, a = 255): Buffer {
  const { deflateSync } = require('zlib');
  const row = Buffer.alloc(1 + w * 4);
  row[0] = 0;
  for (let x = 0; x < w; x++) {
    row[1 + x * 4] = r;
    row[1 + x * 4 + 1] = g;
    row[1 + x * 4 + 2] = b;
    row[1 + x * 4 + 3] = a;
  }
  const raw = Buffer.alloc(row.length * h);
  for (let y = 0; y < h; y++) row.copy(raw, y * row.length);
  const compressed = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
  }
  const crc32 = (buf: Buffer): number => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function getTrayIconPath(): string {
  const iconPath = path.join(app.getPath('temp'), 'achu-tray-icon.png');
  if (!fs.existsSync(iconPath)) {
    fs.writeFileSync(iconPath, createSolidPng(16, 16, 0xC8, 0xFF, 0x00));
  }
  return iconPath;
}

function createTray() {
  if (tray) return;
  tray = new Tray(getTrayIconPath());
  tray.setToolTip('Achu');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Achu',
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

  // Register Global Hotkey (CommandOrControl+Alt+V)
  globalShortcut.register('CommandOrControl+Alt+V', () => {
    pasteFromClipboard();
  });

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
ipcMain.handle('settings:get', () => {
  return loadSettings();
});

ipcMain.handle('settings:set', (_event, newSettings) => {
  saveSettings(newSettings);
  return true;
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
