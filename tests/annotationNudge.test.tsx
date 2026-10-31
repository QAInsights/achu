import React, { useEffect, useState } from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationNudge } from '../src/renderer/hooks/useAnnotationNudge';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { useHistory } from '../src/renderer/hooks/useHistory';
import ShortcutsHelpSection from '../src/renderer/components/ShortcutsHelpSection';
import type { Annotation } from '../src/renderer/canvasRenderer';

const original: Annotation = {
  id: 'one', type: 'rect', x: 0.25, y: 0.3, w: 0.2, h: 0.1,
  color: '#ff0000', strokeWidth: 4,
};
const other = { ...original, id: 'two', x: 0.6 };
const dimensions = { width: 800, height: 600 };

function canvas() {
  const viewport = document.createElement('div');
  viewport.className = 'canvas-viewport';
  viewport.tabIndex = 0;
  const container = document.createElement('div');
  container.tabIndex = -1;
  Object.defineProperties(container, { offsetWidth: { value: 800 }, offsetHeight: { value: 600 } });
  container.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, width: 1200, height: 900, right: 1200, bottom: 900, toJSON: () => ({}),
  });
  viewport.append(container);
  document.body.append(viewport);
  container.focus();
  return { container, viewport, containerRef: { current: container } };
}

function key(target: EventTarget, type: 'keydown' | 'keyup', name: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true, ...options });
  act(() => { target.dispatchEvent(event); });
  return event;
}

type Options = Pick<Parameters<typeof useAnnotationNudge>[0], 'enabled' | 'selectedId' | 'dimensions'>;

