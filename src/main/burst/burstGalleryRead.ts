import * as fs from 'fs';
import * as path from 'path';
import { ACHU_PROJECT_EXT, ACHU_SOURCE_SUFFIX } from '../../shared/galleryNaming';
import { validateGalleryPath, classifyFsError, GalleryError } from '../gallery/galleryValidation';
import type { GalleryResult } from '../gallery/galleryFs';
import type { GalleryProjectReadResult } from '../gallery/galleryProject';
import { isBurstBundleDir } from './burstGalleryExt';
import { moveToTrash } from '../gallery/galleryTrash';

export function tryReadBurstGalleryProject(
  galleryDir: string,
  exportFilePath: string
): GalleryResult<GalleryProjectReadResult> | null {
  try {
    validateGalleryPath(galleryDir, exportFilePath);
    const bundleDir = path.dirname(exportFilePath);
    if (path.resolve(bundleDir) === path.resolve(galleryDir)) return null;
    if (!isBurstBundleDir(bundleDir)) return null;

    const stem = path.basename(bundleDir);
    const sidecar = path.join(bundleDir, `${stem}${ACHU_PROJECT_EXT}`);
    if (!fs.existsSync(sidecar)) {
      return { success: true, data: { hasProject: false } };
    }

    const project = JSON.parse(fs.readFileSync(sidecar, 'utf-8'));
    const sourcePath = project.sourceFile
      ? path.join(bundleDir, project.sourceFile)
      : path.join(bundleDir, `${stem}${ACHU_SOURCE_SUFFIX}.png`);

    let imageSrc: string | null = null;
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

export function deleteBurstBundle(galleryDir: string, exportFilePath: string): boolean {
  const bundleDir = path.dirname(exportFilePath);
  if (path.resolve(bundleDir) === path.resolve(galleryDir)) return false;
  if (!isBurstBundleDir(bundleDir)) return false;
  validateGalleryPath(galleryDir, exportFilePath);
  const entries = fs.readdirSync(bundleDir);
  for (const name of entries) {
    moveToTrash(galleryDir, path.join(bundleDir, name));
  }
  try {
    fs.rmdirSync(bundleDir);
  } catch {
    // non-fatal if trash moves left empty handling
  }
  return true;
}