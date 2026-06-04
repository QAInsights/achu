import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getVersion: () => '2026.5.30',
    getPath: (name: string) => `/mocked/temp/${name}`,
    quit: vi.fn(),
  },
  shell: {
    openPath: vi.fn(),
  },
  BrowserWindow: class {},
}));

import { isNewerVersion, registerUpdaterHandlers } from '../src/main/updater';

describe('Updater isNewerVersion helper', () => {
  it('correctly compares version segments', () => {
    // Normal CalVer
    expect(isNewerVersion('2026.5.30', '2026.6.01')).toBe(true);
    expect(isNewerVersion('2026.5.30', '2026.5.31')).toBe(true);
    expect(isNewerVersion('2026.5.30', '2026.5.30')).toBe(false);
    expect(isNewerVersion('2026.5.30', '2026.5.29')).toBe(false);

    // Prefix stripping
    expect(isNewerVersion('v2026.5.30', 'v2026.6.01')).toBe(true);
    expect(isNewerVersion('v2026.5.30', '2026.6.01')).toBe(true);
    expect(isNewerVersion('2026.5.30', 'v2026.6.01')).toBe(true);

    // Traditional SemVer
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.1.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '2.0.0')).toBe(true);
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(false);

    // Mismatched segments count fallback
    expect(isNewerVersion('1.0', '1.0.1')).toBe(true);
    expect(isNewerVersion('1.0.1', '1.0')).toBe(false);
  });
});

describe('registerUpdaterHandlers', () => {
  it('registers ipcMain handles', () => {
    const mockIpcMain = {
      handle: vi.fn(),
    };
    const mockGetMainWindow = vi.fn();

    registerUpdaterHandlers(mockIpcMain as any, mockGetMainWindow);

    expect(mockIpcMain.handle).toHaveBeenCalledWith('update:check', expect.any(Function));
    expect(mockIpcMain.handle).toHaveBeenCalledWith('update:start', expect.any(Function));
  });
});
