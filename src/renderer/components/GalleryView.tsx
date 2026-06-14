import { useState, useEffect, useCallback, useRef } from 'react';
import { useGalleryContext } from '../contexts/GalleryContext';
import {
  FolderOpen,
  Trash2,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import './GalleryView.css';

interface GalleryItemData {
  name: string;
  path: string;
  size: number;
  modified: number;
  ext: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function GalleryView() {
  const {
    closeGallery,
    galleryFolder,
    galleryItems,
    galleryLoading,
    galleryError,
    loadGallery,
    deleteItem,
    openInEditor,
    copyToClipboard,
    openInExplorer,
    openFolderInExplorer,
    clearError
  } = useGalleryContext();

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const thumbnailLoadId = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const loadId = ++thumbnailLoadId.current;
    const loadThumbs = async () => {
      if (!window.snapFrameAPI || galleryItems.length === 0) return;
      const thumbs: Record<string, string> = {};
      await Promise.all(
        galleryItems.map(async (item) => {
          if (loadId !== thumbnailLoadId.current) return; // Cancelled
          try {
            const result = await window.snapFrameAPI.getGalleryThumbnail(item.path, 300);
            if (result.success && result.data) {
              thumbs[item.path] = result.data;
            }
          } catch { /* skip */ }
        })
      );
      if (loadId === thumbnailLoadId.current) {
        setThumbnails(thumbs);
      }
    };
    loadThumbs();
  }, [galleryItems]);

  const handleOpenInEditor = async (item: GalleryItemData) => {
    await openInEditor(item as any);
  };

  const handleCopyToClipboard = async (item: GalleryItemData) => {
    const success = await copyToClipboard(item.path);
    showToast(success ? 'Copied to clipboard' : 'Failed to copy');
  };

  const handleDelete = async (item: GalleryItemData) => {
    setDeleting(item.path);
    const success = await deleteItem(item.path);
    showToast(success ? 'Deleted' : 'Failed to delete');
    setDeleting(null);
  };

  return (
    <div className="gallery-view">
      <div className="gallery-header">
        <div className="gallery-header-left">
          <button
            className="tool-btn gallery-back-btn"
            onClick={closeGallery}
            title="Back to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="gallery-title">Gallery</h2>
          {!galleryLoading && (
            <span className="gallery-count">
              {galleryItems.length} {galleryItems.length === 1 ? 'image' : 'images'}
            </span>
          )}
        </div>
        <div className="gallery-header-actions">
          <button className="btn btn-secondary" onClick={loadGallery} title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="btn btn-secondary" onClick={openFolderInExplorer} title="Open Folder">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder</span>
          </button>
        </div>
      </div>

      {galleryError && (
        <div className="gallery-error-banner">
          <AlertTriangle className="w-4 h-4 gallery-error-icon" />
          <span className="gallery-error-text">{galleryError.message}</span>
          <button className="gallery-error-dismiss" onClick={clearError} title="Dismiss">
            &times;
          </button>
        </div>
      )}

      {galleryFolder && (
        <div className="gallery-meta-bar">
          <div className="gallery-meta-item">
            <FolderOpen className="gallery-meta-icon" aria-hidden="true" />
            <span className="gallery-meta-label">Folder</span>
            <span className="gallery-meta-value" title={galleryFolder}>
              {galleryFolder}
            </span>
          </div>
          <div className="gallery-info-callout">
            <Info className="gallery-info-callout-icon" aria-hidden="true" />
            <span>
              Deleted images move to <code>.achu-trash</code> and are removed after 30 days.
            </span>
          </div>
        </div>
      )}

      <div className="gallery-content">
        {galleryLoading ? (
          <div className="gallery-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="gallery-skeleton">
                <div className="gallery-skeleton-image" />
                <div className="gallery-skeleton-text" />
                <div className="gallery-skeleton-text short" />
              </div>
            ))}
          </div>
        ) : galleryItems.length === 0 ? (
          <div className="gallery-empty">
            <ImageIcon className="gallery-empty-icon" />
            <p className="gallery-empty-title">No screenshots yet</p>
            <p className="gallery-empty-hint">
              Use "Save to Gallery" to store your beautified screenshots here.
            </p>
          </div>
        ) : (
          <div className="gallery-grid">
            {galleryItems.map((item) => (
              <div
                key={item.path}
                className="gallery-card"
                onDoubleClick={() => handleOpenInEditor(item)}
              >
                <div className="gallery-card-image">
                  {thumbnails[item.path] ? (
                    <img src={thumbnails[item.path]} alt={item.name} />
                  ) : (
                    <div className="gallery-card-placeholder">
                      <Loader2 className="w-5 h-5" />
                    </div>
                  )}
                  <div className="gallery-card-overlay">
                    <button
                      className="gallery-card-action"
                      onClick={() => handleOpenInEditor(item)}
                      title="Open in Editor"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="gallery-card-action"
                      onClick={() => handleCopyToClipboard(item)}
                      title="Copy to Clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="gallery-card-action"
                      onClick={() => openInExplorer(item.path)}
                      title="Open in File Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="gallery-card-action danger"
                      onClick={() => handleDelete(item)}
                      disabled={deleting === item.path}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="gallery-card-info">
                  <span className="gallery-card-name" title={item.name}>
                    {item.name}
                  </span>
                  <div className="gallery-card-meta">
                    <span>{formatFileSize(item.size)}</span>
                    <span className="gallery-card-meta-sep">·</span>
                    <span>{formatDate(item.modified)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="gallery-toast">{toast}</div>}
    </div>
  );
}
