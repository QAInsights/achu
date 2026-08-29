import * as fs from 'fs';
import * as path from 'path';
import { shell, clipboard, nativeImage, BrowserWindow, dialog } from 'electron';
import { compressImageBuffer, decodeImageDataUrl, loadSharp, CompressionMode, ExportImageType } from '../imageCompression';
import { loadSettings, getDefaultGalleryFolder } from '../settings';
import { isGallerySourceFile } from '../../shared/galleryNaming';
import { moveProjectBundleToTrash, readGalleryProject, resolveGalleryOutputPath, writeGalleryProject } from './galleryProject';
import { listBurstBundleItems } from '../burst/burstGalleryList';
import { deleteBurstBundle } from '../burst/burstGalleryRead';
import { purgeTrash } from './galleryTrash';
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
  isBurstBundle?: boolean;
  burstVariantCount?: number;
  bundlePath?: string;
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
        if (isGallerySourceFile(e.name)) return false;
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
      .filter((item): item is GalleryItem => item !== null);

    const burstItems = listBurstBundleItems(galleryDir);
    const merged = [...burstItems, ...items].sort((a, b) => b.modified - a.modified);

    // Side-effect: purge old trash on every list
    try { purgeTrash(galleryDir); } catch { /* non-fatal */ }

    return { success: true, data: merged };
  } catch (err) {
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export async function saveGalleryItem(
  galleryDir: string,
  base64Data: string,
  type: ExportImageType,
  quality?: number,
  compressionMode?: CompressionMode,
  options?: {
    documentName?: string;
    projectConfig?: Record<string, unknown>;
    sourceImageSrc?: string | null;
  }
): Promise<GalleryResult<{ path: string; name: string; documentName: string }>> {
  try {
    fs.mkdirSync(galleryDir, { recursive: true });

    // Pre-save disk space check
    const estimatedSize = estimateOutputSize(base64Data);
    checkDiskSpace(galleryDir, estimatedSize);

    const { outputPath, filename, stem } = resolveGalleryOutputPath(
      galleryDir,
      type,
      options?.documentName
    );

    const buffer = decodeImageDataUrl(base64Data);
    if (buffer.length === 0) {
      throw new GalleryError(
        'EMPTY_IMAGE',
        'Rendered image was empty (0 bytes); the canvas may have failed to render.'
      );
    }

    const outputBuffer = await compressImageBuffer(buffer, {
      type,
      quality,
      compressionMode: compressionMode as CompressionMode | undefined,
    });

    fs.writeFileSync(outputPath, outputBuffer);

    if (options?.projectConfig) {
      const projectResult = writeGalleryProject(
        galleryDir,
        stem,
        filename,
        options.projectConfig,
        options.sourceImageSrc
      );
      if (!projectResult.success) {
        return { success: false, error: projectResult.error };
      }
    }

    return { success: true, data: { path: outputPath, name: filename, documentName: stem } };
  } catch (err) {
    console.error('[saveGalleryItem] Error saving gallery item:', err);
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export { readGalleryProject };

export function deleteGalleryItem(galleryDir: string, filePath: string): GalleryResult {
  try {
    validateGalleryPath(galleryDir, filePath);
    if (deleteBurstBundle(galleryDir, filePath)) {
      return { success: true };
    }
    moveProjectBundleToTrash(galleryDir, filePath);
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
    const sharp = loadSharp();
    if (!sharp) {
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      return { success: true, data: `data:${mimeType};base64,${buffer.toString('base64')}` };
    }

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
