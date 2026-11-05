import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StepSizeFlyout from '../src/renderer/components/StepSizeFlyout';

afterEach(() => { cleanup(); document.body.replaceChildren(); });

it('tracks its icon across resize and sidebar movement and stays below wrapped toolbar buttons', () => {
  const dock = document.createElement('div');
  dock.className = 'toolbar-dock';
  const anchor = document.createElement('span');
  dock.append(anchor);
  const wrappedButton = document.createElement('button');
  dock.append(wrappedButton);
  document.body.append(dock);
  let center = 340;
  let bottom = 36;
  let dockBottom = 40;
  let wrapped = false;
  anchor.getBoundingClientRect = () => ({ left: center - 16, width: 32, bottom }) as DOMRect;
  dock.getBoundingClientRect = () => ({ bottom: dockBottom }) as DOMRect;
  wrappedButton.getBoundingClientRect = () => ({ width: wrapped ? 32 : 0, height: 32, left: 200, right: 232, top: 76, bottom: 104 }) as DOMRect;
  const onChange = vi.fn();
  const { rerender } = render(<StepSizeFlyout anchorRef={{ current: anchor }} size={40} onChange={onChange} />);
  const flyout = screen.getByRole('group', { name: 'Step options' });
  expect(flyout.style.left).toBe('340px');
  expect(flyout.style.top).toBe('43px');
  center = 220;
  bottom = 72;
  dockBottom = 104;
  wrapped = true;
  fireEvent(window, new Event('resize'));
  expect(flyout.style.left).toBe('220px');
  expect(flyout.style.top).toBe('111px');
  center = 500;
  rerender(<StepSizeFlyout anchorRef={{ current: anchor }} size={48} onChange={onChange} />);
  expect(flyout.style.left).toBe('500px');
  for (const size of ['S', 'M', 'L']) {
    const button = screen.getByRole('button', { name: `Step size ${size}` });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.tabIndex).toBe(0);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Step size M' }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith(40);
});
