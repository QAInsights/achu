import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import UpdateChecker from '../src/renderer/components/UpdateChecker';

describe('UpdateChecker component', () => {
  beforeEach(() => {
    vi.stubGlobal('snapFrameAPI', {
      checkForUpdates: vi.fn(),
      startUpdate: vi.fn(),
      onUpdateProgress: vi.fn(() => () => {}),
    });
  });

  it('renders check button initially', () => {
    render(<UpdateChecker />);
    expect(screen.getByText('Check for Updates')).toBeInTheDocument();
  });

  it('shows checking state when check button is clicked', async () => {
    const checkForUpdates = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('snapFrameAPI', { checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    expect(checkForUpdates).toHaveBeenCalled();
    expect(screen.getByText('Checking for updates...')).toBeInTheDocument();
  });

  it('shows no-update state when no updates are available', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({ available: false });
    vi.stubGlobal('snapFrameAPI', { checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    // Wait for the async state resolution
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('achu is up to date!')).toBeInTheDocument();
  });

  it('shows update-available state and details when update is found', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({
      available: true,
      version: '2026.6.01',
      releaseNotes: 'Awesome features added!',
      downloadUrl: 'https://example.com/achu.exe',
    });
    vi.stubGlobal('snapFrameAPI', { checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('New Version Available: v2026.6.01')).toBeInTheDocument();
    expect(screen.getByText('Awesome features added!')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
  });

  it('handles upgrade start and progress state', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({
      available: true,
      version: '2026.6.01',
      downloadUrl: 'https://example.com/achu.exe',
    });
    const startUpdate = vi.fn().mockResolvedValue({ simulated: true });
    let progressCallback: any = null;
    const onUpdateProgress = vi.fn((cb) => {
      progressCallback = cb;
      return () => {};
    });

    vi.stubGlobal('snapFrameAPI', { checkForUpdates, startUpdate, onUpdateProgress });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByText('Upgrade Now'));

    expect(startUpdate).toHaveBeenCalledWith('https://example.com/achu.exe');
    expect(screen.getByText('Downloading update...')).toBeInTheDocument();

    // Simulate progress updates
    act(() => {
      progressCallback(45);
    });
    expect(screen.getByText('45%')).toBeInTheDocument();

    // Await finish
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Update Downloaded!')).toBeInTheDocument();
  });

  it('handles errors gracefully during update check', async () => {
    const checkForUpdates = vi.fn().mockRejectedValue(new Error('Network Timeout'));
    vi.stubGlobal('snapFrameAPI', { checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve().catch(() => {});
    });

    expect(screen.getByText('Update Error')).toBeInTheDocument();
    expect(screen.getByText('Network Timeout')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
