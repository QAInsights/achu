import { app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';
import { loadSettings, saveSettings, AppSettings } from './settings';

const isDev = !app.isPackaged;

const GITHUB_LATEST_URL = 'https://api.github.com/repos/QAInsights/achu/releases/latest';
const RELEASE_PAGE_URL = 'https://github.com/QAInsights/achu/releases/latest';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for startup/auto checks
const MANUAL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for manual checks

/**
 * Compares two CalVer or SemVer strings segment by segment.
 * Normalizes full-year (YYYY) and short-year (YY) CalVer formats so they
 * compare correctly regardless of which convention each side uses.
 * Returns true if latest version is newer than current version.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const normalizeYear = (parts: number[]) => {
    if (parts.length >= 2 && parts[0] > 99) {
      return [parts[0] % 100, ...parts.slice(1)];
    }
    return parts;
  };
  const cParts = normalizeYear(parse(current));
  const lParts = normalizeYear(parse(latest));

  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Maps raw error messages to user-friendly messages with actionable guidance.
 */
export function friendlyUpdateError(error: string): string {
  if (/403|rate limit/i.test(error)) {
    return 'GitHub API rate limit reached. Please try again later or download the update from the releases page.';
  }
  if (/network|fetch|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(error)) {
    return 'Could not connect to the update server. Check your internet connection and try again.';
  }
  if (/status 4\d\d/.test(error)) {
    return 'The update server returned an error. Please try again later or download from the releases page.';
  }
  if (/status 5\d\d/.test(error)) {
    return 'The update server is temporarily unavailable. Please try again later.';
  }
  if (/missing or empty/i.test(error)) {
    return 'The downloaded update file is incomplete. Please try again or download from the releases page.';
  }
  return error || 'An unexpected error occurred during the update.';
}

interface UpdateCheckResult {
  available: boolean;
  version?: string;
  releaseNotes?: string;
  downloadUrl?: string;
  releaseUrl?: string;
  downloadSize?: number;
  error?: string;
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size?: number;
}

/**
 * Selects the best macOS release asset from a GitHub release.
 * Strongly prefers .dmg (the native macOS installer format, handled
 * robustly via hdiutil) over .zip. Falls back to .zip only when no
 * DMG is present — the zip path is fragile because electron-builder's
 * universal zips use zip64 + extended attributes that stock `unzip`
 * and Archive Utility mishandle (the "Error 94 - Bad message" failure).
 * Exported for unit testing.
 */
export function selectMacAsset(assets: ReleaseAsset[]): ReleaseAsset | undefined {
  const dmg = assets.find((a) => a.name.toLowerCase().endsWith('.dmg'));
  if (dmg) return dmg;
  const zip = assets.find((a) => a.name.toLowerCase().endsWith('.zip'));
  return zip;
}

/**
 * Selects the best Windows release asset from a GitHub release.
 * Filters to .exe (portable) assets and picks the one matching the
 * current architecture. The updater can only replace a portable exe,
 * not an .appx (Store package), so .appx is deliberately excluded.
 * Exported for unit testing.
 */
export function selectWindowsAsset(assets: ReleaseAsset[], arch: string): ReleaseAsset | undefined {
  const exeAssets = assets.filter((a) => a.name.toLowerCase().endsWith('.exe'));
  if (exeAssets.length === 0) return undefined;
  // Prefer an exact `-${arch}-` match (e.g. achu-x64-26.6.19.exe)
  let asset = exeAssets.find((a) => a.name.toLowerCase().includes(`-${arch}-`));
  if (!asset) {
    if (arch === 'arm64') {
      asset = exeAssets.find((a) => a.name.toLowerCase().includes('arm64'));
    } else {
      asset = exeAssets.find((a) => !a.name.toLowerCase().includes('arm64'));
    }
  }
  if (!asset) asset = exeAssets[0];
  return asset;
}

/**
 * Selects the best Linux release asset from a GitHub release.
 * Strongly prefers .AppImage (supports in-place replacement without
 * sudo) over .deb (requires pkexec/dpkg). Within each format, picks
 * the asset matching the current architecture. Exported for unit
 * testing.
 */
export function selectLinuxAsset(assets: ReleaseAsset[], arch: string): ReleaseAsset | undefined {
  const appImages = assets.filter((a) => a.name.toLowerCase().endsWith('.appimage'));
  const debs = assets.filter((a) => a.name.toLowerCase().endsWith('.deb'));

  const pickByArch = (list: ReleaseAsset[]): ReleaseAsset | undefined => {
    if (arch === 'arm64') {
      return list.find((a) => a.name.toLowerCase().includes('arm64'));
    }
    // x64: match 'amd64' (deb naming) or no-arch (AppImage default build)
    return list.find((a) =>
      a.name.toLowerCase().includes('amd64') ||
      (a.name.toLowerCase().endsWith('.appimage') && !a.name.toLowerCase().includes('arm64'))
    );
  };

  // Prefer AppImage (in-place update, no sudo) over deb (needs pkexec)
  return pickByArch(appImages) || pickByArch(debs) || appImages[0] || debs[0];
}

/**
 * Core logic for checking updates against GitHub releases API.
 * Uses ETag-based conditional requests to avoid hitting the 60 req/hr
 * unauthenticated rate limit. 304 responses don't count against the limit.
 * Exported so it can be called from both IPC handler and startup auto-check.
 */
export async function performUpdateCheck(useCache: boolean): Promise<UpdateCheckResult> {
  const settings = loadSettings();
  const ttl = useCache ? CACHE_TTL_MS : MANUAL_CACHE_TTL_MS;

  // Use cached result if within TTL
  if (settings.lastUpdateCheck && settings.lastUpdateResult) {
    const age = Date.now() - settings.lastUpdateCheck;
    if (age < ttl) {
      return settings.lastUpdateResult;
    }
  }

  // Build headers — include ETag for conditional request if we have one
  const headers: Record<string, string> = { 'User-Agent': 'achu-updater' };
  if (settings.lastUpdateETag) {
    headers['If-None-Match'] = settings.lastUpdateETag;
  }

  const response = await fetch(GITHUB_LATEST_URL, { headers });

  // 304 Not Modified — release hasn't changed, use cached result
  if (response.status === 304) {
    if (settings.lastUpdateResult) {
      persistUpdateCache(settings, settings.lastUpdateResult, settings.lastUpdateETag || null);
      return settings.lastUpdateResult;
    }
  }

  if (!response.ok) {
    throw new Error(`GitHub API returned status ${response.status}`);
  }

  // Store ETag for future conditional requests
  const etag = response.headers.get('etag') || null;

  const data = (await response.json()) as any;
  const latestVersion = data.tag_name || '';
  const newer = isNewerVersion(app.getVersion(), latestVersion);

  if (!newer) {
    const result: UpdateCheckResult = { available: false };
    persistUpdateCache(settings, result, etag);
    return result;
  }

  const assets = data.assets || [];
  let downloadUrl = '';
  let downloadSize = 0;

  // Match asset by platform
  if (process.platform === 'win32') {
    const winAsset = selectWindowsAsset(assets, process.arch);
    if (winAsset) {
      downloadUrl = winAsset.browser_download_url;
      downloadSize = winAsset.size || 0;
    }
  } else if (process.platform === 'darwin') {
    const macAsset = selectMacAsset(assets);
    if (macAsset) {
      downloadUrl = macAsset.browser_download_url;
      downloadSize = macAsset.size || 0;
    }
  } else {
    // Linux
    const linuxAsset = selectLinuxAsset(assets, process.arch);
    if (linuxAsset) {
      downloadUrl = linuxAsset.browser_download_url;
      downloadSize = linuxAsset.size || 0;
    }
  }

  // Fallback to first asset
  if (!downloadUrl && assets.length > 0) {
    downloadUrl = assets[0].browser_download_url;
    downloadSize = assets[0].size || 0;
  }

  const result: UpdateCheckResult = {
    available: true,
    version: latestVersion.replace(/^v/, ''),
    releaseNotes: data.body || '',
    downloadUrl,
    releaseUrl: data.html_url || RELEASE_PAGE_URL,
    downloadSize,
  };
  persistUpdateCache(settings, result, etag);
  return result;
}

function persistUpdateCache(settings: AppSettings, result: UpdateCheckResult, etag: string | null) {
  settings.lastUpdateCheck = Date.now();
  settings.lastUpdateResult = {
    available: result.available,
    version: result.version,
    releaseUrl: result.releaseUrl,
    downloadUrl: result.downloadUrl,
    downloadSize: result.downloadSize,
    releaseNotes: result.releaseNotes,
  };
  if (etag !== null) {
    settings.lastUpdateETag = etag;
  }
  saveSettings(settings);
}

/**
 * Downloads a file from the given URL to a temp path, reporting progress.
 */
async function downloadWithProgress(
  downloadUrl: string,
  tempPath: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const totalBytes = Number(response.headers.get('content-length') || 0);
  if (!response.body) {
    throw new Error('No response body stream available');
  }

  const fileStream = fs.createWriteStream(tempPath);
  const nodeStream = Readable.fromWeb(response.body as any);
  let receivedBytes = 0;

  nodeStream.on('data', (chunk: any) => {
    receivedBytes += chunk.length;
    if (totalBytes > 0) {
      onProgress(Math.round((receivedBytes / totalBytes) * 100));
    }
  });

  await new Promise<void>((resolve, reject) => {
    nodeStream.pipe(fileStream);
    fileStream.on('finish', () => resolve());
    nodeStream.on('error', (err: Error) => reject(err));
    fileStream.on('error', (err: Error) => reject(err));
  });

  // Verify file was written and is non-empty
  if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
    throw new Error('Downloaded update file is missing or empty.');
  }
}

