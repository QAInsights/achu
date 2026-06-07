import { app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

const isDev = !app.isPackaged;

/**
 * Reads the PE header of a Windows executable to determine its target architecture.
 */
function getExeArch(filePath: string): 'x64' | 'arm64' | 'x86' | 'unknown' {
  try {
    const mzBuf = Buffer.alloc(64);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, mzBuf, 0, 64, 0);
    fs.closeSync(fd);
    if (mzBuf[0] !== 0x4D || mzBuf[1] !== 0x5A) return 'unknown';
    const peOffset = mzBuf.readUInt32LE(60);
    const peBuf = Buffer.alloc(6);
    const fd2 = fs.openSync(filePath, 'r');
    fs.readSync(fd2, peBuf, 0, 6, peOffset);
    fs.closeSync(fd2);
    const machine = peBuf.readUInt16LE(4);
    if (machine === 0x8664) return 'x64';
    if (machine === 0xAA64) return 'arm64';
    if (machine === 0x014C) return 'x86';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Compares two CalVer or SemVer strings segment by segment.
 * Returns true if latest version is newer than current version.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number);
  const cParts = parse(current);
  const lParts = parse(latest);
  
  for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
    const c = cParts[i] || 0;
    const l = lParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Registers IPC handlers for update checks and update installation.
 */
export function registerUpdaterHandlers(ipcMain: any, getMainWindow: () => BrowserWindow | null) {
  // Check for updates
  ipcMain.handle('update:check', async () => {
    try {
      const currentVersion = app.getVersion();
      const response = await fetch('https://api.github.com/repos/QAInsights/achu/releases/latest', {
        headers: {
          'User-Agent': 'achu-updater'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      const data = (await response.json()) as any;
      const latestVersion = data.tag_name || '';
      
      const newer = isNewerVersion(currentVersion, latestVersion);
      if (newer) {
        let downloadUrl = '';
        const assets = data.assets || [];
        
        // Match asset by platform
        if (process.platform === 'win32') {
          const exeAssets = assets.filter((asset: any) => asset.name.endsWith('.exe'));
          console.log(`[Updater] Available exe assets: ${exeAssets.map((a: any) => a.name).join(', ')}`);
          const arch = process.arch;
          let exeAsset;
          // Primary: match explicit arch segment e.g. achu-x64-26.6.5.exe / achu-arm64-26.6.5.exe
          exeAsset = exeAssets.find((asset: any) =>
            asset.name.toLowerCase().includes(`-${arch}-`)
          );
          // Fallback for older releases: arm64 has 'arm64' anywhere; x64 has no 'arm64'
          if (!exeAsset) {
            if (arch === 'arm64') {
              exeAsset = exeAssets.find((asset: any) =>
                asset.name.toLowerCase().includes('arm64')
              );
            } else {
              exeAsset = exeAssets.find((asset: any) =>
                !asset.name.toLowerCase().includes('arm64')
              );
            }
          }
          if (!exeAsset && exeAssets.length > 0) {
            exeAsset = exeAssets[0];
          }
          if (exeAsset) {
            downloadUrl = exeAsset.browser_download_url;
            console.log(`[Updater] Selected asset: ${exeAsset.name} for arch=${process.arch}`);
          }
        } else if (process.platform === 'darwin') {
          // macOS dmg or zip
          const dmgAsset = assets.find((asset: any) => asset.name.endsWith('.dmg') || asset.name.endsWith('.zip'));
          if (dmgAsset) {
            downloadUrl = dmgAsset.browser_download_url;
          }
        } else {
          // Linux AppImage or deb
          const linuxAsset = assets.find((asset: any) => asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb'));
          if (linuxAsset) {
            downloadUrl = linuxAsset.browser_download_url;
          }
        }
        
        // Fallback to first asset if no specific platform matches
        if (!downloadUrl && assets.length > 0) {
          downloadUrl = assets[0].browser_download_url;
        }
        
        return {
          available: true,
          version: latestVersion.replace(/^v/, ''),
          releaseNotes: data.body || '',
          downloadUrl,
          releaseUrl: data.html_url
        };
      }
      
      return { available: false };
    } catch (error: any) {
      console.error('[Updater] Failed to check for updates:', error);
      throw new Error(error.message || 'Failed to check for updates');
    }
  });

  // Start download and rollout update
  ipcMain.handle('update:start', async (_event: any, downloadUrl: string) => {
    try {
      if (!downloadUrl) {
        throw new Error('No download URL provided');
      }

      const isWin = process.platform === 'win32';
      const filename = path.basename(new URL(downloadUrl).pathname);
      const tempPath = path.join(app.getPath('temp'), filename || 'achu-update.exe');
      
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
      const mainWindow = getMainWindow();
      
      let receivedBytes = 0;
      nodeStream.on('data', (chunk: any) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0 && mainWindow) {
          const progress = Math.round((receivedBytes / totalBytes) * 100);
          mainWindow.webContents.send('update:progress', progress);
        }
      });
      
      await new Promise<void>((resolve, reject) => {
        nodeStream.pipe(fileStream);
        fileStream.on('finish', () => resolve());
        nodeStream.on('error', (err: Error) => reject(err));
        fileStream.on('error', (err: Error) => reject(err));
      });
      
      // Rollout phase
      if (isWin) {
        if (isDev) {
          console.log('[Updater] Dev mode: simulation completed successfully');
          return { success: true, simulated: true };
        }
        
        const execPath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
        const batPath = path.join(app.getPath('temp'), 'achu-update.bat');
        const logPath = path.join(app.getPath('temp'), 'achu-update.log');

        const tempExists = fs.existsSync(tempPath);
        const tempSize = tempExists ? fs.statSync(tempPath).size : 0;
        const downloadedArch = tempExists ? getExeArch(tempPath) : 'unknown';
        console.log(`[Updater] execPath        = ${execPath}`);
        console.log(`[Updater] tempPath        = ${tempPath}`);
        console.log(`[Updater] tempFile exists = ${tempExists} (${tempSize} bytes)`);
        console.log(`[Updater] downloaded arch = ${downloadedArch} (process.arch=${process.arch})`);
        console.log(`[Updater] logPath         = ${logPath}`);

        if (downloadedArch !== 'unknown' && downloadedArch !== process.arch) {
          throw new Error(`Downloaded exe is ${downloadedArch} but this system is ${process.arch}. Cannot install incompatible update.`);
        }

        // Write standard Windows updater batch script with retry limit to prevent infinite loop
        const batContent = `@echo off
set LOGFILE=${logPath}
echo [%DATE% %TIME%] Starting updater >> "%LOGFILE%"
echo [%DATE% %TIME%] tempPath=${tempPath} >> "%LOGFILE%"
echo [%DATE% %TIME%] execPath=${execPath} >> "%LOGFILE%"
set count=0
:wait
timeout /t 1 /nobreak >nul
echo [%DATE% %TIME%] Attempt %count%: moving file >> "%LOGFILE%"
move /y "${tempPath}" "${execPath}"
if not errorlevel 1 goto success
echo [%DATE% %TIME%] Move failed (errorlevel=%ERRORLEVEL%), retrying >> "%LOGFILE%"
set /a count=count+1
if %count% LSS 15 goto wait
echo [%DATE% %TIME%] All retries exhausted, giving up >> "%LOGFILE%"
goto done
:success
echo [%DATE% %TIME%] Move succeeded >> "%LOGFILE%"
powershell -Command "Unblock-File -LiteralPath '${execPath}'"
echo [%DATE% %TIME%] Unblocked file, launching >> "%LOGFILE%"
start "" "${execPath}"
:done
del "%~f0"
`;
        
        fs.writeFileSync(batPath, batContent, 'utf-8');

        const vbsPath = path.join(app.getPath('temp'), 'achu-launcher.vbs');
        const vbsContent = 'Set oShell = CreateObject("WScript.Shell")\r\noShell.Run "cmd.exe /c " & Chr(34) & WScript.Arguments(0) & Chr(34), 0, False\r\n';
        fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

        const { spawn } = require('child_process');
        const child = spawn('wscript.exe', ['/nologo', vbsPath, batPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        child.unref();

        app.quit();
        return { success: true };
      } else {
        // macOS or Linux: Open download artifact or trigger standard mount/run
        await shell.openPath(tempPath);
        return { success: true, opened: true };
      }
    } catch (error: any) {
      console.error('[Updater] Update installation failed:', error);
      throw new Error(error.message || 'Failed to install update');
    }
  });
}
