import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BURST_MANIFEST_FILE } from '../src/shared/burstTypes';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  rmdirSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

vi.mock('../src/main/gallery/galleryTrash', () => ({
  moveToTrash: vi.fn(),
}));

import { moveToTrash } from '../src/main/gallery/galleryTrash';
import {
  buildBurstProjectFile,
  writeBurstSidecar,
  writeBurstSource,
  isBurstBundleDir,
} from '../src/main/burst/burstGalleryExt';
import { writeBurstManifest, readBurstManifest } from '../src/main/burst/burstManifest';
import { listBurstBundleItems } from '../src/main/burst/burstGalleryList';
import { tryReadBurstGalleryProject, deleteBurstBundle } from '../src/main/burst/burstGalleryRead';

const GALLERY_DIR = '/home/user/achu-screenshots';
const BUNDLE_DIR = `${GALLERY_DIR}/my-shot`;
const STEM = 'my-shot';

describe('burst main gallery helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  describe('burstGalleryExt', () => {
    it('buildBurstProjectFile strips burst-only config fields', () => {
      const project = buildBurstProjectFile(
        STEM,
        'variant-a.png',
        `${STEM}-source.png`,
        { padding: 40, imageSrc: 'data:image/png;base64,abc', forceCanvasSize: { width: 1, height: 1 } },
        {
          manifestFile: BURST_MANIFEST_FILE,
          variants: [
            { presetKey: 'A - 1', filename: 'variant-a.png', width: 100, height: 100, fileSizeKb: 1 },
          ],
        }
      );

      expect(project.documentName).toBe(STEM);
      expect(project.exportFile).toBe('variant-a.png');
      expect(project.config).toEqual({ padding: 40 });
      expect((project as { burstPack?: { variants: unknown[] } }).burstPack?.variants).toHaveLength(1);
    });

    it('writeBurstSidecar and writeBurstSource write expected files', () => {
      const project = buildBurstProjectFile(STEM, 'variant-a.png', undefined, {}, {
        manifestFile: BURST_MANIFEST_FILE,
        variants: [],
      });
      writeBurstSidecar(BUNDLE_DIR, STEM, project);
      const sourceFile = writeBurstSource(BUNDLE_DIR, STEM, Buffer.from('png'));

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(sourceFile).toBe(`${STEM}-source.png`);
      mockFs.existsSync.mockReturnValue(false);
      expect(isBurstBundleDir(BUNDLE_DIR)).toBe(false);
      mockFs.existsSync.mockReturnValue(true);
      expect(isBurstBundleDir(BUNDLE_DIR)).toBe(true);
    });
  });

  describe('burstManifest', () => {
    it('writes and reads manifest round-trip', () => {
      const variants = [
        {
          presetKey: 'Open Graph - OG Standard',
          filename: 'og.png',
          width: 1200,
          height: 630,
          fileSizeKb: 42,
        },
      ];

      writeBurstManifest(BUNDLE_DIR, STEM, variants);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          documentName: STEM,
          createdAt: '2026-06-14T00:00:00.000Z',
          variants,
        })
      );

      const manifest = readBurstManifest(BUNDLE_DIR);
      expect(manifest?.documentName).toBe(STEM);
      expect(manifest?.variants).toHaveLength(1);
    });

    it('returns null for missing or invalid manifest', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(readBurstManifest(BUNDLE_DIR)).toBeNull();

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not-json');
      expect(readBurstManifest(BUNDLE_DIR)).toBeNull();
    });
  });

  describe('listBurstBundleItems', () => {
    it('lists burst bundles with primary variant metadata', () => {
      mockFs.existsSync.mockImplementation((target: string) => {
        const path = String(target);
        if (path === GALLERY_DIR) return true;
        return path.includes(BURST_MANIFEST_FILE) || path.endsWith('og.png');
      });
      mockFs.readdirSync.mockReturnValue([{ name: STEM, isDirectory: () => true }] as never);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          documentName: STEM,
          createdAt: '2026-06-14T00:00:00.000Z',
          variants: [{ presetKey: 'OG', filename: 'og.png', width: 1200, height: 630, fileSizeKb: 1 }],
        })
      );
      mockFs.statSync.mockReturnValue({ size: 2048, mtimeMs: 1000 } as never);

      const items = listBurstBundleItems(GALLERY_DIR);
      expect(items).toHaveLength(1);
      expect(items[0].isBurstBundle).toBe(true);
      expect(items[0].burstVariantCount).toBe(1);
      expect(items[0].name).toBe(`${STEM}/`);
    });

    it('returns empty list when gallery dir is missing', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(listBurstBundleItems(GALLERY_DIR)).toEqual([]);
    });
  });

  describe('burstGalleryRead', () => {
    it('returns null for non-burst paths', () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = tryReadBurstGalleryProject(GALLERY_DIR, `${GALLERY_DIR}/plain.png`);
      expect(result).toBeNull();
    });

    it('returns null when export file is directly in gallery root', () => {
      const result = tryReadBurstGalleryProject(GALLERY_DIR, `${GALLERY_DIR}/plain.png`);
      expect(result).toBeNull();
    });

    it('reads burst sidecar and source image', () => {
      const exportPath = `${BUNDLE_DIR}/og.png`;
      mockFs.existsSync.mockImplementation((target: string) => {
        const path = String(target);
        return (
          path.includes(BURST_MANIFEST_FILE) ||
          path.endsWith('.achu.json') ||
          path.endsWith('-source.png')
        );
      });
      mockFs.readFileSync.mockImplementation((target: string) => {
        if (String(target).endsWith('.achu.json')) {
          return JSON.stringify({
            documentName: STEM,
            config: { padding: 20 },
            sourceFile: `${STEM}-source.png`,
          });
        }
        return Buffer.from('png-bytes');
      });

      const result = tryReadBurstGalleryProject(GALLERY_DIR, exportPath);
      expect(result?.success).toBe(true);
      expect(result?.data?.hasProject).toBe(true);
      expect(result?.data?.documentName).toBe(STEM);
      expect(result?.data?.imageSrc).toContain('data:image/png;base64,');
    });

    it('deletes burst bundle by moving files to trash', () => {
      const exportPath = `${BUNDLE_DIR}/og.png`;
      mockFs.existsSync.mockImplementation((target: string) => String(target).includes(BURST_MANIFEST_FILE));
      mockFs.readdirSync.mockReturnValue(['og.png', 'burst-manifest.json'] as never);
      mockFs.rmdirSync.mockReturnValue(undefined);

      const deleted = deleteBurstBundle(GALLERY_DIR, exportPath);
      expect(deleted).toBe(true);
      expect(moveToTrash).toHaveBeenCalledTimes(2);
    });

    it('does not delete when bundle dir is gallery root', () => {
      const deleted = deleteBurstBundle(GALLERY_DIR, `${GALLERY_DIR}/og.png`);
      expect(deleted).toBe(false);
      expect(moveToTrash).not.toHaveBeenCalled();
    });
  });
});