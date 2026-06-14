import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { loadSettings, saveSettings } from '../settings';
import {
  getGalleryFolder,
  ensureGalleryDir,
  listGalleryItems,
  saveGalleryItem,
  deleteGalleryItem,
  readGalleryFile,
  copyGalleryToClipboard,
  openInExplorer,
  openGalleryFolderInExplorer,
  chooseGalleryFolder,
  generateThumbnail,
} from './galleryFs';

export function registerGalleryIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('gallery:ensure-dir', () => {
    const dir = getGalleryFolder();
    return ensureGalleryDir(dir);
  });

  ipcMain.handle('gallery:get-folder', () => {
    return getGalleryFolder();
  });

  ipcMain.handle('gallery:set-folder', (_event, folderPath: string) => {
    try {
      if (!folderPath || typeof folderPath !== 'string') {
        return { success: false, error: { code: 'INVALID_PATH', message: 'Folder path must be a non-empty string' } };
      }
      const resolved = path.resolve(folderPath);
      // Verify the path is absolute
      if (!path.isAbsolute(resolved)) {
        return { success: false, error: { code: 'INVALID_PATH', message: 'Folder path must be absolute' } };
      }
      const settings = loadSettings();
      settings.galleryFolder = resolved;
      saveSettings(settings);
      fs.mkdirSync(resolved, { recursive: true });
      return { success: true };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'EACCES' || e.code === 'EPERM') {
        return { success: false, error: { code: 'PERMISSION_DENIED', message: `Cannot create folder: ${e.message}` } };
      }
      return { success: false, error: { code: 'UNKNOWN', message: String(err) } };
    }
  });

  ipcMain.handle('gallery:choose-folder', async () => {
    const mainWindow = getMainWindow();
    return chooseGalleryFolder(mainWindow);
  });

  ipcMain.handle('gallery:list', () => {
    const dir = getGalleryFolder();
    return listGalleryItems(dir);
  });

  ipcMain.handle('gallery:save', async (_event, { base64Data, type, quality, compressionMode }) => {
    if (!base64Data || typeof base64Data !== 'string') {
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Missing or invalid base64 data' } };
    }
    // Reject payloads over 100MB (base64 is ~33% larger than raw)
    const MAX_PAYLOAD = 100 * 1024 * 1024;
    if (base64Data.length > MAX_PAYLOAD) {
      const sizeMb = ((base64Data.length * 0.75) / (1024 * 1024)).toFixed(1);
      return { success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: `Image too large (${sizeMb} MB). Reduce quality or padding.` } };
    }
    const dir = getGalleryFolder();
    return saveGalleryItem(dir, base64Data, type, quality, compressionMode);
  });

  ipcMain.handle('gallery:delete', (_event, filePath: string) => {
    const dir = getGalleryFolder();
    return deleteGalleryItem(dir, filePath);
  });

  ipcMain.handle('gallery:open-in-explorer', (_event, filePath: string) => {
    const dir = getGalleryFolder();
    return openInExplorer(dir, filePath);
  });

  ipcMain.handle('gallery:open-folder', async () => {
    const dir = getGalleryFolder();
    return openGalleryFolderInExplorer(dir);
  });

  ipcMain.handle('gallery:read-file', (_event, filePath: string) => {
    const dir = getGalleryFolder();
    return readGalleryFile(dir, filePath);
  });

  ipcMain.handle('gallery:thumbnail', async (_event, filePath: string, width?: number) => {
    const dir = getGalleryFolder();
    return generateThumbnail(dir, filePath, width);
  });

  ipcMain.handle('gallery:copy-to-clipboard', (_event, filePath: string) => {
    const dir = getGalleryFolder();
    return copyGalleryToClipboard(dir, filePath);
  });
}
