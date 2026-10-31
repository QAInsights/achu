import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StitchModal from '../src/renderer/components/StitchModal';
import sharp from 'sharp';
import { planStitchOutput, planStitchSources, STITCH_MAX_FILE_BYTES, type StitchSize } from '../src/renderer/utils/stitchUtils';

type FakeBitmap = ImageBitmap & { fileName: string };

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalCreateImageBitmap = globalThis.createImageBitmap;
const bitmaps: FakeBitmap[] = [];
const draws: Array<{ width: number; height: number; args: unknown[] }> = [];
const fileSizes = new WeakMap<File, StitchSize>();

function dimensions(name: string) {
  if (name.startsWith('huge')) return { width: 8000, height: 6000 };
  if (name.startsWith('budget')) return { width: 6000, height: 5000 };
  if (name.startsWith('tall')) return { width: 100, height: 2000 };
  return {
    width: name.startsWith('narrow') ? 99 : name.startsWith('large') ? 5000 : name.startsWith('output') ? 4000 : 100,
    height: name.startsWith('short') ? 2 : name.startsWith('large') || name.startsWith('output') ? 3000 : 100,
  };
}

function file(name: string, size = dimensions(name), fileBytes?: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, size.width);
  view.setUint32(20, size.height);
  const result = new File([bytes], name, { type: 'image/png' });
  Object.defineProperty(result, 'arrayBuffer', { value: vi.fn(async () => bytes.buffer), configurable: true });
  if (fileBytes !== undefined) Object.defineProperty(result, 'size', { value: fileBytes });
  fileSizes.set(result, size);
  return result;
}

function pixels(name: string, width: number, height: number) {
  const result = new Uint8ClampedArray(width * height * 4);
  const offset = name.startsWith('second-native') ? 67 : name.startsWith('second') ? 50 : name.startsWith('unrelated') ? 140 : 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    result[i] = ((y + offset) * 37 + x * 13) % 256;
    result[i + 1] = ((y + offset) * 53 + x * 7) % 256;
    result[i + 2] = ((y + offset) * 91 + x * 19) % 256;
    result[i + 3] = 255;
  }
  return result;
}

beforeEach(() => {
  bitmaps.length = 0;
  draws.length = 0;
  globalThis.createImageBitmap = vi.fn(async (source: ImageBitmapSource, options?: ImageBitmapOptions) => {
    const input = source as File;
    const size = fileSizes.get(input) ?? dimensions(input.name);
    const bitmap = { width: options?.resizeWidth ?? size.width, height: options?.resizeHeight ?? size.height, fileName: input.name,
      close: vi.fn() } as unknown as FakeBitmap;
    bitmaps.push(bitmap);
    return bitmap;
  }) as typeof createImageBitmap;
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
    let lastImage: FakeBitmap;
    return {
      drawImage: (...args: unknown[]) => {
        lastImage = args[0] as FakeBitmap;
        draws.push({ width: this.width, height: this.height, args });
      },
      getImageData: () => ({ data: pixels(lastImage.fileName, this.width, this.height) }),
      globalAlpha: 1,
    };
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,combined');
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  globalThis.createImageBitmap = originalCreateImageBitmap;
  vi.restoreAllMocks();
});

async function choose(...names: string[]) {
  fireEvent.change(screen.getByLabelText(/Choose or drop 2–6 screenshots/), { target: { files: names.map(name => file(name)) } });
}

