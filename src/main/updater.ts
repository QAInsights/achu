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
    const exeAssets = assets.filter((a: any) => a.name.endsWith('.exe'));
    const arch = process.arch;
    let exeAsset = exeAssets.find((a: any) => a.name.toLowerCase().includes(`-${arch}-`));
    if (!exeAsset) {
      if (arch === 'arm64') {
        exeAsset = exeAssets.find((a: any) => a.name.toLowerCase().includes('arm64'));
      } else {
        exeAsset = exeAssets.find((a: any) => !a.name.toLowerCase().includes('arm64'));
      }
    }
    if (!exeAsset && exeAssets.length > 0) exeAsset = exeAssets[0];
    if (exeAsset) {
      downloadUrl = exeAsset.browser_download_url;
      downloadSize = exeAsset.size || 0;
    }
  } else if (process.platform === 'darwin') {
    const dmgAsset = assets.find((a: any) => a.name.endsWith('.dmg') || a.name.endsWith('.zip'));
    if (dmgAsset) {
      downloadUrl = dmgAsset.browser_download_url;
      downloadSize = dmgAsset.size || 0;
    }
  } else {
    // Linux
    const arch = process.arch;
    const linuxAssets = assets.filter((a: any) =>
      a.name.endsWith('.AppImage') || a.name.endsWith('.deb')
    );
    let linuxAsset;
    if (arch === 'arm64') {
      linuxAsset = linuxAssets.find((a: any) => a.name.toLowerCase().includes('arm64'));
    } else {
      linuxAsset = linuxAssets.find((a: any) =>
        a.name.toLowerCase().includes('amd64') ||
        (a.name.toLowerCase().includes('.appimage') && !a.name.toLowerCase().includes('arm64'))
      );
    }
    if (!linuxAsset && linuxAssets.length > 0) linuxAsset = linuxAssets[0];
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

function performMacUpdate(tempPath: string): void {
  const { execSync, spawn } = require('child_process');
  const appPath = process.execPath;
  // Navigate from the binary inside the .app bundle to the .app root
  // e.g. /Applications/achu.app/Contents/MacOS/achu → /Applications/achu.app
  const appBundlePath = appPath.includes('.app')
    ? appPath.split('.app')[0] + '.app'
    : null;

  try {
    if (tempPath.endsWith('.dmg')) {
      // Mount the DMG
      const mountOutput = execSync(`hdiutil attach "${tempPath}" -nobrowse -quiet`, { encoding: 'utf-8' });
      // Extract mount point from hdiutil output (last volume path)
      const lines = mountOutput.trim().split('\n');
      const mountPoint = lines[lines.length - 1].trim();
      // Find the .app inside the mounted volume
      const volumes = fs.readdirSync(mountPoint);
      const appName = volumes.find((f: string) => f.endsWith('.app'));
      if (!appName) {
        throw new Error('No .app found in DMG');
      }
      const srcApp = path.join(mountPoint, appName);

      // Copy to /Applications (or wherever the current app lives)
      const destDir = appBundlePath
        ? path.dirname(appBundlePath)
        : '/Applications';
      const destApp = path.join(destDir, appName);

      // Remove old app and copy new one
      if (appBundlePath && fs.existsSync(appBundlePath)) {
        fs.rmSync(appBundlePath, { recursive: true, force: true });
      }
      execSync(`cp -R "${srcApp}" "${destApp}"`);

      // Detach the DMG
      execSync(`hdiutil detach "${mountPoint}" -quiet`);

      // Relaunch
      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return;
    }

    if (tempPath.endsWith('.zip')) {
      // Unzip to temp dir
      const unzipDir = path.join(app.getPath('temp'), 'achu-update-extract');
      if (fs.existsSync(unzipDir)) fs.rmSync(unzipDir, { recursive: true, force: true });
      fs.mkdirSync(unzipDir, { recursive: true });
      execSync(`unzip -q "${tempPath}" -d "${unzipDir}"`);

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

      if (appBundlePath && fs.existsSync(appBundlePath)) {
        fs.rmSync(appBundlePath, { recursive: true, force: true });
      }
      execSync(`cp -R "${srcApp}" "${destApp}"`);

      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
      return;
    }

    // Unknown format — fall back to opening it
    shell.openPath(tempPath);
  } catch (err) {
    console.error('[Updater] macOS auto-install failed, falling back to opening file:', err);
    // Fallback: open the file so user can install manually
    shell.openPath(tempPath);
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

      // Try to replace the current AppImage
      // Linux doesn't lock running executables, so we can move over the current one
      if (execPath && fs.existsSync(execPath)) {
        // Move new file to the same location as the current one
        fs.copyFileSync(tempPath, execPath);
        fs.chmodSync(execPath, 0o755);
        fs.unlinkSync(tempPath);

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
