import { describe, it, expect, vi } from 'vitest';

const mockIpcRenderer = vi.hoisted(() => ({
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

const mockContextBridge = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

import '../src/preload/preload';

function getApi() {
  return mockContextBridge.exposeInMainWorld.mock.calls[0][1];
}

describe('Preload Script', () => {
  it('exposes snapFrameAPI via contextBridge with all 8 methods', () => {
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'snapFrameAPI',
      expect.any(Object)
    );

    const api = getApi();
    expect(api).toHaveProperty('getSettings');
    expect(api).toHaveProperty('saveSettings');
    expect(api).toHaveProperty('openFile');
    expect(api).toHaveProperty('saveFile');
    expect(api).toHaveProperty('copyImageToClipboard');
    expect(api).toHaveProperty('readImageFromClipboard');
    expect(api).toHaveProperty('openURL');
    expect(api).toHaveProperty('onGlobalHotkeyTriggered');

    expect(typeof api.getSettings).toBe('function');
    expect(typeof api.saveSettings).toBe('function');
    expect(typeof api.openFile).toBe('function');
    expect(typeof api.saveFile).toBe('function');
    expect(typeof api.copyImageToClipboard).toBe('function');
    expect(typeof api.readImageFromClipboard).toBe('function');
    expect(typeof api.openURL).toBe('function');
    expect(typeof api.onGlobalHotkeyTriggered).toBe('function');
  });

  it('getSettings calls ipcRenderer.invoke with correct channel', () => {
    const api = getApi();
    api.getSettings();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('settings:get');
  });

  it('saveSettings calls ipcRenderer.invoke with settings', () => {
    const api = getApi();
    const settings = { scale: 90, padding: 50 };
    api.saveSettings(settings);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('settings:set', settings);
  });

  it('openFile calls ipcRenderer.invoke for file dialog', () => {
    const api = getApi();
    api.openFile();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:open-dialog');
  });

  it('saveFile calls ipcRenderer.invoke with file data', () => {
    const api = getApi();
    api.saveFile('data:base64...', 'png', 90);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:save-dialog', {
      base64Data: 'data:base64...',
      type: 'png',
      quality: 90,
    });
  });

  it('saveFile calls ipcRenderer.invoke with jpeg format', () => {
    const api = getApi();
    api.saveFile('data:base64...', 'jpeg', 75);
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('file:save-dialog', {
      base64Data: 'data:base64...',
      type: 'jpeg',
      quality: 75,
    });
  });

  it('copyImageToClipboard calls ipcRenderer.invoke with image data', () => {
    const api = getApi();
    api.copyImageToClipboard('data:base64...');
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      'clipboard:copy-image',
      'data:base64...'
    );
  });

  it('readImageFromClipboard calls ipcRenderer.invoke', () => {
    const api = getApi();
    api.readImageFromClipboard();
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('clipboard:read-image');
  });

  it('openURL calls ipcRenderer.send with url', () => {
    const api = getApi();
    api.openURL('https://example.com');
    expect(mockIpcRenderer.send).toHaveBeenCalledWith('url:open', 'https://example.com');
  });

  it('onGlobalHotkeyTriggered subscribes and returns unsubscribe', () => {
    const api = getApi();
    const callback = vi.fn();
    const unsubscribe = api.onGlobalHotkeyTriggered(callback);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith(
      'hotkey:triggered',
      expect.any(Function)
    );

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith(
      'hotkey:triggered',
      expect.any(Function)
    );
  });
});
