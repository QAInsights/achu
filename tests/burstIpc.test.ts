import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BurstPackSavePayload } from '../src/shared/burstTypes';

const burstHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => unknown>());

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
      burstHandlers.set(channel, handler);
    }),
  },
}));

vi.mock('../src/main/gallery/galleryFs', () => ({
  getGalleryFolder: vi.fn().mockReturnValue('/home/user/achu-screenshots'),
}));

const mockSaveBurstPackBundle = vi.hoisted(() => vi.fn());

vi.mock('../src/main/burst/burstBundle', () => ({
  saveBurstPackBundle: mockSaveBurstPackBundle,
}));

import { registerBurstIpcHandlers } from '../src/main/burst/burstIpc';
import { getGalleryFolder } from '../src/main/gallery/galleryFs';

const base64 = 'data:image/png;base64,' + 'A'.repeat(100);

function makePayload(overrides: Partial<BurstPackSavePayload> = {}): BurstPackSavePayload {
  return {
    documentName: 'my-screenshot',
    masterConfig: { padding: 38 },
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
      },
    ],
    ...overrides,
  };
}

describe('registerBurstIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    burstHandlers.clear();
    registerBurstIpcHandlers();
    mockSaveBurstPackBundle.mockResolvedValue({
      success: true,
      data: {
        bundlePath: '/home/user/achu-screenshots/my-screenshot',
        documentName: 'my-screenshot',
        variantCount: 1,
        primaryExportPath: '/home/user/achu-screenshots/my-screenshot/open-graph.png',
      },
    });
  });

  it('registers burst:save handler', () => {
    expect(burstHandlers.has('burst:save')).toBe(true);
  });

  it('rejects payloads without variants', async () => {
    const handler = burstHandlers.get('burst:save')!;
    const result = await handler({}, makePayload({ variants: [] }));
    expect(result).toEqual({
      success: false,
      error: { code: 'INVALID_PAYLOAD', message: 'Missing burst variants' },
    });
    expect(mockSaveBurstPackBundle).not.toHaveBeenCalled();
  });

  it('rejects payloads exceeding size limit', async () => {
    const handler = burstHandlers.get('burst:save')!;
    const huge = 'A'.repeat(201 * 1024 * 1024);
    const result = await handler(
      {},
      makePayload({
        variants: [
          {
            presetKey: 'Open Graph - OG Standard',
            filename: 'huge.png',
            base64Data: huge,
            width: 1200,
            height: 630,
            fileSizeKb: 99999,
          },
        ],
      })
    );
    expect(result).toEqual({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Burst pack payload is too large' },
    });
  });

  it('delegates valid payloads to saveBurstPackBundle', async () => {
    const handler = burstHandlers.get('burst:save')!;
    const payload = makePayload();
    const result = (await handler({}, payload)) as { success: boolean };

    expect(getGalleryFolder).toHaveBeenCalled();
    expect(mockSaveBurstPackBundle).toHaveBeenCalledWith('/home/user/achu-screenshots', payload);
    expect(result.success).toBe(true);
  });
});