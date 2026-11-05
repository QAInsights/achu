import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface StepSizeFlyoutProps {
  anchorRef: RefObject<HTMLElement>;
  size: number;
  onChange: (size: number) => void;
}

export default function StepSizeFlyout({ anchorRef, size, onChange }: StepSizeFlyoutProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, caret: 51 });
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const dock = anchor.closest('.toolbar-dock');
    const center = rect.left + rect.width / 2;
    const left = Math.max(55, Math.min(window.innerWidth - 55, center));
    let top = rect.bottom + 7;
    const buttons = [...(dock?.querySelectorAll('button') ?? [])]
      .map(button => button.getBoundingClientRect())
      .filter(button => button.width > 0 && button.height > 0)
      .sort((a, b) => a.top - b.top);
    for (const button of buttons) {
      if (button.left < left + 51 && button.right > left - 51 && button.top < top + 38 && button.bottom > top) {
        top = button.bottom + 7;
      }
    }
    const caret = 51 + center - left;
    setPosition(previous => previous.top === top && previous.left === left && previous.caret === caret
      ? previous : { top, left, caret });
  }, [anchorRef]);

  useLayoutEffect(updatePosition);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(updatePosition);
    const anchor = anchorRef.current;
    if (anchor) {
      observer.observe(anchor);
      const dock = anchor.closest('.toolbar-dock');
      if (dock) observer.observe(dock);
      if (dock?.parentElement) observer.observe(dock.parentElement);
    }
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, updatePosition]);

  return createPortal(
    <div className="step-size-flyout" role="group" aria-label="Step options" style={{ top: position.top, left: position.left }}>
      <span className="step-size-caret" aria-hidden="true" style={{ left: position.caret }} />
      {[{ label: 'S', diameter: 32 }, { label: 'M', diameter: 40 }, { label: 'L', diameter: 56 }].map(({ label, diameter }) => (
        <button
          key={label}
          type="button"
          className={`tool-btn ${size === diameter ? 'active' : ''}`}
          aria-label={`Step size ${label}`}
          aria-pressed={size === diameter}
          onClick={() => onChange(diameter)}
        >
          {label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
