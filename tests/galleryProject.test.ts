import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

vi.mock('../src/main/gallery/galleryTrash', () => ({
  moveToTrash: vi.fn(),
}));

vi.mock('../src/main/imageCompression', () => ({
  decodeImageDataUrl: vi.fn().mockReturnValue(Buffer.from('source-image')),
}));

import { moveToTrash } from '../src/main/gallery/galleryTrash';
import {
  getProjectBundlePaths,
  readGalleryProject,
  writeGalleryProject,
  moveProjectBundleToTrash,
} from '../src/main/gallery/galleryProject';

const GALLERY_DIR = '/home/user/achu-screenshots';
const STEM = 'achu-2026-06-14-223900-123';

describe('galleryProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns bundle paths for a stem', () => {
    const paths = getProjectBundlePaths(GALLERY_DIR, STEM);
    expect(paths.sidecar).toBe(path.join(GALLERY_DIR, `${STEM}.achu.json`));
    expect(paths.source).toBe(path.join(GALLERY_DIR, `${STEM}-source.png`));
  });

  it('writes sidecar and source files', () => {
    const result = writeGalleryProject(
      GALLERY_DIR,
      STEM,
      `${STEM}.png`,
      { padding: 20, annotations: [], imageSrc: 'data:image/png;base64,abc' },
      'data:image/png;base64,abc'
    );

    expect(result.success).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    const sidecarPayload = JSON.parse(String(mockFs.writeFileSync.mock.calls[1][1]));
    expect(sidecarPayload.documentName).toBe(STEM);
    expect(sidecarPayload.config.imageSrc).toBeUndefined();
    expect(sidecarPayload.sourceFile).toBe(`${STEM}-source.png`);
  });

  it('writes sidecar without source file when sourceImageSrc is null', () => {
    mockFs.existsSync.mockReturnValue(false);
    const result = writeGalleryProject(
      GALLERY_DIR,
      STEM,
      `${STEM}.png`,
      { padding: 20, annotations: [], imageSrc: null },
      null
    );

    expect(result.success).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    const sidecarPayload = JSON.parse(String(mockFs.writeFileSync.mock.calls[0][1]));
    expect(sidecarPayload.documentName).toBe(STEM);
    expect(sidecarPayload.config.imageSrc).toBeUndefined();
    expect(sidecarPayload.sourceFile).toBeUndefined();
  });

  it('reads project and rehydrates source image', () => {
    const sidecar = {
      version: 1,
      documentName: STEM,
      exportFile: `${STEM}.png`,
      sourceFile: `${STEM}-source.png`,
      config: { padding: 20, annotations: [] },
    };

    vi.mocked(mockFs.existsSync).mockImplementation((p) => {
      const pathStr = String(p);
      return pathStr.endsWith('.achu.json') || pathStr.endsWith('-source.png');
    });
    vi.mocked(mockFs.readFileSync).mockImplementation((p) => {
      const pathStr = String(p);
      if (pathStr.endsWith('.achu.json')) return JSON.stringify(sidecar);
      return Buffer.from('png-bytes');
    });

    const result = readGalleryProject(GALLERY_DIR, `${GALLERY_DIR}/${STEM}.png`);
    expect(result.success).toBe(true);
    expect(result.data?.hasProject).toBe(true);
    expect(result.data?.documentName).toBe(STEM);
    expect(result.data?.imageSrc).toMatch(/^data:image\/png;base64,/);
  });

  it('returns hasProject false when sidecar is missing', () => {
    vi.mocked(mockFs.existsSync).mockReturnValue(false);
    const result = readGalleryProject(GALLERY_DIR, `${GALLERY_DIR}/${STEM}.png`);
    expect(result.success).toBe(true);
    expect(result.data?.hasProject).toBe(false);
  });

  it('moves export, sidecar, and source files to trash', () => {
    vi.mocked(mockFs.existsSync).mockReturnValue(true);
    moveProjectBundleToTrash(GALLERY_DIR, `${GALLERY_DIR}/${STEM}.png`);
    expect(moveToTrash).toHaveBeenCalledTimes(3);
  });
});