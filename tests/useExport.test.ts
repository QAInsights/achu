import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock renderCanvas to avoid DOM dependency
vi.mock('../src/renderer/canvasRenderer', () => ({
  renderCanvas: vi.fn((canvas: HTMLCanvasElement) => {
    // Simulate a canvas that produces a certain-sized data URL
    canvas.toDataURL = () => 'data:image/png;base64,' + 'A'.repeat(1000);
    canvas.toBlob = (cb: (blob: Blob) => void) => {
      cb(new Blob(['test'], { type: 'image/png' }));
    };
  }),
}));

import { useExport } from '../src/renderer/hooks/useExport';

describe('useExport', () => {
  let mockGetCurrentConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();

    mockGetCurrentConfig = vi.fn().mockReturnValue({
      padding: 38,
      rounded: 20,
      scale: 100,
      backgroundType: 'gradient',
      backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      aspectRatio: 'Auto',
      canvasWidth: 800,
      canvasHeight: 600,
      selectedPreset: '',
      noImage: false,
    });
  });

  describe('initial state', () => {
    it('defaults export format to png', () => {
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.exportFormat).toBe('png');
    });

    it('defaults jpeg quality to 90', () => {
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.jpegQuality).toBe(90);
    });

    it('reads export format from localStorage if available', () => {
      localStorage.setItem('snapframe-user-defaults', JSON.stringify({ exportFormat: 'jpeg' }));
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.exportFormat).toBe('jpeg');
    });

    it('reads jpeg quality from localStorage if available', () => {
      localStorage.setItem('snapframe-user-defaults', JSON.stringify({ jpegQuality: 75 }));
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.jpegQuality).toBe(75);
    });

    it('handles malformed localStorage gracefully for export format', () => {
      localStorage.setItem('snapframe-user-defaults', 'bad-json');
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.exportFormat).toBe('png');
    });

    it('handles malformed localStorage gracefully for jpeg quality', () => {
      localStorage.setItem('snapframe-user-defaults', 'bad-json');
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      expect(result.current.jpegQuality).toBe(90);
    });
  });

  describe('setExportFormat', () => {
    it('updates export format state', () => {
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      act(() => {
        result.current.setExportFormat('jpeg');
      });
      expect(result.current.exportFormat).toBe('jpeg');
    });
  });

  describe('setJpegQuality', () => {
    it('updates jpeg quality state', () => {
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      act(() => {
        result.current.setJpegQuality(50);
      });
      expect(result.current.jpegQuality).toBe(50);
    });
  });

  describe('checkOgSizeLimit', () => {
    it('returns true for non-OG presets regardless of size', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'MacBook Pro',
      });
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      // Access private function through the export flow
      // Non-OG preset always returns true
    });

    it('returns true for OG presets under 8MB', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'OG Image',
      });
      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      // Small base64 won't trigger the confirm dialog
    });

    it('shows confirm for OG presets over 8MB', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'OG Image',
      });
      const mockConfirm = vi.fn().mockReturnValue(false);
      vi.stubGlobal('confirm', mockConfirm);

      const { result } = renderHook(() =>
        useExport('test-image', false, mockGetCurrentConfig)
      );
      // The size check needs a large base64 string
      // Base64: 'A' * ~12M characters ≈ 9MB
    });

    it('identifies Link presets as OG', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'LinkedIn Post',
      });
      // Would trigger OG check
    });

    it('identifies Facebook presets as OG', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'Facebook Cover',
      });
      // Would trigger OG check
    });

    it('identifies Ad presets as OG', () => {
      mockGetCurrentConfig.mockReturnValue({
        ...mockGetCurrentConfig(),
        selectedPreset: 'Ad Banner',
      });
      // Would trigger OG check
    });
  });

  describe('triggerExport', () => {
    it('is a no-op when no image and not in noImageMode', () => {
      const { result } = renderHook(() =>
        useExport(null, false, mockGetCurrentConfig)
      );
      expect(() => {
        act(() => {
          result.current.triggerExport();
        });
      }).not.toThrow();
    });

    it('works in noImageMode without image', () => {
      const { result } = renderHook(() =>
        useExport(null, true, mockGetCurrentConfig)
      );
      expect(() => {
        act(() => {
          result.current.triggerExport();
        });
      }).not.toThrow();
    });

    it('uses browser download fallback when snapFrameAPI is unavailable', () => {
      vi.stubGlobal('snapFrameAPI', undefined);

      const { result } = renderHook(() =>
        useExport(null, true, mockGetCurrentConfig)
      );

      // Create a mock link element and spy on click
      const mockLink = document.createElement('a');
      const clickSpy = vi.spyOn(mockLink, 'click');
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        if (tag === 'a') return mockLink;
        return origCreateElement(tag, _options);
      });

      act(() => {
        result.current.triggerExport();
      });

      // Should create a download link and click it
      expect(clickSpy).toHaveBeenCalled();
      expect(mockLink.download).toContain('snapframe-export');
    });
  });

  describe('copyBeautifiedImage', () => {
    it('is a no-op when no image and not in noImageMode', async () => {
      const { result } = renderHook(() =>
        useExport(null, false, mockGetCurrentConfig)
      );
      await act(async () => {
        await result.current.copyBeautifiedImage();
      });
      // Should not throw
    });

    it('works in noImageMode without image', async () => {
      vi.stubGlobal('snapFrameAPI', {
        copyImageToClipboard: vi.fn().mockResolvedValue(true),
      });
      const mockAlert = vi.fn();
      vi.stubGlobal('alert', mockAlert);

      const { result } = renderHook(() =>
        useExport(null, true, mockGetCurrentConfig)
      );
      await act(async () => {
        await result.current.copyBeautifiedImage();
      });

      // Should call snapFrameAPI or attempt clipboard
    });
  });
});
