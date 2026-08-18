import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockHandle = vi.fn();
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '2026.5.30',
    getPath: (name: string) => `/mocked/temp/${name}`,
    quit: vi.fn(),
  },
  shell: { openPath: vi.fn(), openExternal: vi.fn() },
  BrowserWindow: class {},
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({ size: 1000 }),
  createWriteStream: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  copyFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  chmodSync: vi.fn(),
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: vi.fn().mockImplementation(() => ({
    checkForUpdatesOnStartup: true,
    lastUpdateCheck: 0,
    lastUpdateResult: null,
    lastUpdateETag: null,
  })),
  saveSettings: vi.fn(),
  getDefaultGalleryFolder: () => '/mocked/home/achu-screenshots',
}));

// electron-updater is only exercised by the NSIS-install code path
const mockAutoUpdater = {
  autoDownload: true,
  autoInstallOnAppQuit: true,
  on: vi.fn(),
  checkForUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  quitAndInstall: vi.fn(),
};
vi.mock('electron-updater', () => ({ autoUpdater: mockAutoUpdater }));

import { registerUpdaterHandlers, isNewerVersion, friendlyUpdateError } from '../src/main/updater';

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find((args: any[]) => args[0] === channel);
  return call ? call[1] : null;
}

/** Builds a mock fetch Response with headers support (for ETag). */
function mockResponse(body: any, opts: { ok?: boolean; status?: number; etag?: string } = {}) {
  const { ok = true, status = 200, etag } = opts;
  return {
    ok,
    status,
    headers: {
      get: (name: string) => name.toLowerCase() === 'etag' ? (etag || null) : null,
    },
    json: () => Promise.resolve(body),
  };
}

const mockMainWindow = { webContents: { send: vi.fn() } };

beforeEach(() => {
  vi.clearAllMocks();
  // Force the custom (portable) update path on win32: these tests exercise
  // the GitHub-API flow, not the NSIS electron-updater path.
  process.env.PORTABLE_EXECUTABLE_FILE = 'C:\\mocked\\achu.exe';
  registerUpdaterHandlers({ handle: mockHandle } as any, () => mockMainWindow as any);
});

afterEach(() => {
  delete process.env.PORTABLE_EXECUTABLE_FILE;
});

describe('Updater handlers (update:check)', () => {
  it('returns available:false when current is newer', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockResponse(
      { tag_name: 'v2026.5.29', assets: [], body: '' },
      { etag: '"abc123"' }
    )) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result).toEqual({ available: false });
  });

  it('returns available:true with download URL when newer version exists on win32', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v2026.6.1',
      body: 'Release notes',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-x64-2026.6.1.exe', browser_download_url: 'https://dl/x64.exe' },
        { name: 'achu-arm64-2026.6.1.exe', browser_download_url: 'https://dl/arm64.exe' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.version).toBe('2026.6.1');
    expect(result.downloadUrl).toContain('x64');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('selects arm64 asset when arch is arm64', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v2026.6.1',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-x64-2026.6.1.exe', browser_download_url: 'https://dl/x64.exe' },
        { name: 'achu-arm64-2026.6.1.exe', browser_download_url: 'https://dl/arm64.exe' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.downloadUrl).toContain('arm64');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('falls back to first asset when no platform match', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v2026.6.1',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-linux.AppImage', browser_download_url: 'https://dl/app.AppImage' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('throws friendly error on API error response', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockResponse(null, { ok: false, status: 500 })) as any;

    const handler = getHandler('update:check');
    await expect(handler()).rejects.toThrow('temporarily unavailable');
  });

  it('throws friendly error on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network fail')) as any;

    const handler = getHandler('update:check');
    await expect(handler()).rejects.toThrow('internet connection');
  });

  it('selects dmg asset on darwin', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v2026.6.1',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-universal.dmg', browser_download_url: 'https://dl/app.dmg' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.downloadUrl).toContain('.dmg');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('prefers zip over dmg on darwin for the ditto install path (issue #11)', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    // Both assets present (electron-builder ships both for universal builds).
    // Both formats are present in electron-builder macOS releases.
    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v26.6.19',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-26.6.19-universal-mac.zip', browser_download_url: 'https://dl/app.zip', size: 90000000 },
        { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/app.dmg', size: 95000000 },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    // The in-app ZIP path uses ditto, avoiding both Archive Utility's old
    // "Error 94" and hdiutil's "image data corrupted" failure.
    expect(result.downloadUrl).toContain('.zip');
    expect(result.downloadUrl).not.toContain('.dmg');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('falls back to dmg on darwin when no zip is present', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v26.6.19',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/app.dmg', size: 95000000 },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.downloadUrl).toContain('.dmg');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('selects AppImage on linux', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v2026.6.1',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-amd64.AppImage', browser_download_url: 'https://dl/app.AppImage' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.downloadUrl).toContain('AppImage');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('linux: prefers AppImage over deb even when deb is listed first (issue #8 sibling)', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v26.6.19',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu_26.6.19_amd64.deb', browser_download_url: 'https://dl/amd64.deb' },
        { name: 'achu-26.6.19.AppImage', browser_download_url: 'https://dl/app.AppImage' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    // Must pick AppImage (in-place update, no sudo) — not deb
    expect(result.downloadUrl).toContain('AppImage');
    expect(result.downloadUrl).not.toContain('.deb');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('linux arm64: picks arm64 AppImage, not x64 AppImage or arm64 deb', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue(mockResponse({
      tag_name: 'v26.6.19',
      body: '',
      html_url: 'https://github.com/releases/1',
      assets: [
        { name: 'achu-26.6.19.AppImage', browser_download_url: 'https://dl/x64.AppImage' },
        { name: 'achu-26.6.19-arm64.AppImage', browser_download_url: 'https://dl/arm64.AppImage' },
        { name: 'achu_26.6.19_arm64.deb', browser_download_url: 'https://dl/arm64.deb' },
      ],
    })) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.downloadUrl).toContain('arm64.AppImage');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('uses cached result on 304 Not Modified', async () => {
    // First, populate the cache with a real response
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    // Simulate settings that already have a cached result + ETag
    const { loadSettings } = await import('../src/main/settings');
    (loadSettings as any).mockImplementationOnce(() => ({
      checkForUpdatesOnStartup: true,
      lastUpdateCheck: Date.now() - 10 * 60 * 1000, // 10 min ago — past 5-min TTL
      lastUpdateResult: { available: true, version: '2026.6.1', releaseUrl: 'https://github.com/releases/1', downloadUrl: 'https://dl/app.dmg', downloadSize: 1000, releaseNotes: '' },
      lastUpdateETag: '"abc123"',
    }));

    // 304 response — should return cached result without parsing JSON
    global.fetch = vi.fn().mockResolvedValue(mockResponse(null, { ok: false, status: 304 })) as any;

    const handler = getHandler('update:check');
    // Pass force=true to bypass the 5-min TTL (so we actually hit the API)
    const result = await handler({}, true);
    expect(result.available).toBe(true);
    expect(result.version).toBe('2026.6.1');

    // Verify If-None-Match header was sent
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[1].headers['If-None-Match']).toBe('"abc123"');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('handles 304 Not Modified gracefully when no cached result exists (stale ETag)', async () => {
    // Simulate settings with an ETag but NO cached result (corrupted/interrupted write)
    const { loadSettings } = await import('../src/main/settings');
    (loadSettings as any).mockImplementationOnce(() => ({
      checkForUpdatesOnStartup: true,
      lastUpdateCheck: Date.now() - 10 * 60 * 1000, // past TTL
      lastUpdateResult: null,
      lastUpdateETag: '"stale-etag"',
    }));

    // Server returns 304 — but we have nothing cached
    global.fetch = vi.fn().mockResolvedValue(mockResponse(null, { ok: false, status: 304 })) as any;

    const handler = getHandler('update:check');
    // Should NOT throw — should return { available: false } gracefully
    const result = await handler({}, true);
    expect(result).toEqual({ available: false });
  });
});

