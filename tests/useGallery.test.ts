import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGallery } from '../src/renderer/hooks/useGallery';

const mockOpenGalleryImage = vi.fn().mockResolvedValue({ success: true });

const mockSnapFrameAPI = {
  listGallery: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getGalleryFolder: vi.fn().mockResolvedValue('/home/user/achu-screenshots'),
  setGalleryFolder: vi.fn().mockResolvedValue({ success: true }),
  deleteGalleryItem: vi.fn().mockResolvedValue({ success: true }),
  copyGalleryToClipboard: vi.fn().mockResolvedValue({ success: true }),
  openInExplorer: vi.fn().mockResolvedValue({ success: true }),
  openGalleryFolder: vi.fn().mockResolvedValue({ success: true }),
};

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenGalleryImage.mockResolvedValue({ success: true });
    (window as any).snapFrameAPI = mockSnapFrameAPI;
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    expect(result.current.galleryVisible).toBe(false);
    expect(result.current.galleryFolder).toBe('');
    expect(result.current.galleryItems).toEqual([]);
    expect(result.current.galleryLoading).toBe(false);
    expect(result.current.galleryError).toBeNull();
  });

  it('openGallery sets galleryVisible to true', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      result.current.openGallery();
    });

    expect(result.current.galleryVisible).toBe(true);
  });

  it('closeGallery sets galleryVisible to false', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      result.current.openGallery();
    });
    act(() => {
      result.current.closeGallery();
    });

    expect(result.current.galleryVisible).toBe(false);
  });

  it('loadGallery fetches items and updates state', async () => {
    const items = [
      { name: 'a.png', path: '/a.png', size: 100, modified: 1000, ext: 'png' },
    ];
    mockSnapFrameAPI.listGallery.mockResolvedValue({ success: true, data: items });

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(result.current.galleryItems).toEqual(items);
    expect(result.current.galleryLoading).toBe(false);
  });

  it('loadGallery sets error on failure', async () => {
    mockSnapFrameAPI.listGallery.mockResolvedValue({
      success: false,
      error: { code: 'PERMISSION_DENIED', message: 'Access denied' },
    });

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(result.current.galleryError).toEqual({ code: 'PERMISSION_DENIED', message: 'Access denied' });
    expect(result.current.galleryItems).toEqual([]);
  });

  it('deleteItem removes item from list on success', async () => {
    const items = [
      { name: 'a.png', path: '/a.png', size: 100, modified: 1000, ext: 'png' },
    ];
    mockSnapFrameAPI.listGallery.mockResolvedValue({ success: true, data: items });

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(result.current.galleryItems.length).toBe(1);

    await act(async () => {
      await result.current.deleteItem('/a.png');
    });

    expect(result.current.galleryItems.length).toBe(0);
  });

  it('openInEditor restores project via openGalleryImage and closes gallery', async () => {
    const item = { name: 'a.png', path: '/a.png', size: 100, modified: 1000, ext: 'png' };

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      result.current.openGallery();
    });

    await act(async () => {
      await result.current.openInEditor(item);
    });

    expect(mockOpenGalleryImage).toHaveBeenCalledWith(item);
    expect(result.current.galleryVisible).toBe(false);
  });

  it('openInEditor sets error when restore fails', async () => {
    mockOpenGalleryImage.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project missing' },
    });
    const item = { name: 'a.png', path: '/a.png', size: 100, modified: 1000, ext: 'png' };

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      result.current.openGallery();
    });

    await act(async () => {
      await result.current.openInEditor(item);
    });

    expect(result.current.galleryError?.code).toBe('NOT_FOUND');
    expect(result.current.galleryVisible).toBe(true);
  });

  it('copyToClipboard returns true on success', async () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    let success = false;
    await act(async () => {
      success = await result.current.copyToClipboard('/a.png');
    });

    expect(success).toBe(true);
  });

  it('copyToClipboard returns false on failure', async () => {
    mockSnapFrameAPI.copyGalleryToClipboard.mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'File not found' },
    });

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    let success = true;
    await act(async () => {
      success = await result.current.copyToClipboard('/missing.png');
    });

    expect(success).toBe(false);
    expect(result.current.galleryError?.code).toBe('NOT_FOUND');
  });

  it('clearError resets error state', async () => {
    mockSnapFrameAPI.listGallery.mockResolvedValue({
      success: false,
      error: { code: 'DISK_FULL', message: 'Disk full' },
    });

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(result.current.galleryError).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.galleryError).toBeNull();
  });

  it('changeFolder updates galleryFolder on success', async () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    await act(async () => {
      await result.current.changeFolder('/new/path');
    });

    expect(mockSnapFrameAPI.setGalleryFolder).toHaveBeenCalledWith('/new/path');
    expect(result.current.galleryFolder).toBe('/new/path');
  });

  it('handles missing snapFrameAPI gracefully', () => {
    delete (window as any).snapFrameAPI;

    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    expect(result.current.galleryVisible).toBe(false);
  });

  it('Ctrl+G toggles gallery from closed to open', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    expect(result.current.galleryVisible).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }));
    });

    expect(result.current.galleryVisible).toBe(true);
  });

  it('Ctrl+G toggles gallery from open to closed', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      result.current.openGallery();
    });
    expect(result.current.galleryVisible).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }));
    });

    expect(result.current.galleryVisible).toBe(false);
  });

  it('Ctrl+G does not trigger when Shift or Alt is held', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, shiftKey: true, bubbles: true }));
    });
    expect(result.current.galleryVisible).toBe(false);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, altKey: true, bubbles: true }));
    });
    expect(result.current.galleryVisible).toBe(false);
  });

  it('Ctrl+G does not trigger when focus is on an input element', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', ctrlKey: true, bubbles: true }));
    });

    expect(result.current.galleryVisible).toBe(false);
    document.body.removeChild(input);
  });

  it('Meta+G (macOS Cmd) toggles gallery', () => {
    const { result } = renderHook(() => useGallery(mockOpenGalleryImage));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', metaKey: true, bubbles: true }));
    });

    expect(result.current.galleryVisible).toBe(true);
  });
});