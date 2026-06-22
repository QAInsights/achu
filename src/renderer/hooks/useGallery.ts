import { useState, useCallback, useEffect } from 'react';

export interface GalleryItem {
  name: string;
  path: string;
  size: number;
  modified: number;
  ext: string;
  isBurstBundle?: boolean;
  burstVariantCount?: number;
  bundlePath?: string;
}

export interface GalleryError {
  code: string;
  message: string;
}

interface GalleryResult<T = void> {
  success: boolean;
  data?: T;
  error?: GalleryError;
}

export function useGallery(
  openGalleryImage: (item: GalleryItem) => Promise<{ success: boolean; error?: GalleryError }>
) {
  const [galleryVisible, setGalleryVisible] = useState<boolean>(false);
  const [galleryFolder, setGalleryFolder] = useState<string>('');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<GalleryError | null>(null);

  const openGallery = useCallback(() => {
    setGalleryVisible(true);
    setGalleryError(null);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryVisible(false);
  }, []);

  const loadGallery = useCallback(async () => {
    if (!window.snapFrameAPI) return;
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const result: GalleryResult<GalleryItem[]> = await window.snapFrameAPI.listGallery();
      if (result.success && result.data) {
        setGalleryItems(result.data);
      } else if (result.error) {
        setGalleryError(result.error);
        setGalleryItems([]);
      }
    } catch (err) {
      setGalleryError({ code: 'UNKNOWN', message: String(err) });
      setGalleryItems([]);
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const loadGalleryFolder = useCallback(async () => {
    if (!window.snapFrameAPI) return;
    try {
      const folder = await window.snapFrameAPI.getGalleryFolder();
      if (folder) setGalleryFolder(folder);
    } catch {
      // non-fatal
    }
  }, []);

  const changeFolder = useCallback(async (newFolder: string) => {
    if (!window.snapFrameAPI) return;
    try {
      const result: GalleryResult = await window.snapFrameAPI.setGalleryFolder(newFolder);
      if (result.success) {
        setGalleryFolder(newFolder);
        setGalleryError(null);
        setGalleryItems([]);
        const listResult: GalleryResult<GalleryItem[]> = await window.snapFrameAPI.listGallery();
        if (listResult.success && listResult.data) {
          setGalleryItems(listResult.data);
        } else if (listResult.error) {
          setGalleryError(listResult.error);
        }
      } else if (result.error) {
        setGalleryError(result.error);
      }
    } catch (err) {
      setGalleryError({ code: 'UNKNOWN', message: String(err) });
    }
  }, []);

  const deleteItem = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.snapFrameAPI) return false;
    try {
      const result: GalleryResult = await window.snapFrameAPI.deleteGalleryItem(filePath);
      if (result.success) {
        setGalleryItems((prev) => prev.filter((i) => i.path !== filePath));
        return true;
      } else if (result.error) {
        setGalleryError(result.error);
        return false;
      }
      return false;
    } catch (err) {
      setGalleryError({ code: 'UNKNOWN', message: String(err) });
      return false;
    }
  }, []);

  const openInEditor = useCallback(async (item: GalleryItem) => {
    if (!window.snapFrameAPI) return;
    try {
      const result = await openGalleryImage(item);
      if (!result.success) {
        if (result.error) setGalleryError(result.error);
        return;
      }
      closeGallery();
    } catch (err) {
      setGalleryError({ code: 'UNKNOWN', message: String(err) });
    }
  }, [openGalleryImage, closeGallery]);

  const copyToClipboard = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.snapFrameAPI) return false;
    try {
      const result: GalleryResult = await window.snapFrameAPI.copyGalleryToClipboard(filePath);
      if (!result.success && result.error) {
        setGalleryError(result.error);
      }
      return result.success;
    } catch (err) {
      setGalleryError({ code: 'UNKNOWN', message: String(err) });
      return false;
    }
  }, []);

  const openInExplorer = useCallback(async (filePath: string) => {
    if (!window.snapFrameAPI) return;
    try {
      await window.snapFrameAPI.openInExplorer(filePath);
    } catch {
      // non-fatal
    }
  }, []);

  const openFolderInExplorer = useCallback(async () => {
    if (!window.snapFrameAPI) return;
    try {
      await window.snapFrameAPI.openGalleryFolder();
    } catch {
      // non-fatal
    }
  }, []);

  const clearError = useCallback(() => {
    setGalleryError(null);
  }, []);

  useEffect(() => {
    loadGalleryFolder();
  }, [loadGalleryFolder]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (galleryVisible) {
          closeGallery();
        } else {
          openGallery();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryVisible, openGallery, closeGallery]);

  return {
    galleryVisible, setGalleryVisible,
    galleryFolder, setGalleryFolder,
    galleryItems,
    galleryLoading,
    galleryError,
    openGallery,
    closeGallery,
    loadGallery,
    loadGalleryFolder,
    changeFolder,
    deleteItem,
    openInEditor,
    copyToClipboard,
    openInExplorer,
    openFolderInExplorer,
    clearError
  };
}