import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GalleryProvider, useGalleryContext } from '../src/renderer/contexts/GalleryContext';
import { makeFullMockContext } from './shared';

let mockContext: ReturnType<typeof makeFullMockContext>;
const mockGallery = {
  closeGallery: vi.fn(),
  galleryFolder: '/mock/gallery',
  galleryItems: [],
  galleryLoading: false,
  galleryError: null,
  loadGallery: vi.fn(),
  deleteItem: vi.fn(),
  openInEditor: vi.fn(),
  copyToClipboard: vi.fn(),
  openInExplorer: vi.fn(),
  openFolderInExplorer: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
}));

vi.mock('../src/renderer/hooks/useGallery', () => ({
  useGallery: () => mockGallery,
}));

describe('GalleryContext', () => {
  beforeEach(() => {
    mockContext = makeFullMockContext();
    vi.clearAllMocks();
  });

  it('GalleryProvider renders children', () => {
    const { getByText } = render(
      <GalleryProvider>
        <div>test child</div>
      </GalleryProvider>
    );
    expect(getByText('test child')).toBeInTheDocument();
  });

  it('useGalleryContext returns gallery hook value inside provider', () => {
    function Consumer() {
      const gallery = useGalleryContext();
      return <span>{gallery.galleryFolder}</span>;
    }
    const { getByText } = render(
      <GalleryProvider>
        <Consumer />
      </GalleryProvider>
    );
    expect(getByText('/mock/gallery')).toBeInTheDocument();
  });

  it('useGalleryContext throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BadConsumer() {
      useGalleryContext();
      return null;
    }
    expect(() => render(<BadConsumer />)).toThrow('useGalleryContext must be used within a GalleryProvider');
    consoleSpy.mockRestore();
  });
});
