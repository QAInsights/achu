import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import PrivacyGuardOverlays from '../src/renderer/components/PrivacyGuardOverlays';

const baseRedactions = [
  { id: 'r1', x: 0.1, y: 0.2, w: 0.3, h: 0.1, text: 'secret', status: 'redacted' as const },
  { id: 'r2', x: 0.5, y: 0.6, w: 0.2, h: 0.15, text: 'visible', status: 'visible' as const },
];

describe('PrivacyGuardOverlays', () => {
  it('returns null when redactions array is empty', () => {
    const { container } = render(
      <PrivacyGuardOverlays
        redactions={[]}
        redactionStyle="solid"
        imageSrc="data:image/png;base64,test"
        hoveredRedactionId={null}
        setHoveredRedactionId={vi.fn()}
        toggleRedaction={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when no redactions have status "redacted"', () => {
    const allVisible = [
      { id: 'r1', x: 0.1, y: 0.2, w: 0.3, h: 0.1, text: 'a', status: 'visible' as const },
    ];
    const { container } = render(
      <PrivacyGuardOverlays
        redactions={allVisible}
        redactionStyle="solid"
        imageSrc="data:image/png;base64,test"
        hoveredRedactionId={null}
        setHoveredRedactionId={vi.fn()}
        toggleRedaction={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders blur mode SVG with filter and clipPath', () => {
    const { container } = render(
      <PrivacyGuardOverlays
        redactions={baseRedactions}
        redactionStyle="blur"
        imageSrc="data:image/png;base64,test"
        hoveredRedactionId={null}
        setHoveredRedactionId={vi.fn()}
        toggleRedaction={vi.fn()}
      />
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    const filter = svg?.querySelector('filter');
    expect(filter?.getAttribute('id')).toBe('privacy-guard-blur');
    const clipPath = svg?.querySelector('clipPath');
    expect(clipPath?.getAttribute('id')).toBe('privacy-guard-clip');
    const rects = clipPath?.querySelectorAll('rect');
    expect(rects?.length).toBe(1);
  });

  it('renders solid mode with clickable overlay divs', () => {
    const toggleRedaction = vi.fn();
    const setHoveredRedactionId = vi.fn();
    const { container } = render(
      <PrivacyGuardOverlays
        redactions={baseRedactions}
        redactionStyle="solid"
        imageSrc="data:image/png;base64,test"
        hoveredRedactionId={null}
        setHoveredRedactionId={setHoveredRedactionId}
        toggleRedaction={toggleRedaction}
      />
    );
    const overlays = container.querySelectorAll('[style*="position: absolute"][style*="cursor: pointer"]');
    expect(overlays.length).toBe(1);

    const overlay = overlays[0] as HTMLElement;
    overlay.click();
    expect(toggleRedaction).toHaveBeenCalledWith('r1');
  });

  it('applies dashed border on hovered redaction in solid mode', () => {
    const { container } = render(
      <PrivacyGuardOverlays
        redactions={baseRedactions}
        redactionStyle="solid"
        imageSrc="data:image/png;base64,test"
        hoveredRedactionId="r1"
        setHoveredRedactionId={vi.fn()}
        toggleRedaction={vi.fn()}
      />
    );
    const overlays = container.querySelectorAll('[style*="position: absolute"][style*="cursor: pointer"]');
    const overlay = overlays[0] as HTMLElement;
    expect(overlay.style.border).toContain('dashed');
  });
});
