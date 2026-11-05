import { useEffect, useRef } from 'react';
import { useAppContext } from '../AppContext';
import { clampCrop, pixelCrop, resizeCrop, type CropHandle, type CropRect, type ImageSize } from '../utils/cropUtils';
import './CropOverlay.css';

const handles: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
export const cropRatios: Record<string, number | undefined> = { Free: undefined, Original: undefined, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '9:16': 9 / 16 };

export default function CropOverlay({ size }: { size: ImageSize }) {
  const { cropRect, setCropRect, cropAspect, cropBusy } = useAppContext();
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ rect: CropRect; handle: CropHandle; x: number; y: number; ratio?: number; width: number; height: number } | null>(null);
  const ratio = cropAspect === 'Original' ? size.width / size.height : cropRatios[cropAspect];
  const needsRect = !cropRect;
  useEffect(() => {
    setCropRect(current => clampCrop(current || { x: 0, y: 0, w: size.width, h: size.height }, size, ratio));
  }, [size.width, size.height, ratio, setCropRect, needsRect]);
  if (!cropRect) return null;
  const output = pixelCrop(cropRect, size);
  return (
    <div ref={ref} className="crop-overlay" data-crop-ui role="group" aria-label="Crop screenshot"
      onPointerDown={e => {
        if (e.button !== 0 || !e.isPrimary || cropBusy) return;
        const handle = (e.target as HTMLElement).dataset.handle as CropHandle | undefined;
        if (!handle || !ref.current) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const bounds = ref.current.getBoundingClientRect();
        gesture.current = { rect: cropRect, handle, x: e.clientX, y: e.clientY, ratio: ratio || (e.shiftKey ? cropRect.w / cropRect.h : undefined), width: bounds.width, height: bounds.height };
      }}
      onPointerMove={e => {
        const g = gesture.current;
        if (!g) return;
        setCropRect(resizeCrop(g.rect, g.handle, (e.clientX - g.x) * size.width / g.width, (e.clientY - g.y) * size.height / g.height, size,
          ratio || (e.shiftKey ? g.ratio || g.rect.w / g.rect.h : undefined)));
      }}
      onPointerUp={e => {
        gesture.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => { gesture.current = null; }}
      onLostPointerCapture={() => { gesture.current = null; }}
    >
      <div className="crop-rectangle" data-handle="move" style={{ left: `${cropRect.x / size.width * 100}%`, top: `${cropRect.y / size.height * 100}%`, width: `${cropRect.w / size.width * 100}%`, height: `${cropRect.h / size.height * 100}%` }}>
        {[1, 2].map(n => <div key={`v${n}`} className="crop-guide" style={{ left: `${n * 100 / 3}%`, top: 0, height: '100%', borderLeft: '1px solid #ffffff80' }} />)}
        {[1, 2].map(n => <div key={`h${n}`} className="crop-guide" style={{ top: `${n * 100 / 3}%`, left: 0, width: '100%', borderTop: '1px solid #ffffff80' }} />)}
        {handles.map(handle => <span key={handle} data-handle={handle} aria-label={`Crop ${handle} handle`} className={`crop-handle crop-handle-${handle}`} />)}
        <output className="crop-size" aria-live="polite">{output.w} × {output.h} px</output>
      </div>
    </div>
  );
}

export function CropControls() {
  const { cropActive, cropAspect, setCropAspect, setCropRect, cropBusy, cropError, cancelCrop, applyCrop } = useAppContext();
  const selectRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (cropActive) selectRef.current?.focus(); }, [cropActive]);
  if (!cropActive) return null;
  return <div className="toolbar-context crop-controls" role="group" aria-label="Crop options" data-crop-ui>
    <span className="toolbar-context-label">Crop</span>
    <select ref={selectRef} aria-label="Crop aspect ratio" value={cropAspect} disabled={cropBusy} onChange={e => setCropAspect(e.target.value)}>
      {Object.keys(cropRatios).map(label => <option key={label}>{label}</option>)}
    </select>
    <button className="btn btn-secondary" disabled={cropBusy} onClick={() => { setCropAspect('Free'); setCropRect(null); }}>Reset</button>
    <button className="btn btn-secondary" disabled={cropBusy} onClick={cancelCrop}>Cancel</button>
    <button className="btn btn-primary" disabled={cropBusy} onClick={() => { void applyCrop(); }}>{cropBusy ? 'Applying...' : 'Apply'}</button>
    {cropError && <span role="alert">{cropError}</span>}
  </div>;
}
