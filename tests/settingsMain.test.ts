import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mocked/user/data'),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { loadSettings, saveSettings, defaultSettings, getSettingsPath } from '../src/main/settings';

describe('Settings Main Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes correct settings path', () => {
    expect(getSettingsPath()).toContain('settings.json');
  });

  it('loads default settings when file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const settings = loadSettings();
    expect(settings).toEqual(defaultSettings);
  });

  it('loads and parses saved settings from disk', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const mockData = {
      windowBounds: { width: 800, height: 600 },
      lastConfig: { padding: 40, captureShortcut: 'Ctrl+Shift+S' },
      presets: [],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockData));

    const settings = loadSettings();
    expect(settings.windowBounds.width).toBe(800);
    expect(settings.lastConfig.padding).toBe(40);
    // Should fallback to default autoImportCaptured
    expect(settings.lastConfig.autoImportCaptured).toBe(true);
  });

  it('saves settings to disk correctly', () => {
    const mockData = {
      windowBounds: { width: 900, height: 700 },
      lastConfig: { padding: 10, rounded: 5, shadow: 15, shadowColor: 'black', shadowEnabled: true, inset: 0, insetColor: 'white', border: 0, borderColor: 'white', scale: 100, backgroundType: 'color' as const, backgroundValue: 'red', aspectRatio: 'Auto', canvasWidth: 100, canvasHeight: 100, paddingMode: 'fit' as const, chromeStyle: 'mac' as const, watermarkEnabled: false, watermarkText: 'x', position: 'center' },
      presets: [],
    };

    saveSettings(mockData);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.stringContaining('900'),
      'utf-8'
    );
  });
});
