import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandle = vi.fn();
vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '2026.5.30',
    getPath: (name: string) => `/mocked/temp/${name}`,
    quit: vi.fn(),
  },
  shell: { openPath: vi.fn() },
  BrowserWindow: class {},
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  statSync: vi.fn().mockReturnValue({ size: 1000 }),
  createWriteStream: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { registerUpdaterHandlers } from '../src/main/updater';

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]: [string]) => ch === channel);
  return call ? call[1] : null;
}

const mockMainWindow = { webContents: { send: vi.fn() } };

beforeEach(() => {
  vi.clearAllMocks();
  registerUpdaterHandlers({ handle: mockHandle } as any, () => mockMainWindow as any);
});

describe('Updater handlers (update:check)', () => {
  it('returns available:false when current is newer', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tag_name: 'v2026.5.29', assets: [], body: '' }),
    }) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result).toEqual({ available: false });
  });

  it('returns available:true with download URL when newer version exists on win32', async () => {
    const origPlatform = process.platform;
    const origArch = process.arch;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
    Object.defineProperty(process, 'arch', { value: 'x64', configurable: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2026.6.1',
        body: 'Release notes',
        html_url: 'https://github.com/releases/1',
        assets: [
          { name: 'achu-x64-2026.6.1.exe', browser_download_url: 'https://dl/x64.exe' },
          { name: 'achu-arm64-2026.6.1.exe', browser_download_url: 'https://dl/arm64.exe' },
        ],
      }),
    }) as any;

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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2026.6.1',
        body: '',
        html_url: 'https://github.com/releases/1',
        assets: [
          { name: 'achu-x64-2026.6.1.exe', browser_download_url: 'https://dl/x64.exe' },
          { name: 'achu-arm64-2026.6.1.exe', browser_download_url: 'https://dl/arm64.exe' },
        ],
      }),
    }) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.downloadUrl).toContain('arm64');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });

  it('falls back to first asset when no platform match', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2026.6.1',
        body: '',
        html_url: 'https://github.com/releases/1',
        assets: [
          { name: 'achu-linux.AppImage', browser_download_url: 'https://dl/app.AppImage' },
        ],
      }),
    }) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
  });

  it('throws on API error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as any;

    const handler = getHandler('update:check');
    await expect(handler()).rejects.toThrow('GitHub API returned status 500');
  });

  it('throws on network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network fail')) as any;

    const handler = getHandler('update:check');
    await expect(handler()).rejects.toThrow('Network fail');
  });

  it('selects dmg asset on darwin', async () => {
    const origPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2026.6.1',
        body: '',
        html_url: 'https://github.com/releases/1',
        assets: [
          { name: 'achu-universal.dmg', browser_download_url: 'https://dl/app.dmg' },
        ],
      }),
    }) as any;

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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        tag_name: 'v2026.6.1',
        body: '',
        html_url: 'https://github.com/releases/1',
        assets: [
          { name: 'achu-amd64.AppImage', browser_download_url: 'https://dl/app.AppImage' },
        ],
      }),
    }) as any;

    const handler = getHandler('update:check');
    const result = await handler();
    expect(result.available).toBe(true);
    expect(result.downloadUrl).toContain('AppImage');

    Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true });
    Object.defineProperty(process, 'arch', { value: origArch, configurable: true });
  });
});

describe('Updater handlers (update:start)', () => {
  it('throws when no download URL provided', async () => {
    const handler = getHandler('update:start');
    await expect(handler({}, '')).rejects.toThrow('No download URL provided');
  });
});
