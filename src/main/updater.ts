import { app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { loadSettings, saveSettings, AppSettings } from './settings';

const isDev = !app.isPackaged;

/**
 * True when the running build is an NSIS-installed Windows app — the only
 * Windows distribution electron-updater can service (portable exes and
 * APPX/Store packages are explicitly excluded).
 */
export function isNsisInstall(): boolean {
  return (
    process.platform === 'win32' &&
    !isDev &&
    !process.env.PORTABLE_EXECUTABLE_FILE &&
    !(process as any).windowsStore
  );
}

// electron-updater is imported lazily: touching autoUpdater in dev/tests
// (unpackaged app) throws, and the module must never load on other platforms.
let autoUpdaterInstance: any = null;
async function getAutoUpdater(): Promise<any> {
  if (!autoUpdaterInstance) {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdaterInstance = autoUpdater;
  }
  return autoUpdaterInstance;
}

let nsisProgressWired = false;
function wireNsisProgress(autoUpdater: any, getMainWindow: () => BrowserWindow | null): void {
  if (nsisProgressWired) return;
  nsisProgressWired = true;
  autoUpdater.on('download-progress', (p: any) => {
    const win = getMainWindow();
    if (win) win.webContents.send('update:progress', Math.round(p?.percent || 0));
  });
}

/**
 * Update check for NSIS installs via electron-updater. electron-updater
 * verifies sha512 from latest.yml and handles the install natively, so no
 * custom cache/ETag logic is needed here.
 */
async function performNsisUpdateCheck(): Promise<UpdateCheckResult> {
  const autoUpdater = await getAutoUpdater();
  const result = await autoUpdater.checkForUpdates();
  const info = result?.updateInfo;
  if (!info || !info.version || !isNewerVersion(app.getVersion(), info.version)) {
    return { available: false };
  }
  const notes = typeof info.releaseNotes === 'string' ? info.releaseNotes : '';
  const size = Array.isArray(info.files) && info.files.length > 0 ? info.files[0].size || 0 : 0;
  return {
    available: true,
    version: info.version,
    releaseNotes: notes,
    releaseUrl: RELEASE_PAGE_URL,
    downloadSize: size,
  };
}

/**
 * Downloads and installs the update for NSIS installs. Returns after the
 * download completes; quitAndInstall is scheduled by the caller after the
 * IPC reply is flushed.
 */
async function performNsisInstall(getMainWindow: () => BrowserWindow | null): Promise<void> {
  const autoUpdater = await getAutoUpdater();
  wireNsisProgress(autoUpdater, getMainWindow);
  await autoUpdater.downloadUpdate();
}

/**
 * Quits the app for an update install. app.quit() is graceful — and can hang
 * when native worker threads (OCR, image processing) outlive the window,
 * leaving a dangling process that keeps the exe locked (blocking the batch
 * copy) and blocks/confuses the relaunched instance. A hard-exit backstop
 * guarantees the process dies shortly after the IPC reply is flushed.
 */
function quitForUpdate(): void {
  setTimeout(() => {
    app.quit();
    setTimeout(() => {
      try { app.exit(0); } catch { /* process already gone */ }
    }, 2000);
  }, 500);
}

function quitAndInstallNsis(): void {
  // Backstop: if quitAndInstall's internal app.quit() hangs on a dangling
  // worker, force the process down so the NSIS installer can proceed.
  setTimeout(() => {
    try { app.exit(0); } catch { /* process already gone */ }
  }, 5000);
  try {
    // isSilent + isForceRunAfter: one-click per-user NSIS installs support
    // fully silent in-place updates. The instance is always initialized by
    // performNsisInstall before this is scheduled.
    if (autoUpdaterInstance) {
      autoUpdaterInstance.quitAndInstall(true, true);
      return;
    }
    app.quit();
  } catch (err) {
    console.error('[Updater] quitAndInstall failed, quitting:', err);
    app.quit();
  }
}

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
  if (/missing or empty|incomplete|checksum|corrupt/i.test(error)) {
    return 'The update download was incomplete or corrupted. Please try again — if it keeps failing, download the update from the releases page.';
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
 * Filters to portable .exe assets and picks the one matching the current
 * architecture. NSIS installers (`-Setup-`) are excluded: NSIS installs are
 * serviced by electron-updater, and this custom path can only replace the
 * portable exe a user is actually running. .appx (Store packages) are
 * excluded as well. Exported for unit testing.
 */
export function selectWindowsAsset(assets: ReleaseAsset[], arch: string): ReleaseAsset | undefined {
  const exeAssets = assets.filter((a) => {
    const name = a.name.toLowerCase();
    return name.endsWith('.exe') && !name.includes('-setup-');
  });
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
 * Re-validate a cached update result against the *current* app version.
 * Prevents stale "update available" after the user already upgraded, and
 * drops cached "available" if version fields are missing.
 */
function revalidateCachedResult(cached: UpdateCheckResult): UpdateCheckResult {
  if (!cached.available) return { available: false };
  if (!cached.version) return { available: false };
  if (!isNewerVersion(app.getVersion(), cached.version)) {
    return { available: false };
  }
  return cached;
}

/** Clear update-available cache after a successful install attempt. */
function clearUpdateAvailableCache(): void {
  try {
    const settings = loadSettings();
    settings.lastUpdateResult = { available: false };
    settings.lastUpdateCheck = Date.now();
    // Keep ETag so the next check can still 304 cheaply; result is revalidated.
    saveSettings(settings);
  } catch (err) {
    console.warn('[Updater] Failed to clear update cache:', err);
  }
}

/**
 * Core logic for checking updates against GitHub releases API.
 * Uses ETag-based conditional requests to avoid hitting the 60 req/hr
 * unauthenticated rate limit. 304 responses don't count against the limit.
 * Exported so it can be called from both IPC handler and startup auto-check.
 */
export async function performUpdateCheck(useCache: boolean): Promise<UpdateCheckResult> {
  // NSIS-installed Windows builds use electron-updater (sha512-verified
  // downloads, native NSIS install) instead of the custom GitHub flow.
  if (isNsisInstall()) {
    return performNsisUpdateCheck();
  }

  const settings = loadSettings();
  const ttl = useCache ? CACHE_TTL_MS : MANUAL_CACHE_TTL_MS;

  // Use cached result if within TTL (always re-check vs current app version)
  if (settings.lastUpdateCheck && settings.lastUpdateResult) {
    const age = Date.now() - settings.lastUpdateCheck;
    if (age < ttl) {
      return revalidateCachedResult(settings.lastUpdateResult);
    }
  }

  // Build headers - include ETag for conditional request if we have one
  const headers: Record<string, string> = { 'User-Agent': 'achu-updater' };
  if (settings.lastUpdateETag) {
    headers['If-None-Match'] = settings.lastUpdateETag;
  }

  const response = await fetch(GITHUB_LATEST_URL, { headers });

  // 304 Not Modified - release hasn't changed, use cached result
  if (response.status === 304) {
    if (settings.lastUpdateResult) {
      const revalidated = revalidateCachedResult(settings.lastUpdateResult);
      persistUpdateCache(settings, revalidated, settings.lastUpdateETag || null);
      return revalidated;
    }
    // Stale ETag without a cached result - clear it so the next check is fresh
    console.warn('[Updater] Got 304 without cached result; clearing stale ETag');
    settings.lastUpdateETag = null;
    saveSettings(settings);
    return { available: false };
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
 * Throws if the connection drops mid-body (received bytes < Content-Length).
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
      onProgress(Math.min(100, Math.round((receivedBytes / totalBytes) * 100)));
    }
  });

  await new Promise<void>((resolve, reject) => {
    nodeStream.pipe(fileStream);
    fileStream.on('close', () => resolve());
    nodeStream.on('error', (err: Error) => reject(err));
    fileStream.on('error', (err: Error) => reject(err));
  });

  if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
    throw new Error('Downloaded update file is missing or empty.');
  }
  // A silently truncated body (CDN reset, proxy cut-off) must not pass:
  // it previously reached the installer and corrupted the update.
  if (totalBytes > 0 && receivedBytes !== totalBytes) {
    throw new Error(
      `Downloaded update is incomplete (${receivedBytes} of ${totalBytes} bytes).`
    );
  }
}

