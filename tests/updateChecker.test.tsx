import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import UpdateChecker from '../src/renderer/components/UpdateChecker';

// Mock AppContext
vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
}));

let mockContext: any = {};

describe('UpdateChecker component', () => {
  beforeEach(() => {
    mockContext = {
      updateAvailable: null,
      setUpdateAvailable: vi.fn(),
    };
    vi.stubGlobal('snapFrameAPI', {
      checkForUpdates: vi.fn(),
      startUpdate: vi.fn(),
      onUpdateProgress: vi.fn(() => () => {}),
      onUpdateAvailable: vi.fn(() => () => {}),
      openReleasePage: vi.fn(),
    });
  });

  it('renders check button initially', () => {
    render(<UpdateChecker />);
    expect(screen.getByText('Check for Updates')).toBeInTheDocument();
  });

  it('shows checking state when check button is clicked', async () => {
    const checkForUpdates = vi.fn().mockReturnValue(new Promise(() => {}));
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    expect(checkForUpdates).toHaveBeenCalled();
    expect(screen.getByText('Checking for updates...')).toBeInTheDocument();
  });

  it('shows no-update state when no updates are available', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({ available: false });
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

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
      releaseUrl: 'https://github.com/QAInsights/achu/releases/latest',
      downloadSize: 150000000,
    });
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('New Version Available: v2026.6.01')).toBeInTheDocument();
    expect(screen.getByText('Awesome features added!')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
    expect(screen.getByText(/Download size:/)).toBeInTheDocument();
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

    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates, startUpdate, onUpdateProgress });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByText('Upgrade Now'));

    expect(startUpdate).toHaveBeenCalledWith('https://example.com/achu.exe');
    expect(screen.getByText('Downloading update...')).toBeInTheDocument();

    act(() => {
      progressCallback(45);
    });
    expect(screen.getByText('45%')).toBeInTheDocument();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('Update simulated')).toBeInTheDocument();
  });

  it('shows error when install returns manualFallback', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({
      available: true,
      version: '2026.6.01',
      downloadUrl: 'https://example.com/achu.dmg',
    });
    const startUpdate = vi.fn().mockResolvedValue({
      success: false,
      manualFallback: true,
      error: 'Could not parse DMG mount point',
    });
    vi.stubGlobal('snapFrameAPI', {
      ...window.snapFrameAPI,
      checkForUpdates,
      startUpdate,
      onUpdateProgress: vi.fn(() => () => {}),
    });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByText('Upgrade Now'));
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText('Update Error')).toBeInTheDocument();
    expect(screen.getByText('Could not parse DMG mount point')).toBeInTheDocument();
  });

  it('handles errors gracefully during update check', async () => {
    const checkForUpdates = vi.fn().mockRejectedValue(new Error('Network Timeout'));
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve().catch(() => {});
    });

    expect(screen.getByText('Update Error')).toBeInTheDocument();
    expect(screen.getByText('Network Timeout')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Download from GitHub')).toBeInTheDocument();
  });

  it('auto-triggers check when updateAvailable is set from startup', async () => {
    const checkForUpdates = vi.fn().mockResolvedValue({
      available: true,
      version: '2026.7.01',
      downloadUrl: 'https://example.com/achu.exe',
      releaseUrl: 'https://github.com/QAInsights/achu/releases/latest',
    });
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates });

    mockContext.updateAvailable = { version: '2026.7.01', releaseUrl: 'https://github.com/QAInsights/achu/releases/latest' };

    render(<UpdateChecker />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(checkForUpdates).toHaveBeenCalled();
    expect(screen.getByText('New Version Available: v2026.7.01')).toBeInTheDocument();
  });

  it('opens release page when Download from GitHub is clicked', async () => {
    const checkForUpdates = vi.fn().mockRejectedValue(new Error('Network Timeout'));
    const openReleasePage = vi.fn();
    vi.stubGlobal('snapFrameAPI', { ...window.snapFrameAPI, checkForUpdates, openReleasePage });

    render(<UpdateChecker />);
    fireEvent.click(screen.getByText('Check for Updates'));

    await act(async () => {
      await Promise.resolve().catch(() => {});
    });

    fireEvent.click(screen.getByText('Download from GitHub'));
    expect(openReleasePage).toHaveBeenCalled();
  });
});
