import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Images, X } from 'lucide-react';
import './StitchModal.css';
import RangeControl from './RangeControl';
import {
  drawStitchedImages, estimateOverlap, overlapRange, stitchedHeight,
  STITCH_MAX_IMAGES, STITCH_MAX_OUTPUT_HEIGHT, STITCH_MAX_OUTPUT_PIXELS,
  STITCH_MAX_SOURCE_PIXELS, type StitchSample,
} from '../utils/stitchUtils';

interface LoadedScreenshot {
  file: File;
  bitmap: ImageBitmap;
  sample: StitchSample;
}

interface Seam {
  pixels: number;
  confident: boolean;
  adjusted?: boolean;
}

const SAMPLE_WIDTH = 128;

function sampleScreenshot(bitmap: ImageBitmap): StitchSample {
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This device cannot read screenshot pixels.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

function alignScreenshots(images: LoadedScreenshot[]): Seam[] {
  return images.slice(1).map((image, index) => {
    const match = estimateOverlap(images[index].sample, image.sample);
    const { min, max } = overlapRange(images[index].bitmap.height, image.bitmap.height);
    const pixels = match.rows;
    return { pixels: Math.max(min, Math.min(max, pixels)), confident: match.confident };
  });
}

export default function StitchModal({ open, onClose, onImport }: {
  open: boolean;
  onClose: () => void;
  onImport: (dataUrl: string) => void;
}) {
  const [images, setImages] = useState<LoadedScreenshot[]>([]);
  const [seams, setSeams] = useState<Seam[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = useRef(0);
  const resources = useRef<ImageBitmap[]>([]);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const seamRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      const previousFocus = document.activeElement;
      closeRef.current?.focus();
      return () => { if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus(); };
    }
    else {
      token.current++;
      resources.current.forEach(bitmap => bitmap.close());
      resources.current = [];
      setImages([]);
      setSeams([]);
      setBusy(false);
      setError('');
    }
    return undefined;
  }, [open]);

  useEffect(() => () => {
    token.current++;
    resources.current.forEach(bitmap => bitmap.close());
    resources.current = [];
  }, []);

  useEffect(() => {
    if (!open || images.length < 2) return;
    const canvas = previewRef.current;
    const outputHeight = stitchedHeight(images.map(image => image.bitmap.height), seams.map(seam => seam.pixels));
    if (!canvas || outputHeight <= 0) return;
    const scale = Math.min(1, 480 / images[0].bitmap.width, 1600 / outputHeight);
    canvas.width = Math.max(1, Math.round(images[0].bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(outputHeight * scale));
    const context = canvas.getContext('2d');
    if (context) drawStitchedImages(context, images.map(image => image.bitmap), seams.map(seam => seam.pixels), canvas.width / images[0].bitmap.width);

    seams.forEach((seam, index) => {
      const sample = seamRefs.current[index];
      if (!sample) return;
      sample.width = 320;
      sample.height = 72;
      const context = sample.getContext('2d');
      if (!context) return;
      const first = images[index].bitmap;
      const second = images[index + 1].bitmap;
      context.drawImage(first, 0, first.height - seam.pixels, first.width, seam.pixels, 0, 0, 320, 72);
      context.globalAlpha = 0.5;
      context.drawImage(second, 0, 0, second.width, seam.pixels, 0, 0, 320, 72);
      context.globalAlpha = 1;
    });
  }, [open, images, seams]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const outputHeight = stitchedHeight(images.map(image => image.bitmap.height), seams.map(seam => seam.pixels));
  const oversized = images.length >= 2 &&
    (outputHeight > STITCH_MAX_OUTPUT_HEIGHT || outputHeight * images[0].bitmap.width > STITCH_MAX_OUTPUT_PIXELS);

  const readFiles = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files);
    if (!chosen.length) return;
    if (chosen.length < 2 || chosen.length > STITCH_MAX_IMAGES) {
      token.current++;
      resources.current.forEach(bitmap => bitmap.close());
      resources.current = [];
      setImages([]);
      setSeams([]);
      setError(`Choose 2–${STITCH_MAX_IMAGES} screenshots in reading order.`);
      return;
    }
    const id = ++token.current;
    resources.current.forEach(bitmap => bitmap.close());
    resources.current = [];
    setImages([]);
    setSeams([]);
    setBusy(true);
    setError('');
    const loaded: LoadedScreenshot[] = [];
    try {
      for (const file of chosen) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8_000_000) {
          throw new Error('Choose PNG, JPEG or WebP images smaller than 8 MB each.');
        }
        const bitmap = await createImageBitmap(file);
        if (id !== token.current) { bitmap.close(); break; }
        resources.current.push(bitmap);
        if (!bitmap.width || !bitmap.height || bitmap.width > 8192 || bitmap.height > 8192 ||
            bitmap.height / bitmap.width > 12 || bitmap.width * bitmap.height > STITCH_MAX_SOURCE_PIXELS) {
          throw new Error('Use screenshots up to 12 megapixels, 8192px per side and a 12:1 height-to-width ratio.');
        }
        if (loaded.length && bitmap.width !== loaded[0].bitmap.width) {
          throw new Error('Screenshots must have the same pixel width. Capture them at the same window size.');
        }
        loaded.push({ file, bitmap, sample: sampleScreenshot(bitmap) });
      }
      if (id === token.current) {
        setImages(loaded);
        setSeams(alignScreenshots(loaded));
      }
    } catch (cause) {
      if (id === token.current) {
        resources.current.forEach(bitmap => bitmap.close());
        resources.current = [];
        setError(cause instanceof Error ? cause.message : 'Could not read these screenshots.');
      }
    } finally {
      if (id === token.current) setBusy(false);
    }
  };

  const reorder = (index: number, direction: number) => {
    const ordered = [...images];
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    setImages(ordered);
    setSeams(alignScreenshots(ordered));
    setError('');
  };

  const importImage = () => {
    if (images.length < 2 || oversized || busy) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = images[0].bitmap.width;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This device cannot render the stitched image.');
      drawStitchedImages(context, images.map(image => image.bitmap), seams.map(seam => seam.pixels));
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('This device could not encode the combined image.');
      onImport(dataUrl);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not combine these screenshots.');
    }
  };

  return (
    <div className="stitch-overlay" role="presentation"
      onDragOver={event => { event.preventDefault(); event.stopPropagation(); }}
      onDragLeave={event => event.stopPropagation()}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!busy) void readFiles(event.dataTransfer.files); }}
      onPointerDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="stitch-dialog" role="dialog" aria-modal="true" aria-label="Stitch Screenshots" onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)');
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
        <header className="stitch-header">
          <div><p className="stitch-eyebrow">IMAGE WORKFLOW</p><h2><Images size={20} /> Stitch Screenshots</h2>
            <p>Combine a scrolling page into one image. Your screenshots stay on this device.</p></div>
          <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose} disabled={busy} aria-label="Close Stitch Screenshots"><X size={16} /></button>
        </header>
        <label className="stitch-upload">Choose or drop 2–6 screenshots from top to bottom
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => { void readFiles(event.target.files); event.target.value = ''; }} disabled={busy} />
          <span>PNG, JPEG or WebP · Same width · Up to 8 MB each</span>
        </label>
        {busy && <p role="status">Reading screenshots locally…</p>}
        {error && <p className="stitch-error" role="alert">{error}</p>}
        {images.length >= 2 && (
          <div className="stitch-body">
            <div className="stitch-seams">
              {images.map((image, index) => (
                <div key={image.file.name + index} className="stitch-row">
                  <div className="stitch-filename"><strong>{index + 1}. {image.file.name}</strong><span>{image.bitmap.width} × {image.bitmap.height}px</span></div>
                  <button type="button" aria-label={`Move ${image.file.name} up`} title="Move up" disabled={index === 0} onClick={() => reorder(index, -1)}><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`Move ${image.file.name} down`} title="Move down" disabled={index === images.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={16} /></button>
                  {index > 0 && (() => {
                    const min = 0;
                    const max = Math.min(images[index - 1].bitmap.height, image.bitmap.height) - 1;
                    return <div className="stitch-seam">
                      <RangeControl label={`Overlap before screenshot ${index + 1}`} min={min} max={max} value={seams[index - 1].pixels}
                        onChange={pixels => setSeams(current => current.map((seam, seamIndex) => seamIndex === index - 1 ? { pixels, confident: false, adjusted: true } : seam))} onCommit={() => {}}>
                        <span>{seams[index - 1].confident ? 'Auto-aligned. Check the preview.' : seams[index - 1].adjusted ? 'Adjusted manually. Check the combined preview.' : 'Uncertain match. Adjust the overlap before importing.'}</span>
                      </RangeControl>
                      <canvas ref={node => { seamRefs.current[index - 1] = node; }} aria-label={`Alignment preview for screenshot ${index + 1}`} role="img" />
                    </div>;
                  })()}
                </div>
              ))}
            </div>
            <div className="stitch-preview"><h3>Combined preview</h3><div><canvas ref={previewRef} aria-label="Combined screenshot preview" role="img" /></div></div>
          </div>
        )}
        <footer className="stitch-footer">
          <span>{images.length >= 2 ? `${images[0].bitmap.width} × ${outputHeight}px output` : 'Review every join before importing.'}</span>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={images.length < 2 || oversized || busy} onClick={importImage}>Import into editor</button>
        </footer>
        {oversized && <p className="stitch-error" role="alert">Combined image is too large. Increase overlap or use fewer screenshots.</p>}
      </section>
    </div>
  );
}
