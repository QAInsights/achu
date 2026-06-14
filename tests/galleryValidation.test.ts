import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  GalleryError,
  classifyFsError,
  validateGalleryPath,
  estimateOutputSize,
  IMAGE_EXTENSIONS
} from '../src/main/gallery/galleryValidation';

describe('GalleryError', () => {
  it('creates an error with code and message', () => {
    const err = new GalleryError('DISK_FULL', 'No space left');
    expect(err.code).toBe('DISK_FULL');
    expect(err.message).toBe('No space left');
    expect(err.name).toBe('GalleryError');
    expect(err instanceof Error).toBe(true);
  });

  it('serializes to JSON', () => {
    const err = new GalleryError('PERMISSION_DENIED', 'Access denied');
    const json = err.toJSON();
    expect(json).toEqual({ code: 'PERMISSION_DENIED', message: 'Access denied' });
  });
});

describe('classifyFsError', () => {
  it('classifies ENOSPC as DISK_FULL', () => {
    const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
    const result = classifyFsError(err);
    expect(result.code).toBe('DISK_FULL');
  });

  it('classifies EACCES as PERMISSION_DENIED', () => {
    const err = Object.assign(new Error('Access denied'), { code: 'EACCES' });
    const result = classifyFsError(err);
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('classifies EPERM as PERMISSION_DENIED', () => {
    const err = Object.assign(new Error('Not permitted'), { code: 'EPERM' });
    const result = classifyFsError(err);
    expect(result.code).toBe('PERMISSION_DENIED');
  });

  it('classifies ENOENT as NOT_FOUND', () => {
    const err = Object.assign(new Error('Not found'), { code: 'ENOENT' });
    const result = classifyFsError(err);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('classifies unknown errors as UNKNOWN', () => {
    const err = new Error('Something weird');
    const result = classifyFsError(err);
    expect(result.code).toBe('UNKNOWN');
  });
});

describe('validateGalleryPath', () => {
  const galleryDir = path.resolve('/home/user/achu-screenshots');

  it('allows paths inside the gallery directory', () => {
    expect(() => validateGalleryPath(galleryDir, path.join(galleryDir, 'image.png'))).not.toThrow();
  });

  it('allows the gallery directory itself', () => {
    expect(() => validateGalleryPath(galleryDir, galleryDir)).not.toThrow();
  });

  it('rejects paths outside the gallery directory', () => {
    expect(() => validateGalleryPath(galleryDir, '/home/user/other/file.png'))
      .toThrow(GalleryError);
  });

  it('rejects path traversal attempts', () => {
    expect(() => validateGalleryPath(galleryDir, path.join(galleryDir, '..', 'secret.txt')))
      .toThrow('Path escapes gallery directory');
  });

  it('rejects paths that share a prefix but escape', () => {
    expect(() => validateGalleryPath(galleryDir, galleryDir + '-evil/file.png'))
      .toThrow('Path escapes gallery directory');
  });
});

describe('estimateOutputSize', () => {
  it('estimates size from a base64 data URL', () => {
    const data = 'data:image/png;base64,' + 'A'.repeat(100);
    const size = estimateOutputSize(data);
    expect(size).toBe(75); // 100 * 3/4
  });

  it('handles raw base64 without header', () => {
    const data = 'A'.repeat(200);
    const size = estimateOutputSize(data);
    expect(size).toBe(150); // 200 * 3/4
  });

  it('returns 0 for empty data', () => {
    expect(estimateOutputSize('')).toBe(0);
  });
});

describe('IMAGE_EXTENSIONS', () => {
  it('includes png, jpg, jpeg, webp', () => {
    expect(IMAGE_EXTENSIONS.has('.png')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.jpg')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.jpeg')).toBe(true);
    expect(IMAGE_EXTENSIONS.has('.webp')).toBe(true);
  });

  it('excludes non-image extensions', () => {
    expect(IMAGE_EXTENSIONS.has('.gif')).toBe(false);
    expect(IMAGE_EXTENSIONS.has('.txt')).toBe(false);
    expect(IMAGE_EXTENSIONS.has('.bmp')).toBe(false);
  });
});
