import * as fs from 'fs';
import * as path from 'path';

export type GalleryErrorCode =
  | 'DISK_FULL'
  | 'EMPTY_IMAGE'
  | 'PERMISSION_DENIED'
  | 'PATH_TRAVERSAL'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export class GalleryError extends Error {
  public readonly code: GalleryErrorCode;

  constructor(code: GalleryErrorCode, message: string) {
    super(message);
    this.name = 'GalleryError';
    this.code = code;
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

export function classifyFsError(err: unknown): GalleryError {
  const e = err as NodeJS.ErrnoException;
  if (e.code === 'ENOSPC') {
    return new GalleryError('DISK_FULL', `Not enough disk space: ${e.message}`);
  }
  if (e.code === 'EACCES' || e.code === 'EPERM') {
    return new GalleryError('PERMISSION_DENIED', `Permission denied: ${e.message}`);
  }
  if (e.code === 'ENOENT') {
    return new GalleryError('NOT_FOUND', `File or directory not found: ${e.message}`);
  }
  return new GalleryError('UNKNOWN', e.message || String(err));
}

export function validateGalleryPath(galleryDir: string, filePath: string): void {
  const resolvedDir = path.resolve(galleryDir);
  const resolvedFile = path.resolve(filePath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    throw new GalleryError('PATH_TRAVERSAL', `Path escapes gallery directory: ${filePath}`);
  }
}

/**
 * Estimate output file size from a base64 data URL.
 * Base64 encodes 3 bytes into 4 characters, so raw bytes ≈ (base64Len * 3/4).
 * After compression the result is typically smaller, so we use the raw estimate
 * as a conservative upper bound.
 */
export function estimateOutputSize(base64Data: string): number {
  const headerIdx = base64Data.indexOf(',');
  const payload = headerIdx >= 0 ? base64Data.slice(headerIdx + 1) : base64Data;
  return Math.ceil((payload.length * 3) / 4);
}

/**
 * Check whether the filesystem hosting `dir` has at least `requiredBytes` free.
 * Throws a GalleryError('DISK_FULL') if not.
 */
export function checkDiskSpace(dir: string, requiredBytes: number): void {
  try {
    const stat = fs.statfsSync(dir);
    const freeBytes = stat.bavail * stat.bsize;
    if (freeBytes < requiredBytes) {
      const needMb = (requiredBytes / (1024 * 1024)).toFixed(1);
      const haveMb = (freeBytes / (1024 * 1024)).toFixed(1);
      throw new GalleryError(
        'DISK_FULL',
        `Not enough disk space (need ~${needMb} MB, have ~${haveMb} MB)`
      );
    }
  } catch (err) {
    if (err instanceof GalleryError) throw err;
    // statfs not available on all platforms — skip check rather than block
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOSYS' || e.code === 'EPERM') return;
    throw classifyFsError(err);
  }
}

export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
