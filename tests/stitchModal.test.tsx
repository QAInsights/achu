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
  const offset = name.startsWith('second') ? 64 : name.startsWith('unrelated') ? 140 : 0;
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
    const bitmap = { width: input.name.startsWith('narrow') ? 99 : 100, height: 100, fileName: input.name,
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
  fireEvent.change(screen.getByLabelText(/Choose 2–6 screenshots/), { target: { files: names.map(file) } });
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
    expect(screen.getByText(/Review this join/)).toBeInTheDocument();
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
