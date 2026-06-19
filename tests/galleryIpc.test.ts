import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockHandle,
  mockGetGalleryFolder, mockEnsureGalleryDir, mockListGalleryItems,
  mockSaveGalleryItem, mockDeleteGalleryItem, mockReadGalleryFile,
  mockReadGalleryProject, mockCopyGalleryToClipboard, mockOpenInExplorer,
  mockOpenGalleryFolderInExplorer, mockChooseGalleryFolder,
  mockGenerateThumbnail, mockTryReadBurstGalleryProject,
  mockLoadSettings, mockSaveSettings,
} = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockGetGalleryFolder: vi.fn().mockReturnValue('/mock/gallery'),
  mockEnsureGalleryDir: vi.fn(),
  mockListGalleryItems: vi.fn(),
  mockSaveGalleryItem: vi.fn(),
  mockDeleteGalleryItem: vi.fn(),
  mockReadGalleryFile: vi.fn(),
  mockReadGalleryProject: vi.fn(),
  mockCopyGalleryToClipboard: vi.fn(),
  mockOpenInExplorer: vi.fn(),
  mockOpenGalleryFolderInExplorer: vi.fn(),
  mockChooseGalleryFolder: vi.fn(),
  mockGenerateThumbnail: vi.fn(),
  mockTryReadBurstGalleryProject: vi.fn(),
  mockLoadSettings: vi.fn(),
  mockSaveSettings: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  BrowserWindow: class {},
  dialog: { showOpenDialog: vi.fn() },
}));

vi.mock('../src/main/gallery/galleryFs', () => ({
  getGalleryFolder: () => mockGetGalleryFolder(),
  ensureGalleryDir: (d: any) => mockEnsureGalleryDir(d),
  listGalleryItems: (d: any) => mockListGalleryItems(d),
  saveGalleryItem: (...args: any[]) => mockSaveGalleryItem(...args),
  deleteGalleryItem: (d: any, f: any) => mockDeleteGalleryItem(d, f),
  readGalleryFile: (d: any, f: any) => mockReadGalleryFile(d, f),
  readGalleryProject: (d: any, f: any) => mockReadGalleryProject(d, f),
  copyGalleryToClipboard: (d: any, f: any) => mockCopyGalleryToClipboard(d, f),
  openInExplorer: (d: any, f: any) => mockOpenInExplorer(d, f),
  openGalleryFolderInExplorer: (d: any) => mockOpenGalleryFolderInExplorer(d),
  chooseGalleryFolder: (w: any) => mockChooseGalleryFolder(w),
  generateThumbnail: (d: any, f: any, w: any) => mockGenerateThumbnail(d, f, w),
}));

vi.mock('../src/main/burst/burstGalleryRead', () => ({
  tryReadBurstGalleryProject: (d: any, f: any) => mockTryReadBurstGalleryProject(d, f),
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: () => mockLoadSettings(),
  saveSettings: (s: any) => mockSaveSettings(s),
}));

vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
}));

import { registerGalleryIpcHandlers } from '../src/main/gallery/galleryIpc';

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]: [string]) => ch === channel);
  return call ? call[1] : null;
}

const mockMainWindow = { webContents: { send: vi.fn() } };

beforeEach(() => {
  vi.clearAllMocks();
  registerGalleryIpcHandlers(() => mockMainWindow as any);
});

