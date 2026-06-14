import * as fs from 'fs';
import * as path from 'path';
import { shell, clipboard, nativeImage, BrowserWindow, dialog } from 'electron';
import sharp from 'sharp';
import { compressImageBuffer, decodeImageDataUrl, CompressionMode, ExportImageType } from '../imageCompression';
import { loadSettings, getDefaultGalleryFolder } from '../settings';
import { moveToTrash, purgeTrash } from './galleryTrash';
import {
  classifyFsError,
  GalleryError,
  validateGalleryPath,
  estimateOutputSize,
  checkDiskSpace,
  IMAGE_EXTENSIONS
} from './galleryValidation';

export interface GalleryItem {
  name: string;
  path: string;
  size: number;
  modified: number;
  ext: string;
}

export interface GalleryResult<T = void> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export function getGalleryFolder(): string {
  const settings = loadSettings();
  return settings.galleryFolder || getDefaultGalleryFolder();
}

export function ensureGalleryDir(galleryDir: string): GalleryResult<string> {
  try {
    fs.mkdirSync(galleryDir, { recursive: true });
    return { success: true, data: galleryDir };
  } catch (err) {
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function listGalleryItems(galleryDir: string): GalleryResult<GalleryItem[]> {
  try {
    if (!fs.existsSync(galleryDir)) {
      return { success: true, data: [] };
    }

    const entries = fs.readdirSync(galleryDir, { withFileTypes: true });

    const items: GalleryItem[] = entries
      .filter((e) => {
        if (!e.isFile()) return false;
        return IMAGE_EXTENSIONS.has(path.extname(e.name).toLowerCase());
      })
      .map((e) => {
        const fullPath = path.join(galleryDir, e.name);
        try {
          const stat = fs.statSync(fullPath);
          return {
            name: e.name,
            path: fullPath,
            size: stat.size,
            modified: stat.mtimeMs,
            ext: path.extname(e.name).toLowerCase().replace('.', ''),
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is GalleryItem => item !== null)
      .sort((a, b) => b.modified - a.modified);

    // Side-effect: purge old trash on every list
    try { purgeTrash(galleryDir); } catch { /* non-fatal */ }

    return { success: true, data: items };
  } catch (err) {
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

function buildTimestampedFilename(galleryDir: string, ext: string): string {
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
  return path.join(galleryDir, `achu-${ts}.${ext}`);
}

export async function saveGalleryItem(
  galleryDir: string,
  base64Data: string,
  type: ExportImageType,
  quality?: number,
  compressionMode?: CompressionMode
): Promise<GalleryResult<{ path: string; name: string }>> {
  try {
    fs.mkdirSync(galleryDir, { recursive: true });

    // Pre-save disk space check
    const estimatedSize = estimateOutputSize(base64Data);
    checkDiskSpace(galleryDir, estimatedSize);

    const ext = type === 'jpeg' ? 'jpg' : type === 'webp' ? 'webp' : 'png';
    const outputPath = buildTimestampedFilename(galleryDir, ext);
    const filename = path.basename(outputPath);

    const buffer = decodeImageDataUrl(base64Data);
    const outputBuffer = await compressImageBuffer(buffer, {
      type,
      quality,
      compressionMode: compressionMode as CompressionMode | undefined,
    });

    fs.writeFileSync(outputPath, outputBuffer);
    return { success: true, data: { path: outputPath, name: filename } };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function deleteGalleryItem(galleryDir: string, filePath: string): GalleryResult {
  try {
    validateGalleryPath(galleryDir, filePath);
    moveToTrash(galleryDir, filePath);
    return { success: true };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function readGalleryFile(galleryDir: string, filePath: string): GalleryResult<string> {
  try {
    validateGalleryPath(galleryDir, filePath);
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    return { success: true, data: `data:${mimeType};base64,${buffer.toString('base64')}` };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function copyGalleryToClipboard(galleryDir: string, filePath: string): GalleryResult {
  try {
    validateGalleryPath(galleryDir, filePath);
    const buffer = fs.readFileSync(filePath);
    const img = nativeImage.createFromBuffer(buffer);
    clipboard.writeImage(img);
    return { success: true };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function openInExplorer(galleryDir: string, filePath: string): GalleryResult {
  try {
    validateGalleryPath(galleryDir, filePath);
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export async function openGalleryFolderInExplorer(galleryDir: string): Promise<GalleryResult> {
  try {
    const errMsg = await shell.openPath(galleryDir);
    if (errMsg) {
      return { success: false, error: { code: 'UNKNOWN', message: `Failed to open folder: ${errMsg}` } };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export async function generateThumbnail(galleryDir: string, filePath: string, width: number = 300): Promise<GalleryResult<string>> {
  try {
    validateGalleryPath(galleryDir, filePath);
    const buffer = fs.readFileSync(filePath);
    const thumbBuffer = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();
    return { success: true, data: `data:image/jpeg;base64,${thumbBuffer.toString('base64')}` };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export async function chooseGalleryFolder(mainWindow: BrowserWindow | null): Promise<string | null> {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose Gallery Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
}
