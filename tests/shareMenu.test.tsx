import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import WorkspaceFooter from '../src/renderer/components/WorkspaceFooter';

// Mock AppContext
vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
      setExportFormat: vi.fn(),
      setJpegQuality: vi.fn(),
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
    expect(screen.getByText('Copy Image')).toBeInTheDocument();
    expect(screen.getByText('Save File')).toBeInTheDocument();
    expect(screen.getByText('Share on X')).toBeInTheDocument();
    expect(screen.getByText('Share on WhatsApp')).toBeInTheDocument();

    // Click Share button again
    fireEvent.click(shareBtn);
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('triggers copyBeautifiedImage when Copy Image is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Copy Image'));

    expect(mockContext.copyBeautifiedImage).toHaveBeenCalled();
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('triggers triggerExport when Save File is clicked', () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Save File'));

    expect(mockContext.triggerExport).toHaveBeenCalled();
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('copies image and opens X/Twitter intent URL when Share on X is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Share on X'));

    await waitFor(() => {
      expect(mockContext.copyBeautifiedImage).toHaveBeenCalled();
      expect(window.snapFrameAPI.openURL).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet')
      );
    });
    expect(screen.queryByTestId('share-menu-popover')).not.toBeInTheDocument();
  });

  it('copies image and opens WhatsApp intent URL when Share on WhatsApp is clicked', async () => {
    render(<WorkspaceFooter />);
    fireEvent.click(screen.getByText('Share'));
    fireEvent.click(screen.getByText('Share on WhatsApp'));

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