function setup(initial = [original, other], options: Partial<Options> = {}) {
  const fixture = canvas();
  const onSaveHistory = vi.fn<(annotations: Annotation[]) => void>();
  const hook = renderHook((props: Options) => {
    const [annotations, setAnnotations] = useState(initial);
    useAnnotationNudge({ ...props, annotations, setAnnotations, onSaveHistory, containerRef: fixture.containerRef });
    return { annotations, setAnnotations };
  }, { initialProps: { selectedId: original.id, enabled: true, dimensions, ...options } });
  return { ...fixture, ...hook, onSaveHistory };
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('annotation nudging', () => {
  it.each([
    ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1],
  ] as const)('moves only the selection by one canvas pixel with %s', (arrow, x, y) => {
    const { container, result, onSaveHistory } = setup();
    expect(key(container, 'keydown', arrow).defaultPrevented).toBe(true);
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + x / 800);
    expect(result.current.annotations[0].y).toBeCloseTo(original.y + y / 600);
    expect(result.current.annotations[1]).toBe(other);
    expect(onSaveHistory).not.toHaveBeenCalled();
    key(container, 'keyup', arrow);
    expect(onSaveHistory).toHaveBeenCalledExactlyOnceWith(result.current.annotations);
  });

  it('uses ten-pixel Shift steps without zoom or device-pixel scaling', () => {
    const { container, result } = setup();
    container.style.transform = 'scale(1.5)';
    key(container, 'keydown', 'ArrowRight', { shiftKey: true });
    key(container, 'keyup', 'ArrowRight', { shiftKey: true });
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 10 / 800);
  });

  it('accumulates rapid repeats and changing Shift speed into one Undo step', () => {
    const { container, result, onSaveHistory } = setup();
    act(() => {
      for (let i = 0; i < 20; i++) key(container, 'keydown', 'ArrowRight', { repeat: i > 0 });
    });
    key(container, 'keydown', 'Shift', { shiftKey: true });
    key(container, 'keydown', 'ArrowRight', { repeat: true, shiftKey: true });
    key(container, 'keyup', 'Shift');
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 30 / 800);
    expect(onSaveHistory).not.toHaveBeenCalled();
    key(window, 'keyup', 'ArrowRight');
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keyup', 'ArrowRight');
    expect(onSaveHistory).toHaveBeenCalledTimes(2);
  });

  it('waits for every held direction to be released and skips net-zero gestures', () => {
    const { container, result, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowLeft');
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keyup', 'ArrowLeft');
    expect(onSaveHistory).not.toHaveBeenCalled();
    key(container, 'keyup', 'ArrowRight');
    expect(result.current.annotations[0]).toEqual(original);
    expect(onSaveHistory).not.toHaveBeenCalled();
    key(container, 'keydown', 'ArrowUp');
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keyup', 'ArrowUp');
    expect(onSaveHistory).not.toHaveBeenCalled();
    key(container, 'keyup', 'ArrowRight');
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
  });

  it.each(['text', 'pen', 'arrow', 'emoji'] as const)('preserves %s geometry and styling', type => {
    const styled: Annotation = { ...original, type, w: -0.2, h: -0.1, rotation: 42,
      text: 'First\n\nLast', fontSize: 24, fontBold: true, gradientEnabled: true,
      textMinHeight: 0.04, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
    const { container, result } = setup([styled]);
    key(container, 'keydown', 'ArrowDown');
    key(container, 'keyup', 'ArrowDown');
    expect(result.current.annotations[0]).toEqual({ ...styled, y: styled.y + 1 / 600 });
    expect(styled.y).toBe(original.y);
  });

  it('allows precision movement past edges consistently with dragging', () => {
    const { container, result } = setup([{ ...original, x: 0, y: 1 }]);
    key(container, 'keydown', 'ArrowLeft');
    key(container, 'keyup', 'ArrowLeft');
    key(container, 'keydown', 'ArrowDown');
    key(container, 'keyup', 'ArrowDown');
    expect(result.current.annotations[0].x).toBe(-1 / 800);
    expect(result.current.annotations[0].y).toBe(1 + 1 / 600);
  });

  it.each([
    { selectedId: null }, { selectedId: 'missing' }, { enabled: false },
  ])('leaves native arrows untouched without an eligible selection: %j', options => {
    const { container, result, onSaveHistory } = setup(undefined, options);
    expect(key(container, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
    expect(result.current.annotations[0]).toBe(original);
    expect(onSaveHistory).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }])(
    'does not steal modified or composing arrows: %j', options => {
      const { container, result } = setup();
      expect(key(container, 'keydown', 'ArrowRight', options).defaultPrevented).toBe(false);
      expect(result.current.annotations[0]).toBe(original);
    },
  );

  it.each(['input', 'textarea', 'select', 'button', 'a', 'editable', 'slider', 'textbox', 'dialog', 'menu'])(
    'does not steal arrows from %s controls, including nested targets', kind => {
      const { container, result } = setup();
      const control = document.createElement(['editable', 'slider', 'textbox', 'dialog', 'menu'].includes(kind) ? 'div' : kind);
      if (kind === 'editable') control.setAttribute('contenteditable', 'true');
      if (['slider', 'textbox', 'dialog', 'menu'].includes(kind)) control.setAttribute('role', kind);
      if (kind === 'a') control.setAttribute('href', '#');
      const nested = document.createElement('span');
      control.append(nested);
      container.append(control);
      expect(key(nested, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
      expect(result.current.annotations[0]).toBe(original);
    },
  );

  it('requires canvas ownership of focus but also supports the tab-focusable viewport', () => {
    const { viewport, result } = setup();
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(key(outside, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
    expect(key(document.body, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
    viewport.focus();
    expect(key(viewport, 'keydown', 'ArrowRight').defaultPrevented).toBe(true);
    key(viewport, 'keyup', 'ArrowRight');
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 1 / 800);
  });

  it.each(['blur', 'focusout', 'pointerdown'] as const)('commits once when %s interrupts a held key', event => {
    const { container, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    act(() => { window.dispatchEvent(new Event(event)); });
    key(container, 'keyup', 'ArrowRight');
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
  });

  it('commits before a command key and before a pointer action reaches its handler', () => {
    const { container, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keydown', 'Delete');
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    key(container, 'keydown', 'ArrowRight');
    const handler = () => expect(onSaveHistory).toHaveBeenCalledTimes(2);
    container.addEventListener('pointerdown', handler);
    act(() => { container.dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    container.removeEventListener('pointerdown', handler);
  });

  it('does not overwrite an external Undo/reset with stale pending annotations', () => {
    const { container, result, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    act(() => result.current.setAnnotations([other]));
    key(container, 'keyup', 'ArrowRight');
    expect(result.current.annotations).toEqual([other]);
    expect(onSaveHistory).not.toHaveBeenCalled();
  });

  it('closes a gesture when selection changes and cleans up listeners on unmount', () => {
    const { container, rerender, unmount, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    rerender({ enabled: true, selectedId: other.id, dimensions });
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    key(container, 'keydown', 'ArrowRight');
    unmount();
    expect(onSaveHistory).toHaveBeenCalledTimes(2);
    expect(key(container, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
  });

  it('finishes a gesture when the tool or editing state disables nudging', () => {
    const { container, rerender, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    rerender({ selectedId: original.id, enabled: false, dimensions });
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    expect(key(container, 'keydown', 'ArrowRight').defaultPrevented).toBe(false);
    key(container, 'keyup', 'ArrowRight');
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
  });

  it('starts a new dimension-aware gesture after the canvas dimensions change', () => {
    const { container, result, rerender, onSaveHistory } = setup();
    key(container, 'keydown', 'ArrowRight');
    rerender({ selectedId: original.id, enabled: true, dimensions: { width: 1600, height: 300 } });
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    key(container, 'keyup', 'ArrowRight');
    key(container, 'keydown', 'ArrowRight', { shiftKey: true });
    key(container, 'keydown', 'ArrowDown', { shiftKey: true });
    key(container, 'keyup', 'ArrowRight');
    key(container, 'keyup', 'ArrowDown');
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 1 / 800 + 10 / 1600);
    expect(result.current.annotations[0].y).toBeCloseTo(original.y + 10 / 300);
    expect(onSaveHistory).toHaveBeenCalledTimes(2);
  });

  it('makes a pending held movement available to immediate Undo/Redo without losing the image', () => {
    const { container, containerRef } = canvas();
    const { result } = renderHook(() => {
      const [annotations, setAnnotations] = useState([original]);
      const history = useHistory(config => setAnnotations(config.annotations ?? []));
      useAnnotationNudge({ annotations, setAnnotations, selectedId: original.id, enabled: true, dimensions,
        containerRef, onSaveHistory: updated => history.pushHistory({ imageSrc: 'test-image', annotations: updated }) });
      useEffect(() => {
        const command = (e: KeyboardEvent) => {
          if (e.ctrlKey && e.key === 'z') history.handleUndo();
          if (e.ctrlKey && e.key === 'y') history.handleRedo();
        };
        window.addEventListener('keydown', command);
        return () => window.removeEventListener('keydown', command);
      }, [history.handleUndo, history.handleRedo]);
      return { annotations, history };
    });
    act(() => result.current.history.pushHistory({ imageSrc: 'test-image', annotations: [original] }));
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keydown', 'ArrowRight', { repeat: true });
    key(container, 'keydown', 'z', { ctrlKey: true });
    expect(result.current.annotations).toEqual([original]);
    expect(result.current.history.history).toHaveLength(2);
    key(container, 'keyup', 'ArrowRight');
    key(container, 'keydown', 'y', { ctrlKey: true });
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 2 / 800);
    expect(result.current.history.history[1].imageSrc).toBe('test-image');
  });

  it('focuses a clicked annotation without scrolling, then nudges using untransformed dimensions', () => {
    const { container, containerRef } = canvas();
    const focus = vi.spyOn(container, 'focus');
    const { result } = renderHook(() => {
      const [annotations, setAnnotations] = useState([original]);
      const events = useAnnotationEvents({ annotations, setAnnotations, activeTool: 'pointer', color: original.color,
        strokeWidth: 4, onSaveHistory: vi.fn(), customPrompt: vi.fn(), containerRef });
      return { ...events, annotations };
    });
    act(() => result.current.startDrag({ stopPropagation() {}, clientX: 100, clientY: 100, detail: 1, pointerId: 1 } as React.PointerEvent, original));
    act(() => { void result.current.handlePointerUp({ pointerId: 1 } as React.PointerEvent<HTMLDivElement>); });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(container);
    key(container, 'keydown', 'ArrowRight');
    key(container, 'keyup', 'ArrowRight');
    expect(result.current.annotations[0].x).toBeCloseTo(original.x + 1 / 800);
  });

  it('makes the new shortcut searchable in Settings', () => {
    render(<ShortcutsHelpSection searchQuery="nudge" />);
    expect(screen.getByText('Nudge Annotation')).toBeInTheDocument();
    expect(screen.getByText('Nudge Annotation').parentElement).toHaveTextContent('10px');
  });
});
