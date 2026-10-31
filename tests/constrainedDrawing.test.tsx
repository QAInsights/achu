import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { constrainDrawingDimensions } from '../src/renderer/utils/drawingUtils';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { useHistory } from '../src/renderer/hooks/useHistory';
import ShortcutsHelpSection from '../src/renderer/components/ShortcutsHelpSection';
import { getKeywordsForTab } from '../src/renderer/utils/settingsRegistry';
import type { Annotation } from '../src/renderer/canvasRenderer';

const dimensions = { width: 800, height: 400 };
const shapes = ['rect', 'filled-rect', 'circle', 'filled-circle'] as const;

afterEach(() => { cleanup(); document.body.replaceChildren(); });

describe('constrained drawing geometry', () => {
  it.each(shapes)('uses equal canvas pixels for %s in every drag quadrant', type => {
    for (const w of [-0.2, 0.2]) for (const h of [-0.1, 0.1]) {
      const result = constrainDrawingDimensions(type, w, h, dimensions)!;
      expect(Math.abs(result.w * 800)).toBeCloseTo(Math.abs(result.h * 400));
      expect(Math.sign(result.w)).toBe(Math.sign(w));
      expect(Math.sign(result.h)).toBe(Math.sign(h));
    }
  });

  it.each(['line', 'arrow'] as const)('snaps %s to all eight directions in pixel space', type => {
    for (let angle = -180; angle <= 180; angle += 45) {
      const radians = (angle + 5) * Math.PI / 180;
      const result = constrainDrawingDimensions(type, Math.cos(radians) * 0.2, Math.sin(radians) * 0.4, dimensions)!;
      const snapped = Math.atan2(result.h * 400, result.w * 800) * 180 / Math.PI;
      expect(Math.abs(snapped / 45 - Math.round(snapped / 45))).toBeLessThan(1e-10);
      expect(Math.hypot(result.w * 800, result.h * 400)).toBeCloseTo(160);
    }
  });

  it.each(['text', 'pen', 'emoji', 'image'] as const)('does not constrain %s', type => {
    expect(constrainDrawingDimensions(type, 0.2, 0.1, dimensions)).toBeNull();
  });

  it('handles zero deltas and invalid canvas dimensions without NaN', () => {
    expect(constrainDrawingDimensions('line', 0, 0, dimensions)).toEqual({ w: 0, h: 0 });
    expect(constrainDrawingDimensions('rect', 0, -0.1, dimensions)).toEqual({ w: 0.05, h: -0.1 });
    expect(constrainDrawingDimensions('rect', 0.2, 0.1, { width: 0, height: 400 })).toBeNull();
    expect(constrainDrawingDimensions('line', NaN, 0.1, dimensions)).toBeNull();
  });
});

function setup(type: Exclude<Annotation['type'], 'image'>, zoom = 1) {
  const container = document.createElement('div');
  Object.defineProperties(container, { offsetWidth: { value: 800 }, offsetHeight: { value: 400 } });
  container.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0,
    width: 800 * zoom, height: 400 * zoom, right: 800 * zoom, bottom: 400 * zoom, toJSON: () => ({}) });
  document.body.append(container);
  const containerRef = { current: container };
  const onSaveHistory = vi.fn();
  const hook = renderHook(() => {
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const history = useHistory(config => setAnnotations(config.annotations ?? []));
    const events = useAnnotationEvents({ annotations, setAnnotations, activeTool: type,
      color: '#ff0000', strokeWidth: 4, arrowStyle: 'classic', customPrompt: vi.fn(), containerRef,
      onSaveHistory: updated => { onSaveHistory(updated); history.pushHistory({ annotations: updated }); } });
    return { ...events, annotations, history };
  });
  act(() => hook.result.current.history.pushHistory({ annotations: [] }));
  const pointer = (x: number, y: number, shiftKey = false) => ({
    clientX: x * zoom, clientY: y * zoom, shiftKey, pointerId: 1,
    target: container, currentTarget: container,
  } as unknown as React.PointerEvent<HTMLDivElement>);
  return { ...hook, onSaveHistory, pointer };
}

