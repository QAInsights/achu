import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockHandle, mockOn, mockShowOpenDialog, mockShowSaveDialog,
  mockSafeStorage, mockClipboard, mockShell, mockNativeImage,
  mockLoadSettings, mockSaveSettings, mockTriggerCapture,
  mockSetIgnoreNext, mockUpdateCapture, mockCompressBuffer, mockDecodeDataUrl,
  mockReadFileSync, mockWriteFileSync, mockCheckAIHealth, mockGenerateAIResponse,
} = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockOn: vi.fn(),
  mockShowOpenDialog: vi.fn(),
  mockShowSaveDialog: vi.fn(),
  mockSafeStorage: {
    isEncryptionAvailable: vi.fn(),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
  mockClipboard: {
    writeImage: vi.fn(),
    write: vi.fn(),
    readImage: vi.fn(),
    writeText: vi.fn(),
  },
  mockShell: { openExternal: vi.fn() },
  mockNativeImage: {
    createFromBuffer: vi.fn().mockReturnValue({ isEmpty: () => false }),
  },
  mockLoadSettings: vi.fn(),
  mockSaveSettings: vi.fn(),
  mockTriggerCapture: vi.fn(),
  mockSetIgnoreNext: vi.fn(),
  mockUpdateCapture: vi.fn(),
  mockCompressBuffer: vi.fn(),
  mockDecodeDataUrl: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockCheckAIHealth: vi.fn(),
  mockGenerateAIResponse: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle, on: mockOn },
  dialog: { showOpenDialog: mockShowOpenDialog, showSaveDialog: mockShowSaveDialog },
  safeStorage: mockSafeStorage,
  clipboard: mockClipboard,
  shell: mockShell,
  BrowserWindow: class {},
  nativeImage: mockNativeImage,
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: () => mockLoadSettings(),
  saveSettings: (s: any) => mockSaveSettings(s),
}));

vi.mock('../src/main/capture', () => ({
  triggerOSScreenCapture: () => mockTriggerCapture(),
  setIgnoreNextClipboardImage: (b: any) => mockSetIgnoreNext(b),
  updateCaptureConfigurations: (s: any, w: any) => mockUpdateCapture(s, w),
}));

vi.mock('../src/main/imageCompression', () => ({
  compressImageBuffer: (buf: any, opts: any) => mockCompressBuffer(buf, opts),
  decodeImageDataUrl: (data: any) => mockDecodeDataUrl(data),
  CompressionMode: {},
}));

vi.mock('fs', () => ({
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
}));

vi.mock('../src/main/aiService', () => ({
  checkAIHealth: (...args: any[]) => mockCheckAIHealth(...args),
  generateAIResponse: (...args: any[]) => mockGenerateAIResponse(...args),
}));

import { registerIpcHandlers } from '../src/main/ipc';

function getHandler(channel: string) {
  const handleCall = mockHandle.mock.calls.find((args) => args[0] === channel);
  return handleCall ? handleCall[1] : null;
}

function getOnHandler(channel: string) {
  const onCall = mockOn.mock.calls.find((args) => args[0] === channel);
  return onCall ? onCall[1] : null;
}

const mockMainWindow = {
  setTitleBarOverlay: vi.fn(),
  webContents: { send: vi.fn() },
};

beforeEach(() => {
  vi.clearAllMocks();
  registerIpcHandlers(() => mockMainWindow as any);
});

