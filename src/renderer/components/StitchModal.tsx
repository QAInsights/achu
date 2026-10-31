import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Images, X } from 'lucide-react';
import { imageSize } from 'image-size';
import './StitchModal.css';
import RangeControl from './RangeControl';
import {
  drawStitchedImages, estimateOverlapAsync, overlapRange, planStitchOutput, planStitchSources, stitchedHeight,
  validateStitchFileBudget, validateStitchSourceDimensions, STITCH_MAX_IMAGES, STITCH_SAMPLE_WIDTH,
  type StitchSample, type StitchSize, type StitchSourcePlan, type StitchSourceSize,
} from '../utils/stitchUtils';

interface SourceScreenshot extends StitchSourceSize {
  file: File;
}

interface PendingSelection {
  sources: SourceScreenshot[];
  plan: StitchSourcePlan;
}

interface LoadedScreenshot {
  file: File;
  original: StitchSize;
  bitmap: ImageBitmap;
  sample: StitchSample;
}

interface Seam {
  pixels: number;
  confident: boolean;
  adjusted?: boolean;
}

const SOURCE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

async function readSourceSize(file: File): Promise<StitchSize> {
  let metadata: ReturnType<typeof imageSize>;
  try {
    metadata = imageSize(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error('Choose valid PNG, JPEG or WebP images.');
  }
  if (!['png', 'jpg', 'webp'].includes(metadata.type ?? '')) throw new Error('Choose valid PNG, JPEG or WebP images.');
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const size = (metadata.orientation ?? 1) >= 5 ? { width: height, height: width } : { width, height };
  validateStitchSourceDimensions(size);
  return size;
}

function sampleScreenshot(bitmap: ImageBitmap): StitchSample {
  const canvas = document.createElement('canvas');
  canvas.width = STITCH_SAMPLE_WIDTH;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This device cannot read screenshot pixels.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height,
    data: context.getImageData(0, 0, canvas.width, canvas.height).data };
}

type AlignmentCache = WeakMap<ImageBitmap, WeakMap<ImageBitmap, Seam>>;

async function alignScreenshots(images: LoadedScreenshot[], cache: AlignmentCache, isCurrent: () => boolean): Promise<Seam[] | null> {
  const seams: Seam[] = [];
  for (let index = 1; index < images.length; index++) {
    if (!isCurrent()) return null;
    const previous = images[index - 1];
    const image = images[index];
    let pairs = cache.get(previous.bitmap);
    if (!pairs) { pairs = new WeakMap(); cache.set(previous.bitmap, pairs); }
    let seam = pairs.get(image.bitmap);
    if (!seam) {
      const match = await estimateOverlapAsync(previous.sample, image.sample, isCurrent);
      if (!match) return null;
      const { min, max } = overlapRange(previous.bitmap.height, image.bitmap.height);
      seam = { pixels: Math.max(min, Math.min(max, match.rows)), confident: match.confident };
      pairs.set(image.bitmap, seam);
    }
    seams.push(seam);
  }
  return seams;
}

