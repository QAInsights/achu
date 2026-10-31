import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StitchModal from '../src/renderer/components/StitchModal';
import sharp from 'sharp';

type FakeBitmap = ImageBitmap & { fileName: string };

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalCreateImageBitmap = globalThis.createImageBitmap;
const bitmaps: FakeBitmap[] = [];
const draws: Array<{ width: number; height: number; args: unknown[] }> = [];

function dimensions(name: string) {
  return {
    width: name.startsWith('narrow') ? 99 : name.startsWith('large') ? 5000 : name.startsWith('output') ? 4000 : 100,
    height: name.startsWith('short') ? 2 : name.startsWith('large') || name.startsWith('output') ? 3000 : 100,
  };
}

function file(name: string) {
  const size = dimensions(name);
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, size.width);
  view.setUint32(20, size.height);
  const result = new File([bytes], name, { type: 'image/png' });
  Object.defineProperty(result, 'arrayBuffer', { value: async () => bytes.buffer });
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
  globalThis.createImageBitmap = vi.fn(async (source: ImageBitmapSource) => {
    const input = source as File;
    const bitmap = { ...dimensions(input.name), fileName: input.name,
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
  fireEvent.change(screen.getByLabelText(/Choose or drop 2–6 screenshots/), { target: { files: names.map(file) } });
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
    expect(globalThis.createImageBitmap).toHaveBeenCalledOnce();
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

  it('blocks oversized output until manual alignment reduces it below the memory limit', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('output-a.png', 'output-b.png', 'output-c.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('Combined image is too large');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
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

  it('rejects oversized sources and unsupported files', async () => {
    render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'large.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('12 megapixels');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(globalThis.createImageBitmap).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [file('top.png'), new File(['<svg/>'], 'vector.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPEG or WebP');
  });

  it('discards a late decode when the dialog closes', async () => {
    let finishDecode!: (value: ImageBitmap) => void;
    globalThis.createImageBitmap = vi.fn(() => new Promise<ImageBitmap>(resolve => { finishDecode = resolve; })) as typeof createImageBitmap;
    const onImport = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<StitchModal open onImport={onImport} onClose={onClose} />);
    await choose('top.png', 'second.png');
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

  it('rejects mismatched widths without importing and releases decoded bitmaps', async () => {
    const onImport = vi.fn();
    render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('top.png', 'narrow.png');
    expect(await screen.findByRole('alert')).toHaveTextContent('same pixel width');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
    expect(bitmaps.every(bitmap => vi.mocked(bitmap.close).mock.calls.length === 1)).toBe(true);
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
});