describe('registerGalleryIpcHandlers', () => {
  it('registers all gallery IPC channels', () => {
    const channels = mockHandle.mock.calls.map(([ch]: [string]) => ch);
    expect(channels).toContain('gallery:ensure-dir');
    expect(channels).toContain('gallery:get-folder');
    expect(channels).toContain('gallery:set-folder');
    expect(channels).toContain('gallery:choose-folder');
    expect(channels).toContain('gallery:list');
    expect(channels).toContain('gallery:save');
    expect(channels).toContain('gallery:delete');
    expect(channels).toContain('gallery:open-in-explorer');
    expect(channels).toContain('gallery:open-folder');
    expect(channels).toContain('gallery:read-file');
    expect(channels).toContain('gallery:read-project');
    expect(channels).toContain('gallery:thumbnail');
    expect(channels).toContain('gallery:copy-to-clipboard');
  });

  describe('gallery:ensure-dir', () => {
    it('calls ensureGalleryDir with folder path', () => {
      const handler = getHandler('gallery:ensure-dir');
      handler();
      expect(mockEnsureGalleryDir).toHaveBeenCalledWith('/mock/gallery');
    });
  });

  describe('gallery:get-folder', () => {
    it('returns gallery folder path', () => {
      const handler = getHandler('gallery:get-folder');
      expect(handler()).toBe('/mock/gallery');
    });
  });

  describe('gallery:list', () => {
    it('returns listed items', async () => {
      mockListGalleryItems.mockResolvedValue([{ name: 'test.png' }]);
      const handler = getHandler('gallery:list');
      const result = await handler();
      expect(result).toEqual([{ name: 'test.png' }]);
    });
  });

  describe('gallery:save', () => {
    it('rejects missing base64Data', async () => {
      const handler = getHandler('gallery:save');
      const result = await handler({}, { base64Data: '' });
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_PAYLOAD');
    });

    it('rejects payload over 100MB', async () => {
      const huge = 'x'.repeat(101 * 1024 * 1024);
      const handler = getHandler('gallery:save');
      const result = await handler({}, { base64Data: huge });
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
    });

    it('delegates to saveGalleryItem for valid payload', async () => {
      mockSaveGalleryItem.mockResolvedValue({ success: true });
      const handler = getHandler('gallery:save');
      const result = await handler({}, {
        base64Data: 'data:image/png;base64,abc',
        type: 'png',
        quality: 90,
      });
      expect(mockSaveGalleryItem).toHaveBeenCalled();
    });
  });

  describe('gallery:delete', () => {
    it('calls deleteGalleryItem', async () => {
      mockDeleteGalleryItem.mockResolvedValue({ success: true });
      const handler = getHandler('gallery:delete');
      await handler({}, '/mock/gallery/test.png');
      expect(mockDeleteGalleryItem).toHaveBeenCalledWith('/mock/gallery', '/mock/gallery/test.png');
    });
  });

  describe('gallery:read-project', () => {
    it('returns burst project when available', async () => {
      mockTryReadBurstGalleryProject.mockReturnValue({ type: 'burst', data: {} });
      const handler = getHandler('gallery:read-project');
      const result = handler({}, '/mock/gallery/bundle');
      expect(result).toEqual({ type: 'burst', data: {} });
      expect(mockReadGalleryProject).not.toHaveBeenCalled();
    });

    it('falls back to readGalleryProject', async () => {
      mockTryReadBurstGalleryProject.mockReturnValue(null);
      mockReadGalleryProject.mockResolvedValue({ type: 'single' });
      const handler = getHandler('gallery:read-project');
      const result = await handler({}, '/mock/gallery/test.png');
      expect(result).toEqual({ type: 'single' });
    });
  });

  describe('gallery:thumbnail', () => {
    it('calls generateThumbnail with width', async () => {
      mockGenerateThumbnail.mockResolvedValue({ success: true, data: 'thumb-data' });
      const handler = getHandler('gallery:thumbnail');
      const result = await handler({}, '/mock/gallery/test.png', 300);
      expect(mockGenerateThumbnail).toHaveBeenCalledWith('/mock/gallery', '/mock/gallery/test.png', 300);
    });
  });

  describe('gallery:open-in-explorer', () => {
    it('calls openInExplorer', async () => {
      const handler = getHandler('gallery:open-in-explorer');
      await handler({}, '/mock/gallery/test.png');
      expect(mockOpenInExplorer).toHaveBeenCalledWith('/mock/gallery', '/mock/gallery/test.png');
    });
  });

  describe('gallery:copy-to-clipboard', () => {
    it('calls copyGalleryToClipboard', async () => {
      const handler = getHandler('gallery:copy-to-clipboard');
      await handler({}, '/mock/gallery/test.png');
      expect(mockCopyGalleryToClipboard).toHaveBeenCalledWith('/mock/gallery', '/mock/gallery/test.png');
    });
  });
});
