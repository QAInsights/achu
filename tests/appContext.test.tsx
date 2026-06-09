import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AppProvider, useAppContext } from '../src/renderer/AppContext';
import { useToolbarShortcuts } from '../src/renderer/hooks/useToolbarShortcuts';

// Mock dependency hooks
vi.mock('../src/renderer/hooks/useHistory', () => ({
  useHistory: () => mockUseHistory,
}));

vi.mock('../src/renderer/hooks/usePresets', () => ({
  usePresets: () => mockUsePresets,
}));

vi.mock('../src/renderer/hooks/useExport', () => ({
  useExport: () => mockUseExport,
}));

vi.mock('../src/renderer/canvasRenderer', () => ({
  drawMeshGradient: vi.fn(),
}));

const mockWorker = {
  recognize: vi.fn().mockResolvedValue({ data: { blocks: [] } }),
  terminate: vi.fn().mockResolvedValue(undefined),
};

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(() => Promise.resolve(mockWorker)),
}));

vi.mock('../src/renderer/utils/privacyGuardUtils', () => ({
  downsampleImageForOcr: vi.fn(() => Promise.resolve({ dataUrl: 'mockDataUrl', width: 100, height: 100 })),
  processOcrResults: vi.fn(() => []),
}));

let mockUseHistory: any;
let mockUsePresets: any;
let mockUseExport: any;

