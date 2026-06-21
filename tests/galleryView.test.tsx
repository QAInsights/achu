import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GalleryView from '../src/renderer/components/GalleryView';

const mockGalleryCtx = {
  closeGallery: vi.fn(),
  galleryFolder: '/mock/gallery',
  galleryItems: [] as any[],
  galleryLoading: false,
  galleryError: null as any,
  loadGallery: vi.fn(),
  deleteItem: vi.fn().mockResolvedValue(true),
  openInEditor: vi.fn().mockResolvedValue(undefined),
  copyToClipboard: vi.fn().mockResolvedValue(true),
  openInExplorer: vi.fn(),
  openFolderInExplorer: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../src/renderer/contexts/GalleryContext', () => ({
  useGalleryContext: () => mockGalleryCtx,
}));

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => ({}),
}));

const makeItem = (overrides: Record<string, any> = {}) => ({
  name: 'test.png',
  path: '/mock/gallery/test.png',
  size: 1024,
  modified: 1717200000000,
  ext: '.png',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGalleryCtx.galleryItems = [];
  mockGalleryCtx.galleryLoading = false;
  mockGalleryCtx.galleryError = null;
  mockGalleryCtx.galleryFolder = '/mock/gallery';
  delete (window as any).snapFrameAPI;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GalleryView', () => {
  it('renders gallery title and back button', () => {
    render(<GalleryView />);
    expect(screen.getByText('Gallery')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<GalleryView />);
    expect(screen.getByText('No screenshots yet')).toBeInTheDocument();
    expect(screen.getByText(/Save to Gallery/)).toBeInTheDocument();
  });

  it('shows loading skeletons when loading', () => {
    mockGalleryCtx.galleryLoading = true;
    const { container } = render(<GalleryView />);
    const skeletons = container.querySelectorAll('.gallery-skeleton');
    expect(skeletons.length).toBe(8);
  });

  it('renders gallery items', () => {
    mockGalleryCtx.galleryItems = [makeItem({ name: 'test1.png' }), makeItem({ name: 'test2.png' })];
    render(<GalleryView />);
    expect(screen.getByText('test1.png')).toBeInTheDocument();
    expect(screen.getByText('test2.png')).toBeInTheDocument();
    expect(screen.getByText('2 images')).toBeInTheDocument();
  });

  it('shows item count with singular form', () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    expect(screen.getByText('1 image')).toBeInTheDocument();
  });

  it('calls closeGallery on back button click', () => {
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Back to Workspace'));
    expect(mockGalleryCtx.closeGallery).toHaveBeenCalled();
  });

  it('calls loadGallery on refresh button click', () => {
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Refresh'));
    expect(mockGalleryCtx.loadGallery).toHaveBeenCalled();
  });

  it('calls openFolderInExplorer on folder button click', () => {
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Open Folder'));
    expect(mockGalleryCtx.openFolderInExplorer).toHaveBeenCalled();
  });

  it('displays error banner when galleryError is set', () => {
    mockGalleryCtx.galleryError = { code: 'UNKNOWN', message: 'Something went wrong' };
    render(<GalleryView />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('clears error on dismiss button click', () => {
    mockGalleryCtx.galleryError = { code: 'UNKNOWN', message: 'error msg' };
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Dismiss'));
    expect(mockGalleryCtx.clearError).toHaveBeenCalled();
  });

  it('shows folder path in meta bar', () => {
    render(<GalleryView />);
    expect(screen.getByText('/mock/gallery')).toBeInTheDocument();
  });

  it('hides meta bar when galleryFolder is null', () => {
    mockGalleryCtx.galleryFolder = null;
    render(<GalleryView />);
    expect(screen.queryByText('Folder')).not.toBeInTheDocument();
  });

  it('shows burst badge for bundle items', () => {
    mockGalleryCtx.galleryItems = [
      makeItem({ name: 'bundle', isBurstBundle: true, burstVariantCount: 3 }),
    ];
    render(<GalleryView />);
    expect(screen.getByText('3 variants')).toBeInTheDocument();
  });

  it('does not show burst badge when variantCount is 0', () => {
    mockGalleryCtx.galleryItems = [
      makeItem({ isBurstBundle: true, burstVariantCount: 0 }),
    ];
    render(<GalleryView />);
    expect(screen.queryByText('0 variants')).not.toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    mockGalleryCtx.galleryItems = [
      makeItem({ name: 'bytes.png', size: 512 }),
      makeItem({ name: 'kb.png', size: 5120 }),
      makeItem({ name: 'mb.png', size: 5 * 1024 * 1024 }),
    ];
    render(<GalleryView />);
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('5.0 KB')).toBeInTheDocument();
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const date = new Date(2024, 5, 15, 14, 30).getTime();
    mockGalleryCtx.galleryItems = [makeItem({ modified: date })];
    render(<GalleryView />);
    expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
  });

  it('opens item in editor on single click', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    const { container } = render(<GalleryView />);
    const card = container.querySelector('.gallery-card') as HTMLElement;
    fireEvent.click(card);
    await waitFor(() => {
      expect(mockGalleryCtx.openInEditor).toHaveBeenCalled();
    });
  });

  it('opens item in editor via overlay button', () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    const openBtn = screen.getByTitle('Open in Editor');
    fireEvent.click(openBtn);
    expect(mockGalleryCtx.openInEditor).toHaveBeenCalled();
  });

  it('copies item to clipboard via overlay button', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.copyToClipboard.mockResolvedValue(true);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Copy to Clipboard'));
    await waitFor(() => {
      expect(mockGalleryCtx.copyToClipboard).toHaveBeenCalledWith('/mock/gallery/test.png');
    });
  });

  it('shows toast "Copied to clipboard" on successful copy', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.copyToClipboard.mockResolvedValue(true);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Copy to Clipboard'));
    await waitFor(() => {
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
    });
  });

  it('shows toast "Failed to copy" on failed copy', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.copyToClipboard.mockResolvedValue(false);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Copy to Clipboard'));
    await waitFor(() => {
      expect(screen.getByText('Failed to copy')).toBeInTheDocument();
    });
  });

  it('opens item in file explorer via overlay button', () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Open in File Explorer'));
    expect(mockGalleryCtx.openInExplorer).toHaveBeenCalledWith('/mock/gallery/test.png');
  });

  it('deletes item via overlay button', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.deleteItem.mockResolvedValue(true);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => {
      expect(mockGalleryCtx.deleteItem).toHaveBeenCalledWith('/mock/gallery/test.png');
    });
  });

  it('shows toast "Deleted" on successful delete', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.deleteItem.mockResolvedValue(true);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => {
      expect(screen.getByText('Deleted')).toBeInTheDocument();
    });
  });

  it('shows toast "Failed to delete" on failed delete', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.deleteItem.mockResolvedValue(false);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => {
      expect(screen.getByText('Failed to delete')).toBeInTheDocument();
    });
  });

  it('disables delete button while deleting', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    let resolveDelete: (val: boolean) => void;
    mockGalleryCtx.deleteItem.mockImplementation(() => new Promise<boolean>(r => { resolveDelete = r; }));
    render(<GalleryView />);
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(deleteBtn).toBeDisabled();
    });
    resolveDelete!(true);
    await waitFor(() => {
      expect(deleteBtn).not.toBeDisabled();
    });
  });

  it('loads thumbnails when snapFrameAPI is available', async () => {
    (window as any).snapFrameAPI = {
      getGalleryThumbnail: vi.fn().mockResolvedValue({ success: true, data: 'data:image/png;base64,thumb' }),
    };
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    await waitFor(() => {
      expect((window as any).snapFrameAPI.getGalleryThumbnail).toHaveBeenCalledWith('/mock/gallery/test.png', 300);
    });
  });

  it('shows placeholder when thumbnail fails to load', async () => {
    (window as any).snapFrameAPI = {
      getGalleryThumbnail: vi.fn().mockRejectedValue(new Error('fail')),
    };
    mockGalleryCtx.galleryItems = [makeItem()];
    const { container } = render(<GalleryView />);
    await waitFor(() => {
      expect((window as any).snapFrameAPI.getGalleryThumbnail).toHaveBeenCalled();
    });
  });

  it('shows placeholder when thumbnail API returns no data', async () => {
    (window as any).snapFrameAPI = {
      getGalleryThumbnail: vi.fn().mockResolvedValue({ success: false, data: null }),
    };
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    await waitFor(() => {
      expect((window as any).snapFrameAPI.getGalleryThumbnail).toHaveBeenCalled();
    });
  });

  it('renders card overlay action buttons', () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    render(<GalleryView />);
    expect(screen.getByTitle('Open in Editor')).toBeInTheDocument();
    expect(screen.getByTitle('Copy to Clipboard')).toBeInTheDocument();
    expect(screen.getByTitle('Open in File Explorer')).toBeInTheDocument();
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('closes gallery when Escape key is pressed', () => {
    render(<GalleryView />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockGalleryCtx.closeGallery).toHaveBeenCalled();
  });

  it('gallery toast has role="status" for accessibility', async () => {
    mockGalleryCtx.galleryItems = [makeItem()];
    mockGalleryCtx.copyToClipboard.mockResolvedValue(true);
    render(<GalleryView />);
    fireEvent.click(screen.getByTitle('Copy to Clipboard'));
    await waitFor(() => {
      const toast = screen.getByText('Copied to clipboard');
      expect(toast.closest('.gallery-toast')).toHaveAttribute('role', 'status');
      expect(toast.closest('.gallery-toast')).toHaveAttribute('aria-live', 'polite');
    });
  });
});