export default function StitchModal({ open, onClose, onImport }: {
  open: boolean;
  onClose: () => void;
  onImport: (dataUrl: string) => void;
}) {
  const [images, setImages] = useState<LoadedScreenshot[]>([]);
  const [seams, setSeams] = useState<Seam[]>([]);
  const [pending, setPending] = useState<PendingSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const token = useRef(0);
  const resources = useRef<ImageBitmap[]>([]);
  const alignmentCache = useRef<AlignmentCache>(new WeakMap());
  const previewRef = useRef<HTMLCanvasElement>(null);
  const seamRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const prepareRef = useRef<HTMLButtonElement>(null);

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
      setPending(null);
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
    if (context) drawStitchedImages(context, images.map(image => image.bitmap), seams.map(seam => seam.pixels),
      { x: canvas.width / images[0].bitmap.width, y: canvas.height / outputHeight });

    seams.forEach((seam, index) => {
      const sample = seamRefs.current[index];
      if (!sample) return;
      sample.width = Math.min(320, images[index].bitmap.width);
      sample.height = 72;
      const context = sample.getContext('2d');
      if (!context) return;
      const first = images[index].bitmap;
      const second = images[index + 1].bitmap;
      const width = sample.width;
      const left = Math.floor((first.width - width) / 2);
      if (seam.pixels === 0) {
        const before = Math.min(36, first.height);
        const after = Math.min(36, second.height);
        context.drawImage(first, left, first.height - before, width, before, 0, 36 - before, width, before);
        context.drawImage(second, left, 0, width, after, 0, 36, width, after);
        return;
      }
      const before = Math.min(72, first.height);
      const after = Math.min(72, seam.pixels);
      context.drawImage(first, left, first.height - before, width, before, 0, 72 - before, width, before);
      context.globalAlpha = 0.5;
      context.drawImage(second, left, seam.pixels - after, width, after, 0, 72 - after, width, after);
      context.globalAlpha = 1;
    });
  }, [open, images, seams]);

  useEffect(() => {
    if (open && busy) dialogRef.current?.focus();
  }, [open, busy]);

  useEffect(() => {
    if (pending) prepareRef.current?.focus();
  }, [pending]);

  if (!open) return null;

  const workingWidth = images[0]?.bitmap.width ?? 0;
  const outputHeight = stitchedHeight(images.map(image => image.bitmap.height), seams.map(seam => seam.pixels));
  const output = images.length >= 2 && outputHeight > 0 ? planStitchOutput({ width: workingWidth, height: outputHeight }) : null;
  const originalScale = output ? workingWidth / images[0].original.width * output.scale : 1;
  const smallerCopy = originalScale < 1;
  const percent = Math.floor(originalScale * 100);
  const pendingOutput = pending ? planStitchOutput({
    width: pending.plan.width, height: pending.plan.heights.reduce((sum, height) => sum + height, 0),
  }) : null;

  const reportLoadError = (cause: unknown, id: number) => {
    if (id !== token.current) return;
    resources.current.forEach(bitmap => bitmap.close());
    resources.current = [];
    setError(cause instanceof Error ? cause.message : 'Could not read these screenshots.');
  };

  const loadSources = async ({ sources, plan }: PendingSelection, id: number) => {
    const loaded: LoadedScreenshot[] = [];
    for (const [index, source] of sources.entries()) {
      if (id !== token.current) return;
      const bitmap = await (plan.reduced
        ? createImageBitmap(source.file, { resizeWidth: plan.width, resizeHeight: plan.heights[index], resizeQuality: 'high' })
        : createImageBitmap(source.file));
      if (id !== token.current) { bitmap.close(); return; }
      resources.current.push(bitmap);
      if (bitmap.width !== plan.width || bitmap.height !== plan.heights[index]) {
        throw new Error('This device could not prepare the screenshots at the planned resolution. Try exporting smaller files.');
      }
      loaded.push({ file: source.file, original: source, bitmap, sample: sampleScreenshot(bitmap) });
    }
    const nextSeams = await alignScreenshots(loaded, alignmentCache.current, () => id === token.current);
    if (id === token.current && nextSeams) {
      setImages(loaded);
      setSeams(nextSeams);
    }
  };

  const readFiles = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files);
    if (!chosen.length) return;
    if (chosen.length < 2 || chosen.length > STITCH_MAX_IMAGES) {
      setError(`Choose 2–${STITCH_MAX_IMAGES} screenshots in reading order.`);
      return;
    }
    const id = ++token.current;
    resources.current.forEach(bitmap => bitmap.close());
    resources.current = [];
    setImages([]);
    setSeams([]);
    setPending(null);
    setBusy(true);
    setError('');
    try {
      if (chosen.some(file => !SOURCE_TYPES.includes(file.type))) throw new Error('Choose PNG, JPEG or WebP images.');
      validateStitchFileBudget(chosen.reduce((sum, file) => sum + file.size, 0));
      const sources: SourceScreenshot[] = [];
      for (const file of chosen) {
        const size = await readSourceSize(file);
        if (id !== token.current) return;
        sources.push({ ...size, bytes: file.size, file });
      }
      const selection = { sources, plan: planStitchSources(sources) };
      if (selection.plan.reduced) setPending(selection);
      else await loadSources(selection, id);
    } catch (cause) {
      reportLoadError(cause, id);
    } finally {
      if (id === token.current) setBusy(false);
    }
  };

  const prepareSmallerCopy = async () => {
    if (!pending || busy) return;
    const id = token.current;
    const selection = pending;
    setPending(null);
    setError('');
    setBusy(true);
    try {
      await loadSources(selection, id);
    } catch (cause) {
      reportLoadError(cause, id);
    } finally {
      if (id === token.current) setBusy(false);
    }
  };

  const reorder = async (index: number, direction: number) => {
    if (busy) return;
    const ordered = [...images];
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    const id = ++token.current;
    setBusy(true);
    setError('');
    try {
      const nextSeams = await alignScreenshots(ordered, alignmentCache.current, () => id === token.current);
      if (id === token.current && nextSeams) { setImages(ordered); setSeams(nextSeams); }
    } catch (cause) {
      if (id === token.current) setError(cause instanceof Error ? cause.message : 'Could not align these screenshots.');
    } finally {
      if (id === token.current) setBusy(false);
    }
  };

  const importImage = () => {
    if (!output || busy) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = output.width;
      canvas.height = output.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This device cannot render the stitched image.');
      context.imageSmoothingQuality = 'high';
      drawStitchedImages(context, images.map(image => image.bitmap), seams.map(seam => seam.pixels),
        output.reduced ? { x: output.width / workingWidth, y: output.height / outputHeight } : 1);
      const dataUrl = canvas.toDataURL('image/png');
      if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('This device could not encode the combined image.');
      onImport(dataUrl);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not combine these screenshots.');
    }
  };

  const changeOverlap = (index: number, pixels: number) => {
    const seam = { pixels, confident: false, adjusted: true };
    alignmentCache.current.get(images[index].bitmap)?.set(images[index + 1].bitmap, seam);
    setSeams(current => current.map((value, seamIndex) => seamIndex === index ? seam : value));
  };

  return (
    <div className="stitch-overlay" role="presentation"
      onDragOver={event => { event.preventDefault(); event.stopPropagation(); }}
      onDragLeave={event => event.stopPropagation()}
      onDrop={event => { event.preventDefault(); event.stopPropagation(); if (!busy) void readFiles(event.dataTransfer.files); }}
      onPointerDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="stitch-dialog" role="dialog" aria-modal="true" aria-busy={busy} aria-label="Stitch Screenshots" onPaste={event => event.stopPropagation()} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        if (event.key !== 'Tab') return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>(':is(button, input):not(:disabled)');
        if (!controls.length) { event.preventDefault(); return; }
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus(); }
      }}>
        <header className="stitch-header">
          <div><p className="stitch-eyebrow">IMAGE WORKFLOW</p><h2><Images size={20} /> Stitch Screenshots</h2>
            <p>Combine a scrolling page into one image. Your screenshots stay on this device.</p></div>
          <button ref={closeRef} type="button" className="btn btn-secondary" onClick={onClose} aria-label="Close Stitch Screenshots"><X size={16} /></button>
        </header>
        <label className="stitch-upload">Choose or drop 2–6 screenshots from top to bottom
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => { void readFiles(event.target.files); event.target.value = ''; }} disabled={busy} />
          <span>PNG, JPEG or WebP · Same width · Original resolution when safe</span>
        </label>
        {busy && <p role="status">Preparing screenshots locally…</p>}
        {error && <p className="stitch-error" role="alert">{error}</p>}
        {pending && pendingOutput && <div className="stitch-resolution" aria-label="Smaller copy options">
          <h3>Prepare a smaller stitched copy</h3>
          <p>This selection needs more working memory than achu can safely use at original resolution. Your source files stay unchanged.</p>
          <p>Without overlap: <strong>{pendingOutput.width} × {pendingOutput.height}px</strong>.
            Exact dimensions appear after alignment.</p>
          <button ref={prepareRef} type="button" className="btn btn-primary" onClick={() => void prepareSmallerCopy()}>Prepare smaller copy</button>
          <p>Or choose fewer screenshots to keep more detail.</p>
        </div>}
        {images.length >= 2 && (
          <div className="stitch-body">
            <div className="stitch-seams">
              {images.map((image, index) => (
                <div key={image.file.name + index} className="stitch-row">
                  <div className="stitch-filename"><strong>{index + 1}. {image.file.name}</strong><span>{image.original.width} × {image.original.height}px</span></div>
                  <button type="button" aria-label={`Move ${image.file.name} up`} title="Move up" disabled={busy || index === 0} onClick={() => void reorder(index, -1)}><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`Move ${image.file.name} down`} title="Move down" disabled={busy || index === images.length - 1} onClick={() => void reorder(index, 1)}><ArrowDown size={16} /></button>
                  {index > 0 && (() => {
                    const min = 0;
                    const max = Math.min(images[index - 1].bitmap.height, image.bitmap.height) - 1;
                    return <div className="stitch-seam">
                      <RangeControl label={`Overlap before screenshot ${index + 1}`} min={min} max={max} value={seams[index - 1].pixels} disabled={busy}
                        onChange={pixels => changeOverlap(index - 1, pixels)} onCommit={() => {}}>
                        <span>{seams[index - 1].confident ? 'Auto-aligned. Check the preview.' : seams[index - 1].adjusted ? 'Adjusted manually. Check the combined preview.' : 'Uncertain match. Adjust the overlap before importing.'}</span>
                      </RangeControl>
                      <canvas ref={node => { seamRefs.current[index - 1] = node; }} aria-label={`Center-crop alignment detail for screenshot ${index + 1}`} role="img" />
                    </div>;
                  })()}
                </div>
              ))}
            </div>
            <div className="stitch-preview"><h3>Combined preview</h3><div><canvas ref={previewRef} aria-label="Combined screenshot preview" role="img" /></div></div>
          </div>
        )}
        <footer className="stitch-footer">
          <span>{!output ? 'Review every join before importing.' : smallerCopy
            ? `${output.width} × ${output.height}px smaller copy (${percent}% of original)` : `${output.width} × ${output.height}px output`}</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!output || busy} onClick={importImage}>{smallerCopy ? 'Import smaller copy' : 'Import into editor'}</button>
        </footer>
        {smallerCopy && <p className="stitch-note">Original resolution is too large to stitch safely, so achu will import a smaller copy. Your source files stay unchanged.
          {workingWidth !== images[0].original.width && ' Overlap values are measured in smaller-copy pixels.'}
          {output?.reduced && ' Increase overlap or use fewer screenshots to keep more detail.'}</p>}
      </section>
    </div>
  );
}