describe('StitchModal', () => {
  it('detects overlap, supports manual correction, and imports one combined image', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={onClose} />);
    await choose('top.png', 'second.png');
    expect(await screen.findByText(/Auto-aligned/)).toBeInTheDocument();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('50');
    fireEvent.change(slider, { target: { value: '30' } });
    expect(screen.getByText(/170px output/)).toBeInTheDocument();
    expect(screen.getByText(/Adjusted manually/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import into editor' }));
    expect(onImport).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,combined');
    expect(onClose).toHaveBeenCalledOnce();
    expect(draws).toContainEqual({ width: 100, height: 170,
      args: [bitmaps[1], 0, 30, 100, 70, 0, 100, 100, 70] });
  });

  it('reorders sources and recalculates the seam', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    fireEvent.click(screen.getByRole('button', { name: 'Move top.png down' }));
    expect(await screen.findByText(/1\. second.png/)).toBeInTheDocument();
    expect(screen.getByText(/2\. top.png/)).toBeInTheDocument();
  });

  it.each(['png', 'jpeg', 'webp'] as const)('accepts real %s metadata before decoding', async format => {
    const bytes = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#445566' } }).toFormat(format).toBuffer();
    const sources = ['top', 'second'].map(name => {
      const input = new File([new Uint8Array(bytes)], `${name}.${format}`, { type: `image/${format}` });
      Object.defineProperty(input, 'arrayBuffer', { value: async () => new Uint8Array(bytes).buffer });
      return input;
    });
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    expect(await screen.findByText(/Auto-aligned/)).toBeInTheDocument();
    expect(globalThis.createImageBitmap).toHaveBeenCalledTimes(2);
  });

  it('preserves manual alignment when returning to a previously ordered image pair', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move top.png down' }));
    await screen.findByText(/1\. second.png/);
    fireEvent.click(screen.getByRole('button', { name: 'Move top.png up' }));
    await screen.findByText(/1\. top.png/);
    expect(screen.getByRole('slider')).toHaveValue('30');
    expect(screen.getByText(/Adjusted manually/)).toBeInTheDocument();
  });

  it.each([0, 12])('gives a readable error for a damaged %i-byte image before decoding', async size => {
    const bytes = new Uint8Array(size).fill(65);
    const damaged = new File([bytes], 'damaged.png', { type: 'image/png' });
    Object.defineProperty(damaged, 'arrayBuffer', { value: async () => bytes.buffer });
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [file('top.png'), damaged] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose valid PNG, JPEG or WebP images.');
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    bitmaps.forEach(bitmap => expect(bitmap.close).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
  });

  it('contains keyboard focus and shortcuts and restores the launching control', () => {
    const onClose = vi.fn();
    const onImport = vi.fn();
    const { rerender } = render(<><button>Launch stitch</button><StitchModal open={false} onImport={onImport} onClose={onClose} /></>);
    const launcher = screen.getByRole('button', { name: 'Launch stitch' });
    launcher.focus();
    rerender(<><button>Launch stitch</button><StitchModal open onImport={onImport} onClose={onClose} /></>);
    const close = screen.getByRole('button', { name: 'Close Stitch Screenshots' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(close).toHaveFocus();
    const workspaceShortcut = vi.fn();
    window.addEventListener('keydown', workspaceShortcut);
    fireEvent.keyDown(close, { key: 'n', ctrlKey: true });
    fireEvent.keyDown(close, { key: 's', ctrlKey: true });
    fireEvent.keyDown(close, { key: '2' });
    expect(workspaceShortcut).not.toHaveBeenCalled();
    window.removeEventListener('keydown', workspaceShortcut);
    const paste = vi.fn();
    window.addEventListener('paste', paste);
    fireEvent.paste(close);
    expect(paste).not.toHaveBeenCalled();
    window.removeEventListener('paste', paste);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<><button>Launch stitch</button><StitchModal open={false} onImport={onImport} onClose={onClose} /></>);
    expect(launcher).toHaveFocus();
  });

  it('allows a manual join with zero overlap or near-total overlap', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
    expect(screen.getByText(/200px output/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '99' } });
    expect(screen.getByText(/101px output/)).toBeInTheDocument();
  });

  it('offers a smaller copy for oversized output and returns to original resolution when overlap allows it', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('output-a.png', 'output-b.png', 'output-c.png');
    expect(await screen.findByRole('button', { name: 'Import smaller copy' })).toBeEnabled();
    expect(screen.getByText(/smaller copy \(.*% of original\)/)).toBeInTheDocument();
    expect(screen.getByText(/source files stay unchanged/)).toBeInTheDocument();
    screen.getAllByRole('slider').forEach(slider => fireEvent.change(slider, { target: { value: '2500' } }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeEnabled();
  });

  it('uses native row precision and lets the numeric control adjust a seam', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second-native.png');
    await screen.findByText(/Auto-aligned/);
    expect(screen.getByRole('slider')).toHaveValue('33');
    const numeric = screen.getByRole('spinbutton', { name: 'Overlap before screenshot 2 value' });
    fireEvent.change(numeric, { target: { value: '34' } });
    fireEvent.keyDown(numeric, { key: 'Enter' });
    expect(screen.getByRole('slider')).toHaveValue('34');
    expect(screen.getByText(/166px output/)).toBeInTheDocument();
  });

  it('owns file drops instead of changing the workspace underneath the dialog', async () => {
    const workspaceDrop = vi.fn();
    render(<div onDrop={workspaceDrop}><StitchModal open onImport={vi.fn()} onClose={vi.fn()} /></div>);
    fireEvent.drop(screen.getByRole('dialog'), { dataTransfer: { files: [file('top.png'), file('second.png')] } });
    await screen.findByText(/Auto-aligned/);
    expect(workspaceDrop).not.toHaveBeenCalled();
  });

  it('rejects sources beyond the hard safety ceiling and unsupported files before decoding', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'huge.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('40 megapixels');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [file('top.png'), new File(['<svg/>'], 'vector.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPEG or WebP');
  });

  it.each([false, true])('discards a late decode when the dialog closes (smaller preview: %s)', async reduced => {
    let finishDecode!: (value: ImageBitmap) => void;
    globalThis.createImageBitmap = vi.fn(() => new Promise<ImageBitmap>(resolve => { finishDecode = resolve; })) as typeof createImageBitmap;
    const onImport = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<StitchModal open onImport={onImport} onClose={onClose} />);
    await choose(...(reduced ? ['budget-top.png', 'budget-second.png'] : ['top.png', 'second.png']));
    if (reduced) fireEvent.click(await screen.findByRole('button', { name: 'Prepare smaller copy' }));
    await waitFor(() => expect(globalThis.createImageBitmap).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<StitchModal open={false} onImport={onImport} onClose={vi.fn()} />);
    const bitmap = { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
    finishDecode(bitmap);
    await waitFor(() => expect(bitmap.close).toHaveBeenCalledOnce());
    expect(onImport).not.toHaveBeenCalled();
  });

  it('reports PNG encoding failure instead of importing an invalid data URL', async () => {
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:,');
    fireEvent.click(screen.getByRole('button', { name: 'Import into editor' }));
    expect(screen.getByRole('alert')).toHaveTextContent('could not encode');
    expect(onImport).not.toHaveBeenCalled();
  });

  it('rejects mismatched original widths before decoding', async () => {
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('top.png', 'narrow.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('same pixel width');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it('keeps the current alignment after invalid selection counts and releases bitmaps on close', async () => {
    const { rerender } = render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    await choose('one.png');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 2–6');
    expect(screen.getByRole('slider')).toHaveValue('50');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeEnabled();
    rerender(<StitchModal open={false} onImport={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(bitmaps.every(bitmap => vi.mocked(bitmap.close).mock.calls.length === 1)).toBe(true));
  });

  it('rejects short sources without publishing images with missing seams or crashing', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('short-a.png', 'short-b.png');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(bitmaps.every(bitmap => vi.mocked(bitmap.close).mock.calls.length === 1)).toBe(true);
  });

  it('reads and validates every source before the first original-resolution decode', async () => {
    const first = file('top.png');
    const second = file('second.png');
    const buffer = await second.arrayBuffer();
    let finishMetadata!: (buffer: ArrayBuffer) => void;
    Object.defineProperty(second, 'arrayBuffer', { value: vi.fn(() => new Promise<ArrayBuffer>(resolve => { finishMetadata = resolve; })) });
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [first, second] } });
    await waitFor(() => expect(second.arrayBuffer).toHaveBeenCalledOnce());
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    await act(async () => finishMetadata(buffer));
    await screen.findByRole('img', { name: 'Combined screenshot preview' });
    expect(globalThis.createImageBitmap).toHaveBeenNthCalledWith(1, first);
    expect(globalThis.createImageBitmap).toHaveBeenNthCalledWith(2, second);
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeEnabled();
  });

  it('accepts files larger than the former 8 MB cap when the selection fits the memory budget', async () => {
    const sources = [file('top.png', undefined, 12_000_000), file('second.png', undefined, 12_000_000)];
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    await screen.findByRole('img', { name: 'Combined screenshot preview' });
    expect(globalThis.createImageBitmap).toHaveBeenNthCalledWith(1, sources[0]);
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([['large-top.png', 'large-second.png'], ['tall-top.png', 'tall-second.png']])(
    'accepts larger or taller screenshots without the former pixel or aspect-ratio limits: %s', async (first, second) => {
      render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
      await choose(first, second);
      await screen.findByRole('img', { name: 'Combined screenshot preview' });
      expect(globalThis.createImageBitmap).toHaveBeenCalledTimes(2);
      vi.mocked(globalThis.createImageBitmap).mock.calls.forEach(call => expect(call).toHaveLength(1));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('shows exact smaller-output dimensions before importing and renders into that canvas', async () => {
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('output-a.png', 'output-b.png', 'output-c.png');
    await screen.findByRole('button', { name: 'Import smaller copy' });
    const overlaps = screen.getAllByRole('slider').map(slider => Number((slider as HTMLInputElement).value));
    const height = 9000 - overlaps.reduce((sum, overlap) => sum + overlap, 0);
    const output = planStitchOutput({ width: 4000, height });
    expect(screen.getByText(new RegExp(`${output.width} × ${output.height}px smaller copy`))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import smaller copy' }));
    expect(onImport).toHaveBeenCalledExactlyOnceWith('data:image/png;base64,combined');
    expect(draws).toContainEqual({ width: output.width, height: output.height,
      args: [bitmaps[0], 0, 0, 4000, 3000, 0, 0, output.width, 3000 * (output.height / height)] });
  });

  it('fits very tall output to the height ceiling without rejecting the original sources', async () => {
    const sources = ['top.png', 'second.png'].map(name => file(name, { width: 100, height: 10_000 }));
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    const slider = await screen.findByRole('slider');
    fireEvent.change(slider, { target: { value: '0' } });
    expect(screen.getByText('80 × 16000px smaller copy (80% of original)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import smaller copy' }));
    expect(onImport).toHaveBeenCalledOnce();
    expect(draws).toContainEqual({ width: 80, height: 16_000,
      args: [bitmaps[1], 0, 0, 100, 10_000, 0, 8000, 80, 8000] });
  });

  it('asks before preparing a memory-heavy selection, then decodes the agreed smaller dimensions', async () => {
    const sources = [file('budget-top.png'), file('budget-second.png')];
    const plan = planStitchSources(sources.map(source => ({ ...dimensions(source.name), bytes: source.size })));
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    const prepare = await screen.findByRole('button', { name: 'Prepare smaller copy' });
    expect(prepare).toHaveFocus();
    expect(screen.getByText(`${plan.width} × ${plan.heights.reduce((sum, height) => sum + height, 0)}px`)).toBeInTheDocument();
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    fireEvent.click(prepare);
    await screen.findByRole('img', { name: 'Combined screenshot preview' });
    sources.forEach((source, index) => {
      expect(globalThis.createImageBitmap).toHaveBeenNthCalledWith(index + 1, source,
        { resizeWidth: plan.width, resizeHeight: plan.heights[index], resizeQuality: 'high' });
      expect(source.size).toBe(33);
      expect(bitmaps[index]).toMatchObject({ width: plan.width, height: plan.heights[index] });
    });
    expect(screen.getAllByText('6000 × 5000px')).toHaveLength(2);
    expect(screen.getByText(/Overlap values are measured in smaller-copy pixels/)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('max', String(plan.heights[1] - 1));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move budget-top.png down' }));
    await screen.findByText('1. budget-second.png');
    fireEvent.click(screen.getByRole('button', { name: 'Move budget-top.png up' }));
    await screen.findByText('1. budget-top.png');
    expect(screen.getByRole('slider')).toHaveValue('50');
    fireEvent.click(screen.getByRole('button', { name: 'Import smaller copy' }));
    expect(onImport).toHaveBeenCalledOnce();
  });

  it('clears an unapproved smaller-copy choice when closed and reopened without decoding', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<StitchModal open onImport={onImport} onClose={onClose} />);
    await choose('budget-top.png', 'budget-second.png');
    await screen.findByRole('button', { name: 'Prepare smaller copy' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<StitchModal open={false} onImport={onImport} onClose={onClose} />);
    rerender(<StitchModal open onImport={onImport} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: 'Prepare smaller copy' })).not.toBeInTheDocument();
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('replaces a pending smaller-copy choice with a new original-resolution selection', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('budget-top.png', 'budget-second.png');
    await screen.findByRole('button', { name: 'Prepare smaller copy' });
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    expect(screen.queryByRole('button', { name: 'Prepare smaller copy' })).not.toBeInTheDocument();
    expect(vi.mocked(globalThis.createImageBitmap).mock.calls.map(call => (call[0] as File).name)).toEqual(['top.png', 'second.png']);
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeEnabled();
  });

  it('rejects excessive file data before allocating a metadata buffer', async () => {
    const sources = [file('top.png', undefined, STITCH_MAX_FILE_BYTES), file('second.png')];
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    expect(await screen.findByRole('alert')).toHaveTextContent('too much file data');
    sources.forEach(source => expect(source.arrayBuffer).not.toHaveBeenCalled());
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it('rejects a working set that cannot fit even after reducing source resolution', async () => {
    const sources = ['top', 'second'].map(name => file(name, { width: 8000, height: 5000 }, 64_000_000));
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    expect(await screen.findByRole('alert')).toHaveTextContent('even as a smaller copy');
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Prepare smaller copy' })).not.toBeInTheDocument();
  });

  it('releases a bitmap if the browser ignores the planned resize options', async () => {
    const bitmap = { width: 6000, height: 5000, close: vi.fn() } as unknown as ImageBitmap;
    globalThis.createImageBitmap = vi.fn(async () => bitmap) as typeof createImageBitmap;
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('budget-top.png', 'budget-second.png');
    fireEvent.click(await screen.findByRole('button', { name: 'Prepare smaller copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('planned resolution');
    expect(bitmap.close).toHaveBeenCalledOnce();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('releases previously decoded sources if a later image cannot decode', async () => {
    const decode = globalThis.createImageBitmap;
    globalThis.createImageBitmap = vi.fn(async (source: ImageBitmapSource) => {
      if ((source as File).name === 'second.png') throw new Error('Could not decode the second screenshot.');
      return decode(source);
    }) as typeof createImageBitmap;
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not decode the second screenshot.');
    expect(bitmaps).toHaveLength(1);
    expect(bitmaps[0].close).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('discards late metadata without opening a smaller-copy choice after closing', async () => {
    const first = file('budget-top.png');
    const buffer = await first.arrayBuffer();
    let finishMetadata!: (buffer: ArrayBuffer) => void;
    Object.defineProperty(first, 'arrayBuffer', { value: vi.fn(() => new Promise<ArrayBuffer>(resolve => { finishMetadata = resolve; })) });
    const onImport = vi.fn();
    const { rerender } = render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [first, file('budget-second.png')] } });
    await waitFor(() => expect(first.arrayBuffer).toHaveBeenCalledOnce());
    rerender(<StitchModal open={false} onImport={onImport} onClose={vi.fn()} />);
    await act(async () => finishMetadata(buffer));
    rerender(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Prepare smaller copy' })).not.toBeInTheDocument();
    expect(globalThis.createImageBitmap).not.toHaveBeenCalled();
  });

  it('plans JPEGs using their displayed EXIF orientation before decoding', async () => {
    const bytes = await sharp({ create: { width: 80, height: 100, channels: 3, background: '#445566' } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const sources = ['top', 'second'].map(name => {
      const input = new File([new Uint8Array(bytes)], `${name}.jpeg`, { type: 'image/jpeg' });
      Object.defineProperty(input, 'arrayBuffer', { value: async () => new Uint8Array(bytes).buffer });
      fileSizes.set(input, { width: 100, height: 80 });
      return input;
    });
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: sources } });
    await screen.findByRole('img', { name: 'Combined screenshot preview' });
    expect(screen.getAllByText('100 × 80px')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
