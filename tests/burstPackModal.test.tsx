import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BurstPackModal from '../src/renderer/components/burst/BurstPackModal';

const mockBurst = {
  modalOpen: true,
  openModal: vi.fn(),
  closeModal: vi.fn(),
  phase: 'idle' as const,
  progress: { current: 0, total: 0 },
  toast: null,
  saveBurstPack: vi.fn().mockResolvedValue({ success: true, variantCount: 4 }),
};

const mockGallery = {
  galleryFolder: 'C:\\Users\\me\\Pictures\\Screenshot Beaut',
};

const mockApp = {
  documentName: 'my-screenshot',
};

vi.mock('../src/renderer/contexts/BurstPackContext', () => ({
  useBurstPackContext: () => mockBurst,
}));

vi.mock('../src/renderer/contexts/GalleryContext', () => ({
  useGalleryContext: () => mockGallery,
}));

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockApp,
}));

describe('BurstPackModal', () => {
  beforeEach(() => {
    mockBurst.saveBurstPack.mockClear();
    mockBurst.closeModal.mockClear();
    mockBurst.modalOpen = true;
    mockBurst.phase = 'idle';
  });

  it('renders curated packs', () => {
    render(<BurstPackModal />);
    expect(screen.getByText('Platform Burst Pack')).toBeInTheDocument();
    expect(screen.getByText('Launch Kit')).toBeInTheDocument();
    expect(screen.getByText('Social Story Kit')).toBeInTheDocument();
  });

  it('calls saveBurstPack with selected pack', () => {
    render(<BurstPackModal />);
    fireEvent.click(screen.getByText('Save Burst Pack'));
    expect(mockBurst.saveBurstPack).toHaveBeenCalledWith('launch-kit', []);
  });

  it('renders nothing when modal is closed', () => {
    mockBurst.modalOpen = false;
    const { container } = render(<BurstPackModal />);
    expect(container.firstChild).toBeNull();
  });

  it('shows save destination with gallery path', () => {
    render(<BurstPackModal />);
    expect(screen.getByText(/Saves to your/)).toBeInTheDocument();
    expect(document.querySelector('.burst-pack-save-dest-path')?.textContent).toContain('my-screenshot');
    expect(document.querySelector('.burst-pack-save-dest-path')?.textContent).toContain('Screenshot Beaut');
  });

  it('custom checkbox clears curated pack selection', () => {
    render(<BurstPackModal />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(mockBurst.saveBurstPack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Save Burst Pack'));
    expect(mockBurst.saveBurstPack).toHaveBeenCalledWith(null, expect.arrayContaining([expect.any(String)]));
  });
});