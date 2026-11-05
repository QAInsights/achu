import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToolbarShortcuts } from '../src/renderer/hooks/useToolbarShortcuts';

const context = vi.hoisted(() => ({ setActiveTool: vi.fn(), startCrop: vi.fn(), imageSrc: 'image' as string | null, cropActive: false, noImageMode: false, codeStudioActive: false }));
vi.mock('../src/renderer/AppContext', () => ({ useAppContext: () => context }));
beforeEach(() => { vi.clearAllMocks(); Object.assign(context, { imageSrc: 'image', cropActive: false, noImageMode: false, codeStudioActive: false }); });
const press = (key: string, opts: KeyboardEventInit = {}) => act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts })); });

describe('crop toolbar shortcut', () => {
  it('uses plain X without stealing modified cut', () => {
    renderHook(useToolbarShortcuts);
    press('x', { ctrlKey: true });
    expect(context.startCrop).not.toHaveBeenCalled();
    press('x');
    expect(context.startCrop).toHaveBeenCalledOnce();
    expect(context.setActiveTool).not.toHaveBeenCalled();
  });
  it.each(['noImageMode', 'codeStudioActive', 'cropActive'])('does not start while %s', mode => {
    Object.assign(context, { [mode]: true });
    renderHook(useToolbarShortcuts);
    press('x'); press('1');
    expect(context.startCrop).not.toHaveBeenCalled();
    if (mode === 'cropActive') expect(context.setActiveTool).not.toHaveBeenCalled();
  });
  it('does not crop without image or while typing', () => {
    context.imageSrc = null;
    renderHook(useToolbarShortcuts);
    press('x');
    const input = document.createElement('input');
    document.body.append(input);
    context.imageSrc = 'image';
    act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true })); });
    expect(context.startCrop).not.toHaveBeenCalled();
    input.remove();
  });
});