/**
 * Streams a file through SHA-512 and returns the base64 digest — the same
 * format electron-builder publishes in latest-mac.yml / latest.yml.
 */
function sha512FileBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    hash.on('error', reject);
    stream.pipe(hash);
    hash.on('finish', () => resolve(hash.digest('base64')));
  });
}

/**
 * Verifies a downloaded update artifact before it is allowed anywhere near
 * the install step. Checks, in order: non-empty, exact byte size (when the
 * expected size is known), PE magic for Windows executables, and SHA-512
 * (when a checksum was published with the release).
 */
export async function verifyDownloadedFile(
  tempPath: string,
  expectedSize?: number,
  expectedSha512?: string
): Promise<void> {
  if (!fs.existsSync(tempPath)) {
    throw new Error('Downloaded update file is missing.');
  }
  const size = fs.statSync(tempPath).size;
  if (size === 0) {
    throw new Error('Downloaded update file is empty.');
  }
  if (expectedSize && expectedSize > 0 && size !== expectedSize) {
    throw new Error(
      `Downloaded update is incomplete (${size} of ${expectedSize} bytes).`
    );
  }
  if (tempPath.toLowerCase().endsWith('.exe')) {
    const fd = fs.openSync(tempPath, 'r');
    try {
      const header = Buffer.alloc(2);
      fs.readSync(fd, header, 0, 2, 0);
      if (header.toString('latin1') !== 'MZ') {
        throw new Error('Downloaded update is corrupt (not a valid executable).');
      }
    } finally {
      fs.closeSync(fd);
    }
  }
  if (expectedSha512) {
    const actual = await sha512FileBase64(tempPath);
    if (actual !== expectedSha512) {
      throw new Error('Downloaded update failed checksum verification.');
    }
  }
}