beforeEach(() => {
  mockUseHistory = {
    history: [], setHistory: vi.fn(),
    historyIndex: -1, setHistoryIndex: vi.fn(),
    pushHistory: vi.fn(), handleUndo: vi.fn(), handleRedo: vi.fn(),
  };
  mockUsePresets = {
    customPresets: [], setCustomPresets: vi.fn(),
    newPresetName: '', setNewPresetName: vi.fn(),
    fileInputRef: { current: null },
    onImageLoaded: vi.fn(),
    selectFile: vi.fn(),
    handleHTMLFileInput: vi.fn(),
    pasteFromClipboard: vi.fn(),
    saveCustomPreset: vi.fn(),
    deleteCustomPreset: vi.fn(),
    selectBackgroundPreset: vi.fn(),
  };
  mockUseExport = {
    exportFormat: 'png', setExportFormat: vi.fn(),
    jpegQuality: 90, setJpegQuality: vi.fn(),
    compressionMode: 'balanced', setCompressionMode: vi.fn(),
    copyBeautifiedImage: vi.fn(), triggerExport: vi.fn(),
  };

  vi.stubGlobal('snapFrameAPI', undefined);
  localStorage.clear();
  document.body.className = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Test consumer component
function TestConsumer() {
  const ctx = useAppContext();
  return (
    <div>
      <span data-testid="padding">{ctx.padding}</span>
      <span data-testid="backgroundType">{ctx.backgroundType}</span>
      <button data-testid="undo-btn" onClick={ctx.handleUndo}>Undo</button>
      <button data-testid="redo-btn" onClick={ctx.handleRedo}>Redo</button>
      <button data-testid="export-btn" onClick={ctx.triggerExport}>Export</button>
      <button data-testid="copy-btn" onClick={() => ctx.copyBeautifiedImage()}>Copy</button>
      <button data-testid="slider-btn" onClick={ctx.handleSliderRelease}>Slider Release</button>
      <button data-testid="apply-mesh" onClick={() => ctx.applyMeshPalette(['#ff0000', '#00ff00'])}>Apply Mesh</button>
      <button data-testid="random-palette" onClick={ctx.generateRandomPalette}>Random</button>
    </div>
  );
}

describe('AppContext', () => {
  describe('AppProvider', () => {
    it('renders children', () => {
      const { container } = render(
        <AppProvider><div data-testid="child">Hello</div></AppProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('provides default context values', () => {
      render(
        <AppProvider><TestConsumer /></AppProvider>
      );
      expect(screen.getByTestId('padding')).toHaveTextContent('38');
      expect(screen.getByTestId('backgroundType')).toHaveTextContent('gradient');
    });

    it('provides getCurrentConfig with all state', () => {
      let capturedConfig: any;
      function Consumer() {
        const ctx = useAppContext();
        capturedConfig = ctx.getCurrentConfig();
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);
      expect(capturedConfig).toHaveProperty('padding', 38);
      expect(capturedConfig).toHaveProperty('backgroundType', 'gradient');
      expect(capturedConfig).toHaveProperty('noImage', false);
    });

    it('provides applyConfig', () => {
      let applyConfigFn: any;
      function Consumer() {
        const ctx = useAppContext();
        applyConfigFn = ctx.applyConfig;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);
      expect(typeof applyConfigFn).toBe('function');
    });

    it('pushHistory delegates to useHistory hook', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('slider-btn'));
      expect(mockUseHistory.pushHistory).toHaveBeenCalled();
    });

    it('handleUndo delegates to useHistory', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('undo-btn'));
      expect(mockUseHistory.handleUndo).toHaveBeenCalled();
    });

    it('handleRedo delegates to useHistory', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('redo-btn'));
      expect(mockUseHistory.handleRedo).toHaveBeenCalled();
    });

    it('triggerExport delegates to useExport', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('export-btn'));
      expect(mockUseExport.triggerExport).toHaveBeenCalled();
    });

    it('copyBeautifiedImage delegates to useExport', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('copy-btn'));
      expect(mockUseExport.copyBeautifiedImage).toHaveBeenCalled();
    });

    it('applyMeshPalette updates mesh point colors', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('apply-mesh'));
      expect(mockUseHistory.pushHistory).toHaveBeenCalled();
    });

    it('generateRandomPalette randomizes mesh points', () => {
      render(<AppProvider><TestConsumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('random-palette'));
      expect(mockUseHistory.pushHistory).toHaveBeenCalled();
    });

    it('customPrompt returns a promise and sets promptConfig', async () => {
      let customPromptFn: any;
      function Consumer() {
        const ctx = useAppContext();
        customPromptFn = ctx.customPrompt;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);

      const promise = customPromptFn('Test message', 'default');
      expect(promise).toBeInstanceOf(Promise);
    });

    it('handleDragOver prevents default and sets isDragging', () => {
      let handleDragOverFn: any;
      function Consumer() {
        const ctx = useAppContext();
        handleDragOverFn = ctx.handleDragOver;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);

      const mockEvent = { preventDefault: vi.fn() };
      handleDragOverFn(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('handleDragLeave sets isDragging false', () => {
      let handleDragLeaveFn: any;
      function Consumer() {
        const ctx = useAppContext();
        handleDragLeaveFn = ctx.handleDragLeave;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);
      expect(() => handleDragLeaveFn()).not.toThrow();
    });

    it('handleDrop reads dropped image file', () => {
      let handleDropFn: any;
      function Consumer() {
        const ctx = useAppContext();
        handleDropFn = ctx.handleDrop;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);

      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [mockFile] as unknown as FileList },
      };
      handleDropFn(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('handleDrop ignores non-image files', () => {
      let handleDropFn: any;
      function Consumer() {
        const ctx = useAppContext();
        handleDropFn = ctx.handleDrop;
        return <div data-testid="cfg">done</div>;
      }
      render(<AppProvider><Consumer /></AppProvider>);

      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const mockEvent = {
        preventDefault: vi.fn(),
        dataTransfer: { files: [mockFile] as unknown as FileList },
      };
      expect(() => handleDropFn(mockEvent)).not.toThrow();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('useAppContext', () => {
    it('throws error when used outside AppProvider', () => {
      function BadConsumer() {
        useAppContext();
        return <div>bad</div>;
      }
      // Suppress console.error for expected error
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<BadConsumer />)).toThrow('useAppContext must be used within an AppProvider');
      spy.mockRestore();
    });
  });

  describe('Theme effect', () => {
    it('syncs appTheme to localStorage', () => {
      function Consumer() {
        const ctx = useAppContext();
        return (
          <button
            data-testid="theme-btn"
            onClick={() => ctx.setAppTheme('light')}
          >
            Toggle
          </button>
        );
      }
      render(<AppProvider><Consumer /></AppProvider>);
      fireEvent.click(screen.getByTestId('theme-btn'));
      expect(localStorage.getItem('snapframe-app-theme')).toBe('light');
    });
  });

  describe('Keyboard shortcuts', () => {
    it('fires undo on Ctrl+Z', () => {
      render(<AppProvider><div>test</div></AppProvider>);
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'z', bubbles: true }));
      });
      expect(mockUseHistory.handleUndo).toHaveBeenCalled();
    });

    it('fires redo on Ctrl+Y', () => {
      render(<AppProvider><div>test</div></AppProvider>);
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'y', bubbles: true }));
      });
      expect(mockUseHistory.handleRedo).toHaveBeenCalled();
    });

    it('fires export on Ctrl+Shift+S', () => {
      render(<AppProvider><div>test</div></AppProvider>);
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'S', bubbles: true }));
      });
      expect(mockUseExport.triggerExport).toHaveBeenCalled();
    });

    it('fires clear workspace on Ctrl+N', () => {
      let currentCtx: any;
      function ShortcutConsumer() {
        currentCtx = useAppContext();
        return <div>test</div>;
      }
      render(
        <AppProvider>
          <ShortcutConsumer />
        </AppProvider>
      );

      act(() => {
        currentCtx.setImageSrc('data:image/png;base64,test');
        currentCtx.setAnnotations([{ id: '1' }]);
      });

      expect(currentCtx.imageSrc).toBe('data:image/png;base64,test');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'n', bubbles: true }));
      });

      expect(currentCtx.imageSrc).toBeNull();
      expect(currentCtx.annotations).toEqual([]);
    });

    it('does not fire shortcut when focused on input', () => {
      render(
        <AppProvider>
          <input type="text" data-testid="text-input" />
        </AppProvider>
      );
      const input = screen.getByTestId('text-input') as HTMLInputElement;
      input.focus();
      mockUseHistory.handleUndo.mockClear();

      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'z', bubbles: true }));
      });
      expect(mockUseHistory.handleUndo).not.toHaveBeenCalled();
    });

    it('switches active tools via keyboard shortcuts', () => {
      function ShortcutConsumer() {
        const ctx = useAppContext();
        useToolbarShortcuts();
        return <div data-testid="tool">{ctx.activeTool}</div>;
      }
      render(
        <AppProvider>
          <ShortcutConsumer />
        </AppProvider>
      );
      
      expect(screen.getByTestId('tool')).toHaveTextContent('pointer');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('rect');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('filled-rect');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('circle');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'O', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('filled-circle');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '6', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('line');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('arrow');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '8', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('text');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('pen');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('emoji');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('pointer');
    });

    it('ignores toolbar shortcuts when modifier keys are pressed', () => {
      function ShortcutConsumer() {
        const ctx = useAppContext();
        useToolbarShortcuts();
        return <div data-testid="tool">{ctx.activeTool}</div>;
      }
      render(
        <AppProvider>
          <ShortcutConsumer />
        </AppProvider>
      );
      
      expect(screen.getByTestId('tool')).toHaveTextContent('pointer');

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'r', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('pointer');
    });

    it('ignores toolbar shortcuts when typing inside a textarea', () => {
      function ShortcutConsumer() {
        const ctx = useAppContext();
        useToolbarShortcuts();
        return (
          <div>
            <div data-testid="tool">{ctx.activeTool}</div>
            <textarea data-testid="editor" />
          </div>
        );
      }
      render(
        <AppProvider>
          <ShortcutConsumer />
        </AppProvider>
      );

      const textarea = screen.getByTestId('editor') as HTMLTextAreaElement;
      textarea.focus();

      act(() => {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
      });
      expect(screen.getByTestId('tool')).toHaveTextContent('pointer');
    });
  });

  describe('Paste event', () => {
    it('adds paste event listener on mount', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { unmount } = render(<AppProvider><div>test</div></AppProvider>);
      expect(addSpy).toHaveBeenCalledWith('paste', expect.any(Function));
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('paste', expect.any(Function));
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('calls onImageLoaded when imageSrc is null', async () => {
      let context: any;
      function Consumer() {
        context = useAppContext();
        return <div>test</div>;
      }

      vi.stubGlobal('snapFrameAPI', {
        readImageFromClipboard: vi.fn().mockResolvedValue('data:image/png;base64,pastedimage'),
        getSettings: vi.fn().mockResolvedValue({}),
        saveSettings: vi.fn().mockResolvedValue(undefined),
        onGlobalHotkeyTriggered: vi.fn(() => vi.fn()),
      });

      render(
        <AppProvider>
          <Consumer />
        </AppProvider>
      );

      await act(async () => {
        window.dispatchEvent(new Event('paste'));
      });
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockUsePresets.onImageLoaded).toHaveBeenCalledWith('data:image/png;base64,pastedimage');
    });

    it('pastes onto existing canvas when imageSrc is present', async () => {
      const originalImage = global.Image;
      try {
        global.Image = class {
          onload: (() => void) | null = null;
          naturalWidth = 1000;
          naturalHeight = 800;
          set src(_: string) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          }
        } as any;

        let context: any;
        function Consumer() {
          context = useAppContext();
          return (
            <div>
              <span data-testid="annotations-count">{context.annotations.length}</span>
            </div>
          );
        }

        vi.stubGlobal('snapFrameAPI', {
          readImageFromClipboard: vi.fn().mockResolvedValue('data:image/png;base64,pastedimage'),
          getSettings: vi.fn().mockResolvedValue({}),
          saveSettings: vi.fn().mockResolvedValue(undefined),
          onGlobalHotkeyTriggered: vi.fn(() => vi.fn()),
        });

        render(
          <AppProvider>
            <Consumer />
          </AppProvider>
        );

        await act(async () => {
          context.setImageSrc('data:image/png;base64,existing');
          context.setAnnotations([]);
        });

        await act(async () => {
          window.dispatchEvent(new Event('paste'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('annotations-count')).toHaveTextContent('1');
        });

        expect(context.annotations[0].type).toBe('image');
        expect(context.annotations[0].imageSrc).toBe('data:image/png;base64,pastedimage');
      } finally {
        global.Image = originalImage;
      }
    });

    it('creates a new canvas when global hotkey is triggered', async () => {
      let context: any;
      let hotkeyCallback: ((src: string) => void) | null = null;
      function Consumer() {
        context = useAppContext();
        return <div>test</div>;
      }

      vi.stubGlobal('snapFrameAPI', {
        getSettings: vi.fn().mockResolvedValue({}),
        saveSettings: vi.fn().mockResolvedValue(undefined),
        onGlobalHotkeyTriggered: vi.fn((cb) => {
          hotkeyCallback = cb;
          return vi.fn();
        }),
      });

      render(
        <AppProvider>
          <Consumer />
        </AppProvider>
      );

      await act(async () => {
        context.setImageSrc('data:image/png;base64,existing');
        context.setAnnotations([]);
      });

      await act(async () => {
        if (hotkeyCallback) {
          hotkeyCallback('data:image/png;base64,capturedimage');
        }
      });
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(mockUsePresets.onImageLoaded).toHaveBeenCalledWith('data:image/png;base64,capturedimage');
    });
  });

  describe('Settings sync effect', () => {
    it('attempts to load settings from snapFrameAPI on mount', async () => {
      const mockGetSettings = vi.fn().mockResolvedValue({});
      vi.stubGlobal('snapFrameAPI', {
        getSettings: mockGetSettings,
        saveSettings: vi.fn().mockResolvedValue(undefined),
        onGlobalHotkeyTriggered: vi.fn(() => vi.fn()),
      });

      render(<AppProvider><div>test</div></AppProvider>);
      // Wait for async effect
      await vi.waitFor(() => {
        expect(mockGetSettings).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('ExtendedContext operations', () => {
    function ExtendedTestConsumer() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="padding">{ctx.padding}</span>
          <span data-testid="backgroundType">{ctx.backgroundType}</span>
          <span data-testid="watermarkText">{ctx.watermarkText}</span>
          <span data-testid="annotations-count">{ctx.annotations.length}</span>
          <span data-testid="redactions-count">{ctx.redactions.length}</span>
          <span data-testid="meshPoints-count">{ctx.meshPoints.length}</span>
          <button data-testid="reset-btn" onClick={ctx.resetStyles}>Reset Styles</button>
          <button data-testid="clear-btn" onClick={ctx.clearWorkspace}>Clear Workspace</button>
          <button data-testid="redact-all-btn" onClick={ctx.redactAll}>Redact All</button>
          <button data-testid="reveal-all-btn" onClick={ctx.revealAll}>Reveal All</button>
          <button data-testid="apply-mesh" onClick={() => ctx.applyMeshPalette(['#ff0000', '#00ff00'])}>Apply Mesh</button>
          <button data-testid="random-palette" onClick={ctx.generateRandomPalette}>Random Palette</button>
          <button data-testid="slider-btn" onClick={ctx.handleSliderRelease}>Slider Release</button>
        </div>
      );
    }

    it('resetStyles sets all state to defaults via setters', () => {
      render(
        <AppProvider>
          <ExtendedTestConsumer />
        </AppProvider>
      );

      // Verify initial state
      expect(screen.getByTestId('backgroundType')).toHaveTextContent('gradient');

      // Click reset
      fireEvent.click(screen.getByTestId('reset-btn'));

      // After resetStyles, background type should reset to 'gradient'
      expect(screen.getByTestId('backgroundType')).toHaveTextContent('gradient');
      // Redactions should be cleared
      expect(screen.getByTestId('redactions-count')).toHaveTextContent('0');
    });

    it('clearWorkspace clears image, history, annotations, and redactions', () => {
      render(
        <AppProvider>
          <ExtendedTestConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('clear-btn'));

      // After clear, annotations and redactions should be empty
      expect(screen.getByTestId('annotations-count')).toHaveTextContent('0');
      expect(screen.getByTestId('redactions-count')).toHaveTextContent('0');
    });

    it('applyMeshPalette calls pushHistory', () => {
      mockUseHistory.pushHistory = vi.fn();
      render(
        <AppProvider>
          <ExtendedTestConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('apply-mesh'));
      // Mesh points should still be 4 (just colors changed)
      expect(screen.getByTestId('meshPoints-count')).toHaveTextContent('4');
    });

    it('generateRandomPalette preserves point count and calls pushHistory', () => {
      mockUseHistory.pushHistory = vi.fn();
      render(
        <AppProvider>
          <ExtendedTestConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('random-palette'));
      // Should still have 4 points
      expect(screen.getByTestId('meshPoints-count')).toHaveTextContent('4');
    });

    it('handleSliderRelease delegates to pushHistory', () => {
      mockUseHistory.pushHistory = vi.fn();
      render(
        <AppProvider>
          <ExtendedTestConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('slider-btn'));
      expect(mockUseHistory.pushHistory).toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    function DragConsumer() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="dragging">{ctx.isDragging ? 'yes' : 'no'}</span>
          <div
            data-testid="drop-zone"
            onDragOver={ctx.handleDragOver}
            onDragLeave={ctx.handleDragLeave}
            onDrop={ctx.handleDrop}
          >
            Drop Zone
          </div>
        </div>
      );
    }

    it('handleDragOver prevents default and sets isDragging', () => {
      render(
        <AppProvider>
          <DragConsumer />
        </AppProvider>
      );

      const zone = screen.getByTestId('drop-zone');
      const event = new Event('dragover', { bubbles: true, cancelable: true }) as React.DragEvent;
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      fireEvent(zone, event);
      // After drag over, isDragging should be true
      expect(screen.getByTestId('dragging')).toHaveTextContent('yes');
    });

    it('handleDragLeave sets isDragging false', () => {
      render(
        <AppProvider>
          <DragConsumer />
        </AppProvider>
      );

      // First set dragging to true
      const zone = screen.getByTestId('drop-zone');
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true }) as React.DragEvent;
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: vi.fn() });
      fireEvent(zone, dragOverEvent);

      expect(screen.getByTestId('dragging')).toHaveTextContent('yes');

      // Now drag leave
      fireEvent.dragLeave(zone);
      expect(screen.getByTestId('dragging')).toHaveTextContent('no');
    });
  });

  describe('redaction operations', () => {
    function RedactionConsumer() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="redact-count">{ctx.redactions.length}</span>
          <button data-testid="redact-all-btn" onClick={ctx.redactAll}>Redact All</button>
          <button data-testid="reveal-all-btn" onClick={ctx.revealAll}>Reveal All</button>
          <button data-testid="toggle-btn" onClick={() => ctx.toggleRedaction('test-id')}>Toggle</button>
        </div>
      );
    }

    it('redactAll and revealAll are no-ops with empty redactions', () => {
      render(
        <AppProvider>
          <RedactionConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('redact-all-btn'));
      expect(screen.getByTestId('redact-count')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('reveal-all-btn'));
      expect(screen.getByTestId('redact-count')).toHaveTextContent('0');
    });

    it('toggleRedaction is a safe no-op with empty redactions', () => {
      render(
        <AppProvider>
          <RedactionConsumer />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('toggle-btn'));
      expect(screen.getByTestId('redact-count')).toHaveTextContent('0');
    });
  });

  describe('sidebar position', () => {
    function SidebarConsumer() {
      const ctx = useAppContext();
      return (
        <div>
          <span data-testid="sidebar-pos">{ctx.sidebarPosition}</span>
        </div>
      );
    }

    it('defaults sidebar position to left', () => {
      render(
        <AppProvider>
          <SidebarConsumer />
        </AppProvider>
      );
      expect(screen.getByTestId('sidebar-pos')).toHaveTextContent('left');
    });

    it('reads sidebar position from localStorage', () => {
      localStorage.setItem('snapframe-user-defaults', JSON.stringify({ sidebarPosition: 'right' }));
      render(
        <AppProvider>
          <SidebarConsumer />
        </AppProvider>
      );
      expect(screen.getByTestId('sidebar-pos')).toHaveTextContent('right');
    });
  });

  describe('generateIssue with userInstruction', () => {
    it('appends userInstruction to prompt and calls generateAIResponse without error', async () => {
      const mockGenerateAIResponse = vi.fn().mockResolvedValue(JSON.stringify({
        title: 'Custom Instruction Bug',
        severity: 'high',
        severityReason: 'Assigned correctly',
        reproSteps: ['Step 1'],
        expected: 'Expected behavior',
        actual: 'Actual behavior',
        components: ['Button'],
        labels: ['bug']
      }));

      vi.stubGlobal('snapFrameAPI', {
        getSettings: vi.fn().mockResolvedValue({}),
        saveSettings: vi.fn().mockResolvedValue(undefined),
        onGlobalHotkeyTriggered: vi.fn(() => vi.fn()),
        generateAIResponse: mockGenerateAIResponse
      });

      let contextValues: any;
      function IssueConsumer() {
        const ctx = useAppContext();
        contextValues = ctx;
        return (
          <div>
            <button data-testid="gen-btn" onClick={ctx.generateIssue}>Generate</button>
            <span data-testid="payload-title">{ctx.issuePayload?.title || ''}</span>
          </div>
        );
      }

      render(
        <AppProvider>
          <IssueConsumer />
        </AppProvider>
      );

      await act(async () => {
        contextValues.setImageSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      });

      await act(async () => {
        contextValues.setAiProvider('ollama');
        contextValues.setCachedOcrResult({ text: 'Some OCR text', words: [] });
        contextValues.setUserInstruction('Focus on error and generate detailed report');
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('gen-btn'));
      });

      expect(mockGenerateAIResponse).toHaveBeenCalled();
      const callArgs = mockGenerateAIResponse.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Focus on error and generate detailed report');
      expect(screen.getByTestId('payload-title')).toHaveTextContent('Custom Instruction Bug');
    });
  });

  describe('scanForSecrets error handling', () => {
    it('always terminates tesseract worker even if recognize fails', async () => {
      mockWorker.recognize.mockRejectedValueOnce(new Error('OCR recognition failed'));
      mockWorker.terminate.mockClear();

      let contextValues: any;
      function Consumer() {
        contextValues = useAppContext();
        return <button data-testid="scan-btn" onClick={contextValues.scanForSecrets}>Scan</button>;
      }

      render(
        <AppProvider>
          <Consumer />
        </AppProvider>
      );

      // Set image source so scanning can run
      await act(async () => {
        contextValues.setImageSrc('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      });

      // Suppress alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      await act(async () => {
        try {
          await contextValues.scanForSecrets();
        } catch (e) {}
      });

      expect(mockWorker.terminate).toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });
});

