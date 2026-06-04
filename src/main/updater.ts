import { app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

const isDev = !app.isPackaged;

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
          // Portable Windows exe
          const exeAsset = assets.find((asset: any) => asset.name.endsWith('.exe'));
          if (exeAsset) {
            downloadUrl = exeAsset.browser_download_url;
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
        
        const execPath = process.execPath;
        const batPath = path.join(app.getPath('temp'), 'achu-update.bat');
        
        // Write standard Windows updater batch script
        const batContent = `@echo off
:wait
timeout /t 1 /nobreak >nul
move /y "${tempPath}" "${execPath}"
if errorlevel 1 goto wait
start "" "${execPath}"
del "%~f0"
`;
        
        fs.writeFileSync(batPath, batContent, 'utf-8');
        
        const { spawn } = require('child_process');
        spawn('cmd.exe', ['/c', batPath], {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
        });
        
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
