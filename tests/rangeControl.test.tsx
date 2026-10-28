import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RangeControl from '../src/renderer/components/RangeControl';

function setup() {
  const onCommit = vi.fn();
  function Control() {
    const [value, setValue] = useState(38);
    return <RangeControl label="Padding" value={value} min={0} max={120}
      onChange={setValue} onCommit={onCommit} />;
  }
  render(<Control />);
  return {
    slider: screen.getByRole('slider', { name: 'Padding' }),
    number: screen.getByRole('spinbutton', { name: 'Padding value' }),
    onCommit,
  };
}

describe('RangeControl', () => {
  it('previews slider changes and commits only the last value once per gesture', () => {
    const { slider, number, onCommit } = setup();
    fireEvent.change(slider, { target: { value: '50' } });
    fireEvent.change(slider, { target: { value: '64' } });
    expect(number).toHaveValue(64);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider, { pointerType: 'touch' });
    fireEvent.blur(slider);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(64);
  });

  it('commits a keyboard adjustment on key release without duplicating on blur', () => {
    const { slider, onCommit } = setup();
    fireEvent.change(slider, { target: { value: '39' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    fireEvent.blur(slider);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(39);
  });

  it('commits a pending change if the slider loses focus or a pointer is cancelled', () => {
    const { slider, onCommit } = setup();
    fireEvent.change(slider, { target: { value: '40' } });
    fireEvent.blur(slider);
    fireEvent.change(slider, { target: { value: '45' } });
    fireEvent.pointerCancel(slider);
    expect(onCommit.mock.calls).toEqual([[40], [45]]);
  });

  it('commits a typed value on Enter and synchronizes the slider', () => {
    const { slider, number, onCommit } = setup();
    fireEvent.change(number, { target: { value: '73' } });
    expect(slider).toHaveValue('38');
    fireEvent.keyDown(number, { key: 'Enter' });
    fireEvent.blur(number);
    expect(slider).toHaveValue('73');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(73);
  });

  it.each([['999', 120], ['-20', 0], ['42.6', 43]])('normalizes %s to %s on blur', (draft, expected) => {
    const { number, onCommit } = setup();
    fireEvent.change(number, { target: { value: draft } });
    fireEvent.blur(number);
    expect(number).toHaveValue(expected);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith(expected);
  });

  it('restores an empty field without changing the canvas', () => {
    const { number, onCommit } = setup();
    fireEvent.change(number, { target: { value: '' } });
    fireEvent.blur(number);
    expect(number).toHaveValue(38);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('cancels an uncommitted numeric edit with Escape', () => {
    const { number, onCommit } = setup();
    fireEvent.change(number, { target: { value: '90' } });
    fireEvent.keyDown(number, { key: 'Escape' });
    fireEvent.blur(number);
    expect(number).toHaveValue(38);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('synchronizes numeric entry when undo or another control changes the value', () => {
    const onCommit = vi.fn();
    const props = { label: 'Padding', min: 0, max: 120, onChange: vi.fn(), onCommit };
    const { rerender } = render(<RangeControl {...props} value={70} />);
    rerender(<RangeControl {...props} value={38} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(38);
    expect(screen.getByRole('slider')).toHaveValue('38');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