describe('Updater handlers (update:start)', () => {
  it('throws when no download URL provided', async () => {
    const handler = getHandler('update:start');
    await expect(handler({}, '')).rejects.toThrow('No download URL provided');
  });
});

describe('NSIS install path (electron-updater)', () => {
  const asNsisInstall = () => {
    // NSIS installs are packaged, not portable, not Store — so remove the
    // portable env marker set in beforeEach and pretend to be win32.
    delete process.env.PORTABLE_EXECUTABLE_FILE;
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    return () => Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  };

  it('update:check uses electron-updater and reports a newer version', async () => {
    const restore = asNsisInstall();
    try {
      mockAutoUpdater.checkForUpdates.mockResolvedValue({
        updateInfo: { version: '26.9.0', releaseNotes: 'notes', files: [{ size: 123 }] },
      });
      const handler = getHandler('update:check');
      const result = await handler({}, true);
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
      expect(result.available).toBe(true);
      expect(result.version).toBe('26.9.0');
      expect(result.downloadSize).toBe(123);
    } finally {
      restore();
    }
  });

  it('update:check returns available:false when electron-updater finds nothing newer', async () => {
    const restore = asNsisInstall();
    try {
      mockAutoUpdater.checkForUpdates.mockResolvedValue(null);
      const handler = getHandler('update:check');
      const result = await handler({}, true);
      expect(result.available).toBe(false);
    } finally {
      restore();
    }
  });

  it('update:start downloads via electron-updater without needing a downloadUrl', async () => {
    const restore = asNsisInstall();
    try {
      mockAutoUpdater.downloadUpdate.mockResolvedValue([]);
      const handler = getHandler('update:start');
      const result = await handler({}, null);
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true, relaunching: true });
    } finally {
      restore();
    }
  });
});

describe('isNewerVersion', () => {
  it('returns true when latest is newer', () => {
    expect(isNewerVersion('2026.5.30', '2026.6.1')).toBe(true);
  });

  it('returns false when latest is older', () => {
    expect(isNewerVersion('2026.6.1', '2026.5.30')).toBe(false);
  });

  it('returns false when versions are equal', () => {
    expect(isNewerVersion('2026.5.30', '2026.5.30')).toBe(false);
  });

  it('normalizes full-year CalVer', () => {
    expect(isNewerVersion('2026.5.30', '26.6.1')).toBe(true);
  });

  it('handles v prefix', () => {
    expect(isNewerVersion('2026.5.30', 'v2026.6.1')).toBe(true);
  });
});

describe('friendlyUpdateError', () => {
  it('maps 403 to rate limit message', () => {
    expect(friendlyUpdateError('GitHub API returned status 403')).toContain('rate limit');
  });

  it('maps network errors to connection message', () => {
    expect(friendlyUpdateError('fetch failed: ECONNREFUSED')).toContain('internet connection');
  });

  it('maps 5xx to server unavailable message', () => {
    expect(friendlyUpdateError('GitHub API returned status 503')).toContain('temporarily unavailable');
  });

  it('maps missing file error', () => {
    expect(friendlyUpdateError('Downloaded update file is missing or empty.')).toContain('incomplete');
  });

  it('passes through unknown errors', () => {
    expect(friendlyUpdateError('Something weird happened')).toBe('Something weird happened');
  });
});
