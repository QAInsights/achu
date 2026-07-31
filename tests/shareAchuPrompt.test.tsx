import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ShareAchuPrompt from '../src/renderer/components/ShareAchuPrompt';
import { makeFullMockContext } from './shared';

const mockCtx = vi.hoisted(() => ({
  value: null as any,
}));

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockCtx.value,
}));

describe('ShareAchuPrompt', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    onClose.mockClear();
    mockCtx.value = makeFullMockContext({
      showToast: vi.fn(),
    });
    vi.stubGlobal('snapFrameAPI', {
      openURL: vi.fn(),
      copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders nothing when closed', () => {
    render(<ShareAchuPrompt open={false} onClose={onClose} />);
    expect(screen.queryByTestId('share-achu-prompt')).not.toBeInTheDocument();
  });

  it('shows soft share UI when open', () => {
    render(<ShareAchuPrompt open onClose={onClose} />);
    expect(screen.getByTestId('share-achu-prompt')).toBeInTheDocument();
    expect(screen.getByText('Share achu?')).toBeInTheDocument();
    expect(screen.getByText('Not now')).toBeInTheDocument();
  });

  it('dismisses permanently on Not now', () => {
    render(<ShareAchuPrompt open onClose={onClose} />);
    fireEvent.click(screen.getByText('Not now'));
    expect(onClose).toHaveBeenCalled();
    const parsed = JSON.parse(localStorage.getItem('snapframe-user-defaults') || '{}');
    expect(parsed.shareAchuPromptDismissed).toBe(true);
  });

  it('opens X intent and dismisses on Share on X', () => {
    render(<ShareAchuPrompt open onClose={onClose} />);
    fireEvent.click(screen.getByTestId('share-achu-x'));
    expect(window.snapFrameAPI.openURL).toHaveBeenCalled();
    const url = (window.snapFrameAPI.openURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('x.com/intent/post');
    expect(onClose).toHaveBeenCalled();
  });

  it('copies achu.app link', async () => {
    render(<ShareAchuPrompt open onClose={onClose} />);
    await act(async () => {
      fireEvent.click(screen.getByText('Copy link'));
      await Promise.resolve();
    });
    expect(window.snapFrameAPI.copyTextToClipboard).toHaveBeenCalledWith('https://achu.app');
    expect(mockCtx.value.showToast).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
