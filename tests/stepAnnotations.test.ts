import { useRef, useState } from 'react';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { useHistory } from '../src/renderer/hooks/useHistory';
import { assignStepOrder, nextStepOrder, resizeStep, stepNumbers, stepTextColor, stepTextBaseline } from '../src/renderer/utils/stepUtils';
import { clearAnnotationClipboard } from '../src/renderer/utils/annotationClipboardUtils';
import { bringToFront, sendToBack } from '../src/renderer/utils/layerOrderUtils';
import type { Annotation } from '../src/renderer/canvasRenderer';

const track = vi.hoisted(() => vi.fn());
vi.mock('../src/renderer/utils/telemetry', () => ({ trackFeature: track }));
const step = (key: number): Annotation => ({ id: `step-${key}`, type: 'step', stepOrder: key, x: .1 * key, y: .2, w: .05, h: .1, color: '#ff0000', strokeWidth: 4 });

function setup(initial: Annotation[] = [], tool: 'step' | 'pointer' | 'text' | 'arrow' = 'step', zoom = 1) {
  const container = document.createElement('div');
  container.tabIndex = -1;
  Object.defineProperties(container, { offsetWidth: { value: 800 }, offsetHeight: { value: 400 } });
  container.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 800 * zoom, height: 400 * zoom, right: 800 * zoom, bottom: 400 * zoom, toJSON: () => ({}) });
  document.body.append(container);
  container.focus();
  const onSave = vi.fn();
  const containerRef = { current: container };
  const hook = renderHook(() => {
    const [activeTool, setActiveTool] = useState(tool);
    const [annotations, setAnnotations] = useState(initial);
    const [color, setColor] = useState('#00ff00');
    const [stepSize, setStepSize] = useState(40);
    const [stepSelected, setStepSelected] = useState(false);
    const stepSizeActionRef = useRef<((size: number) => void) | null>(null);
    const applyConfig = (config: { annotations?: Annotation[]; annotationStepSize?: number }) => {
      setAnnotations(config.annotations ?? []);
      setStepSize(config.annotationStepSize ?? 40);
    };
    const history = useHistory(applyConfig);
    const events = useAnnotationEvents({ annotations, setAnnotations, activeTool,
      color, setAnnotationColor: setColor, annotationFontSize: 24, strokeWidth: 4,
      annotationStepSize: stepSize, setAnnotationStepSize: setStepSize,
      stepSizeActionRef,
      setStepSelected,
      containerRef, customPrompt: vi.fn(),
      onSaveHistory: updated => { onSave(updated); history.pushHistory({ annotations: updated, annotationStepSize: stepSize }); } });
    const clickSize = (diameter: number) => {
      setStepSize(diameter);
      stepSizeActionRef.current?.(diameter);
    };
    return { ...events, annotations, history, color, setColor, stepSize, setStepSize, clickSize, applyConfig, stepSelected, setActiveTool };
  });
  act(() => hook.result.current.history.pushHistory({ annotations: initial, annotationStepSize: 40 }));
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
    expect(stepTextColor('#ff0000')).toBe('#ffffff');
    expect(stepTextColor('invalid')).toBe('#ffffff');
  });
  it.each([
    ['#f43f5e', '#ffffff'], ['#F43F5EFF', '#ffffff'], ['#f00', '#ffffff'], ['#f008', '#ffffff'],
    ['rgb(244, 63, 94)', '#ffffff'], ['rgba(244, 63, 94, 0.7)', '#ffffff'],
    ['rgb(100% 0% 0%)', '#ffffff'], ['hsl(350, 89%, 60%)', '#ffffff'], ['red', '#ffffff'],
    ['rebeccapurple', '#ffffff'], ['#ff0', '#111827'], ['#ffff00ff', '#111827'],
    ['rgb(255 255 0 / 80%)', '#111827'], ['hsla(60, 100%, 50%, .6)', '#111827'],
    ['yellow', '#111827'], ['white', '#111827'], ['lightgreen', '#111827'],
    ['#a3e635', '#111827'], ['#2563eb', '#ffffff'], ['', '#ffffff'],
  ])('resolves %s consistently with a white-biased lightness threshold', (fill, expected) => {
    expect(stepTextColor(fill)).toBe(expected);
  });
  it('centers the ink bounds and has a fallback for missing canvas metrics', () => {
    expect(stepTextBaseline({ actualBoundingBoxAscent: 15, actualBoundingBoxDescent: 3 } as TextMetrics, 24)).toBe(6);
    expect(stepTextBaseline({} as TextMetrics, 20)).toBe(7);
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
  it.each(['text', 'arrow'] as const)('preserves a selected Step when switching to %s', tool => {
    const original = step(1);
    const { result, pointer } = setup([original], 'pointer');
    act(() => result.current.startDrag(pointer(100, 100), original));
    act(() => result.current.setActiveTool(tool));
    expect(result.current.selectedId).toBe(original.id);
    expect(result.current.stepSelected).toBe(true);
  });
  it('reads a selected badge size without applying the toolbar default', () => {
    const original = { ...step(1), w: .07, h: .14 };
    const { result, onSave } = setup([original], 'pointer');
    act(() => result.current.setSelectedId(original.id));
    expect(result.current.stepSize).toBe(56);
    expect(result.current.stepSelected).toBe(true);
    expect(result.current.annotations).toEqual([original]);
    expect(onSave).not.toHaveBeenCalled();
  });
  it('applies size controls to new badges and selected steps without changing their center or pushing defaults on selection', () => {
    const { result, onSave } = setup([step(1)], 'pointer');
    act(() => result.current.setSelectedId('step-1'));
    expect(onSave).not.toHaveBeenCalled();
    const before = result.current.annotations[0];
    act(() => result.current.clickSize(56));
    const after = result.current.annotations[0];
    expect(after.w * 800).toBeCloseTo(56);
    expect(after.h * 400).toBeCloseTo(56);
    expect(after.x + after.w / 2).toBeCloseTo(before.x + before.w / 2);
    expect(after.y + after.h / 2).toBeCloseTo(before.y + before.h / 2);
    expect(onSave).toHaveBeenCalledTimes(1);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([step(1)]);
  });
  it('places badges at the chosen size', () => {
    const { result, pointer } = setup();
    act(() => result.current.setStepSize(56));
    act(() => result.current.handlePointerDown(pointer(200, 200)));
    expect(result.current.annotations[0].w * 800).toBeCloseTo(56);
  });
  it('does not resize or write history when restoring size config, including color undo/redo with a selected 56px step', () => {
    const original = { ...step(1), w: .07, h: .14 };
    const { result, onSave } = setup([original], 'pointer');
    act(() => result.current.setSelectedId(original.id));
    expect(result.current.stepSize).toBe(56);
    expect(onSave).not.toHaveBeenCalled();
    act(() => result.current.setColor('#ffff00'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.history.historyIndex).toBe(1);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([original]);
    expect(result.current.history.historyIndex).toBe(0);
    expect(result.current.history.history).toHaveLength(2);
    expect(onSave).toHaveBeenCalledTimes(1);
    act(() => result.current.history.handleRedo());
    expect(result.current.annotations[0]).toEqual({ ...original, color: '#ffff00' });
    expect(result.current.history.historyIndex).toBe(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    act(() => result.current.applyConfig({ annotations: [original], annotationStepSize: 32 }));
    expect(result.current.annotations).toEqual([original]);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
  it('syncs manual resize diameters without extra history and accepts explicit size clicks even when the value matches', () => {
    const { result, pointer, onSave } = setup([step(1)], 'pointer');
    act(() => result.current.setSelectedId('step-1'));
    act(() => result.current.clickSize(40));
    expect(onSave).toHaveBeenCalledTimes(1);
    onSave.mockClear();
    act(() => result.current.startResize(pointer(120, 120), result.current.annotations[0], 'br'));
    act(() => result.current.handlePointerMove(pointer(128, 128)));
    expect(result.current.stepSize).toBe(48);
    expect(onSave).not.toHaveBeenCalled();
    act(() => { void result.current.handlePointerUp(pointer(128, 128)); });
    expect(onSave).toHaveBeenCalledTimes(1);
    act(() => result.current.clickSize(40));
    expect(result.current.annotations[0].w * 800).toBeCloseTo(40);
    expect(result.current.stepSize).toBe(40);
    expect(onSave).toHaveBeenCalledTimes(2);
    act(() => result.current.history.handleUndo());
    expect(result.current.stepSize).toBe(48);
    expect(result.current.annotations[0].w * 800).toBeCloseTo(48);
    expect(onSave).toHaveBeenCalledTimes(2);
  });
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
