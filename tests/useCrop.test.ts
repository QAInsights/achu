import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCrop, isolateCropEvents } from '../src/renderer/hooks/useCrop';
import { useHistory } from '../src/renderer/hooks/useHistory';
import type { RenderConfig } from '../src/renderer/canvasRenderer';
import * as cropUtils from '../src/renderer/utils/cropUtils';

vi.mock('../src/renderer/utils/telemetry', () => ({ trackFeature: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const rect = { x: 100, y: 100, w: 400, h: 300 };
const before = { imageSrc: 'original', annotations: [{ id: 'a', x: .25, y: .25, w: .1, h: .1 }], redactions: [] } as unknown as RenderConfig;

describe('crop apply and history', () => {
  function setup(src: string | null = 'original', disabled = false) {
    const apply = vi.fn();
    const invalidate = vi.fn();
    const hook = renderHook(() => {
      const history = useHistory(apply);
      const crop = useCrop(src, disabled, () => before, apply, history.pushHistory, invalidate);
      return { ...crop, ...history };
    });
    return { ...hook, apply, invalidate };
  }
  it('pushes one complete snapshot, undo restores original positions and redo restores crop', async () => {
    vi.spyOn(cropUtils, 'renderCrop').mockResolvedValue({ imageSrc: 'cropped', size: { width: 800, height: 600 }, crop: rect });
    const { result, apply, invalidate } = setup();
    act(() => result.current.pushHistory(before));
    act(() => { result.current.startCrop(); result.current.setCropRect(rect); });
    await act(async () => result.current.applyCrop());
    expect(result.current.history).toHaveLength(2);
    const snapshot = result.current.history[1];
    expect(snapshot.imageSrc).toBe('cropped');
    expect(snapshot.annotations[0].x).toBe(.25);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(result.current.cropActive).toBe(false);
    act(() => result.current.handleUndo());
    expect(apply).toHaveBeenLastCalledWith(before);
    act(() => result.current.handleRedo());
    expect(apply).toHaveBeenLastCalledWith(snapshot);
  });
  it('does nothing without image or in disabled modes', () => {
    const empty = setup(null);
    act(() => empty.result.current.startCrop());
    expect(empty.result.current.cropActive).toBe(false);
    const disabled = setup('original', true);
    act(() => disabled.result.current.startCrop());
    expect(disabled.result.current.cropActive).toBe(false);
  });
  it('cancel changes neither image nor history', () => {
    const { result, apply } = setup();
    act(() => result.current.startCrop());
    act(() => result.current.cancelCrop());
    expect(result.current.history).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });
  it('keeps listeners stable while applying the latest rectangle', async () => {
    const render = vi.spyOn(cropUtils, 'renderCrop').mockResolvedValue({
      imageSrc: 'cropped', size: { width: 800, height: 600 }, crop: rect,
    });
    const add = vi.spyOn(window, 'addEventListener');
    const { result } = setup();
    act(() => result.current.startCrop());
    const registrations = add.mock.calls.filter(([type]) => type === 'keydown').length;
    act(() => result.current.setCropRect({ ...rect, w: 200 }));
    act(() => result.current.setCropRect(rect));
    expect(add.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(registrations);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(render).toHaveBeenCalledExactlyOnceWith('original', rect);
  });
  it('retains crop mode on error and does not mutate history', async () => {
    vi.spyOn(cropUtils, 'renderCrop').mockRejectedValue(new Error('bad image'));
    const { result, apply } = setup();
    act(() => { result.current.startCrop(); result.current.setCropRect(rect); });
    await act(async () => result.current.applyCrop());
    expect(result.current.cropError).toContain('bad image');
    expect(result.current.cropActive).toBe(true);
    expect(result.current.history).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('crop event isolation', () => {
  it('activates crop buttons with Enter and Space without applying', () => {
    const apply = vi.fn();
    const cleanup = isolateCropEvents(apply, vi.fn());
    const group = document.createElement('div');
    group.dataset.cropUi = '';
    const button = document.createElement('button');
    const click = vi.fn();
    button.addEventListener('click', click);
    group.append(button);
    document.body.append(group);
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(apply).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(2);
    cleanup();
    group.remove();
  });
  it('blocks app shortcuts, annotation keys, window paste and file drops until cancel', () => {
    const appShortcut = vi.fn();
    const paste = vi.fn();
    const drop = vi.fn();
    const apply = vi.fn();
    const cancel = vi.fn();
    window.addEventListener('keydown', appShortcut);
    window.addEventListener('paste', paste);
    window.addEventListener('drop', drop);
    const cleanup = isolateCropEvents(apply, cancel);
    for (const key of ['s', 'z', 'y', 'g', 'c', 'v', '1', 'Delete', 'ArrowRight']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, cancelable: true }));
    }
    window.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }));
    window.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(appShortcut).not.toHaveBeenCalled();
    expect(paste).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(apply).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    cleanup();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v' }));
    expect(appShortcut).toHaveBeenCalledOnce();
    window.removeEventListener('keydown', appShortcut);
    window.removeEventListener('paste', paste);
    window.removeEventListener('drop', drop);
  });
});