/**
 * Extracts the sha512 (base64) and size for a given artifact filename from
 * an electron-builder update manifest (latest-mac.yml / latest.yml).
 * The manifest is a small flat YAML doc; a full parser would be overkill.
 * Exported for unit testing.
 */
export function parseSha512FromUpdateYml(
  yml: string,
  filename: string
): { sha512?: string; size?: number } {
  if (!yml || !filename) return {};
  const lines = yml.split(/\r?\n/);
  let inEntry = false;
  let sha512: string | undefined;
  let size: number | undefined;

  const consider = (key: string, value: string) => {
    if (key === 'url' || key === 'path') {
      inEntry = value === filename;
    } else if (inEntry && key === 'sha512') {
      sha512 = value;
    } else if (inEntry && key === 'size') {
      const n = Number(value);
      if (Number.isFinite(n)) size = n;
    }
  };

  for (const line of lines) {
    const m = line.match(/^\s*-?\s*(url|path|sha512|size):\s*('?)(.+?)\2\s*$/);
    if (m) consider(m[1], m[3]);
  }
  return { sha512, size };
}

/**
 * Best-effort lookup of the published SHA-512 for a release asset, from the
 * electron-builder manifest sitting next to it on the same release
 * (latest-mac.yml for macOS, latest.yml for Windows). Returns undefined
 * when no manifest or no matching entry exists — callers then fall back to
 * strict size verification only.
 */
async function fetchPublishedSha512(downloadUrl: string): Promise<string | undefined> {
  try {
    const manifestName = process.platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml';
    const manifestUrl = downloadUrl.replace(/[^/]+$/, manifestName);
    const response = await fetch(manifestUrl, { headers: { 'User-Agent': 'achu-updater' } });
    if (!response.ok) return undefined;
    const yml = await response.text();
    const filename = decodeURIComponent(downloadUrl.split('/').pop() || '');
    return parseSha512FromUpdateYml(yml, filename).sha512;
  } catch (err) {
    console.warn('[Updater] Could not fetch published checksum:', err);
    return undefined;
  }
}

const MAX_DOWNLOAD_ATTEMPTS = 3;

/**
 * Downloads an update artifact with integrity verification and retries.
 * A failed verification deletes the partial file and retries from scratch;
 * a corrupt download must never reach the install step (previously a
 * truncated DMG failed hdiutil with "image data corrupted", and a truncated
 * Windows portable exe was copied over the working installation).
 */
async function downloadVerified(
  downloadUrl: string,
  tempPath: string,
  expectedSize: number | undefined,
  onProgress: (percent: number) => void
): Promise<void> {
  const expectedSha512 = await fetchPublishedSha512(downloadUrl);

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      await downloadWithProgress(downloadUrl, tempPath, onProgress);
      await verifyDownloadedFile(tempPath, expectedSize, expectedSha512);
      return;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Updater] Download attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS} failed:`, err?.message || err);
      try { fs.unlinkSync(tempPath); } catch { /* may not exist */ }
      if (attempt < MAX_DOWNLOAD_ATTEMPTS) {
        onProgress(0);
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  throw lastError || new Error('Update download failed.');
}

// ─── Windows: replace running exe via batch script ───

/**
 * Resolve the on-disk path of the portable EXE the user actually launches.
 * electron-builder portable sets PORTABLE_EXECUTABLE_FILE to the original
 * download path; process.execPath alone often points at a temp extract
 * that is discarded on exit (so "updates" appear to work then vanish).
 */
export function resolveWindowsUpdateTarget(): string {
  const portable = process.env.PORTABLE_EXECUTABLE_FILE;
  if (portable && typeof portable === 'string' && portable.trim()) {
    return portable;
  }
  // Fallback: process.execPath (unpacked / non-portable runs)
  return process.execPath;
}

export function buildWindowsUpdateScript(tempPath: string, execPath: string, logPath: string): string {
  // Escape for embedding inside a double-quoted batch string
  const q = (p: string) => p.replace(/"/g, '""');
  const tempQ = q(tempPath);
  const execQ = q(execPath);
  const logQ = q(logPath);
  const releaseQ = q(RELEASE_PAGE_URL);
  // PowerShell path arguments use single quotes; escape embedded single quotes
  const execPs = execPath.replace(/'/g, "''");
  const execDirPs = path.win32.dirname(execPath).replace(/'/g, "''");

  // copy /y then del is more reliable than move when AV briefly locks the file.
  // Retries after app.quit() releases the running image. The original exe is
  // backed up first and restored if the new copy fails or comes out with the
  // wrong size, so a failed update can never leave the user without a
  // working app.
  //
  // CWD handling matters: the portable wrapper runs the app from a temp
  // extraction dir and deletes it on exit. If this script kept that deleted
  // dir as its working directory, the relaunched process would be created
  // with an invalid CWD and fail to start — so we anchor to %TEMP% and give
  // Start-Process an explicit -WorkingDirectory.
  return `@echo off
setlocal EnableExtensions
cd /d "%TEMP%"
set "LOGFILE=${logQ}"
set "BAKFILE=${execQ}.bak"
echo [%DATE% %TIME%] Starting updater >> "%LOGFILE%"
echo [%DATE% %TIME%] tempPath=${tempQ} >> "%LOGFILE%"
echo [%DATE% %TIME%] execPath=${execQ} >> "%LOGFILE%"
echo [%DATE% %TIME%] pid=%~1 >> "%LOGFILE%"
if exist "%BAKFILE%" del /f /q "%BAKFILE%" >nul 2>&1
copy /y "${execQ}" "%BAKFILE%" >nul 2>&1
for %%F in ("${execQ}") do set "EXENAME=%%~nxF"
set /a count=0
:wait
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
rem Kill dangling achu processes: a graceful quit can hang on native worker
rem threads, and the wrapper process then keeps the exe locked forever.
taskkill /f /im "achu.exe" >nul 2>&1
taskkill /f /im "%EXENAME%" >nul 2>&1
echo [%DATE% %TIME%] Attempt %count%: copy file >> "%LOGFILE%"
copy /y "${tempQ}" "${execQ}" >nul
if errorlevel 1 goto copyfailed
for %%I in ("${tempQ}") do set "NEWSZ=%%~zI"
for %%I in ("${execQ}") do set "OLDSZ=%%~zI"
if "%NEWSZ%"=="%OLDSZ%" goto success
echo [%DATE% %TIME%] Size mismatch after copy (%OLDSZ% != %NEWSZ%), retrying >> "%LOGFILE%"
goto retry
:copyfailed
echo [%DATE% %TIME%] Copy failed (errorlevel=%ERRORLEVEL%), retrying >> "%LOGFILE%"
:retry
set /a count+=1
if %count% LSS 30 goto wait
echo [%DATE% %TIME%] All retries exhausted, restoring backup >> "%LOGFILE%"
if exist "%BAKFILE%" copy /y "%BAKFILE%" "${execQ}" >nul 2>&1
echo [%DATE% %TIME%] Opening browser fallback >> "%LOGFILE%"
start "" "${releaseQ}"
goto done
:success
echo [%DATE% %TIME%] Copy succeeded >> "%LOGFILE%"
del /f /q "${tempQ}" >nul 2>&1
if exist "%BAKFILE%" del /f /q "%BAKFILE%" >nul 2>&1
powershell -NoProfile -Command "try { Unblock-File -LiteralPath '${execPs}' } catch { }"
echo [%DATE% %TIME%] Unblocked file, waiting for security scan >> "%LOGFILE%"
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
echo [%DATE% %TIME%] Launching >> "%LOGFILE%"
powershell -NoProfile -Command "Start-Process -FilePath '${execPs}' -WorkingDirectory '${execDirPs}'"
if errorlevel 1 goto launchfailed
echo [%DATE% %TIME%] Launch command sent >> "%LOGFILE%"
goto done
:launchfailed
echo [%DATE% %TIME%] Launch failed (errorlevel=%ERRORLEVEL%), opening browser fallback >> "%LOGFILE%"
start "" "${releaseQ}"
:done
del "%~f0" >nul 2>&1
`;
}

function performWindowsUpdate(tempPath: string): void {
  const execPath = resolveWindowsUpdateTarget();
  const batPath = path.join(app.getPath('temp'), 'achu-update.bat');
  const logPath = path.join(app.getPath('temp'), 'achu-update.log');

  if (!process.env.PORTABLE_EXECUTABLE_FILE) {
    console.warn(
      '[Updater] PORTABLE_EXECUTABLE_FILE is unset; updating process.execPath. ' +
        'For portable builds this may only patch a temp extract. Target:',
      execPath
    );
  }

  fs.writeFileSync(batPath, buildWindowsUpdateScript(tempPath, execPath, logPath), 'utf-8');

  // Spawn the batch directly (no VBS middleman — script interpreters launched
  // from %TEMP% by an unsigned process are a classic AV/Defender block
  // pattern). windowsHide keeps the console hidden. cwd is pinned to the real
  // temp dir so the script never inherits the portable wrapper's extraction
  // dir, which is deleted when the app exits.
  const { spawn } = require('child_process');
  const child = spawn('cmd.exe', ['/d', '/c', batPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: app.getPath('temp'),
  });
  child.unref();
  clearUpdateAvailableCache();
  // Caller should quit after IPC reply is flushed.
}

// ─── macOS: mount DMG, copy app, relaunch ───

/**
 * Parse `hdiutil attach` text output and return the first /Volumes/... mount point.
 *
 * hdiutil prints lines like:
 *   /dev/disk4s1        	GUID_partition_scheme
 *   /dev/disk4s2        	Apple_HFS                      	/Volumes/achu 26.7.6
 *
 * Using the whole last line as a path is wrong (it includes the device node).
 * `-quiet` can also suppress stdout entirely, so callers should not rely on quiet mode.
 * Exported for unit testing.
 */
export function parseHdiutilMountPoint(output: string): string | null {
  if (!output || !output.trim()) return null;

  const lines = output.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    // Prefer explicit /Volumes/ path (may contain spaces)
    const volumesMatch = line.match(/(\/Volumes\/[^\t\r\n]+?)\s*$/);
    if (volumesMatch) {
      return volumesMatch[1].replace(/\s+$/, '');
    }

    // Tab-separated columns: device, type, mount point
    const tabParts = line.split(/\t+/).map((s) => s.trim()).filter(Boolean);
    const tabLast = tabParts[tabParts.length - 1];
    if (tabLast && tabLast.startsWith('/Volumes/')) {
      return tabLast;
    }

    // Space-padded columns (2+ spaces)
    const spaceParts = line.trim().split(/\s{2,}/);
    const spaceLast = spaceParts[spaceParts.length - 1];
    if (spaceLast && spaceLast.startsWith('/Volumes/')) {
      return spaceLast;
    }
  }
  return null;
}

/**
 * Find a .app bundle at the root of a directory (DMG/zip extract).
 */
function findAppBundle(dir: string): string | null {
  const entries = fs.readdirSync(dir);
  const appName = entries.find((f) => f.endsWith('.app'));
  return appName ? path.join(dir, appName) : null;
}

/**
 * Strip quarantine so the replaced app can launch after an in-app update.
 * Unsigned builds still need Open Anyway on first Gatekeeper encounter, but
 * a fresh com.apple.quarantine from the DMG often re-blocks immediately.
 */
function clearMacQuarantine(appBundle: string): void {
  const { execSync } = require('child_process');
  try {
    execSync(`xattr -dr com.apple.quarantine "${appBundle}"`, { stdio: 'ignore' });
  } catch {
    try {
      execSync(`xattr -cr "${appBundle}"`, { stdio: 'ignore' });
    } catch {
      /* best effort */
    }
  }
}

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
    clearMacQuarantine(destApp);
  } catch (err) {
    // Copy failed - restore the old app so the user isn't left with nothing.
    if (backupPath && fs.existsSync(backupPath)) {
      try { fs.renameSync(backupPath, appBundlePath!); } catch { /* best effort */ }
    }
    throw err;
  }
  // Copy succeeded - remove the old backup asynchronously (best effort).
  if (backupPath) {
    try { fs.rmSync(backupPath, { recursive: true, force: true }); } catch { /* non-fatal */ }
  }
}

export type PlatformInstallResult = {
  installed: boolean;
  relaunching?: boolean;
  manualFallback?: boolean;
  error?: string;
};

/**
 * Install a downloaded macOS update (DMG preferred, ZIP fallback).
 * Does not call app.quit() - the IPC handler quits after the reply is flushed.
 * On failure, opens the release page and returns manualFallback.
 */
function performMacUpdate(tempPath: string): PlatformInstallResult {
  const { execSync, spawn } = require('child_process');
  const appPath = process.execPath;
  // Navigate from the binary inside the .app bundle to the .app root
  // e.g. /Applications/achu.app/Contents/MacOS/achu → /Applications/achu.app
  const appBundlePath = appPath.includes('.app')
    ? appPath.split('.app')[0] + '.app'
    : null;

  let mountPoint: string | null = null;

  try {
    const lower = tempPath.toLowerCase();

    if (lower.endsWith('.dmg')) {
      // Do NOT use -quiet: it can suppress the mount table we need to parse.
      // -nobrowse avoids Finder windows popping during update.
      const mountOutput = execSync(`hdiutil attach "${tempPath}" -nobrowse`, {
        encoding: 'utf-8',
        maxBuffer: 2 * 1024 * 1024,
      });
      const mp = parseHdiutilMountPoint(mountOutput);
      if (!mp) {
        throw new Error(
          `Could not parse DMG mount point from hdiutil output: ${mountOutput.slice(0, 400)}`
        );
      }
      mountPoint = mp;

      const srcApp = findAppBundle(mp);
      if (!srcApp) {
        throw new Error(`No .app found in mounted DMG at ${mp}`);
      }
      const appName = path.basename(srcApp);

      const destDir = appBundlePath ? path.dirname(appBundlePath) : '/Applications';
      const destApp = path.join(destDir, appName);

      replaceAppBundle(srcApp, destApp, appBundlePath);

      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      clearUpdateAvailableCache();
      return { installed: true, relaunching: true };
    }

    if (lower.endsWith('.zip')) {
      // Extract with ditto (not unzip) - electron-builder universal zips use
      // zip64 + xattrs that stock unzip mishandles ("Error 94 - Bad message").
      const unzipDir = path.join(app.getPath('temp'), 'achu-update-extract');
      if (fs.existsSync(unzipDir)) fs.rmSync(unzipDir, { recursive: true, force: true });
      fs.mkdirSync(unzipDir, { recursive: true });
      execSync(`ditto -x -k "${tempPath}" "${unzipDir}"`);

      const srcApp = findAppBundle(unzipDir);
      if (!srcApp) {
        throw new Error('No .app found in ZIP');
      }
      const appName = path.basename(srcApp);

      const destDir = appBundlePath ? path.dirname(appBundlePath) : '/Applications';
      const destApp = path.join(destDir, appName);

      replaceAppBundle(srcApp, destApp, appBundlePath);

      spawn('open', ['-n', destApp], { detached: true, stdio: 'ignore' }).unref();
      clearUpdateAvailableCache();
      return { installed: true, relaunching: true };
    }

    // Unknown format - open the release page so the user can install manually.
    shell.openExternal(RELEASE_PAGE_URL);
    return { installed: false, manualFallback: true, error: 'Unsupported macOS update package format' };
  } catch (err: any) {
    console.error('[Updater] macOS auto-install failed, opening release page:', err);
    // Fallback: open the release page. Do NOT shell.openPath() the raw archive.
    shell.openExternal(RELEASE_PAGE_URL);
    return {
      installed: false,
      manualFallback: true,
      error: err?.message || 'macOS auto-install failed',
    };
  } finally {
    // Always detach the DMG if we mounted one, even on failure.
    if (mountPoint) {
      try {
        execSync(`hdiutil detach "${mountPoint}" -quiet`, { stdio: 'ignore' });
      } catch {
        try {
          execSync(`hdiutil detach "${mountPoint}" -force`, { stdio: 'ignore' });
        } catch { /* best effort */ }
      }
    }
  }
}

// ─── Linux: replace AppImage or install DEB ───

/**
 * Install a downloaded Linux update. Does not call app.quit() - the IPC
 * handler quits after the reply is flushed when install succeeds.
 */
function performLinuxUpdate(tempPath: string): PlatformInstallResult {
  const { execSync, spawn } = require('child_process');
  const execPath = process.execPath;
  const lower = tempPath.toLowerCase();

  try {
    if (lower.endsWith('.appimage')) {
      // Make executable
      fs.chmodSync(tempPath, 0o755);

      // Try to replace the current AppImage.
      // Linux doesn't lock running executables, so we can replace the
      // current one - but we rename it aside first so a failed copy
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
          // Copy failed - restore the old AppImage so the user isn't left with nothing.
          if (backupPath && fs.existsSync(backupPath)) {
            try { fs.renameSync(backupPath, execPath); } catch { /* best effort */ }
          }
          throw err;
        }
        // Copy succeeded - clean up
        try { fs.unlinkSync(tempPath); } catch { /* non-fatal */ }
        if (backupPath) {
          try { fs.unlinkSync(backupPath); } catch { /* non-fatal */ }
        }

        // Relaunch
        spawn(execPath, [], { detached: true, stdio: 'ignore' }).unref();
        clearUpdateAvailableCache();
        return { installed: true, relaunching: true };
      }

      // Can't determine exec path - just open the new AppImage
      shell.openPath(tempPath);
      return { installed: false, manualFallback: true, error: 'Could not locate current AppImage path' };
    }

    if (lower.endsWith('.deb')) {
      // Try installing via pkexec (polkit prompt for sudo)
      try {
        execSync(`pkexec dpkg -i "${tempPath}"`, { stdio: 'ignore' });
        // Relaunch
        spawn('sh', ['-c', `which achu && achu &`], { detached: true, stdio: 'ignore' }).unref();
        clearUpdateAvailableCache();
        return { installed: true, relaunching: true };
      } catch {
        // pkexec failed or cancelled - fall back to opening with xdg-open
        shell.openPath(tempPath);
        return { installed: false, manualFallback: true, error: 'deb install requires admin approval' };
      }
    }

    shell.openPath(tempPath);
    return { installed: false, manualFallback: true, error: 'Unsupported Linux update package format' };
  } catch (err: any) {
    console.error('[Updater] Linux auto-install failed, falling back to opening file:', err);
    shell.openPath(tempPath);
    return {
      installed: false,
      manualFallback: true,
      error: err?.message || 'Linux auto-install failed',
    };
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
  ipcMain.handle('update:start', async (_event: any, downloadUrl?: string | null, expectedSize?: number) => {
    try {
      // Rollout phase - platform specific
      if (isDev) {
        console.log('[Updater] Dev mode: simulation completed successfully');
        return { success: true, simulated: true, relaunching: false };
      }

      // NSIS-installed Windows builds: electron-updater downloads (sha512
      // verified against latest.yml) and installs natively.
      if (isNsisInstall()) {
        await performNsisInstall(getMainWindow);
        setTimeout(() => quitAndInstallNsis(), 800);
        return { success: true, relaunching: true };
      }

      // Microsoft Store (APPX) builds cannot replace files in-place; the
      // Store manages their updates. Point the user at the release page.
      if (process.platform === 'win32' && (process as any).windowsStore) {
        shell.openExternal(RELEASE_PAGE_URL);
        return {
          success: false,
          manualFallback: true,
          error: 'This build was installed from the Microsoft Store. Updates are delivered through the Store; the release page was opened as a fallback.',
        };
      }

      if (!downloadUrl) {
        throw new Error('No download URL provided');
      }

      const filename = path.basename(new URL(downloadUrl).pathname);
      const tempPath = path.join(app.getPath('temp'), filename || 'achu-update');

      const mainWindow = getMainWindow();
      await downloadVerified(downloadUrl, tempPath, expectedSize, (progress: number) => {
        if (mainWindow) {
          mainWindow.webContents.send('update:progress', progress);
        }
      });

      if (process.platform === 'win32') {
        // Spawn detached batch script (needs app to exit so the exe unlocks),
        // return IPC reply, then quit so the reply is not dropped.
        performWindowsUpdate(tempPath);
        quitForUpdate();
        return { success: true, relaunching: true };
      }

      if (process.platform === 'darwin') {
        const result = performMacUpdate(tempPath);
        if (!result.installed) {
          return {
            success: false,
            manualFallback: true,
            error: result.error || 'macOS auto-install failed. Opened the release page.',
          };
        }
        quitForUpdate();
        return { success: true, relaunching: true };
      }

      // Linux
      const result = performLinuxUpdate(tempPath);
      if (!result.installed) {
        return {
          success: false,
          manualFallback: true,
          error: result.error || 'Linux auto-install failed. Opened the package/file.',
        };
      }
      quitForUpdate();
      return { success: true, relaunching: true };
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
