import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { usePresets } from '../src/renderer/hooks/usePresets';

describe('usePresets', () => {
  let mockSetImageSrc: ReturnType<typeof vi.fn>;
  let mockSetNoImageMode: ReturnType<typeof vi.fn>;
  let mockSetAnnotations: ReturnType<typeof vi.fn>;
  let mockSetBackgroundType: ReturnType<typeof vi.fn>;
  let mockSetBackgroundValue: ReturnType<typeof vi.fn>;
  let mockGetCurrentConfig: ReturnType<typeof vi.fn>;
  let mockPushHistory: ReturnType<typeof vi.fn>;
  let mockSetRedactions: ReturnType<typeof vi.fn>;
  let mockSetBgGrain: ReturnType<typeof vi.fn>;
  let mockSetLightRaysStyle: ReturnType<typeof vi.fn>;
  let mockSetLightRaysOpacity: ReturnType<typeof vi.fn>;
  let mockSetLightRaysAngle: ReturnType<typeof vi.fn>;
  let mockSetLightRaysCount: ReturnType<typeof vi.fn>;
  let mockSetLightRaysSourceX: ReturnType<typeof vi.fn>;
  let mockSetLightRaysSourceY: ReturnType<typeof vi.fn>;

  const defaultConfig = {
    padding: 38,
    rounded: 20,
    scale: 100,
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    annotations: [],
    bgGrain: 0,
    lightRaysStyle: 'none' as const,
    lightRaysOpacity: 30,
    lightRaysAngle: 135,
    lightRaysCount: 4,
    lightRaysSourceX: 50,
    lightRaysSourceY: 0,
  };

  beforeEach(() => {
    mockSetImageSrc = vi.fn();
    mockSetNoImageMode = vi.fn();
    mockSetAnnotations = vi.fn();
    mockSetBackgroundType = vi.fn();
    mockSetBackgroundValue = vi.fn();
    mockGetCurrentConfig = vi.fn().mockReturnValue(defaultConfig);
    mockPushHistory = vi.fn();
    mockSetRedactions = vi.fn();
    mockSetBgGrain = vi.fn();
    mockSetLightRaysStyle = vi.fn();
    mockSetLightRaysOpacity = vi.fn();
    mockSetLightRaysAngle = vi.fn();
    mockSetLightRaysCount = vi.fn();
    mockSetLightRaysSourceX = vi.fn();
    mockSetLightRaysSourceY = vi.fn();
    vi.restoreAllMocks();
  });

  const render = (overrides?: {
    backgroundType?: 'gradient' | 'color' | 'blur' | 'mesh';
    backgroundValue?: string;
    setRedactions?: ReturnType<typeof vi.fn>;
  }) =>
    renderHook(() =>
      usePresets(
        mockSetImageSrc,
        mockSetNoImageMode,
        mockSetAnnotations,
        overrides?.backgroundType ?? 'gradient',
        mockSetBackgroundType,
        overrides?.backgroundValue ?? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
        mockSetBackgroundValue,
        mockGetCurrentConfig,
        mockPushHistory,
        overrides?.setRedactions ?? mockSetRedactions,
        mockSetBgGrain,
        mockSetLightRaysStyle,
        mockSetLightRaysOpacity,
        mockSetLightRaysAngle,
        mockSetLightRaysCount,
        mockSetLightRaysSourceX,
        mockSetLightRaysSourceY,
      )
    );

  describe('initial state', () => {
    it('starts with empty custom presets', () => {
      const { result } = render();
      expect(result.current.customPresets).toEqual([]);
    });

    it('starts with empty preset name', () => {
      const { result } = render();
      expect(result.current.newPresetName).toBe('');
    });

    it('provides a fileInputRef', () => {
      const { result } = render();
      expect(result.current.fileInputRef).toBeDefined();
      expect(result.current.fileInputRef.current).toBeNull();
    });
  });

  describe('onImageLoaded', () => {
    it('sets the image src', () => {
      const { result } = render();
      act(() => {
        result.current.onImageLoaded('data:image/png;base64,abc123');
      });
      expect(mockSetImageSrc).toHaveBeenCalledWith('data:image/png;base64,abc123');
    });

    it('disables noImageMode', () => {
      const { result } = render();
      act(() => {
        result.current.onImageLoaded('test');
      });
      expect(mockSetNoImageMode).toHaveBeenCalledWith(false);
    });

    it('clears annotations', () => {
      const { result } = render();
      act(() => {
        result.current.onImageLoaded('test');
      });
      expect(mockSetAnnotations).toHaveBeenCalledWith([]);
    });

    it('clears redactions when setRedactions is provided', () => {
      const { result } = render();
      act(() => {
        result.current.onImageLoaded('test');
      });
      expect(mockSetRedactions).toHaveBeenCalledWith([]);
    });

    it('does not throw when setRedactions is undefined', () => {
      const { result } = render({ setRedactions: undefined as unknown as ReturnType<typeof vi.fn> });
      expect(() => {
        act(() => {
          result.current.onImageLoaded('test');
        });
      }).not.toThrow();
    });

    it('pushes history with cleared annotations and redactions', () => {
      const { result } = render();
      act(() => {
        result.current.onImageLoaded('test-image');
      });
      expect(mockPushHistory).toHaveBeenCalledWith({
        ...defaultConfig,
        annotations: [],
        redactions: [],
        noImage: false,
      });
    });
  });

  describe('saveCustomPreset', () => {
    it('does nothing when preset name is empty', () => {
      const { result } = render();
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.customPresets).toEqual([]);
    });

    it('does nothing when preset name is only whitespace', () => {
      const { result } = render();
      act(() => {
        result.current.setNewPresetName('   ');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.customPresets).toEqual([]);
    });

    it('creates a gradient preset', () => {
      const { result } = render({ backgroundType: 'gradient', backgroundValue: 'my-gradient' });
      act(() => {
        result.current.setNewPresetName('My Preset');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.customPresets).toHaveLength(1);
      const preset = result.current.customPresets[0];
      expect(preset.name).toBe('My Preset');
      expect(preset.gradient).toBe('my-gradient');
      expect(preset.type).toBe('gradient');
      expect(preset.id).toMatch(/^custom-\d+$/);
    });

    it('creates a color preset', () => {
      const { result } = render({ backgroundType: 'color', backgroundValue: '#ff0000' });
      act(() => {
        result.current.setNewPresetName('Red');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.customPresets).toHaveLength(1);
      const preset = result.current.customPresets[0];
      expect(preset.color).toBe('#ff0000');
      expect(preset.type).toBe('color');
    });

    it('clears preset name after saving', () => {
      const { result } = render();
      act(() => {
        result.current.setNewPresetName('Test Preset');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.newPresetName).toBe('');
    });

    it('appends to existing presets', () => {
      const { result } = render();
      act(() => {
        result.current.setNewPresetName('First');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      act(() => {
        result.current.setNewPresetName('Second');
      });
      act(() => {
        result.current.saveCustomPreset();
      });
      expect(result.current.customPresets).toHaveLength(2);
    });
  });

  describe('deleteCustomPreset', () => {
    it('removes a preset by id and stops propagation', () => {
      const { result } = render();

      // Pre-populate customPresets directly for reliable setup
      act(() => {
        result.current.setCustomPresets([
          { id: 'preset-1', name: 'P1', type: 'gradient', gradient: 'g1' },
          { id: 'preset-2', name: 'P2', type: 'color', color: '#fff' },
        ]);
      });

      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;

      act(() => {
        result.current.deleteCustomPreset('preset-1', mockEvent);
      });

      expect(result.current.customPresets).toHaveLength(1);
      expect(result.current.customPresets[0].name).toBe('P2');
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('does nothing when id does not exist', () => {
      const { result } = render();
      const mockEvent = { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
      act(() => {
        result.current.deleteCustomPreset('non-existent', mockEvent);
      });
      expect(result.current.customPresets).toEqual([]);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('selectBackgroundPreset', () => {
    it('sets background type and value from a gradient preset', () => {
      const { result } = render();
      act(() => {
        result.current.selectBackgroundPreset({
          type: 'gradient',
          gradient: 'my-gradient-value',
        });
      });
      expect(mockSetBackgroundType).toHaveBeenCalledWith('gradient');
      expect(mockSetBackgroundValue).toHaveBeenCalledWith('my-gradient-value');
    });

    it('sets background type and value from a color preset', () => {
      const { result } = render();
      act(() => {
        result.current.selectBackgroundPreset({
          type: 'color',
          color: '#00ff00',
        });
      });
      expect(mockSetBackgroundType).toHaveBeenCalledWith('color');
      expect(mockSetBackgroundValue).toHaveBeenCalledWith('#00ff00');
    });

    it('pushes history with the preset config', () => {
      const { result } = render();
      act(() => {
        result.current.selectBackgroundPreset({
          type: 'gradient',
          gradient: 'preset-gradient',
        });
      });
      expect(mockPushHistory).toHaveBeenCalledWith({
        ...defaultConfig,
        backgroundType: 'gradient',
        backgroundValue: 'preset-gradient',
      });
    });
  });

  describe('setNewPresetName', () => {
    it('updates the preset name state', () => {
      const { result } = render();
      act(() => {
        result.current.setNewPresetName('Hello');
      });
      expect(result.current.newPresetName).toBe('Hello');
    });
  });

  describe('setCustomPresets', () => {
    it('allows direct state override', () => {
      const { result } = render();
      act(() => {
        result.current.setCustomPresets([{ id: 'x', name: 'Direct' }]);
      });
      expect(result.current.customPresets).toHaveLength(1);
      expect(result.current.customPresets[0].name).toBe('Direct');
    });
  });

  describe('selectFile', () => {
    it('calls snapFrameAPI.openFile in Electron environment', async () => {
      const mockOpenFile = vi.fn().mockResolvedValue('data:image/png;base64,electron-test');
      vi.stubGlobal('snapFrameAPI', { openFile: mockOpenFile });

      const { result } = render();
      await act(async () => {
        await result.current.selectFile();
      });

      expect(mockOpenFile).toHaveBeenCalled();
      expect(mockSetImageSrc).toHaveBeenCalledWith('data:image/png;base64,electron-test');
      expect(mockSetNoImageMode).toHaveBeenCalledWith(false);
    });

    it('handles null return from snapFrameAPI.openFile', async () => {
      const mockOpenFile = vi.fn().mockResolvedValue(null);
      vi.stubGlobal('snapFrameAPI', { openFile: mockOpenFile });

      const { result } = render();
      await act(async () => {
        await result.current.selectFile();
      });

      expect(mockOpenFile).toHaveBeenCalled();
      expect(mockSetImageSrc).not.toHaveBeenCalled();
    });

    it('clicks hidden file input in browser environment', async () => {
      vi.stubGlobal('snapFrameAPI', undefined);
      const { result } = render();

      // Create a real input and assign it to the ref
      const input = document.createElement('input');
      const clickSpy = vi.spyOn(input, 'click');
      result.current.fileInputRef.current = input;

      await act(async () => {
        await result.current.selectFile();
      });

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('handleHTMLFileInput', () => {
    it('reads a file via FileReader', () => {
      const { result } = render();

      const file = new File(['test-image-data'], 'test.png', { type: 'image/png' });

      // Mock FileReader — readAsDataURL immediately triggers onload
      const mockFileReader = vi.fn(function (this: any) {
        this.onload = null;
        this.readAsDataURL = vi.fn(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,fake' } });
          }
        });
      });
      vi.stubGlobal('FileReader', mockFileReader);

      const mockEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleHTMLFileInput(mockEvent);
      });

      expect(mockFileReader).toHaveBeenCalled();
      expect(mockSetImageSrc).toHaveBeenCalledWith('data:image/png;base64,fake');
    });

    it('does nothing when no files are selected', () => {
      const { result } = render();
      const mockEvent = {
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleHTMLFileInput(mockEvent);
      });

      expect(mockSetImageSrc).not.toHaveBeenCalled();
    });

    it('does nothing when files is null', () => {
      const { result } = render();
      const mockEvent = {
        target: { files: null },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleHTMLFileInput(mockEvent);
      });

      expect(mockSetImageSrc).not.toHaveBeenCalled();
    });
  });

  describe('pasteFromClipboard', () => {
    it('reads image from clipboard via snapFrameAPI in Electron', async () => {
      const mockReadClipboard = vi.fn().mockResolvedValue('data:image/png;base64,clipboard-test');
      vi.stubGlobal('snapFrameAPI', { readImageFromClipboard: mockReadClipboard });

      const { result } = render();
      await act(async () => {
        await result.current.pasteFromClipboard();
      });

      expect(mockReadClipboard).toHaveBeenCalled();
      expect(mockSetImageSrc).toHaveBeenCalledWith('data:image/png;base64,clipboard-test');
    });

    it('shows alert when clipboard has no image in Electron', async () => {
      const mockReadClipboard = vi.fn().mockResolvedValue(null);
      vi.stubGlobal('snapFrameAPI', { readImageFromClipboard: mockReadClipboard });
      const mockAlert = vi.fn();
      vi.stubGlobal('alert', mockAlert);

      const { result } = render();
      await act(async () => {
        await result.current.pasteFromClipboard();
      });

      expect(mockAlert).toHaveBeenCalledWith('No image found in clipboard.');
    });
  });
});