describe('constrained drawing interactions', () => {
  it.each([...shapes, 'line', 'arrow'] as const)('commits a constrained %s with one Undo/Redo step', type => {
    const { result, pointer, onSaveHistory } = setup(type, 1.5);
    act(() => result.current.handlePointerDown(pointer(350, 260)));
    act(() => result.current.handlePointerMove(pointer(150, 160, true)));
    const preview = result.current.drawingAnnotation!;
    if (type === 'line' || type === 'arrow') {
      const angle = Math.atan2(preview.h * 400, preview.w * 800) * 180 / Math.PI;
      expect(angle / 45).toBeCloseTo(Math.round(angle / 45));
    } else {
      expect(Math.abs(preview.w * 800)).toBeCloseTo(Math.abs(preview.h * 400));
    }
    expect(result.current.activeGuides).toEqual([]);
    expect(onSaveHistory).not.toHaveBeenCalled();
    act(() => { void result.current.handlePointerUp(pointer(150, 160, true)); });
    expect(onSaveHistory).toHaveBeenCalledOnce();
    expect(result.current.annotations[0]).toMatchObject({ color: '#ff0000', strokeWidth: 4, rotation: 0 });
    if (type === 'line' || type === 'arrow') {
      expect(result.current.annotations[0]).toEqual(preview);
    } else {
      expect(result.current.annotations[0].x).toBeCloseTo(0.1875);
      expect(result.current.annotations[0].y).toBeCloseTo(0.15);
      expect(result.current.annotations[0]).toMatchObject({ w: 0.25, h: 0.5 });
    }
    const saved = result.current.annotations;
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([]);
    act(() => result.current.history.handleRedo());
    expect(result.current.annotations).toEqual(saved);
  });

  it('toggles constraints without moving the pointer and restores ordinary snapping', () => {
    const { result, pointer } = setup('rect');
    act(() => result.current.handlePointerDown(pointer(80, 40)));
    act(() => result.current.handlePointerMove(pointer(280, 140)));
    const unconstrained = result.current.drawingAnnotation;
    fireEvent.keyDown(window, { key: 'Shift' });
    expect(result.current.drawingAnnotation!.w).toBeCloseTo(0.25);
    expect(result.current.drawingAnnotation!.h).toBeCloseTo(0.5);
    fireEvent.keyUp(window, { key: 'Shift' });
    expect(result.current.drawingAnnotation).toEqual(unconstrained);
  });

  it('gives Shift priority over nearby alignment targets', () => {
    const { result, pointer } = setup('rect');
    act(() => result.current.handlePointerDown(pointer(80, 40)));
    act(() => result.current.handlePointerMove(pointer(398, 140)));
    expect(result.current.activeGuides.length).toBeGreaterThan(0);
    act(() => result.current.handlePointerMove(pointer(398, 140, true)));
    expect(result.current.activeGuides).toEqual([]);
    expect(result.current.drawingAnnotation!.w * 800).toBeCloseTo(result.current.drawingAnnotation!.h * 400);
  });

  it.each(['text', 'pen', 'emoji'] as const)('leaves %s drawing unchanged by Shift', type => {
    const { result, pointer } = setup(type);
    act(() => result.current.handlePointerDown(pointer(80, 40)));
    act(() => result.current.handlePointerMove(pointer(280, 140, true)));
    const preview = result.current.drawingAnnotation;
    fireEvent.keyUp(window, { key: 'Shift' });
    expect(result.current.drawingAnnotation).toEqual(preview);
    if (type !== 'pen') {
      expect(preview!.w).toBeCloseTo(0.25);
      expect(preview!.h).toBeCloseTo(0.25);
    }
  });

  it('registers and displays constraint help in Settings search', () => {
    expect(getKeywordsForTab('shortcuts')).toContain('constrain');
    render(<ShortcutsHelpSection searchQuery="constrain" />);
    expect(screen.getByText('Constrain Drawing').parentElement).toHaveTextContent('Shift');
  });
});
