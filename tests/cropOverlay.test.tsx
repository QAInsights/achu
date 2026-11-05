import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CropOverlay, { CropControls } from '../src/renderer/components/CropOverlay';
import type { CropRect } from '../src/renderer/utils/cropUtils';

let context: any;
vi.mock('../src/renderer/AppContext', () => ({ useAppContext: () => context }));

afterEach(() => vi.restoreAllMocks());

function CropHarness({ active = true, busy = false, error = null }: { active?: boolean; busy?: boolean; error?: string | null }) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState('Free');
  context = { cropActive: active, cropRect, setCropRect, cropAspect, setCropAspect, cropBusy: busy, cropError: error, cancelCrop: vi.fn(), applyCrop: vi.fn() };
  return <>
    <div className="toolbar-dock"><button ref={anchorRef}>Crop</button></div>
    <CropControls anchorRef={anchorRef} />
    <div className="canvas-viewport">{active && <CropOverlay size={{ width: 800, height: 600 }} />}</div>
  </>;
}
describe('crop overlay', () => {
  it('shows eight handles, source size and aspect constraints, and reset restores the full image', () => {
    render(<CropHarness />);
    expect(screen.getByText('800 × 600 px')).toBeTruthy();
    expect(document.querySelectorAll('.crop-handle')).toHaveLength(8);
    expect(document.querySelectorAll('.crop-edge')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Free' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '1:1' }));
    expect(screen.getByRole('button', { name: '1:1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Free' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('600 × 600 px')).toBeTruthy();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('800 × 600 px')).toBeTruthy();
    expect(context.cropAspect).toBe('Free');
  });
  it('portals controls without adding a toolbar row, gives shortcut hints and restores focus to the anchor', () => {
    const { rerender } = render(<CropHarness />);
    const controls = screen.getByRole('group', { name: 'Crop options' });
    expect(controls.parentElement).toBe(document.body);
    expect(document.querySelector('.toolbar-dock')).not.toContainElement(controls);
    expect(document.querySelector('.toolbar-context')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel Esc' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Enter' }));
    expect(context.applyCrop).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Esc' }));
    expect(context.cancelCrop).toHaveBeenCalledOnce();
    rerender(<CropHarness active={false} />);
    expect(screen.queryByRole('group', { name: 'Crop options' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Crop' })).toHaveFocus();
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('keeps crop errors readable and disables edits while applying', () => {
    const { rerender } = render(<CropHarness error="Could not crop image: bad image" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not crop image: bad image');
    rerender(<CropHarness busy />);
    for (const button of screen.getByRole('group', { name: 'Crop options' }).querySelectorAll('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: 'Applying...' })).toBeInTheDocument();
  });
  it('clamps the pill to the canvas after wrapping or sidebar movement, and puts the readout outside the crop', () => {
    let viewport = { left: 100, top: 120, width: 800, height: 580 };
    const box = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('canvas-viewport')) return box(viewport.left, viewport.top, viewport.width, viewport.height);
      if (this.classList.contains('crop-controls')) return box(0, 0, Math.min(560, viewport.width - 16), 50);
      if (this.classList.contains('crop-overlay')) return box(200, 200, 600, 400);
      if (this.classList.contains('crop-size')) return box(0, 0, 120, 24);
      return box(200, 20, 32, 32);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
    render(<CropHarness />);
    expect(document.querySelector('.crop-overlay')).toHaveStyle({ '--crop-ui-scale': String(800 / 600) });
    const pill = screen.getByRole('group', { name: 'Crop options' });
    expect(pill.style.left).toBe('108px');
    expect(pill.style.top).toBe('128px');
    const readout = screen.getByText('800 × 600 px');
    expect(readout.parentElement).toBe(document.body);
    expect(readout.style.top).toBe('610px');
    viewport = { left: 424, top: 160, width: 476, height: 450 };
    fireEvent(window, new Event('resize'));
    expect(pill.style.left).toBe('432px');
    expect(pill.style.top).toBe('168px');
    expect(pill.style.maxWidth).toBe('460px');
    expect(readout.style.top).toBe('168px');
    expect(Number.parseFloat(readout.style.left)).toBeGreaterThanOrEqual(432);
    expect(Number.parseFloat(readout.style.left) + 120).toBeLessThanOrEqual(892);
  });
  it('ignores non-primary and secondary-button pointer gestures', () => {
    render(<CropHarness />);
    const handle = screen.getByLabelText('Crop se handle');
    for (const options of [{ button: 2, isPrimary: true }, { button: 0, isPrimary: false }]) {
      const event = new Event('pointerdown', { bubbles: true });
      Object.assign(event, options);
      fireEvent(handle, event);
      fireEvent.pointerMove(handle, { clientX: -200, clientY: -200 });
    }
    expect(context.cropRect).toEqual({ x: 0, y: 0, w: 800, h: 600 });
  });
});
