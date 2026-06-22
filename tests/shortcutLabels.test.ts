import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPlatformId, getModKeyLabel, formatModShortcut } from '../src/renderer/utils/shortcutLabels';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getPlatformId', () => {
  it('returns win32 when no platform info is available', () => {
    // In jsdom, window.snapFrameAPI is typically undefined and navigator.platform is empty
    const originalSnap = window.snapFrameAPI;
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });

    expect(getPlatformId()).toBe('win32');

    Object.defineProperty(window, 'snapFrameAPI', { value: originalSnap, writable: true, configurable: true });
  });

  it('prefers snapFrameAPI.platform over navigator.platform', () => {
    Object.defineProperty(window, 'snapFrameAPI', {
      value: { platform: 'darwin' },
      writable: true,
      configurable: true,
    });

    expect(getPlatformId()).toBe('darwin');

    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
  });

  it('detects macOS from navigator.platform when snapFrameAPI is absent', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', writable: true, configurable: true });

    expect(getPlatformId()).toBe('darwin');

    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });
  });

  it('detects iPad from navigator.platform', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'iPad', writable: true, configurable: true });

    expect(getPlatformId()).toBe('darwin');

    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });
  });

  it('returns win32 for Windows navigator.platform', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'Win32', writable: true, configurable: true });

    expect(getPlatformId()).toBe('win32');

    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });
  });

  it('returns linux for Linux navigator.platform', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', writable: true, configurable: true });

    expect(getPlatformId()).toBe('win32'); // falls through to win32 default since no Mac pattern matches

    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });
  });
});

describe('getModKeyLabel', () => {
  it('returns Ctrl on Windows (default test environment)', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'Win32', writable: true, configurable: true });

    expect(getModKeyLabel()).toBe('Ctrl');
  });

  it('returns ⌘ on macOS via snapFrameAPI', () => {
    Object.defineProperty(window, 'snapFrameAPI', {
      value: { platform: 'darwin' },
      writable: true,
      configurable: true,
    });

    expect(getModKeyLabel()).toBe('⌘');

    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
  });

  it('returns ⌘ on macOS via navigator.platform', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', writable: true, configurable: true });

    expect(getModKeyLabel()).toBe('⌘');

    Object.defineProperty(navigator, 'platform', { value: '', writable: true, configurable: true });
  });
});

describe('formatModShortcut', () => {
  it('formats shortcut with Ctrl on Windows', () => {
    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
    Object.defineProperty(navigator, 'platform', { value: 'Win32', writable: true, configurable: true });

    expect(formatModShortcut('Z')).toBe('Ctrl + Z');
    expect(formatModShortcut('Y')).toBe('Ctrl + Y');
    expect(formatModShortcut('N')).toBe('Ctrl + N');
    expect(formatModShortcut('S')).toBe('Ctrl + S');
  });

  it('formats shortcut with ⌘ on macOS', () => {
    Object.defineProperty(window, 'snapFrameAPI', {
      value: { platform: 'darwin' },
      writable: true,
      configurable: true,
    });

    expect(formatModShortcut('Z')).toBe('⌘ + Z');
    expect(formatModShortcut('Y')).toBe('⌘ + Y');

    Object.defineProperty(window, 'snapFrameAPI', { value: undefined, writable: true, configurable: true });
  });

  it('handles single-character keys', () => {
    expect(formatModShortcut('V')).toContain('+ V');
  });
});
