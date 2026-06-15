import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BurstPackSavePayload } from '../src/shared/burstTypes';

const mockFs = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statfsSync: vi.fn(),
  statSync: vi.fn(),
  rmdirSync: vi.fn(),
}));

vi.mock('fs', () => mockFs);

vi.mock('../src/main/imageCompression', () => ({
  compressImageBuffer: vi.fn().mockImplementation(async (buf: Buffer) => buf),
  decodeImageDataUrl: vi.fn().mockReturnValue(Buffer.from('decoded-image')),
}));

import { compressImageBuffer, decodeImageDataUrl } from '../src/main/imageCompression';
import { saveBurstPackBundle } from '../src/main/burst/burstBundle';

const GALLERY_DIR = '/home/user/achu-screenshots';
const base64 = 'data:image/png;base64,' + 'A'.repeat(100);

function makePayload(overrides: Partial<BurstPackSavePayload> = {}): BurstPackSavePayload {
  return {
    documentName: 'my-screenshot',
    masterConfig: { padding: 38, scale: 100 },
    sourceImageSrc: base64,
    exportFormat: 'png',
    jpegQuality: 90,
    compressionMode: 'balanced',
    variants: [
      {
        presetKey: 'Open Graph - OG Standard',
        filename: 'open-graph-og-standard-1200x630.png',
        base64Data: base64,
        width: 1200,
        height: 630,
        fileSizeKb: 1,
        warnings: [],
      },
      {
        presetKey: 'X (Twitter) - In-Feed Landscape',
        filename: 'x-twitter-in-feed-landscape-1200x675.png',
        base64Data: base64,
        width: 1200,
        height: 675,
        fileSizeKb: 1,
      },
    ],
    ...overrides,
  };
}

describe('saveBurstPackBundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.mkdirSync.mockReturnValue(undefined);
    mockFs.statfsSync.mockReturnValue({ bavail: 1000000, bsize: 4096 } as never);
    mockFs.writeFileSync.mockReturnValue(undefined);
  });

  it('returns error when no variants are provided', async () => {
    const result = await saveBurstPackBundle(GALLERY_DIR, makePayload({ variants: [] }));
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('NO_VARIANTS');
  });

  it('writes variants, manifest, source, and sidecar project file', async () => {
    const result = await saveBurstPackBundle(GALLERY_DIR, makePayload());

    expect(result.success).toBe(true);
    expect(result.data?.variantCount).toBe(2);
    expect(result.data?.documentName).toBe('my-screenshot');
    expect(result.data?.bundlePath).toContain('my-screenshot');
    expect(mockFs.mkdirSync).toHaveBeenCalled();
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    expect(decodeImageDataUrl).toHaveBeenCalled();
    expect(compressImageBuffer).toHaveBeenCalledTimes(2);
  });

  it('skips source file when sourceImageSrc is absent', async () => {
    const payload = makePayload({ sourceImageSrc: undefined });
    const result = await saveBurstPackBundle(GALLERY_DIR, payload);
    expect(result.success).toBe(true);
    const writeCalls = vi.mocked(mockFs.writeFileSync).mock.calls.map((call) => String(call[0]));
    expect(writeCalls.some((path) => path.includes('-source.png'))).toBe(false);
  });

  it('returns DISK_FULL when disk check fails', async () => {
    const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
    mockFs.statfsSync.mockImplementation(() => {
      throw err;
    });

    const result = await saveBurstPackBundle(GALLERY_DIR, makePayload());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DISK_FULL');
  });

  it('returns permission error when write fails', async () => {
    const err = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    mockFs.writeFileSync.mockImplementation(() => {
      throw err;
    });

    const result = await saveBurstPackBundle(GALLERY_DIR, makePayload());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('PERMISSION_DENIED');
  });
});