// ─── Windows: replace running exe via batch script ───

function performWindowsUpdate(tempPath: string): void {
  const execPath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const batPath = path.join(app.getPath('temp'), 'achu-update.bat');
  const logPath = path.join(app.getPath('temp'), 'achu-update.log');

  const batContent = `@echo off
set LOGFILE=${logPath}
echo [%DATE% %TIME%] Starting updater >> "%LOGFILE%"
echo [%DATE% %TIME%] tempPath=${tempPath} >> "%LOGFILE%"
echo [%DATE% %TIME%] execPath=${execPath} >> "%LOGFILE%"
set count=0
:wait
timeout /t 2 /nobreak >nul
echo [%DATE% %TIME%] Attempt %count%: moving file >> "%LOGFILE%"
move /y "${tempPath}" "${execPath}"
if not errorlevel 1 goto success
echo [%DATE% %TIME%] Move failed (errorlevel=%ERRORLEVEL%), retrying >> "%LOGFILE%"
set /a count=count+1
if %count% LSS 20 goto wait
echo [%DATE% %TIME%] All retries exhausted, opening browser fallback >> "%LOGFILE%"
start "" "${RELEASE_PAGE_URL}"
goto done
:success
echo [%DATE% %TIME%] Move succeeded >> "%LOGFILE%"
powershell -Command "Unblock-File -LiteralPath '${execPath.replace(/'/g, "''")}'"
echo [%DATE% %TIME%] Unblocked file, waiting for security scan >> "%LOGFILE%"
timeout /t 3 /nobreak >nul
echo [%DATE% %TIME%] Launching >> "%LOGFILE%"
powershell -Command "Start-Process -LiteralPath '${execPath.replace(/'/g, "''")}'"
echo [%DATE% %TIME%] Launch command sent >> "%LOGFILE%"
:done
del "%~f0"
`;

  fs.writeFileSync(batPath, batContent, 'utf-8');

  // Use VBS to run the batch script hidden (no console window)
  const vbsPath = path.join(app.getPath('temp'), 'achu-launcher.vbs');
  const vbsContent =
    'Set oShell = CreateObject("WScript.Shell")\r\n' +
    'oShell.Run "cmd.exe /c " & Chr(34) & WScript.arguments(0) & Chr(34), 0, False\r\n';
  fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

  const { spawn } = require('child_process');
  const child = spawn('wscript.exe', ['/nologo', vbsPath, batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  app.quit();
}

// ─── macOS: mount DMG, copy app, relaunch ───

/**
 * Safely replaces the running .app bundle with the new one.
 * The old app is renamed aside BEFORE the copy so a failed copy never
 * leaves the user with no app at all. `ditto` is used for the copy
 * because (unlike `cp -R`) it preserves resource forks, extended
 * attributes, and code signatures that Gatekeeper requires.
 */
function replaceAppBundle(srcApp: string, destApp: string, appBundlePath: string | null): void {
  const { execSync } = require('child_process');
  // Move the old app aside first so a failed copy is recoverable.
  // A running app's binary is memory-mapped, but renaming the bundle
  // directory is safe on macOS (the running process keeps its file handles).
  let backupPath: string | null = null;
  if (appBundlePath && fs.existsSync(appBundlePath)) {
    backupPath = `${appBundlePath}.old`;
    // Clean up any stale backup from a previous attempt
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    fs.renameSync(appBundlePath, backupPath);
  }
  try {
    // ditto preserves resource forks, extended attributes, and code signatures.
    execSync(`ditto "${srcApp}" "${destApp}"`);
  } catch (err) {
    // Copy failed — restore the old app so the user isn't left with nothing.
    if (backupPath && fs.existsSync(backupPath)) {
      try { fs.renameSync(backupPath, appBundlePath!); } catch { /* best effort */ }
    }
    throw err;
  }
  // Copy succeeded — remove the old backup asynchronously (best effort).
  if (backupPath) {
    try { fs.rmSync(backupPath, { recursive: true, force: true }); } catch { /* non-fatal */ }
  }
}

function performMacUpdate(tempPath: string): void {
  const { execSync, spawn } = require('child_process');
  const appPath = process.execPath;
  // Navigate from the binary inside the .app bundle to the .app root
  // e.g. /Applications/achu.app/Contents/MacOS/achu → /Applications/achu.app
  const appBundlePath = appPath.includes('.app')
    ? appPath.split('.app')[0] + '.app'
    : null;

  let mountPoint: string | null = null;

  try {
    if (tempPath.endsWith('.dmg')) {
      // Mount the DMG
      const mountOutput = execSync(`hdiutil attach "${tempPath}" -nobrowse -quiet`, { encoding: 'utf-8' });
      // Extract mount point from hdiutil output (last volume path)
      const lines = mountOutput.trim().split('\n');
      const mp = lines[lines.length - 1].trim();
      mountPoint = mp; // tracked for detach in finally
      // Find the .app inside the mounted volume
      const volumes = fs.readdirSync(mp);
      const appName = volumes.find((f: string) => f.endsWith('.app'));
      if (!appName) {
        throw new Error('No .app found in DMG');
      }
      const srcApp = path.join(mp, appName);

      // Copy to /Applications (or wherever the current app lives)
      const destDir = appBundlePath
        ? path.dirname(appBundlePath)
        : '/Applications';
      const destApp = path.join(destDir, appName);

      replaceAppBundle(srcApp, destApp, appBundlePath);

      // Relaunch
      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return;
    }

    if (tempPath.endsWith('.zip')) {
      // Extract the zip. `ditto` is used instead of `unzip` because
      // electron-builder's universal-build zips use zip64 + extended
      // attributes that the stock `unzip` (and Archive Utility) mishandle —
      // the documented "Error 94 - Bad message" failure. ditto is Apple's
      // native tool and preserves resource forks + code signatures.
      const unzipDir = path.join(app.getPath('temp'), 'achu-update-extract');
      if (fs.existsSync(unzipDir)) fs.rmSync(unzipDir, { recursive: true, force: true });
      fs.mkdirSync(unzipDir, { recursive: true });
      execSync(`ditto -x -k "${tempPath}" "${unzipDir}"`);

      // Find the .app
      const files = fs.readdirSync(unzipDir);
      const appName = files.find((f: string) => f.endsWith('.app'));
      if (!appName) {
        throw new Error('No .app found in ZIP');
      }
      const srcApp = path.join(unzipDir, appName);

      const destDir = appBundlePath
        ? path.dirname(appBundlePath)
        : '/Applications';
      const destApp = path.join(destDir, appName);

      replaceAppBundle(srcApp, destApp, appBundlePath);

      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return;
    }

    // Unknown format — open the release page so the user can install manually.
    shell.openExternal(RELEASE_PAGE_URL);
  } catch (err) {
    console.error('[Updater] macOS auto-install failed, opening release page:', err);
    // Fallback: open the release page in the browser so the user can
    // download/install manually. Do NOT shell.openPath() the raw archive —
    // that invokes Archive Utility, which fails with "Error 94 - Bad message"
    // on electron-builder universal zips.
    shell.openExternal(RELEASE_PAGE_URL);
  } finally {
    // Always detach the DMG if we mounted one, even on failure.
    if (mountPoint) {
      try { execSync(`hdiutil detach "${mountPoint}" -quiet`); } catch { /* best effort */ }
    }
  }
}

// ─── Linux: replace AppImage or install DEB ───

function performLinuxUpdate(tempPath: string): void {
  const { execSync, spawn } = require('child_process');
  const execPath = process.execPath;

  try {
    if (tempPath.endsWith('.AppImage')) {
      // Make executable
      fs.chmodSync(tempPath, 0o755);

      // Try to replace the current AppImage.
      // Linux doesn't lock running executables, so we can replace the
      // current one — but we rename it aside first so a failed copy
      // never leaves the user with a corrupted AppImage.
      if (execPath && fs.existsSync(execPath)) {
        let backupPath: string | null = null;
        try {
          backupPath = `${execPath}.old`;
          if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
          fs.renameSync(execPath, backupPath);
          fs.copyFileSync(tempPath, execPath);
          fs.chmodSync(execPath, 0o755);
        } catch (err) {
          // Copy failed — restore the old AppImage so the user isn't left with nothing.
          if (backupPath && fs.existsSync(backupPath)) {
            try { fs.renameSync(backupPath, execPath); } catch { /* best effort */ }
          }
          throw err;
        }
        // Copy succeeded — clean up
        try { fs.unlinkSync(tempPath); } catch { /* non-fatal */ }
        if (backupPath) {
          try { fs.unlinkSync(backupPath); } catch { /* non-fatal */ }
        }

        // Relaunch
        spawn(execPath, [], { detached: true, stdio: 'ignore' }).unref();
        app.quit();
        return;
      }

      // Can't determine exec path — just open the new AppImage
      shell.openPath(tempPath);
      return;
    }

    if (tempPath.endsWith('.deb')) {
      // Try installing via pkexec (polkit prompt for sudo)
      try {
        execSync(`pkexec dpkg -i "${tempPath}"`, { stdio: 'ignore' });
        // Relaunch
        spawn('sh', ['-c', `which achu && achu &`], { detached: true, stdio: 'ignore' }).unref();
        app.quit();
        return;
      } catch {
        // pkexec failed or cancelled — fall back to opening with xdg-open
        shell.openPath(tempPath);
      }
      return;
    }

    shell.openPath(tempPath);
  } catch (err) {
    console.error('[Updater] Linux auto-install failed, falling back to opening file:', err);
    shell.openPath(tempPath);
  }
}

/**
 * Registers IPC handlers for update checks and update installation.
 */
export function registerUpdaterHandlers(ipcMain: any, getMainWindow: () => BrowserWindow | null) {
  // Check for updates. force=true uses a shorter 5-min cache TTL (manual check);
  // force=false uses the full 1-hour TTL (startup auto-check).
  ipcMain.handle('update:check', async (_event: any, force?: boolean) => {
    try {
      const result = await performUpdateCheck(!force);
      return result;
    } catch (error: any) {
      console.error('[Updater] Failed to check for updates:', error);
      const friendly = friendlyUpdateError(error.message || 'Failed to check for updates');
      throw new Error(friendly);
    }
  });

  // Start download and rollout update
  ipcMain.handle('update:start', async (_event: any, downloadUrl: string) => {
    try {
      if (!downloadUrl) {
        throw new Error('No download URL provided');
      }

      const filename = path.basename(new URL(downloadUrl).pathname);
      const tempPath = path.join(app.getPath('temp'), filename || 'achu-update');

      const mainWindow = getMainWindow();
      await downloadWithProgress(downloadUrl, tempPath, (progress: number) => {
        if (mainWindow) {
          mainWindow.webContents.send('update:progress', progress);
        }
      });

      // Rollout phase — platform specific
      if (isDev) {
        console.log('[Updater] Dev mode: simulation completed successfully');
        return { success: true, simulated: true };
      }

      if (process.platform === 'win32') {
        performWindowsUpdate(tempPath);
        return { success: true };
      } else if (process.platform === 'darwin') {
        performMacUpdate(tempPath);
        return { success: true, opened: true };
      } else {
        performLinuxUpdate(tempPath);
        return { success: true, opened: true };
      }
    } catch (error: any) {
      console.error('[Updater] Update installation failed:', error);
      const friendly = friendlyUpdateError(error.message || 'Failed to install update');
      throw new Error(friendly);
    }
  });

  // Open release page in browser (fallback)
  ipcMain.handle('update:open-release-page', async () => {
    shell.openExternal(RELEASE_PAGE_URL);
  });
}

/**
 * Performs a startup auto-check for updates.
 * Called from main.ts after app ready with a delay.
 * Sends 'update:available' IPC event to the renderer if an update is found.
 */
export async function performStartupUpdateCheck(getMainWindow: () => BrowserWindow | null) {
  const settings = loadSettings();
  if (!settings.checkForUpdatesOnStartup) return;
  if (isDev) return; // Skip in development

  try {
    const result = await performUpdateCheck(true); // use cache
    if (result.available) {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('update:available', {
          version: result.version,
          releaseUrl: result.releaseUrl,
        });
      }
    }
  } catch (err) {
    // Silent failure on startup — don't bother the user
    console.error('[Updater] Startup update check failed:', err);
  }
}
