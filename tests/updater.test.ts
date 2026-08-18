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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  isNewerVersion,
  registerUpdaterHandlers,
  selectMacAsset,
  selectWindowsAsset,
  selectLinuxAsset,
  parseHdiutilMountPoint,
  resolveWindowsUpdateTarget,
  buildWindowsUpdateScript,
  parseSha512FromUpdateYml,
  verifyDownloadedFile,
  sanitizeReleaseNotes,
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

describe('selectMacAsset (macOS automatic update package)', () => {
  it('prefers .zip over .dmg because the automatic installer uses ditto', () => {
    const assets = [
      { name: 'achu-26.6.19-universal-mac.zip', browser_download_url: 'https://dl/app.zip' },
      { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/app.dmg' },
    ];
    const picked = selectMacAsset(assets);
    expect(picked?.name).toBe('achu-26.6.19-universal-mac.zip');
  });

  it('falls back to .dmg when no .zip is present', () => {
    const assets = [
      { name: 'achu-26.6.19-universal.dmg', browser_download_url: 'https://dl/app.dmg' },
    ];
    const picked = selectMacAsset(assets);
    expect(picked?.name).toBe('achu-26.6.19-universal.dmg');
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

  it('excludes NSIS -Setup- installers (serviced by electron-updater, not the portable replace path)', () => {
    const assets = [
      { name: 'achu-Setup-x64-26.8.0.exe', browser_download_url: 'https://dl/setup-x64.exe' },
      { name: 'achu-Setup-arm64-26.8.0.exe', browser_download_url: 'https://dl/setup-arm64.exe' },
      { name: 'achu-x64-26.8.0.exe', browser_download_url: 'https://dl/x64.exe' },
      { name: 'achu-arm64-26.8.0.exe', browser_download_url: 'https://dl/arm64.exe' },
    ];
    expect(selectWindowsAsset(assets, 'x64')?.name).toBe('achu-x64-26.8.0.exe');
    expect(selectWindowsAsset(assets, 'arm64')?.name).toBe('achu-arm64-26.8.0.exe');
  });

  it('returns undefined when only NSIS setup exes are present', () => {
    const assets = [
      { name: 'achu-Setup-x64-26.8.0.exe', browser_download_url: 'https://dl/setup-x64.exe' },
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

  it('anchors CWD to %TEMP% and relaunches with an explicit working directory (portable wrapper deletes its extraction dir on exit)', () => {
    const script = buildWindowsUpdateScript(
      'C:\\Temp\\achu update.exe',
      'C:\\Users\\me\\Downloads\\achu.exe',
      'C:\\Temp\\achu-update.log'
    );

    expect(script).toContain('cd /d "%TEMP%"');
    expect(script).toContain(
      "Start-Process -FilePath 'C:\\Users\\me\\Downloads\\achu.exe' -WorkingDirectory 'C:\\Users\\me\\Downloads'"
    );
  });

  it('escapes apostrophes in paths passed to PowerShell', () => {
    const script = buildWindowsUpdateScript(
      "C:\\Users\\O'Brien\\achu update.exe",
      "C:\\Users\\O'Brien\\achu.exe",
      "C:\\Users\\O'Brien\\achu-update.log"
    );

    expect(script).toContain("Start-Process -FilePath 'C:\\Users\\O''Brien\\achu.exe'");
    expect(script).toContain("-WorkingDirectory 'C:\\Users\\O''Brien'");
  });

  it('backs up the original exe and restores it when retries are exhausted', () => {
    const script = buildWindowsUpdateScript(
      'C:\\Temp\\achu update.exe',
      'C:\\Users\\me\\Downloads\\achu.exe',
      'C:\\Temp\\achu-update.log'
    );

    // Backup of the running exe before replacing it
    expect(script).toContain('set "BAKFILE=C:\\Users\\me\\Downloads\\achu.exe.bak"');
    expect(script).toContain('copy /y "C:\\Users\\me\\Downloads\\achu.exe" "%BAKFILE%"');
    // Restore on failure so the user is never left without a working app
    expect(script).toContain('if exist "%BAKFILE%" copy /y "%BAKFILE%" "C:\\Users\\me\\Downloads\\achu.exe"');
    // Post-copy size verification (guards against partial copies)
    expect(script).toContain('if "%NEWSZ%"=="%OLDSZ%" goto success');
    // Backup cleaned up on success
    expect(script).toContain('if exist "%BAKFILE%" del /f /q "%BAKFILE%"');
  });

  it('kills dangling achu processes before copying (graceful quit can hang on native workers)', () => {
    const script = buildWindowsUpdateScript(
      'C:\\Temp\\achu update.exe',
      'C:\\Users\\me\\Downloads\\achu-x64-26.8.1.exe',
      'C:\\Temp\\achu-update.log'
    );

    // Inner extracted process name + the wrapper image name derived from the exe path
    expect(script).toContain('taskkill /f /im "achu.exe"');
    expect(script).toContain('for %%F in ("C:\\Users\\me\\Downloads\\achu-x64-26.8.1.exe") do set "EXENAME=%%~nxF"');
    expect(script).toContain('taskkill /f /im "%EXENAME%"');
    // Kills happen before the copy attempt, never after (would kill the relaunched app)
    expect(script.indexOf('taskkill /f /im "%EXENAME%"')).toBeLessThan(script.indexOf(':success'));
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
 * Uses the actual asset order from v26.6.19. The ZIP is safe here because
 * the in-app updater extracts it with `ditto`; it is never handed to Archive
 * Utility (issue #8), and avoiding the DMG prevents the hdiutil corruption
 * failure reported in issue #11.
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

  it('macOS: picks the .zip payload consumed by the ditto install path', () => {
    const picked = selectMacAsset(realAssets);
    expect(picked?.name).toBe('achu-26.6.19-universal-mac.zip');
    expect(picked?.name).not.toContain('.dmg');
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

describe('parseSha512FromUpdateYml', () => {
  // Matches the structure electron-builder emits for macOS releases
  const latestMacYml = [
    'version: 26.8.0',
    'files:',
    '  - url: achu-26.8.0-universal-mac.zip',
    '    sha512: ZmFrZV96aXAtYzI1Ng==',
    '    size: 111111111',
    '  - url: achu-26.8.0-universal.dmg',
    '    sha512: RG1nU2hhNTEyQmFzZTY0',
    '    size: 222327129',
    "path: achu-26.8.0-universal-mac.zip",
    'sha512: ZmFrZV96aXAtYzI1Ng==',
    "releaseDate: '2026-08-03T03:36:57.000Z'",
  ].join('\n');

  it('extracts sha512 and size for the matching file entry', () => {
    const dmg = parseSha512FromUpdateYml(latestMacYml, 'achu-26.8.0-universal.dmg');
    expect(dmg.sha512).toBe('RG1nU2hhNTEyQmFzZTY0');
    expect(dmg.size).toBe(222327129);

    const zip = parseSha512FromUpdateYml(latestMacYml, 'achu-26.8.0-universal-mac.zip');
    expect(zip.sha512).toBe('ZmFrZV96aXAtYzI1Ng==');
    expect(zip.size).toBe(111111111);
  });

  it('falls back to top-level path entry when the filename matches it', () => {
    const minimal = ['version: 26.8.0', 'path: achu-26.8.0.exe', 'sha512: dG9wTGV2ZWxTaGE=', 'size: 42'].join('\n');
    expect(parseSha512FromUpdateYml(minimal, 'achu-26.8.0.exe').sha512).toBe('dG9wTGV2ZWxTaGE=');
  });

  it('returns empty when the filename is not in the manifest', () => {
    expect(parseSha512FromUpdateYml(latestMacYml, 'achu-x64-26.8.0.exe')).toEqual({});
  });

  it('handles empty input', () => {
    expect(parseSha512FromUpdateYml('', 'x.dmg')).toEqual({});
    expect(parseSha512FromUpdateYml(latestMacYml, '')).toEqual({});
  });
});

describe('sanitizeReleaseNotes', () => {
  it('strips GitHub auto-generated Full Changelog HTML footer (the reported UI bug)', () => {
    const html = '<p><strong>Full Changelog</strong>: <a class="commit-link" href="https://github.com/QAInsights/achu/compare/v26.08.03...v26.08.06"><tt>v26.08.03...v26.08.06</tt></a></p>';
    const out = sanitizeReleaseNotes(html);
    expect(out).not.toContain('<');
    expect(out).not.toContain('href');
    expect(out).toContain('Full Changelog');
    expect(out).toContain('v26.08.03...v26.08.06');
  });

  it('converts block tags and list items to readable plain text', () => {
    const html = '<h2>What\'s Changed</h2><ul><li>Fix one</li><li>Fix two</li></ul><p>Done</p>';
    const out = sanitizeReleaseNotes(html);
    expect(out).toContain("What's Changed");
    expect(out).toContain('• Fix one');
    expect(out).toContain('• Fix two');
    expect(out).toContain('Done');
    expect(out).not.toMatch(/<\w+/);
  });

  it('decodes common HTML entities', () => {
    expect(sanitizeReleaseNotes('a &amp; b &lt;ok&gt; &quot;q&quot;')).toBe('a & b <ok> "q"');
  });

  it('passes plain markdown through unchanged', () => {
    const md = '## What\'s Changed\n\n* fix: something by @user in #123';
    expect(sanitizeReleaseNotes(md)).toBe(md);
  });

  it('handles empty input', () => {
    expect(sanitizeReleaseNotes('')).toBe('');
  });
});

describe('verifyDownloadedFile (issue #11 — truncated downloads must never install)', () => {
  const tmpFile = (name: string, content: Buffer | string) => {
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'achu-test-')), name);
    fs.writeFileSync(p, content);
    return p;
  };

  it('accepts a file whose size matches the expected size', async () => {
    const p = tmpFile('update.dmg', Buffer.alloc(1024, 1));
    await expect(verifyDownloadedFile(p, 1024)).resolves.toBeUndefined();
  });

  it('rejects a truncated file (size mismatch)', async () => {
    const p = tmpFile('update.dmg', Buffer.alloc(512, 1));
    await expect(verifyDownloadedFile(p, 1024)).rejects.toThrow(/incomplete/);
  });

  it('rejects an empty file', async () => {
    const p = tmpFile('update.dmg', Buffer.alloc(0));
    await expect(verifyDownloadedFile(p)).rejects.toThrow(/empty/);
  });

  it('rejects a missing file', async () => {
    await expect(verifyDownloadedFile(path.join(os.tmpdir(), 'does-not-exist-achu.dmg'))).rejects.toThrow(/missing/);
  });

  it('rejects a corrupt .exe without the MZ header', async () => {
    const p = tmpFile('update.exe', Buffer.from('NOT_A_PE_FILE.....'));
    await expect(verifyDownloadedFile(p)).rejects.toThrow(/corrupt/);
  });

  it('accepts a valid .exe (MZ header) with matching size', async () => {
    const p = tmpFile('update.exe', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(998)]));
    await expect(verifyDownloadedFile(p, 1000)).resolves.toBeUndefined();
  });

  it('verifies sha512 (base64) when a checksum is published', async () => {
    const content = Buffer.alloc(2048, 7);
    const p = tmpFile('update.dmg', content);
    const good = crypto.createHash('sha512').update(content).digest('base64');
    await expect(verifyDownloadedFile(p, 2048, good)).resolves.toBeUndefined();

    const bad = crypto.createHash('sha512').update(Buffer.from('tampered')).digest('base64');
    await expect(verifyDownloadedFile(p, 2048, bad)).rejects.toThrow(/checksum/);
  });
});
