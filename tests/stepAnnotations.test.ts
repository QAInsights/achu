import { useState } from 'react';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { useHistory } from '../src/renderer/hooks/useHistory';
import { assignStepOrder, nextStepOrder, resizeStep, stepNumbers, stepTextColor } from '../src/renderer/utils/stepUtils';
import { clearAnnotationClipboard } from '../src/renderer/utils/annotationClipboardUtils';
import { bringToFront, sendToBack } from '../src/renderer/utils/layerOrderUtils';
import type { Annotation } from '../src/renderer/canvasRenderer';

const track = vi.hoisted(() => vi.fn());
vi.mock('../src/renderer/utils/telemetry', () => ({ trackFeature: track }));
const step = (key: number): Annotation => ({ id: `step-${key}`, type: 'step', stepOrder: key, x: .1 * key, y: .2, w: .05, h: .1, color: '#ff0000', strokeWidth: 4 });

function setup(initial: Annotation[] = [], tool: 'step' | 'pointer' = 'step', zoom = 1) {
  const container = document.createElement('div');
  container.tabIndex = -1;
  Object.defineProperties(container, { offsetWidth: { value: 800 }, offsetHeight: { value: 400 } });
  container.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 800 * zoom, height: 400 * zoom, right: 800 * zoom, bottom: 400 * zoom, toJSON: () => ({}) });
  document.body.append(container);
  container.focus();
  const onSave = vi.fn();
  const containerRef = { current: container };
  const hook = renderHook(() => {
    const [annotations, setAnnotations] = useState(initial);
    const [color, setColor] = useState('#00ff00');
    const history = useHistory(config => setAnnotations(config.annotations ?? []));
    const events = useAnnotationEvents({ annotations, setAnnotations, activeTool: tool,
      color, setAnnotationColor: setColor, annotationFontSize: 24, strokeWidth: 4,
      containerRef, customPrompt: vi.fn(),
      onSaveHistory: updated => { onSave(updated); history.pushHistory({ annotations: updated }); } });
    return { ...events, annotations, history, color };
  });
  act(() => hook.result.current.history.pushHistory({ annotations: initial }));
  const pointer = (x: number, y: number, extra = {}) => ({ clientX: x * zoom, clientY: y * zoom,
    target: container, currentTarget: container, button: 0, isPrimary: true, pointerId: 1, stopPropagation: vi.fn(), ...extra } as unknown as React.PointerEvent<HTMLDivElement>);
  return { ...hook, container, pointer, onSave };
}

beforeEach(() => { clearAnnotationClipboard(); track.mockClear(); });
afterEach(() => { cleanup(); document.body.replaceChildren(); });

describe('step numbering', () => {
  it('ranks creation keys, not z-order, and renumbers gaps', () => {
    const steps = [step(1), step(2), step(3), step(4)];
    expect([...stepNumbers(steps).values()]).toEqual([1, 2, 3, 4]);
    expect([...stepNumbers(steps.filter(a => a.stepOrder !== 2))]).toEqual([['step-1', 1], ['step-3', 2], ['step-4', 3]]);
    expect(stepNumbers(bringToFront(steps, 'step-1'))).toEqual(stepNumbers(steps));
    expect(stepNumbers(sendToBack(steps, 'step-4'))).toEqual(stepNumbers(steps));
    expect(nextStepOrder([])).toBe(1);
    expect(nextStepOrder([step(2), step(10)])).toBe(11);
    expect(assignStepOrder(step(2), [step(10)]).stepOrder).toBe(11);
    expect(stepNumbers([]).size).toBe(0);
  });
  it('chooses white or near-black from fill luminance', () => {
    expect(stepTextColor('#000')).toBe('#ffffff');
    expect(stepTextColor('#fff')).toBe('#111827');
    expect(stepTextColor('#ff0000')).toBe('#111827');
    expect(stepTextColor('invalid')).toBe('#ffffff');
  });
  it.each(['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'])('keeps %s resizing circular in non-square canvas pixels', handle => {
    const bounds = resizeStep(step(1), .12, .3, handle, { width: 800, height: 400 });
    expect(bounds.w * 800).toBeCloseTo(bounds.h * 400);
    const min = resizeStep(step(1), -1, -1, handle, { width: 800, height: 400 });
    expect(min.w * 800).toBe(16);
    expect(min.h * 400).toBe(16);
  });
});

