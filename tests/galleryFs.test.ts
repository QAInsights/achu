import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statfsSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

vi.mock('electron', () => ({
  shell: {
    showItemInFolder: vi.fn(),
    openPath: vi.fn().mockResolvedValue(''),
  },
  clipboard: {
    writeImage: vi.fn(),
  },
  nativeImage: {
    createFromBuffer: vi.fn().mockReturnValue({ isEmpty: vi.fn().mockReturnValue(false) }),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: class {},
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: vi.fn(),
  getDefaultGalleryFolder: vi.fn().mockReturnValue('/home/user/achu-screenshots'),
}));

vi.mock('../src/main/gallery/galleryTrash', () => ({
  moveToTrash: vi.fn(),
  purgeTrash: vi.fn().mockReturnValue(0),
}));

vi.mock('../src/main/gallery/galleryProject', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/main/gallery/galleryProject')>();
  return {
    ...actual,
    moveProjectBundleToTrash: vi.fn(),
    writeGalleryProject: vi.fn().mockReturnValue({ success: true }),
  };
});

vi.mock('../src/main/imageCompression', () => ({
  compressImageBuffer: vi.fn().mockImplementation(async (buf: Buffer) => buf),
  decodeImageDataUrl: vi.fn().mockReturnValue(Buffer.from('decoded-image')),
  loadSharp: vi.fn().mockReturnValue(vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
  })),
}));

vi.mock('sharp', () => {
  const mockSharp = vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('thumbnail-data')),
  });
  return { default: mockSharp };
});

import { shell, clipboard, dialog } from 'electron';
import { loadSettings } from '../src/main/settings';
import { purgeTrash } from '../src/main/gallery/galleryTrash';
import { moveProjectBundleToTrash, writeGalleryProject } from '../src/main/gallery/galleryProject';
import { compressImageBuffer, decodeImageDataUrl } from '../src/main/imageCompression';

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
} from '../src/main/gallery/galleryFs';

const GALLERY_DIR = '/home/user/achu-screenshots';

function makeEntry(name: string, isFile = true) {
  return { name, isFile: () => isFile, isDirectory: () => !isFile };
}

function makeStat(size: number, mtimeMs: number) {
  return { size, mtimeMs };
}

