import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GrabTextModal from '../src/renderer/components/GrabTextModal';
import { makeFullMockContext } from './shared';

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
}));

const mockWorker = {
  recognize: vi.fn(),
  terminate: vi.fn(),
};

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockImplementation(() => Promise.resolve(mockWorker)),
}));

vi.mock('../src/renderer/utils/privacyGuardUtils', () => ({
  downsampleImageForOcr: vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,downsampled' }),
}));

let mockContext: ReturnType<typeof makeFullMockContext>;

beforeEach(() => {
  mockContext = {
    ...makeFullMockContext(),
    imageSrc: 'data:image/png;base64,testimage',
  };
  vi.clearAllMocks();
  mockWorker.recognize.mockResolvedValue({ data: { text: 'Hello World' } });
  mockWorker.terminate.mockResolvedValue(undefined);
});

describe('GrabTextModal', () => {
  it('renders modal title', () => {
    render(<GrabTextModal onClose={vi.fn()} />);
    expect(screen.getByText('Grab Text')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<GrabTextModal onClose={vi.fn()} />);
    expect(screen.getByText(/Extracting text from image/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<GrabTextModal onClose={onClose} />);
    const closeButtons = screen.getAllByTitle('Close');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error state when no image is loaded', async () => {
    mockContext.imageSrc = null;
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('No image loaded in the editor.')).toBeInTheDocument();
    });
  });

  it('shows extracted text after OCR completes', async () => {
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeTruthy();
      expect((textarea as HTMLTextAreaElement).value).toBe('Hello World');
    });
  });

  it('renders Copy Text button after OCR completes', async () => {
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Copy Text')).toBeInTheDocument();
    });
  });

  it('calls onClose when Close button in actions is clicked', async () => {
    const onClose = vi.fn();
    render(<GrabTextModal onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('toggles trim checkbox', async () => {
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      expect(document.querySelector('textarea')).toBeTruthy();
    });
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('does not show copy button on error', async () => {
    mockContext.imageSrc = null;
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/No image loaded/)).toBeInTheDocument();
    });
    expect(screen.queryByText('Copy Text')).not.toBeInTheDocument();
  });

  it('closes modal when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<GrabTextModal onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Try Again button on error state', async () => {
    mockContext.imageSrc = null;
    render(<GrabTextModal onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/No image loaded/)).toBeInTheDocument();
    });
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});
