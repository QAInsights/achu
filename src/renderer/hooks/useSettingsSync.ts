import { useEffect } from 'react';
import type { RenderConfig } from '../canvasRenderer';
import { updateUserDefault } from '../utils/storageUtils';

interface UseSettingsSyncDeps {
  appTheme: 'dark' | 'light';
  exportFormat: string;
  jpegQuality: number;
  compressionMode: string;
  sidebarPosition: string;
  secondarySidebarVisible: boolean;
  secondarySidebarPosition: string;
  bgGrain: number;
  lightRaysStyle: string;
  lightRaysOpacity: number;
  lightRaysAngle: number;
  lightRaysCount: number;
  lightRaysSourceX: number;
  lightRaysSourceY: number;
  getCurrentConfig: () => RenderConfig;
  customPresets: any[];
  checkForUpdatesOnStartup: boolean;
  setCustomPresets: React.Dispatch<React.SetStateAction<any[]>>;
  applyConfig: (config: RenderConfig) => void;
  // Deps for the settings sync effect dependency array
  syncDeps: any[];
}

export function useSettingsSync(deps: UseSettingsSyncDeps) {
  // Sync settings on startup
  useEffect(() => {
    const initApp = async () => {
      if (window.snapFrameAPI) {
        try {
          const settings = await window.snapFrameAPI.getSettings();
          if (settings.lastConfig) deps.applyConfig(settings.lastConfig);
          if (settings.presets) deps.setCustomPresets(settings.presets);
        } catch (e) { console.error('Failed to read settings:', e); }
      }
    };
    initApp();
  }, []);

  // Sync appTheme to localStorage and toggle body class
  useEffect(() => {
    localStorage.setItem('snapframe-app-theme', deps.appTheme);
    if (deps.appTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    if (window.snapFrameAPI && typeof window.snapFrameAPI.setTheme === 'function') {
      window.snapFrameAPI.setTheme(deps.appTheme);
    }
  }, [deps.appTheme]);

  useEffect(() => {
    updateUserDefault('exportFormat', deps.exportFormat);
  }, [deps.exportFormat]);

  useEffect(() => {
    updateUserDefault('jpegQuality', deps.jpegQuality);
  }, [deps.jpegQuality]);

  useEffect(() => {
    updateUserDefault('compressionMode', deps.compressionMode);
  }, [deps.compressionMode]);

  useEffect(() => {
    updateUserDefault('sidebarPosition', deps.sidebarPosition);
  }, [deps.sidebarPosition]);

  useEffect(() => {
    updateUserDefault('secondarySidebarVisible', deps.secondarySidebarVisible);
  }, [deps.secondarySidebarVisible]);

  useEffect(() => {
    updateUserDefault('secondarySidebarPosition', deps.secondarySidebarPosition);
  }, [deps.secondarySidebarPosition]);

  useEffect(() => {
    updateUserDefault('bgGrain', deps.bgGrain);
  }, [deps.bgGrain]);

  useEffect(() => {
    updateUserDefault('lightRaysStyle', deps.lightRaysStyle);
  }, [deps.lightRaysStyle]);

  useEffect(() => {
    updateUserDefault('lightRaysOpacity', deps.lightRaysOpacity);
  }, [deps.lightRaysOpacity]);

  useEffect(() => {
    updateUserDefault('lightRaysAngle', deps.lightRaysAngle);
  }, [deps.lightRaysAngle]);

  useEffect(() => {
    updateUserDefault('lightRaysCount', deps.lightRaysCount);
  }, [deps.lightRaysCount]);

  useEffect(() => {
    updateUserDefault('lightRaysSourceX', deps.lightRaysSourceX);
  }, [deps.lightRaysSourceX]);

  useEffect(() => {
    updateUserDefault('lightRaysSourceY', deps.lightRaysSourceY);
  }, [deps.lightRaysSourceY]);

  // Debounced settings save to main process
  useEffect(() => {
    const saveSettingsToMain = async () => {
      if (window.snapFrameAPI) {
        const config = deps.getCurrentConfig();
        const settings = { windowBounds: {}, lastConfig: { ...config, annotations: [], redactions: [] }, presets: deps.customPresets, checkForUpdatesOnStartup: deps.checkForUpdatesOnStartup };
        await window.snapFrameAPI.saveSettings(settings);
      }
    };
    const timer = setTimeout(saveSettingsToMain, 1000);
    return () => clearTimeout(timer);
  }, deps.syncDeps);
}
