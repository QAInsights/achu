import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SecondarySidebar from '../src/renderer/components/SecondarySidebar';
import { makeFullMockContext } from './shared';

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
}));

let mockContext: ReturnType<typeof makeFullMockContext>;

beforeEach(() => {
  mockContext = {
    ...makeFullMockContext(),
    secondarySidebarVisible: true,
    setSecondarySidebarVisible: vi.fn(),
    secondarySidebarPosition: 'right',
  };
});

describe('SecondarySidebar', () => {
  describe('rendering', () => {
    it('renders with correct title', () => {
      render(<SecondarySidebar />);
      expect(screen.getByText('AI & OCR')).toBeInTheDocument();
    });

    it('collapsed class applied when secondarySidebarVisible = false', () => {
      mockContext.secondarySidebarVisible = false;
      const { container } = render(<SecondarySidebar />);
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toBeTruthy();
      expect(sidebar?.classList.contains('collapsed')).toBe(true);
    });

    it('no collapsed class when secondarySidebarVisible = true', () => {
      const { container } = render(<SecondarySidebar />);
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar?.classList.contains('collapsed')).toBe(false);
    });
  });

  describe('position', () => {
    it('right class applied when secondarySidebarPosition = right', () => {
      mockContext.secondarySidebarPosition = 'right';
      const { container } = render(<SecondarySidebar />);
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar?.classList.contains('right')).toBe(true);
    });

    it('left class applied when secondarySidebarPosition = left', () => {
      mockContext.secondarySidebarPosition = 'left';
      const { container } = render(<SecondarySidebar />);
      const sidebar = container.querySelector('.sidebar');
      expect(sidebar?.classList.contains('left')).toBe(true);
    });
  });
});