describe('step placement and editing', () => {
  it('places centered circles on primary clicks at zoom, without dragging, and one snapshot each', () => {
    const { result, pointer, onSave } = setup([], 'step', 1.5);
    for (let i = 1; i <= 3; i++) {
      act(() => result.current.handlePointerDown(pointer(100 * i, 150)));
      act(() => { void result.current.handlePointerUp(pointer(100 * i, 150)); });
    }
    expect(result.current.annotations).toHaveLength(3);
    expect(result.current.annotations.map(a => a.stepOrder)).toEqual([1, 2, 3]);
    result.current.annotations.forEach((a, index) => {
      expect((a.x + a.w / 2) * 800).toBeCloseTo((index + 1) * 100);
      expect((a.y + a.h / 2) * 400).toBeCloseTo(150);
      expect(a.w * 800).toBeCloseTo(a.h * 400);
      expect(a.color).toBe('#00ff00');
    });
    expect(onSave).toHaveBeenCalledTimes(3);
    expect(track).toHaveBeenCalledTimes(3);
    expect(track).toHaveBeenLastCalledWith('annot_step');
    expect(result.current.drawingAnnotation).toBeNull();
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toHaveLength(2);
    act(() => result.current.history.handleRedo());
    expect([...stepNumbers(result.current.annotations).values()]).toEqual([1, 2, 3]);
  });
  it('ignores secondary buttons and non-primary pointers for placement, drag and resize', () => {
    const placement = setup();
    for (const extra of [{ button: 2 }, { button: 1 }, { isPrimary: false }]) {
      act(() => placement.result.current.handlePointerDown(placement.pointer(100, 100, extra)));
    }
    expect(placement.result.current.annotations).toHaveLength(0);
    expect(placement.onSave).not.toHaveBeenCalled();
    placement.unmount();
    const editing = setup([step(1)], 'pointer');
    for (const extra of [{ button: 2 }, { isPrimary: false }]) {
      act(() => editing.result.current.startDrag(editing.pointer(100, 100, extra), step(1)));
      act(() => editing.result.current.startResize(editing.pointer(100, 100, extra), step(1), 'br'));
      act(() => editing.result.current.handlePointerMove(editing.pointer(200, 200, extra)));
    }
    expect(editing.result.current.annotations).toEqual([step(1)]);
    expect(editing.onSave).not.toHaveBeenCalled();
  });
  it('delete renumbers and undo restores labels and original keys', () => {
    const { result, container, onSave } = setup([step(1), step(2), step(3), step(4)], 'pointer');
    act(() => result.current.setSelectedId('step-2'));
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.annotations[1].color).toBe('#ff0000');
    fireEvent.keyDown(container, { key: 'Delete' });
    expect([...stepNumbers(result.current.annotations)]).toEqual([['step-1', 1], ['step-3', 2], ['step-4', 3]]);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations.map(a => a.stepOrder)).toEqual([1, 2, 3, 4]);
  });
  it('duplicate and paste append new creation keys even after reordering', () => {
    const { result, container } = setup([step(3), step(1)], 'pointer');
    act(() => result.current.setSelectedId('step-1'));
    fireEvent.keyDown(container, { key: 'd', ctrlKey: true });
    expect(result.current.annotations[2].stepOrder).toBe(4);
    expect(stepNumbers(result.current.annotations).get(result.current.annotations[2].id)).toBe(3);
    act(() => result.current.copyAnnotation('step-1'));
    act(() => result.current.pasteAnnotation());
    act(() => result.current.pasteAnnotation());
    expect(result.current.annotations.map(a => a.stepOrder)).toEqual([3, 1, 4, 5, 6]);
    expect(new Set(result.current.annotations.map(a => a.id)).size).toBe(5);
  });
  it('uses circular resize handles and keeps nudge behavior', () => {
    const { result, pointer, container } = setup([step(1)], 'pointer');
    act(() => result.current.startResize(pointer(120, 100), step(1), 'br'));
    act(() => result.current.handlePointerMove(pointer(200, 200)));
    act(() => { void result.current.handlePointerUp(pointer(200, 200)); });
    const resized = result.current.annotations[0];
    expect(resized.w * 800).toBeCloseTo(resized.h * 400);
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    fireEvent.keyUp(container, { key: 'ArrowRight' });
    expect(result.current.annotations[0].x).toBeCloseTo(resized.x + 1 / 800);
  });
});
