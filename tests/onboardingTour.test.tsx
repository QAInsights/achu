import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OnboardingTour from '../src/renderer/components/OnboardingTour';
import { makeFullMockContext } from './shared';

const mockCtx = vi.hoisted(() => ({
  value: null as any,
}));

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockCtx.value,
}));

describe('OnboardingTour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockCtx.value = makeFullMockContext({
      imageSrc: null,
      noImageMode: false,
      copyBeautifiedImage: vi.fn().mockResolvedValue(undefined),
      showToast: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows after a short delay for first-run users', () => {
    render(<OnboardingTour />);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
    expect(screen.getByText('Paste a screenshot')).toBeInTheDocument();
  });

  it('does not show when tour already completed', () => {
    localStorage.setItem(
      'snapframe-user-defaults',
      JSON.stringify({ onboardingTourCompleted: true })
    );
    render(<OnboardingTour />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });

  it('advances steps and completes via Skip', () => {
    render(<OnboardingTour />);
    act(() => {
      vi.advanceTimersByTime(450);
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Beautify in one click')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Paste a screenshot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
    const parsed = JSON.parse(localStorage.getItem('snapframe-user-defaults') || '{}');
    expect(parsed.onboardingTourCompleted).toBe(true);
  });

  it('option A: empty canvas toasts and stays on step 3', async () => {
    render(<OnboardingTour />);
    act(() => {
      vi.advanceTimersByTime(450);
    });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Share a polished shot')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('onboarding-copy-shot'));
    });

    expect(mockCtx.value.showToast).toHaveBeenCalledWith(
      'Paste a screenshot first, then copy.',
      3500
    );
    expect(mockCtx.value.copyBeautifiedImage).not.toHaveBeenCalled();
    expect(screen.getByTestId('onboarding-tour')).toBeInTheDocument();
  });

  it('copies when canvas has content and completes tour', async () => {
    mockCtx.value = makeFullMockContext({
      imageSrc: 'data:image/png;base64,abc',
      noImageMode: false,
      copyBeautifiedImage: vi.fn().mockResolvedValue(undefined),
      showToast: vi.fn(),
    });
    render(<OnboardingTour />);
    act(() => {
      vi.advanceTimersByTime(450);
    });
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('onboarding-copy-shot'));
      await Promise.resolve();
    });

    expect(mockCtx.value.copyBeautifiedImage).toHaveBeenCalled();
    expect(mockCtx.value.showToast).toHaveBeenCalledWith('Beautified shot copied', 2500);
    expect(screen.queryByTestId('onboarding-tour')).not.toBeInTheDocument();
  });
});
