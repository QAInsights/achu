import * as fs from 'fs';
import * as path from 'path';
import { classifyFsError, GalleryError } from './galleryValidation';

const TRASH_DIR_NAME = '.achu-trash';
const MAX_AGE_DAYS = 30;

export function getTrashDir(galleryDir: string): string {
  return path.join(galleryDir, TRASH_DIR_NAME);
}

function ensureTrashDir(galleryDir: string): string {
  const trashDir = getTrashDir(galleryDir);
  try {
    fs.mkdirSync(trashDir, { recursive: true });
  } catch (err) {
    throw classifyFsError(err);
  }
  return trashDir;
}

/**
 * Move a file from the gallery into the .achu-trash/ subfolder.
 * The trashed file is prefixed with a timestamp to avoid collisions.
 */
export function moveToTrash(galleryDir: string, filePath: string): void {
  const trashDir = ensureTrashDir(galleryDir);
  const basename = path.basename(filePath);
  const ts = Date.now();
  const trashPath = path.join(trashDir, `${ts}-${basename}`);
  try {
    fs.renameSync(filePath, trashPath);
  } catch (err) {
    // rename can fail across volumes — fall back to copy+delete
    try {
      fs.copyFileSync(filePath, trashPath);
      fs.unlinkSync(filePath);
    } catch (fallbackErr) {
      throw classifyFsError(fallbackErr);
    }
  }
}

/**
 * Delete files in .achu-trash/ that are older than `maxAgeDays`.
 * Silently skips files that can't be deleted.
 */
export function purgeTrash(galleryDir: string, maxAgeDays: number = MAX_AGE_DAYS): number {
  const trashDir = getTrashDir(galleryDir);
  if (!fs.existsSync(trashDir)) return 0;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let purged = 0;

  try {
    const entries = fs.readdirSync(trashDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(trashDir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fullPath);
          purged++;
        }
      } catch {
        // skip files we can't stat or delete
      }
    }
  } catch (err) {
    // trash dir read failure is non-fatal
    if (!(err instanceof GalleryError)) {
      console.error('[gallery:purgeTrash]', err);
    }
  }

  return purged;
}
