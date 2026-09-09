import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';

vi.mock('electron', () => ({ app: { isPackaged: false }, shell: { openPath: vi.fn() }, BrowserWindow: class {} }));
vi.mock('../src/main/settings', () => ({ loadSettings: vi.fn(), saveSettings: vi.fn() }));
import { replaceAppBundle, resolveLinuxUpdateTarget, resolveMacUpdateTarget, performLinuxUpdate, scheduleLinuxRelaunch } from '../src/main/updater';

const childProcess = createRequire(import.meta.url)('child_process');
const dirs: string[] = [];
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'achu-install-test-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('Linux update target', () => {
  it('uses a detached helper to wait for exit and launch the real AppImage', () => {
    const unref = vi.fn();
    const spawn = vi.spyOn(childProcess, 'spawn').mockReturnValue({ unref } as any);
    vi.stubEnv('APPIMAGE', '/old/image.AppImage');
    vi.stubEnv('APPDIR', '/tmp/.mount_old');
    vi.stubEnv('APPIMAGE_EXIT_AFTER_INSTALL', 'true');

    scheduleLinuxRelaunch('/opt/Achu App/achu.AppImage', ['--no-sandbox'], 4321);

    expect(spawn).toHaveBeenCalledTimes(1);
    const [command, rawArgs, rawOptions] = spawn.mock.calls[0];
    const args = rawArgs as string[];
    const options = rawOptions as { detached: boolean; stdio: string; cwd: string; env: NodeJS.ProcessEnv };
    expect(command).toBe('/bin/sh');
    expect(args.slice(2)).toEqual([
      'achu-update-relaunch', '4321', '/opt/Achu App/achu.AppImage', '--no-sandbox',
    ]);
    expect(args[1]).toContain('while kill -0 "$pid"');
    expect(args[1]).toContain('exec "$@"');
    expect(options).toMatchObject({ detached: true, stdio: 'ignore', cwd: '/opt/Achu App' });
    expect(options.env.APPIMAGE).toBeUndefined();
    expect(options.env.APPDIR).toBeUndefined();
    expect(options.env.APPIMAGE_EXIT_AFTER_INSTALL).toBeUndefined();
    expect(unref).toHaveBeenCalledOnce();
  });

  it('replaces the original AppImage and schedules relaunch from that file', () => {
    const dir = fixture();
    const original = path.join(dir, 'achu.AppImage');
    const download = path.join(dir, 'update.AppImage');
    fs.writeFileSync(original, 'old');
    fs.writeFileSync(download, 'new');
    vi.stubEnv('APPIMAGE', original);
    const unref = vi.fn();
    const spawn = vi.spyOn(childProcess, 'spawn').mockReturnValue({ unref } as any);
    expect(performLinuxUpdate(download)).toEqual({ installed: true, relaunching: true });
    expect(fs.readFileSync(original, 'utf8')).toBe('new');
    expect(fs.statSync(original).mode & 0o777).toBe(0o755);
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0][1]).toContain(original);
    expect(unref).toHaveBeenCalledOnce();
    expect(fs.existsSync(`${original}.old`)).toBe(false);
  });

  it('restores the old AppImage when the restart helper cannot be created', () => {
    const dir = fixture();
    const original = path.join(dir, 'achu.AppImage');
    const download = path.join(dir, 'update.AppImage');
    fs.writeFileSync(original, 'old');
    fs.writeFileSync(download, 'new');
    vi.stubEnv('APPIMAGE', original);
    vi.spyOn(childProcess, 'spawn').mockImplementation(() => { throw new Error('spawn failed'); });

    expect(performLinuxUpdate(download)).toMatchObject({ installed: false, manualFallback: true });
    expect(fs.readFileSync(original, 'utf8')).toBe('old');
  });
  it('resolves the original AppImage, including a launcher symlink', () => {
    const dir = fixture();
    const original = path.join(dir, 'achu.AppImage');
    fs.writeFileSync(original, 'original');
    const launcher = path.join(dir, 'launcher');
    fs.symlinkSync(original, launcher);
    vi.stubEnv('APPIMAGE', launcher);
    expect(resolveLinuxUpdateTarget()).toBe(original);
  });
  it('never falls back to the mounted or package-installed executable', () => {
    vi.stubEnv('APPIMAGE', '');
    expect(() => resolveLinuxUpdateTarget()).toThrow('original AppImage');
    vi.stubEnv('APPIMAGE', '/tmp/.mount_achu.Azmbom4/achu');
    expect(() => resolveLinuxUpdateTarget()).toThrow('original AppImage');
  });
});

describe('macOS update installation', () => {
  it('preserves renamed bundles and handles .app in parent directory names', () => {
    expect(resolveMacUpdateTarget('/Users/me/apps.app/My Achu.app/Contents/MacOS/achu'))
      .toBe('/Users/me/apps.app/My Achu.app');
  });
  it('rejects DMG and translocated launches with installation guidance', () => {
    for (const executable of ['/Volumes/achu/achu.app/Contents/MacOS/achu',
      '/private/var/folders/x/AppTranslocation/id/d/achu.app/Contents/MacOS/achu']) {
      expect(() => resolveMacUpdateTarget(executable)).toThrow('Move achu to Applications');
    }
  });
  it('leaves the installed bundle intact when ditto fails halfway through', () => {
    const dir = fixture();
    const dest = path.join(dir, 'My Achu.app');
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'version'), 'old');
    vi.spyOn(childProcess, 'execFileSync').mockImplementation((_command: any, args: any) => {
      fs.mkdirSync(args[1]);
      fs.writeFileSync(path.join(args[1], 'partial'), 'partial');
      throw new Error('copy failed');
    });
    expect(() => replaceAppBundle('/source/achu.app', dest)).toThrow('copy failed');
    expect(fs.readFileSync(path.join(dest, 'version'), 'utf8')).toBe('old');
    expect(fs.readdirSync(dir)).toEqual(['My Achu.app']);
  });
  it('replaces the whole bundle without retaining stale files', () => {
    const dir = fixture();
    const dest = path.join(dir, 'My Achu.app');
    fs.mkdirSync(dest);
    fs.writeFileSync(path.join(dest, 'stale'), 'old');
    vi.spyOn(childProcess, 'execFileSync').mockImplementation((command: any, args: any) => {
      if (command === 'ditto') {
        fs.mkdirSync(args[1]);
        fs.writeFileSync(path.join(args[1], 'version'), 'new');
      }
      return Buffer.alloc(0);
    });
    replaceAppBundle('/source/achu.app', dest);
    expect(fs.readdirSync(dest)).toEqual(['version']);
    expect(fs.readdirSync(dir)).toEqual(['My Achu.app']);
  });
});
