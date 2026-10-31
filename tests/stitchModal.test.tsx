import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StitchModal from '../src/renderer/components/StitchModal';

type FakeBitmap = ImageBitmap & { fileName: string };

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
const originalCreateImageBitmap = globalThis.createImageBitmap;
const bitmaps: FakeBitmap[] = [];
const draws: Array<{ width: number; height: number; args: unknown[] }> = [];

function file(name: string) {
  return new File([new Uint8Array(200)], name, { type: 'image/png' });
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
    const bitmap = { width: input.name.startsWith('narrow') ? 99 : input.name.startsWith('large') ? 5000 : input.name.startsWith('output') ? 4000 : 100,
      height: input.name.startsWith('large') || input.name.startsWith('output') ? 3000 : 100, fileName: input.name,
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
    expect(screen.getByText(/1\. second.png/)).toBeInTheDocument();
    expect(screen.getByText(/2\. top.png/)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/Choose or drop/), { target: { files: [file('top.png'), new File(['<svg/>'], 'vector.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPEG or WebP');
  });

  it('discards a late decode when the dialog closes', async () => {
    let finishDecode!: (value: ImageBitmap) => void;
    globalThis.createImageBitmap = vi.fn(() => new Promise<ImageBitmap>(resolve => { finishDecode = resolve; })) as typeof createImageBitmap;
    const onImport = vi.fn();
    const { rerender } = render(<StitchModal open onImport={onImport} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
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

  it('rejects too many sources, preserves no partial import, and releases bitmaps on close', async () => {
    const { rerender } = render(<StitchModal open onImport={vi.fn()} onClose={vi.fn()} />);
    await choose('top.png', 'second.png');
    await screen.findByText(/Auto-aligned/);
    await choose('one.png');
    expect(screen.getByRole('alert')).toHaveTextContent('Choose 2–6');
    expect(screen.getByRole('button', { name: 'Import into editor' })).toBeDisabled();
    await choose('top.png', 'second.png');
    rerender(<StitchModal open={false} onImport={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(bitmaps.every(bitmap => vi.mocked(bitmap.close).mock.calls.length === 1)).toBe(true));
  });
});
