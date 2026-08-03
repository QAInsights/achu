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

import {
  isNewerVersion,
  registerUpdaterHandlers,
  selectMacAsset,
  selectWindowsAsset,
  selectLinuxAsset,
  parseHdiutilMountPoint,
  resolveWindowsUpdateTarget,
  buildWindowsUpdateScript,
} from '../src/main/updater';

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

  it('normalizes full-year (YYYY) vs short-year (YY) CalVer formats', () => {
    // YYYY.M.D local vs YY.MM.MICRO remote (the actual production scenario)
    expect(isNewerVersion('2026.5.30', 'v26.06.08')).toBe(true);
    expect(isNewerVersion('2026.5.30', '26.06.08')).toBe(true);
    expect(isNewerVersion('2026.5.30', '26.5.30')).toBe(false);
    expect(isNewerVersion('2026.5.30', '26.5.29')).toBe(false);

    // v26.07.00 release — the actual current production scenario
    expect(isNewerVersion('2026.5.30', 'v26.07.00')).toBe(true);
    expect(isNewerVersion('26.7.0', 'v26.07.00')).toBe(false); // same version
    expect(isNewerVersion('26.7.0', 'v26.07.01')).toBe(true);  // micro bump

    // Both full-year
    expect(isNewerVersion('2026.5.30', '2026.6.1')).toBe(true);
    expect(isNewerVersion('2026.6.1', '2026.5.30')).toBe(false);

    // Both short-year
    expect(isNewerVersion('26.5.30', '26.6.1')).toBe(true);
    expect(isNewerVersion('26.6.1', '26.5.30')).toBe(false);

    // With v-prefix on either side
    expect(isNewerVersion('v2026.5.30', 'v26.6.1')).toBe(true);
    expect(isNewerVersion('2026.5.30', 'v26.6.1')).toBe(true);
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

describe('selectMacAsset (issue #8 — macOS upgrade picks zip that fails to expand)', () => {
  it('prefers .dmg over .zip even when zip is listed first', () => {
    const assets = [
      { name: 'achu-26.6.19-universal-mac.zip', browser_download_url: 'https://dl/app.zip' },
      { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/app.dmg' },
    ];
    const picked = selectMacAsset(assets);
    expect(picked?.name).toBe('achu-26.6.19-universal.dmg');
  });

  it('falls back to .zip when no .dmg is present', () => {
    const assets = [
      { name: 'achu-26.6.19-universal-mac.zip', browser_download_url: 'https://dl/app.zip' },
    ];
    const picked = selectMacAsset(assets);
    expect(picked?.name).toBe('achu-26.6.19-universal-mac.zip');
  });

  it('returns undefined when neither dmg nor zip present', () => {
    const assets = [
      { name: 'achu-x64-2026.6.1.exe', browser_download_url: 'https://dl/app.exe' },
    ];
    expect(selectMacAsset(assets)).toBeUndefined();
  });

  it('returns undefined for an empty asset list', () => {
    expect(selectMacAsset([])).toBeUndefined();
  });

  it('is case-insensitive on file extensions', () => {
    const assets = [
      { name: 'achu-universal.DMG', browser_download_url: 'https://dl/app.dmg' },
    ];
    expect(selectMacAsset(assets)?.name).toBe('achu-universal.DMG');
  });
});

describe('selectWindowsAsset', () => {
  it('picks the x64 exe on x64 arch', () => {
    const assets = [
      { name: 'achu-x64-26.6.19.exe', browser_download_url: 'https://dl/x64.exe' },
      { name: 'achu-arm64-26.6.19.exe', browser_download_url: 'https://dl/arm64.exe' },
    ];
    expect(selectWindowsAsset(assets, 'x64')?.name).toBe('achu-x64-26.6.19.exe');
  });

  it('picks the arm64 exe on arm64 arch', () => {
    const assets = [
      { name: 'achu-x64-26.6.19.exe', browser_download_url: 'https://dl/x64.exe' },
      { name: 'achu-arm64-26.6.19.exe', browser_download_url: 'https://dl/arm64.exe' },
    ];
    expect(selectWindowsAsset(assets, 'arm64')?.name).toBe('achu-arm64-26.6.19.exe');
  });

  it('excludes .appx files (Store packages cannot be auto-replaced)', () => {
    const assets = [
      { name: 'achu-x64-26.6.19.appx', browser_download_url: 'https://dl/x64.appx' },
      { name: 'achu-x64-26.6.19.exe', browser_download_url: 'https://dl/x64.exe' },
    ];
    expect(selectWindowsAsset(assets, 'x64')?.name).toBe('achu-x64-26.6.19.exe');
  });

  it('falls back to first exe when no arch match', () => {
    const assets = [
      { name: 'achu-26.6.19.exe', browser_download_url: 'https://dl/app.exe' },
    ];
    expect(selectWindowsAsset(assets, 'x64')?.name).toBe('achu-26.6.19.exe');
  });

  it('returns undefined when no exe assets', () => {
    const assets = [
      { name: 'achu-26.6.19.appx', browser_download_url: 'https://dl/app.appx' },
    ];
    expect(selectWindowsAsset(assets, 'x64')).toBeUndefined();
  });
});

describe('parseHdiutilMountPoint (macOS DMG mount table)', () => {
  it('extracts /Volumes path from typical hdiutil attach output', () => {
    const output = [
      '/dev/disk4s1        	GUID_partition_scheme          	',
      '/dev/disk4s2        	Apple_HFS                      	/Volumes/achu 26.7.6',
    ].join('\n');
    expect(parseHdiutilMountPoint(output)).toBe('/Volumes/achu 26.7.6');
  });

  it('handles space-padded columns without tabs', () => {
    const output = '/dev/disk2s1            Apple_HFS                       /Volumes/achu';
    expect(parseHdiutilMountPoint(output)).toBe('/Volumes/achu');
  });

  it('returns null for empty or device-only lines (the old bug)', () => {
    // Old code used the whole last line as a path - that is never valid
    expect(parseHdiutilMountPoint('')).toBeNull();
    expect(parseHdiutilMountPoint('/dev/disk4s1        	GUID_partition_scheme')).toBeNull();
  });

  it('finds /Volumes even when not on the last line', () => {
    const output = [
      '/dev/disk4s2        	Apple_HFS                      	/Volumes/achu',
      'extra trailing noise',
    ].join('\n');
    expect(parseHdiutilMountPoint(output)).toBe('/Volumes/achu');
  });
});

describe('resolveWindowsUpdateTarget', () => {
  it('prefers PORTABLE_EXECUTABLE_FILE when set', () => {
    const prev = process.env.PORTABLE_EXECUTABLE_FILE;
    process.env.PORTABLE_EXECUTABLE_FILE = 'C:\\Users\\me\\Downloads\\achu-x64-26.7.5.exe';
    try {
      expect(resolveWindowsUpdateTarget()).toBe('C:\\Users\\me\\Downloads\\achu-x64-26.7.5.exe');
    } finally {
      if (prev === undefined) delete process.env.PORTABLE_EXECUTABLE_FILE;
      else process.env.PORTABLE_EXECUTABLE_FILE = prev;
    }
  });

  it('falls back to process.execPath when portable env is unset', () => {
    const prev = process.env.PORTABLE_EXECUTABLE_FILE;
    delete process.env.PORTABLE_EXECUTABLE_FILE;
    try {
      expect(resolveWindowsUpdateTarget()).toBe(process.execPath);
    } finally {
      if (prev !== undefined) process.env.PORTABLE_EXECUTABLE_FILE = prev;
    }
  });
});

describe('buildWindowsUpdateScript', () => {
  it('uses console-independent waits and a valid PowerShell relaunch parameter', () => {
    const script = buildWindowsUpdateScript(
      'C:\\Temp\\achu update.exe',
      'C:\\Users\\me\\Downloads\\achu.exe',
      'C:\\Temp\\achu-update.log'
    );

    expect(script).toContain('Start-Sleep -Seconds 2');
    expect(script).toContain("Start-Process -FilePath 'C:\\Users\\me\\Downloads\\achu.exe'");
    expect(script).not.toContain('timeout /t');
    expect(script).not.toContain('Start-Process -LiteralPath');
  });

  it('escapes apostrophes in paths passed to PowerShell', () => {
    const script = buildWindowsUpdateScript(
      "C:\\Users\\O'Brien\\achu update.exe",
      "C:\\Users\\O'Brien\\achu.exe",
      "C:\\Users\\O'Brien\\achu-update.log"
    );

    expect(script).toContain("Start-Process -FilePath 'C:\\Users\\O''Brien\\achu.exe'");
  });
});

describe('selectLinuxAsset', () => {
  it('prefers AppImage over deb for x64', () => {
    const assets = [
      { name: 'achu_26.6.19_amd64.deb', browser_download_url: 'https://dl/amd64.deb' },
      { name: 'achu-26.6.19.AppImage', browser_download_url: 'https://dl/app.AppImage' },
    ];
    // deb is listed first, but AppImage should be preferred (in-place update, no sudo)
    expect(selectLinuxAsset(assets, 'x64')?.name).toBe('achu-26.6.19.AppImage');
  });

  it('prefers AppImage over deb for arm64', () => {
    const assets = [
      { name: 'achu_26.6.19_arm64.deb', browser_download_url: 'https://dl/arm64.deb' },
      { name: 'achu-26.6.19-arm64.AppImage', browser_download_url: 'https://dl/arm64.AppImage' },
    ];
    expect(selectLinuxAsset(assets, 'arm64')?.name).toBe('achu-26.6.19-arm64.AppImage');
  });

  it('picks the arm64 AppImage, not the x64 one, on arm64', () => {
    const assets = [
      { name: 'achu-26.6.19.AppImage', browser_download_url: 'https://dl/app.AppImage' },
      { name: 'achu-26.6.19-arm64.AppImage', browser_download_url: 'https://dl/arm64.AppImage' },
    ];
    expect(selectLinuxAsset(assets, 'arm64')?.name).toBe('achu-26.6.19-arm64.AppImage');
  });

  it('falls back to deb when no AppImage present', () => {
    const assets = [
      { name: 'achu_26.6.19_amd64.deb', browser_download_url: 'https://dl/amd64.deb' },
    ];
    expect(selectLinuxAsset(assets, 'x64')?.name).toBe('achu_26.6.19_amd64.deb');
  });

  it('returns undefined when neither AppImage nor deb present', () => {
    const assets = [
      { name: 'achu-x64-26.6.19.exe', browser_download_url: 'https://dl/app.exe' },
    ];
    expect(selectLinuxAsset(assets, 'x64')).toBeUndefined();
  });
});

/**
 * Regression test for issue #8 — uses the ACTUAL asset order from the
 * v26.6.19 GitHub release to prove the fix works against real-world data.
 * Before the fix, macOS picked the .zip (listed before .dmg) which
 * triggered "Error 94 - Bad message" in Archive Utility.
 */
describe('issue #8 regression — real v26.6.19 release asset order', () => {
  // Exact asset order returned by GitHub API for v26.06.19
  const realAssets = [
    { name: 'achu-26.6.19-arm64.AppImage', browser_download_url: 'https://dl/arm64.AppImage' },
    { name: 'achu-26.6.19-universal-mac.zip', browser_download_url: 'https://dl/mac.zip' },
    { name: 'achu-26.6.19-universal-mac.zip.blockmap', browser_download_url: 'https://dl/mac.zip.blockmap' },
    { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/mac.dmg' },
    { name: 'achu-26.6.19-universal.dmg.blockmap', browser_download_url: 'https://dl/mac.dmg.blockmap' },
    { name: 'achu-26.6.19.AppImage', browser_download_url: 'https://dl/app.AppImage' },
    { name: 'achu-26.6.19.exe', browser_download_url: 'https://dl/app.exe' },
    { name: 'achu-arm64-26.6.19.appx', browser_download_url: 'https://dl/arm64.appx' },
    { name: 'achu-arm64-26.6.19.exe', browser_download_url: 'https://dl/arm64.exe' },
    { name: 'achu-x64-26.6.19.appx', browser_download_url: 'https://dl/x64.appx' },
    { name: 'achu-x64-26.6.19.exe', browser_download_url: 'https://dl/x64.exe' },
    { name: 'achu_26.6.19_amd64.deb', browser_download_url: 'https://dl/amd64.deb' },
    { name: 'achu_26.6.19_arm64.deb', browser_download_url: 'https://dl/arm64.deb' },
    { name: 'builder-debug.yml', browser_download_url: 'https://dl/builder-debug.yml' },
    { name: 'latest-linux-arm64.yml', browser_download_url: 'https://dl/latest-linux-arm64.yml' },
    { name: 'latest-linux.yml', browser_download_url: 'https://dl/latest-linux.yml' },
    { name: 'latest-mac.yml', browser_download_url: 'https://dl/latest-mac.yml' },
  ];

  it('macOS: picks .dmg, NOT .zip (the bug was picking .zip first)', () => {
    const picked = selectMacAsset(realAssets);
    expect(picked?.name).toBe('achu-26.6.19-universal.dmg');
    expect(picked?.name).not.toContain('.zip');
  });

  it('macOS: does not pick .blockmap or .yml metadata files', () => {
    const picked = selectMacAsset(realAssets);
    expect(picked).toBeDefined();
    expect(picked!.name).not.toMatch(/\.(blockmap|yml)$/);
  });

  it('Windows x64: picks x64 exe, not appx or arm64 exe', () => {
    const picked = selectWindowsAsset(realAssets, 'x64');
    expect(picked?.name).toBe('achu-x64-26.6.19.exe');
  });

  it('Windows arm64: picks arm64 exe, not appx or x64 exe', () => {
    const picked = selectWindowsAsset(realAssets, 'arm64');
    expect(picked?.name).toBe('achu-arm64-26.6.19.exe');
  });

  it('Linux x64: picks AppImage, not deb (AppImage supports in-place update)', () => {
    const picked = selectLinuxAsset(realAssets, 'x64');
    expect(picked?.name).toBe('achu-26.6.19.AppImage');
  });

  it('Linux arm64: picks arm64 AppImage, not arm64 deb', () => {
    const picked = selectLinuxAsset(realAssets, 'arm64');
    expect(picked?.name).toBe('achu-26.6.19-arm64.AppImage');
  });
});