describe('galleryFs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- getGalleryFolder ---
  describe('getGalleryFolder', () => {
    it('returns settings.galleryFolder when set', () => {
      vi.mocked(loadSettings).mockReturnValue({ galleryFolder: '/custom/path' } as any);
      expect(getGalleryFolder()).toBe('/custom/path');
    });

    it('falls back to getDefaultGalleryFolder when not set', () => {
      vi.mocked(loadSettings).mockReturnValue({} as any);
      expect(getGalleryFolder()).toBe('/home/user/achu-screenshots');
    });
  });

  // --- ensureGalleryDir ---
  describe('ensureGalleryDir', () => {
    it('returns success with dir path', () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      const result = ensureGalleryDir(GALLERY_DIR);
      expect(result).toEqual({ success: true, data: GALLERY_DIR });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(GALLERY_DIR, { recursive: true });
    });

    it('returns EACCES error as PERMISSION_DENIED', () => {
      const err = Object.assign(new Error('Access denied'), { code: 'EACCES' });
      vi.mocked(mockFs.mkdirSync).mockImplementation(() => { throw err; });
      const result = ensureGalleryDir(GALLERY_DIR);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });

    it('returns ENOSPC error as DISK_FULL', () => {
      const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
      vi.mocked(mockFs.mkdirSync).mockImplementation(() => { throw err; });
      const result = ensureGalleryDir(GALLERY_DIR);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISK_FULL');
    });
  });

  // --- listGalleryItems ---
  describe('listGalleryItems', () => {
    it('returns empty array when directory does not exist', () => {
      vi.mocked(mockFs.existsSync).mockReturnValue(false);
      const result = listGalleryItems(GALLERY_DIR);
      expect(result).toEqual({ success: true, data: [] });
    });

    it('returns only image files, sorted by modified date descending', () => {
      vi.mocked(mockFs.existsSync).mockReturnValue(true);
      vi.mocked(mockFs.readdirSync).mockReturnValue([
        makeEntry('newer.png'),
        makeEntry('older.jpg'),
        makeEntry('readme.txt'),
        makeEntry('.achu-trash', false),
      ] as any);
      vi.mocked(mockFs.statSync)
        .mockReturnValueOnce(makeStat(1000, 2000)) // newer.png
        .mockReturnValueOnce(makeStat(2000, 1000)); // older.jpg

      const result = listGalleryItems(GALLERY_DIR);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].name).toBe('newer.png');
      expect(result.data![1].name).toBe('older.jpg');
      expect(purgeTrash).toHaveBeenCalledWith(GALLERY_DIR);
    });

    it('skips files whose statSync throws', () => {
      vi.mocked(mockFs.existsSync).mockReturnValue(true);
      vi.mocked(mockFs.readdirSync).mockReturnValue([
        makeEntry('good.png'),
        makeEntry('broken.png'),
      ] as any);
      vi.mocked(mockFs.statSync)
        .mockReturnValueOnce(makeStat(100, 500))
        .mockImplementationOnce(() => { throw new Error('ENOENT'); });

      const result = listGalleryItems(GALLERY_DIR);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('good.png');
    });

    it('survives purgeTrash throwing', () => {
      vi.mocked(mockFs.existsSync).mockReturnValue(true);
      vi.mocked(mockFs.readdirSync).mockReturnValue([] as any);
      vi.mocked(purgeTrash).mockImplementation(() => { throw new Error('boom'); });

      const result = listGalleryItems(GALLERY_DIR);
      expect(result.success).toBe(true);
    });

    it('returns error when readdirSync throws EACCES', () => {
      vi.mocked(mockFs.existsSync).mockReturnValue(true);
      const err = Object.assign(new Error('Access denied'), { code: 'EACCES' });
      vi.mocked(mockFs.readdirSync).mockImplementation(() => { throw err; });

      const result = listGalleryItems(GALLERY_DIR);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });
  });

  // --- saveGalleryItem ---
  describe('saveGalleryItem', () => {
    const base64 = 'data:image/png;base64,' + 'A'.repeat(100);

    it('saves PNG and returns success with path and name', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      vi.mocked(mockFs.writeFileSync).mockReturnValue(undefined);

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png');
      expect(result.success).toBe(true);
      expect(result.data?.name).toMatch(/^achu-\d{4}-\d{2}-\d{2}-\d{6}-\d{3}\.png$/);
      expect(result.data?.path).toContain(result.data!.name);
      expect(decodeImageDataUrl).toHaveBeenCalledWith(base64);
      expect(compressImageBuffer).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('saves JPEG with .jpg extension', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      vi.mocked(mockFs.writeFileSync).mockReturnValue(undefined);

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'jpeg', 85, 'balanced');
      expect(result.data?.name).toMatch(/\.jpg$/);
      expect(compressImageBuffer).toHaveBeenCalledWith(expect.any(Buffer), {
        type: 'jpeg', quality: 85, compressionMode: 'balanced'
      });
    });

    it('saves WebP with .webp extension', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      vi.mocked(mockFs.writeFileSync).mockReturnValue(undefined);

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'webp');
      expect(result.data?.name).toMatch(/\.webp$/);
    });

    it('returns EMPTY_IMAGE when the decoded image is empty', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      vi.mocked(decodeImageDataUrl).mockReturnValueOnce(Buffer.alloc(0));

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png');

      expect(result).toEqual({
        success: false,
        error: {
          code: 'EMPTY_IMAGE',
          message: 'Rendered image was empty (0 bytes); the canvas may have failed to render.',
        },
      });
      expect(compressImageBuffer).not.toHaveBeenCalled();
    });

    it('returns DISK_FULL error when checkDiskSpace fails', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
      vi.mocked(mockFs.statfsSync).mockImplementation(() => { throw err; });

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISK_FULL');
    });

    it('returns error when writeFileSync fails', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      const err = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
      vi.mocked(mockFs.writeFileSync).mockImplementation(() => { throw err; });

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PERMISSION_DENIED');
    });

    it('returns GalleryError when compressImageBuffer throws one', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      const { GalleryError } = await import('../src/main/gallery/galleryValidation');
      vi.mocked(compressImageBuffer).mockRejectedValueOnce(new GalleryError('UNKNOWN', 'compression failed'));

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('compression failed');
    });
  });

  // --- deleteGalleryItem ---
  describe('deleteGalleryItem', () => {
    it('returns success when project bundle trash succeeds', () => {
      vi.mocked(moveProjectBundleToTrash).mockReturnValue(undefined);
      const filePath = GALLERY_DIR + '/image.png';
      const result = deleteGalleryItem(GALLERY_DIR, filePath);
      expect(result.success).toBe(true);
      expect(moveProjectBundleToTrash).toHaveBeenCalledWith(GALLERY_DIR, filePath);
    });

    it('returns PATH_TRAVERSAL error for path outside gallery', () => {
      const result = deleteGalleryItem(GALLERY_DIR, '/etc/passwd');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATH_TRAVERSAL');
      expect(moveProjectBundleToTrash).not.toHaveBeenCalled();
    });

    it('returns error when bundle trash throws', () => {
      const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
      vi.mocked(moveProjectBundleToTrash).mockImplementation(() => { throw err; });
      const result = deleteGalleryItem(GALLERY_DIR, GALLERY_DIR + '/image.png');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DISK_FULL');
    });
  });

  describe('saveGalleryItem with project bundle', () => {
    const base64 = 'data:image/png;base64,' + 'A'.repeat(100);

    it('writes project sidecar when project config is provided', async () => {
      vi.mocked(mockFs.mkdirSync).mockReturnValue(undefined);
      vi.mocked(mockFs.statfsSync).mockReturnValue({ bavail: 1000000, bsize: 4096 } as any);
      vi.mocked(mockFs.writeFileSync).mockReturnValue(undefined);

      const result = await saveGalleryItem(GALLERY_DIR, base64, 'png', undefined, undefined, {
        documentName: 'achu-2026-06-14-223900-123',
        projectConfig: { padding: 20 },
        sourceImageSrc: 'data:image/png;base64,source',
      });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('achu-2026-06-14-223900-123.png');
      expect(writeGalleryProject).toHaveBeenCalled();
    });
  });

  // --- readGalleryFile ---
  describe('readGalleryFile', () => {
    it('reads PNG and returns data URL with image/png MIME type', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('png-data'));
      const result = readGalleryFile(GALLERY_DIR, GALLERY_DIR + '/photo.png');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^data:image\/png;base64,/);
    });

    it('reads JPG and returns data URL with image/jpeg MIME type', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('jpg-data'));
      const result = readGalleryFile(GALLERY_DIR, GALLERY_DIR + '/photo.jpg');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('reads JPEG and returns data URL with image/jpeg MIME type', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('jpeg-data'));
      const result = readGalleryFile(GALLERY_DIR, GALLERY_DIR + '/photo.jpeg');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('reads WebP and returns data URL with image/webp MIME type', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('webp-data'));
      const result = readGalleryFile(GALLERY_DIR, GALLERY_DIR + '/photo.webp');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^data:image\/webp;base64,/);
    });

    it('returns PATH_TRAVERSAL error for path outside gallery', () => {
      const result = readGalleryFile(GALLERY_DIR, '/etc/shadow');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATH_TRAVERSAL');
      expect(mockFs.readFileSync).not.toHaveBeenCalled();
    });

    it('returns error when readFileSync throws', () => {
      const err = Object.assign(new Error('Not found'), { code: 'ENOENT' });
      vi.mocked(mockFs.readFileSync).mockImplementation(() => { throw err; });
      const result = readGalleryFile(GALLERY_DIR, GALLERY_DIR + '/missing.png');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  // --- copyGalleryToClipboard ---
  describe('copyGalleryToClipboard', () => {
    it('reads file and writes to clipboard', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('img'));
      const result = copyGalleryToClipboard(GALLERY_DIR, GALLERY_DIR + '/img.png');
      expect(result.success).toBe(true);
      expect(clipboard.writeImage).toHaveBeenCalled();
    });

    it('returns PATH_TRAVERSAL error for path outside gallery', () => {
      const result = copyGalleryToClipboard(GALLERY_DIR, '/tmp/evil.png');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATH_TRAVERSAL');
    });

    it('returns error when clipboard operation fails', () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('img'));
      vi.mocked(clipboard.writeImage).mockImplementation(() => { throw new Error('clipboard fail'); });
      const result = copyGalleryToClipboard(GALLERY_DIR, GALLERY_DIR + '/img.png');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // --- openInExplorer ---
  describe('openInExplorer', () => {
    it('calls shell.showItemInFolder', () => {
      const result = openInExplorer(GALLERY_DIR, GALLERY_DIR + '/img.png');
      expect(result.success).toBe(true);
      expect(shell.showItemInFolder).toHaveBeenCalledWith(GALLERY_DIR + '/img.png');
    });

    it('returns PATH_TRAVERSAL error for path outside gallery', () => {
      const result = openInExplorer(GALLERY_DIR, '/etc/passwd');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATH_TRAVERSAL');
      expect(shell.showItemInFolder).not.toHaveBeenCalled();
    });
  });

  // --- openGalleryFolderInExplorer ---
  describe('openGalleryFolderInExplorer', () => {
    it('calls shell.openPath', async () => {
      const result = await openGalleryFolderInExplorer(GALLERY_DIR);
      expect(result.success).toBe(true);
      expect(shell.openPath).toHaveBeenCalledWith(GALLERY_DIR);
    });

    it('returns error when shell.openPath throws', async () => {
      vi.mocked(shell.openPath).mockImplementation(() => { throw new Error('fail'); });
      const result = await openGalleryFolderInExplorer(GALLERY_DIR);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // --- generateThumbnail ---
  describe('generateThumbnail', () => {
    it('returns JPEG base64 thumbnail', async () => {
      vi.mocked(mockFs.readFileSync).mockReturnValue(Buffer.from('image-data'));
      const result = await generateThumbnail(GALLERY_DIR, GALLERY_DIR + '/photo.png');
      expect(result.success).toBe(true);
      expect(result.data).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('returns PATH_TRAVERSAL error for path outside gallery', async () => {
      const result = await generateThumbnail(GALLERY_DIR, '/etc/passwd');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PATH_TRAVERSAL');
    });
  });

  // --- chooseGalleryFolder ---
  describe('chooseGalleryFolder', () => {
    it('returns null when mainWindow is null', async () => {
      const result = await chooseGalleryFolder(null);
      expect(result).toBeNull();
    });

    it('returns path when dialog succeeds', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false, filePaths: ['/new/gallery'], bookmarks: []
      });
      const result = await chooseGalleryFolder({} as any);
      expect(result).toBe('/new/gallery');
    });

    it('returns null when dialog is canceled', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true, filePaths: [], bookmarks: []
      });
      const result = await chooseGalleryFolder({} as any);
      expect(result).toBeNull();
    });

    it('returns null when filePaths is empty', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false, filePaths: [], bookmarks: []
      });
      const result = await chooseGalleryFolder({} as any);
      expect(result).toBeNull();
    });
  });
});
