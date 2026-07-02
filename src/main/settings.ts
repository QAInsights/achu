import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export const getDefaultGalleryFolder = () => {
  try {
    return path.join(app.getPath('home'), 'achu-screenshots');
  } catch (e) {
    return path.join(process.env.HOME || process.env.USERPROFILE || '.', 'achu-screenshots');
  }
};

export interface AppSettings {
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  lastConfig: {
    padding: number;
    rounded: number;
    shadow: number;
    shadowColor: string;
    shadowEnabled: boolean;
    inset: number;
    insetColor: string;
    border: number;
    borderColor: string;
    scale: number;
    backgroundType: 'color' | 'gradient' | 'blur' | 'mesh';
    backgroundValue: string;
    aspectRatio: string;
    canvasWidth: number;
    canvasHeight: number;
    chromeStyle: 'mac' | 'windows' | 'none';
    watermarkEnabled: boolean;
    watermarkText: string;
    watermarkFont?: string;
    watermarkBold?: boolean;
    watermarkItalic?: boolean;
    annotationFont?: string;
    annotationFontSize?: number;
    annotationBold?: boolean;
    annotationItalic?: boolean;
    annotationOutlineEnabled?: boolean;
    annotationOutlineColor?: string;
    annotationOutlineWidth?: number;
    annotationGradientEnabled?: boolean;
    annotationGradientColor1?: string;
    annotationGradientColor2?: string;
    annotationGradientAngle?: number;
    position: string;
    captureShortcut?: string;
    autoImportCaptured?: boolean;
    [key: string]: any;
  };
  presets: Array<{
    id: string;
    name: string;
    gradient?: string;
    color?: string;
    type: 'color' | 'gradient';
  }>;
  githubToken?: string;
  secureKeys?: Record<string, string>;
  galleryFolder?: string;
  checkForUpdatesOnStartup?: boolean;
  lastUpdateCheck?: number;
  lastUpdateResult?: { available: boolean; version?: string; releaseUrl?: string; downloadUrl?: string; downloadSize?: number; releaseNotes?: string } | null;
  lastUpdateETag?: string | null;
}

export const getSettingsPath = () => {
  // If app is not ready yet, return a safe placeholder path or use direct app getPath
  try {
    return path.join(app.getPath('userData'), 'settings.json');
  } catch (e) {
    return 'settings.json';
  }
};

export const defaultSettings: AppSettings = {
  windowBounds: {
    width: 1200,
    height: 800,
  },
  lastConfig: {
    padding: 38,
    rounded: 20,
    shadow: 30,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowEnabled: true,
    inset: 0,
    insetColor: 'rgba(255, 255, 255, 0.2)',
    border: 0,
    borderColor: '#ffffff',
    scale: 100,
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    aspectRatio: 'Auto',
    canvasWidth: 800,
    canvasHeight: 600,
    paddingMode: 'fit',
    chromeStyle: 'mac',
    watermarkEnabled: false,
    watermarkText: 'Made using achu.app',
    watermarkFont: 'sans-serif',
    watermarkBold: false,
    watermarkItalic: false,
    annotationFont: 'sans-serif',
    annotationFontSize: 24,
    annotationBold: true,
    annotationItalic: false,
    annotationOutlineEnabled: false,
    annotationOutlineColor: '#000000',
    annotationOutlineWidth: 3,
    annotationGradientEnabled: false,
    annotationGradientColor1: '#ff0080',
    annotationGradientColor2: '#7928ca',
    annotationGradientAngle: 135,
    position: 'Middle center',
    captureShortcut: 'PrintScreen',
    autoImportCaptured: true,
  },
  presets: [],
  galleryFolder: getDefaultGalleryFolder(),
  checkForUpdatesOnStartup: true,
  lastUpdateCheck: 0,
  lastUpdateResult: null,
  lastUpdateETag: null,
};

export function loadSettings(): AppSettings {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed.lastConfig) {
        if (parsed.lastConfig.captureShortcut === undefined) {
          parsed.lastConfig.captureShortcut = defaultSettings.lastConfig.captureShortcut;
        }
        if (parsed.lastConfig.autoImportCaptured === undefined) {
          parsed.lastConfig.autoImportCaptured = defaultSettings.lastConfig.autoImportCaptured;
        }
      }
      if (!parsed.galleryFolder) {
        parsed.galleryFolder = getDefaultGalleryFolder();
      }
      if (parsed.checkForUpdatesOnStartup === undefined) {
        parsed.checkForUpdatesOnStartup = defaultSettings.checkForUpdatesOnStartup;
      }
      if (parsed.lastUpdateCheck === undefined) {
        parsed.lastUpdateCheck = defaultSettings.lastUpdateCheck;
      }
      if (parsed.lastUpdateResult === undefined) {
        parsed.lastUpdateResult = defaultSettings.lastUpdateResult;
      }
      if (parsed.lastUpdateETag === undefined) {
        parsed.lastUpdateETag = defaultSettings.lastUpdateETag;
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings) {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}
