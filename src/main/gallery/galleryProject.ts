import * as fs from 'fs';
import * as path from 'path';
import {
  ACHU_PROJECT_EXT,
  ACHU_SOURCE_SUFFIX,
  buildAchuGalleryFilename,
  exportTypeToExt,
  getAchuProjectStem,
} from '../../shared/galleryNaming';
import { decodeImageDataUrl } from '../imageCompression';
import { classifyFsError, GalleryError, validateGalleryPath } from './galleryValidation';
import { moveToTrash } from './galleryTrash';
import type { GalleryResult } from './galleryFs';

export const GALLERY_PROJECT_VERSION = 1;

export interface GalleryProjectFile {
  version: number;
  documentName: string;
  exportFile: string;
  sourceFile?: string;
  config: Record<string, unknown>;
}

export interface GalleryProjectReadResult {
  hasProject: boolean;
  documentName?: string;
  config?: Record<string, unknown>;
  imageSrc?: string | null;
}

export function getProjectBundlePaths(galleryDir: string, stem: string) {
  return {
    sidecar: path.join(galleryDir, `${stem}${ACHU_PROJECT_EXT}`),
    source: path.join(galleryDir, `${stem}${ACHU_SOURCE_SUFFIX}.png`),
  };
}

function removeStaleExports(galleryDir: string, stem: string, keepFilename: string): void {
  const keepExt = path.extname(keepFilename).toLowerCase();
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    if (ext === keepExt) continue;
    const candidate = path.join(galleryDir, `${stem}${ext}`);
    if (!fs.existsSync(candidate)) continue;
    try {
      fs.unlinkSync(candidate);
    } catch {
      // non-fatal
    }
  }
}

export function writeGalleryProject(
  galleryDir: string,
  documentName: string,
  exportFilename: string,
  projectConfig: Record<string, unknown>,
  sourceImageSrc?: string | null
): GalleryResult {
  try {
    const stem = getAchuProjectStem(documentName);
    const { sidecar, source } = getProjectBundlePaths(galleryDir, stem);
    const { imageSrc: _omit, ...configWithoutImage } = projectConfig;

    let sourceFile: string | undefined;
    if (sourceImageSrc) {
      sourceFile = `${stem}${ACHU_SOURCE_SUFFIX}.png`;
      const sourceBuffer = decodeImageDataUrl(sourceImageSrc);
      fs.writeFileSync(source, sourceBuffer);
    } else if (fs.existsSync(source)) {
      try {
        fs.unlinkSync(source);
      } catch {
        // non-fatal
      }
    }

    const project: GalleryProjectFile = {
      version: GALLERY_PROJECT_VERSION,
      documentName: stem,
      exportFile: exportFilename,
      ...(sourceFile ? { sourceFile } : {}),
      config: configWithoutImage,
    };

    fs.writeFileSync(sidecar, JSON.stringify(project, null, 2), 'utf-8');
    removeStaleExports(galleryDir, stem, exportFilename);
    return { success: true };
  } catch (err) {
    console.error('[writeGalleryProject] Error writing gallery project:', err);
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function readGalleryProject(
  galleryDir: string,
  exportFilePath: string
): GalleryResult<GalleryProjectReadResult> {
  try {
    validateGalleryPath(galleryDir, exportFilePath);
    const stem = getAchuProjectStem(path.basename(exportFilePath));
    const { sidecar, source } = getProjectBundlePaths(galleryDir, stem);

    if (!fs.existsSync(sidecar)) {
      return { success: true, data: { hasProject: false } };
    }

    const raw = fs.readFileSync(sidecar, 'utf-8');
    const project = JSON.parse(raw) as GalleryProjectFile;

    let imageSrc: string | null = null;
    const sourcePath = project.sourceFile
      ? path.join(galleryDir, project.sourceFile)
      : source;

    if (fs.existsSync(sourcePath)) {
      validateGalleryPath(galleryDir, sourcePath);
      const buffer = fs.readFileSync(sourcePath);
      imageSrc = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return {
      success: true,
      data: {
        hasProject: true,
        documentName: project.documentName,
        config: project.config,
        imageSrc,
      },
    };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}

export function moveProjectBundleToTrash(galleryDir: string, exportFilePath: string): void {
  validateGalleryPath(galleryDir, exportFilePath);
  const stem = getAchuProjectStem(path.basename(exportFilePath));
  const { sidecar, source } = getProjectBundlePaths(galleryDir, stem);

  moveToTrash(galleryDir, exportFilePath);

  if (fs.existsSync(sidecar)) {
    moveToTrash(galleryDir, sidecar);
  }
  if (fs.existsSync(source)) {
    moveToTrash(galleryDir, source);
  }
}

export function resolveGalleryOutputPath(
  galleryDir: string,
  type: 'png' | 'jpeg' | 'webp',
  documentName?: string
): { outputPath: string; filename: string; stem: string } {
  const ext = exportTypeToExt(type);
  if (documentName) {
    const stem = getAchuProjectStem(documentName);
    const filename = `${stem}.${ext}`;
    return {
      outputPath: path.join(galleryDir, filename),
      filename,
      stem,
    };
  }

  const generated = buildAchuGalleryFilename(ext);
  return {
    outputPath: path.join(galleryDir, generated),
    filename: generated,
    stem: getAchuProjectStem(generated),
  };
}