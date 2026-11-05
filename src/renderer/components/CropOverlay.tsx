import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../AppContext';
import { clampCrop, pixelCrop, resizeCrop, type CropHandle, type CropRect, type ImageSize } from '../utils/cropUtils';
import './CropOverlay.css';

const handles: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function useCropPosition(update: () => void, element: RefObject<HTMLElement | null>, visible = true) {
  const latest = useRef(update);
  useLayoutEffect(() => {
    latest.current = update;
    update();
  });
  useLayoutEffect(() => {
    const reposition = () => latest.current();
    const observer = new ResizeObserver(reposition);
    const viewport = document.querySelector('.canvas-viewport');
    const dock = document.querySelector('.toolbar-dock');
    for (const node of [element.current, viewport, dock]) {
      if (node) observer.observe(node);
    }
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [element, visible]);
}

function canvasBounds() {
  const viewport = document.querySelector('.canvas-viewport')?.getBoundingClientRect();
  return {
    left: Math.max(0, viewport?.left ?? 0) + 8,
    right: Math.min(window.innerWidth, viewport?.right ?? window.innerWidth) - 8,
    top: Math.max(0, viewport?.top ?? 0) + 8,
    bottom: Math.min(window.innerHeight, viewport?.bottom ?? window.innerHeight) - 8,
  };
}

function CropSize({ rect, size, overlayRef }: {
  rect: CropRect;
  size: ImageSize;
  overlayRef: RefObject<HTMLDivElement | null>;
}) {
  const labelRef = useRef<HTMLOutputElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, maxWidth: 0 });
  useCropPosition(() => {
    const overlay = overlayRef.current?.getBoundingClientRect();
    const label = labelRef.current?.getBoundingClientRect();
    if (!overlay || !label) return;
    const bounds = canvasBounds();
    const width = Math.min(label.width, bounds.right - bounds.left);
    const center = overlay.left + (rect.x + rect.w / 2) / size.width * overlay.width;
    const bottom = overlay.top + (rect.y + rect.h) / size.height * overlay.height;
    const above = overlay.top + rect.y / size.height * overlay.height - label.height - 10;
    const top = bottom + 10 + label.height <= bounds.bottom ? bottom + 10 : above;
    const next = {
      left: Math.max(bounds.left, Math.min(bounds.right - width, center - width / 2)),
      top: Math.max(bounds.top, Math.min(bounds.bottom - label.height, top)),
      maxWidth: bounds.right - bounds.left,
    };
    setPosition(previous => previous.left === next.left && previous.top === next.top && previous.maxWidth === next.maxWidth
      ? previous : next);
  }, labelRef);
  const output = pixelCrop(rect, size);
  return createPortal(
    <output ref={labelRef} className="crop-size" aria-live="polite" style={position}>
      {output.w} × {output.h} px
    </output>,
    document.body,
  );
}
export const cropRatios: Record<string, number | undefined> = {
  Free: undefined,
  Original: undefined,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

interface CropGesture {
  rect: CropRect;
  handle: CropHandle;
  x: number;
  y: number;
  ratio?: number;
  width: number;
  height: number;
}

export default function CropOverlay({ size }: { size: ImageSize }) {
  const { cropRect, setCropRect, cropAspect, cropBusy } = useAppContext();
  const ref = useRef<HTMLDivElement>(null);
  const [uiScale, setUiScale] = useState(1);
  const gesture = useRef<CropGesture | null>(null);
  const ratio = cropAspect === 'Original' ? size.width / size.height : cropRatios[cropAspect];
  const needsRect = !cropRect;
  useCropPosition(() => {
    const overlay = ref.current;
    if (!overlay) return;
    const width = overlay.getBoundingClientRect().width;
    if (width > 0 && overlay.offsetWidth > 0) setUiScale(overlay.offsetWidth / width);
  }, ref, !needsRect);
  useEffect(() => {
    setCropRect(current => clampCrop(current || { x: 0, y: 0, w: size.width, h: size.height }, size, ratio));
  }, [size.width, size.height, ratio, setCropRect, needsRect]);
  if (!cropRect) return null;
  return (
    <div
      ref={ref}
      className="crop-overlay"
      style={{ '--crop-ui-scale': uiScale } as CSSProperties}
      data-crop-ui
      role="group"
      aria-label="Crop screenshot"
      tabIndex={-1}
      onPointerDown={e => {
        if (e.button !== 0 || !e.isPrimary || cropBusy) return;
        const handle = (e.target as HTMLElement).dataset.handle as CropHandle | undefined;
        if (!handle || !ref.current) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        const bounds = ref.current.getBoundingClientRect();
        gesture.current = {
          rect: cropRect,
          handle,
          x: e.clientX,
          y: e.clientY,
          ratio: ratio || (e.shiftKey ? cropRect.w / cropRect.h : undefined),
          width: bounds.width,
          height: bounds.height,
        };
      }}
      onPointerMove={e => {
        const g = gesture.current;
        if (!g) return;
        const dx = (e.clientX - g.x) * size.width / g.width;
        const dy = (e.clientY - g.y) * size.height / g.height;
        const resizeRatio = ratio || (e.shiftKey ? g.ratio || g.rect.w / g.rect.h : undefined);
        setCropRect(resizeCrop(g.rect, g.handle, dx, dy, size, resizeRatio));
      }}
      onPointerUp={e => {
        gesture.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => { gesture.current = null; }}
      onLostPointerCapture={() => { gesture.current = null; }}
    >
      <div
        className="crop-rectangle"
        data-handle="move"
        style={{
          left: `${cropRect.x / size.width * 100}%`,
          top: `${cropRect.y / size.height * 100}%`,
          width: `${cropRect.w / size.width * 100}%`,
          height: `${cropRect.h / size.height * 100}%`,
        }}
      >
        {[1, 2].map(n => (
          <div key={`v${n}`} className={`crop-guide crop-guide-vertical crop-guide-${n}`} />
        ))}
        {[1, 2].map(n => (
          <div key={`h${n}`} className={`crop-guide crop-guide-horizontal crop-guide-${n}`} />
        ))}
        {(['n', 'e', 's', 'w'] as CropHandle[]).map(handle => (
          <span key={`edge-${handle}`} data-handle={handle} className={`crop-edge crop-edge-${handle}`} />
        ))}
        {handles.map(handle => (
          <span key={handle} data-handle={handle} aria-label={`Crop ${handle} handle`} className={`crop-handle crop-handle-${handle}`} />
        ))}
      </div>
      <CropSize rect={cropRect} size={size} overlayRef={ref} />
    </div>
  );
}

export function CropControls({ anchorRef }: { anchorRef: RefObject<HTMLButtonElement | null> }) {
  const { cropActive, cropAspect, setCropAspect, setCropRect, cropBusy, cropError, cancelCrop, applyCrop } = useAppContext();
  const firstAspectRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, maxWidth: 0, caret: 0 });
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const pill = pillRef.current?.getBoundingClientRect();
    if (!anchor || !pill) return;
    const bounds = canvasBounds();
    const maxWidth = bounds.right - bounds.left;
    const width = Math.min(pill.width, maxWidth);
    const center = anchor.left + anchor.width / 2;
    const left = Math.max(bounds.left, Math.min(bounds.right - width, center - width / 2));
    let top = Math.max(bounds.top, anchor.bottom + 7);
    const buttons = [...(anchorRef.current?.closest('.toolbar-dock')?.querySelectorAll('button') ?? [])]
      .map(button => button.getBoundingClientRect())
      .sort((a, b) => a.top - b.top);
    for (const button of buttons) {
      if (button.left < left + width && button.right > left && button.top < top + pill.height && button.bottom > top) {
        top = button.bottom + 7;
      }
    }
    top = Math.max(bounds.top, Math.min(bounds.bottom - pill.height, top));
    const next = { left, top, maxWidth, caret: Math.max(10, Math.min(width - 10, center - left)) };
    setPosition(previous => previous.left === next.left && previous.top === next.top && previous.maxWidth === next.maxWidth && previous.caret === next.caret
      ? previous : next);
  }, [anchorRef]);
  useCropPosition(updatePosition, pillRef, cropActive);
  useEffect(() => {
    if (!cropActive) return;
    const anchor = anchorRef.current;
    firstAspectRef.current?.focus({ preventScroll: true });
    return () => anchor?.focus({ preventScroll: true });
  }, [cropActive, anchorRef]);
  if (!cropActive) return null;
  return createPortal(
    <div ref={pillRef} className="crop-controls" role="group" aria-label="Crop options" data-crop-ui
      style={{ left: position.left, top: position.top, maxWidth: position.maxWidth || undefined }}>
      <span className="crop-controls-caret" aria-hidden="true" style={{ left: position.caret }} />
      <div className="toolbar-group crop-aspects" role="group" aria-label="Crop aspect ratio">
        {Object.keys(cropRatios).map((label, index) => (
          <button
            key={label}
            ref={index === 0 ? firstAspectRef : undefined}
            type="button"
            className={`tool-btn ${cropAspect === label ? 'active' : ''}`}
            aria-pressed={cropAspect === label}
            disabled={cropBusy}
            onClick={() => setCropAspect(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="crop-actions" role="group" aria-label="Crop actions">
        <button className="btn btn-secondary" disabled={cropBusy} onClick={() => {
          setCropAspect('Free');
          setCropRect(null);
        }}>
          Reset
        </button>
        <button className="btn btn-secondary" disabled={cropBusy} onClick={cancelCrop}>Cancel <kbd>Esc</kbd></button>
        <button className="btn btn-primary" disabled={cropBusy} onClick={() => {
          void applyCrop();
        }}>
          {cropBusy ? 'Applying...' : <>Apply <kbd>Enter</kbd></>}
        </button>
      </div>
      {cropError && <span role="alert">{cropError}</span>}
    </div>,
    document.body,
  );
}
