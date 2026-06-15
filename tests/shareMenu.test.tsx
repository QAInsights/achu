import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkspaceFooter from '../src/renderer/components/WorkspaceFooter';

// Mock AppContext
vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/renderer/contexts/BurstPackContext', () => ({
  useBurstPackContext: () => ({
    openModal: vi.fn(),
    toast: null,
  }),
}));

let mockContext: any = {};

describe('WorkspaceFooter & ShareMenu', () => {
  beforeEach(() => {
    mockContext = {
      imageSrc: 'data:image/png;base64,mock',
      noImageMode: false,
      exportFormat: 'png',
      jpegQuality: 90,
      triggerExport: vi.fn(),
      copyBeautifiedImage: vi.fn().mockResolvedValue(undefined),
      handleSaveToGallery: vi.fn().mockResolvedValue(undefined),
      galleryToast: null,
      setExportFormat: vi.fn(),
      setJpegQuality: vi.fn(),
      compressionMode: 'balanced',
      setCompressionMode: vi.fn(),
    };
    window.snapFrameAPI = {
      openURL: vi.fn(),
    };
  });

  it('renders WorkspaceFooter components', () => {
    render(<WorkspaceFooter />);
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('toggles share menu popover when clicking Share button', () => {
    render(<WorkspaceFooter />);
    
    // Popover shouldn't be visible initially
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();

    // Click Share button
    const shareBtn = screen.getByText('Share');
    fireEvent.click(shareBtn);

    // Popover should be visible
    expect(screen.getByTestId('share-menu-popover')).toBeInTheDocument();
    expect(screen.getByText('Copy & post on X')).toBeInTheDocument();
    expect(screen.getByText('Copy & send on WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Copy & share on LinkedIn')).toBeInTheDocument();

    // Click Share button again
    fireEvent.click(shareBtn);
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('triggers copyBeautifiedImage when Copy is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Copy'));

    expect(mockContext.copyBeautifiedImage).toHaveBeenCalled();
  });

  it('triggers triggerExport when Export is clicked', () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Export'));

    expect(mockContext.triggerExport).toHaveBeenCalled();
  });

  it('copies image and opens X/Twitter intent URL when Copy & post on X is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Copy & post on X'));

    await waitFor(() => {
      expect(mockContext.copyBeautifiedImage).toHaveBeenCalled();
      expect(window.snapFrameAPI.openURL).toHaveBeenCalledWith(
        expect.stringContaining('x.com/intent/post')
      );
    });
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('copies image and opens WhatsApp intent URL when Copy & send on WhatsApp is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Copy & send on WhatsApp'));

    await waitFor(() => {
      expect(mockContext.copyBeautifiedImage).toHaveBeenCalled();
      expect(window.snapFrameAPI.openURL).toHaveBeenCalledWith(
        expect.stringContaining('api.whatsapp.com/send')
      );
    });
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('closes share menu popover when clicking outside', () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    expect(screen.getByTestId('share-menu-popover')).toBeInTheDocument();

    // Trigger mousedown outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });
});