describe('registerIpcHandlers', () => {
  it('registers all expected IPC channels', () => {
    const channels = mockHandle.mock.calls.map((args) => args[0]);
    expect(channels).toContain('settings:get');
    expect(channels).toContain('settings:set');
    expect(channels).toContain('set-github-token');
    expect(channels).toContain('get-github-token');
    expect(channels).toContain('set-secure-key');
    expect(channels).toContain('get-secure-key');
    expect(channels).toContain('llm:check-health');
    expect(channels).toContain('llm:generate-issue');
    expect(channels).toContain('file:open-dialog');
    expect(channels).toContain('file:save-dialog');
    expect(channels).toContain('clipboard:copy-image');
    expect(channels).toContain('clipboard:read-image');
    expect(channels).toContain('clipboard:copy-text');

    const onChannels = mockOn.mock.calls.map((args) => args[0]);
    expect(onChannels).toContain('theme:changed');
    expect(onChannels).toContain('url:open');
    expect(onChannels).toContain('capture:trigger');
  });

  describe('theme:changed', () => {
    it('calls setTitleBarOverlay on win32', () => {
      const origPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const handler = getOnHandler('theme:changed');
      handler({}, 'dark');
      expect(mockMainWindow.setTitleBarOverlay).toHaveBeenCalled();
      Object.defineProperty(process, 'platform', { value: origPlatform });
    });
  });

  describe('settings:get', () => {
    it('returns loaded settings', () => {
      mockLoadSettings.mockReturnValue({ padding: 50 });
      const handler = getHandler('settings:get');
      expect(handler()).toEqual({ padding: 50 });
    });
  });

  describe('settings:set', () => {
    it('merges and saves settings', () => {
      mockLoadSettings.mockReturnValue({ padding: 30, githubToken: 'tok', secureKeys: {} });
      const handler = getHandler('settings:set');
      handler({}, { padding: 50, rounded: 20 });
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ padding: 50, rounded: 20, githubToken: 'tok' })
      );
    });

    it('calls updateCaptureConfigurations', () => {
      mockLoadSettings.mockReturnValue({ padding: 30 });
      const handler = getHandler('settings:set');
      handler({}, { padding: 50 });
      expect(mockUpdateCapture).toHaveBeenCalled();
    });
  });

  describe('set-github-token', () => {
    it('encrypts and stores token', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from('encrypted'));
      mockLoadSettings.mockReturnValue({});
      const handler = getHandler('set-github-token');
      const result = handler({}, 'my-token');
      expect(result).toBe(true);
      expect(mockSaveSettings).toHaveBeenCalled();
    });

    it('returns false when encryption unavailable', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const handler = getHandler('set-github-token');
      const result = handler({}, 'my-token');
      expect(result).toBe(false);
    });
  });

  describe('get-github-token', () => {
    it('decrypts and returns token', () => {
      mockLoadSettings.mockReturnValue({ githubToken: Buffer.from('enc').toString('base64') });
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.decryptString.mockReturnValue('decrypted-token');
      const handler = getHandler('get-github-token');
      expect(handler()).toBe('decrypted-token');
    });

    it('returns null when no token stored', () => {
      mockLoadSettings.mockReturnValue({});
      const handler = getHandler('get-github-token');
      expect(handler()).toBeNull();
    });
  });

  describe('set-secure-key', () => {
    it('stores encrypted key under secureKeys', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from('enc'));
      mockLoadSettings.mockReturnValue({ secureKeys: {} });
      const handler = getHandler('set-secure-key');
      const result = handler({}, 'openai', 'sk-123');
      expect(result).toBe(true);
    });

    it('returns false when encryption unavailable', () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const handler = getHandler('set-secure-key');
      expect(handler({}, 'openai', 'sk-123')).toBe(false);
    });
  });

  describe('get-secure-key', () => {
    it('returns decrypted key', () => {
      mockLoadSettings.mockReturnValue({ secureKeys: { openai: Buffer.from('enc').toString('base64') } });
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true);
      mockSafeStorage.decryptString.mockReturnValue('sk-abc');
      const handler = getHandler('get-secure-key');
      expect(handler({}, 'openai')).toBe('sk-abc');
    });

    it('returns null when key not found', () => {
      mockLoadSettings.mockReturnValue({ secureKeys: {} });
      const handler = getHandler('get-secure-key');
      expect(handler({}, 'openai')).toBeNull();
    });
  });

  describe('file:open-dialog', () => {
    it('returns null when dialog is cancelled', async () => {
      mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
      const handler = getHandler('file:open-dialog');
      const result = await handler();
      expect(result).toBeNull();
    });

    it('returns null when no main window', async () => {
      vi.clearAllMocks();
      registerIpcHandlers(() => null);
      const handler = getHandler('file:open-dialog');
      const result = await handler();
      expect(result).toBeNull();
    });

    it('returns base64 data URL when file is selected (PNG)', async () => {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/image.png'] });
      mockReadFileSync.mockReturnValue(Buffer.from('fake-png-data'));
      const handler = getHandler('file:open-dialog');
      const result = await handler();
      expect(result).toContain('data:image/png;base64,');
    });

    it('returns base64 data URL for JPEG file', async () => {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/image.jpg'] });
      mockReadFileSync.mockReturnValue(Buffer.from('fake-jpg-data'));
      const handler = getHandler('file:open-dialog');
      const result = await handler();
      expect(result).toContain('data:image/jpeg;base64,');
    });

    it('returns base64 data URL for WebP file', async () => {
      mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/image.webp'] });
      mockReadFileSync.mockReturnValue(Buffer.from('fake-webp-data'));
      const handler = getHandler('file:open-dialog');
      const result = await handler();
      expect(result).toContain('data:image/webp;base64,');
    });
  });

  describe('file:save-dialog', () => {
    it('returns false when no main window', async () => {
      vi.clearAllMocks();
      registerIpcHandlers(() => null);
      const handler = getHandler('file:save-dialog');
      const result = await handler({}, { base64Data: 'data', type: 'png', quality: 90 });
      expect(result).toBe(false);
    });

    it('returns false when dialog is cancelled', async () => {
      mockShowSaveDialog.mockResolvedValue({ canceled: true, filePath: '' });
      const handler = getHandler('file:save-dialog');
      const result = await handler({}, { base64Data: 'data:image/png;base64,abc', type: 'png', quality: 90 });
      expect(result).toBe(false);
    });

    it('returns true and writes file when save succeeds', async () => {
      mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: '/path/to/output.png' });
      mockDecodeDataUrl.mockReturnValue(Buffer.from('decoded'));
      mockCompressBuffer.mockResolvedValue(Buffer.from('compressed'));
      const handler = getHandler('file:save-dialog');
      const result = await handler({}, { base64Data: 'data:image/png;base64,abc', type: 'png', quality: 90 });
      expect(result).toBe(true);
      expect(mockCompressBuffer).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/output.png', expect.any(Buffer));
    });

    it('handles JPEG export', async () => {
      mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: '/path/to/output.jpg' });
      mockDecodeDataUrl.mockReturnValue(Buffer.from('decoded'));
      mockCompressBuffer.mockResolvedValue(Buffer.from('compressed'));
      const handler = getHandler('file:save-dialog');
      const result = await handler({}, { base64Data: 'data:image/jpeg;base64,abc', type: 'jpeg', quality: 80 });
      expect(result).toBe(true);
    });

    it('handles WebP export', async () => {
      mockShowSaveDialog.mockResolvedValue({ canceled: false, filePath: '/path/to/output.webp' });
      mockDecodeDataUrl.mockReturnValue(Buffer.from('decoded'));
      mockCompressBuffer.mockResolvedValue(Buffer.from('compressed'));
      const handler = getHandler('file:save-dialog');
      const result = await handler({}, { base64Data: 'data:image/webp;base64,abc', type: 'webp', quality: 85 });
      expect(result).toBe(true);
    });
  });

  describe('clipboard:copy-image', () => {
    it('returns false on error', async () => {
      mockClipboard.writeImage.mockImplementation(() => { throw new Error('fail'); });
      const handler = getHandler('clipboard:copy-image');
      const result = await handler({}, 'data:image/png;base64,abc');
      expect(result).toBe(false);
    });
  });

  describe('llm:check-health', () => {
    it('returns false when encryption unavailable for non-ollama provider', async () => {
      mockLoadSettings.mockReturnValue({ secureKeys: {} });
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);
      const handler = getHandler('llm:check-health');
      const result = await handler({}, { provider: 'openai', endpoint: 'http://localhost' });
      expect(result).toBe(false);
    });

    it('returns false when checkAIHealth throws error', async () => {
      const handler = getHandler('llm:check-health');
      const result = await handler({}, { provider: 'ollama', endpoint: 'http://localhost:11434' });
      expect(result).toBe(false);
    });
  });

  describe('llm:generate-issue', () => {
    it('throws error when AI generation fails', async () => {
      mockLoadSettings.mockReturnValue({ secureKeys: {} });
      const handler = getHandler('llm:generate-issue');
      await expect(handler({}, {
        provider: 'openai',
        model: 'gpt-4',
        prompt: 'test',
        imageBase64: 'data',
        endpoint: 'http://localhost',
      })).rejects.toThrow();
    });
  });

  describe('clipboard:read-image', () => {
    it('returns null when clipboard is empty', () => {
      mockClipboard.readImage.mockReturnValue({ isEmpty: () => true });
      const handler = getHandler('clipboard:read-image');
      expect(handler()).toBeNull();
    });

    it('returns data URL when clipboard has image', () => {
      mockClipboard.readImage.mockReturnValue({
        isEmpty: () => false,
        toDataURL: () => 'data:image/png;base64,abc',
      });
      const handler = getHandler('clipboard:read-image');
      expect(handler()).toBe('data:image/png;base64,abc');
    });
  });

  describe('clipboard:copy-text', () => {
    it('returns true on success', () => {
      const handler = getHandler('clipboard:copy-text');
      expect(handler({}, 'hello')).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('hello');
    });

    it('returns false on error', () => {
      mockClipboard.writeText.mockImplementation(() => { throw new Error('fail'); });
      const handler = getHandler('clipboard:copy-text');
      expect(handler({}, 'hello')).toBe(false);
    });
  });

  describe('url:open', () => {
    it('opens external URL', () => {
      const handler = getOnHandler('url:open');
      handler({}, 'https://example.com');
      expect(mockShell.openExternal).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('capture:trigger', () => {
    it('triggers OS screen capture', () => {
      const handler = getOnHandler('capture:trigger');
      handler();
      expect(mockTriggerCapture).toHaveBeenCalled();
    });
  });
});
