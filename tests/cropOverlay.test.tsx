import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CropOverlay, { CropControls } from '../src/renderer/components/CropOverlay';
import type { CropRect } from '../src/renderer/utils/cropUtils';

let context: any;
vi.mock('../src/renderer/AppContext', () => ({ useAppContext: () => context }));

function CropHarness() {
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState('Free');
  context = { cropActive: true, cropRect, setCropRect, cropAspect, setCropAspect, cropBusy: false, cancelCrop: vi.fn(), applyCrop: vi.fn() };
  return <><CropControls /><CropOverlay size={{ width: 800, height: 600 }} /></>;
}
describe('crop overlay', () => {
  it('shows eight handles, source size and aspect constraints, and reset restores the full image', () => {
    render(<CropHarness />);
    expect(screen.getByText('800 × 600 px')).toBeTruthy();
    expect(document.querySelectorAll('.crop-handle')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Free' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '1:1' }));
    expect(screen.getByRole('button', { name: '1:1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Free' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('600 × 600 px')).toBeTruthy();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('800 × 600 px')).toBeTruthy();
    expect(context.cropAspect).toBe('Free');
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
