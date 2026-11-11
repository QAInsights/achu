import { useCallback, useLayoutEffect, useRef, useState, type RefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function ToolOptionsFlyout({ anchorRef, label, className = '', children }: {
  anchorRef: RefObject<HTMLElement>; label: string; className?: string; children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, caret: 51 });
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const dock = anchor.closest('.toolbar-dock');
    const workspace = anchor.closest('.workspace')?.getBoundingClientRect();
    const boundaryLeft = Math.max(0, workspace?.left ?? 0);
    const boundaryRight = Math.min(window.innerWidth, workspace?.right ?? window.innerWidth);
    if (panelRef.current) panelRef.current.style.maxWidth = `${Math.max(0, boundaryRight - boundaryLeft - 8)}px`;
    const center = rect.left + rect.width / 2;
    const width = panelRef.current?.getBoundingClientRect().width || 102;
    const height = panelRef.current?.getBoundingClientRect().height || 38;
    const half = width / 2;
    const left = Math.max(boundaryLeft + half + 4, Math.min(boundaryRight - half - 4, center));
    let top = rect.bottom + 7;
    const buttons = [...(dock?.querySelectorAll('button') ?? [])]
      .map(button => button.getBoundingClientRect())
      .filter(button => button.width > 0 && button.height > 0)
      .sort((a, b) => a.top - b.top);
    for (const button of buttons) {
      if (button.left < left + half && button.right > left - half && button.top < top + height && button.bottom > top) {
        top = button.bottom + 7;
      }
    }
    top = Math.max(4, Math.min(window.innerHeight - height - 4, top));
    const caret = Math.max(10, Math.min(width - 10, half + center - left));
    setPosition(previous => previous.top === top && previous.left === left && previous.caret === caret
      ? previous : { top, left, caret });
  }, [anchorRef]);

  useLayoutEffect(updatePosition, [updatePosition, children]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(updatePosition);
    if (panelRef.current) observer.observe(panelRef.current);
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
    <div ref={panelRef} className={`tool-options-flyout ${className}`} role="group" aria-label={label} style={{ top: position.top, left: position.left }}>
      <span className="step-size-caret" aria-hidden="true" style={{ left: position.caret }} />
      {children}
    </div>,
    document.body,
  );
}
