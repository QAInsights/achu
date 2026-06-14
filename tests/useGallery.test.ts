import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGallery } from '../src/renderer/hooks/useGallery';

const mockSetImageSrc = vi.fn();
const mockPushHistory = vi.fn();
const mockGetCurrentConfig = vi.fn(() => ({ padding: 38 })) as any;

const mockSnapFrameAPI = {
  listGallery: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getGalleryFolder: vi.fn().mockResolvedValue('/home/user/achu-screenshots'),
  setGalleryFolder: vi.fn().mockResolvedValue({ success: true }),
  deleteGalleryItem: vi.fn().mockResolvedValue({ success: true }),
  readGalleryFile: vi.fn().mockResolvedValue({ success: true, data: 'data:image/png;base64,abc' }),
  copyGalleryToClipboard: vi.fn().mockResolvedValue({ success: true }),
  openInExplorer: vi.fn().mockResolvedValue({ success: true }),
  openGalleryFolder: vi.fn().mockResolvedValue({ success: true }),
};

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).snapFrameAPI = mockSnapFrameAPI;
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    expect(result.current.galleryVisible).toBe(false);
    expect(result.current.galleryFolder).toBe('');
    expect(result.current.galleryItems).toEqual([]);
    expect(result.current.galleryLoading).toBe(false);
    expect(result.current.galleryError).toBeNull();
  });

  it('openGallery sets galleryVisible to true', () => {
    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    act(() => {
      result.current.openGallery();
    });

    expect(result.current.galleryVisible).toBe(true);
  });

  it('closeGallery sets galleryVisible to false', () => {
    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    await act(async () => {
      await result.current.loadGallery();
    });

    expect(result.current.galleryItems.length).toBe(1);

    await act(async () => {
      await result.current.deleteItem('/a.png');
    });

    expect(result.current.galleryItems.length).toBe(0);
  });

  it('openInEditor loads image and closes gallery', async () => {
    const item = { name: 'a.png', path: '/a.png', size: 100, modified: 1000, ext: 'png' };

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    act(() => {
      result.current.openGallery();
    });

    await act(async () => {
      await result.current.openInEditor(item);
    });

    expect(mockSnapFrameAPI.readGalleryFile).toHaveBeenCalledWith('/a.png');
    expect(mockSetImageSrc).toHaveBeenCalledWith('data:image/png;base64,abc');
    expect(mockPushHistory).toHaveBeenCalled();
    expect(result.current.galleryVisible).toBe(false);
  });

  it('copyToClipboard returns true on success', async () => {
    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

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
    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    await act(async () => {
      await result.current.changeFolder('/new/path');
    });

    expect(mockSnapFrameAPI.setGalleryFolder).toHaveBeenCalledWith('/new/path');
    expect(result.current.galleryFolder).toBe('/new/path');
  });

  it('handles missing snapFrameAPI gracefully', () => {
    delete (window as any).snapFrameAPI;

    const { result } = renderHook(() =>
      useGallery(mockSetImageSrc, mockPushHistory, mockGetCurrentConfig)
    );

    expect(result.current.galleryVisible).toBe(false);
  });
});
