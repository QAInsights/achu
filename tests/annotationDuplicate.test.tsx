import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { useHistory } from '../src/renderer/hooks/useHistory';
import ShortcutsHelpSection from '../src/renderer/components/ShortcutsHelpSection';
import { getKeywordsForTab } from '../src/renderer/utils/settingsRegistry';
import { clearAnnotationClipboard, getAnnotationClipboard, setAnnotationClipboard } from '../src/renderer/utils/annotationClipboardUtils';
import type { Annotation } from '../src/renderer/canvasRenderer';

const original: Annotation = { id: 'original', type: 'text', x: 0.2, y: 0.3, w: -0.2, h: 0.1,
  rotation: 35, text: 'First\n\nLast', fontFamily: 'sans-serif', fontSize: 24, fontBold: false,
  gradientEnabled: true, textMinHeight: 0.08, strokeWidth: 4, color: '#ff0000', points: [{ x: 0.2, y: 0.5 }] };

function setup(source = original) {
  const viewport = document.createElement('div');
  viewport.className = 'canvas-viewport';
  const container = document.createElement('div');
  container.tabIndex = -1;
  viewport.append(container);
  document.body.append(viewport);
  container.focus();
  const containerRef = { current: container };
  const onSaveHistory = vi.fn();
  const hook = renderHook(({ activeTool }: { activeTool: 'pointer' | 'rect' }) => {
    const [annotations, setAnnotations] = useState([source]);
    const history = useHistory(config => setAnnotations(config.annotations ?? []));
    const events = useAnnotationEvents({ annotations, setAnnotations, activeTool, color: source.color,
      strokeWidth: 4, containerRef, customPrompt: vi.fn(),
      onSaveHistory: updated => { onSaveHistory(updated); history.pushHistory({ imageSrc: 'image', annotations: updated }); } });
    return { ...events, annotations, history };
  }, { initialProps: { activeTool: 'pointer' } });
  act(() => {
    hook.result.current.setSelectedId(source.id);
    hook.result.current.history.pushHistory({ imageSrc: 'image', annotations: [source] });
  });
  return { ...hook, container, onSaveHistory };
}

beforeEach(() => clearAnnotationClipboard());
afterEach(() => { cleanup(); document.body.replaceChildren(); });

describe('quick duplicate', () => {
  it('registers duplicate for Settings tab search and displays the shortcut', () => {
    expect(getKeywordsForTab('shortcuts')).toContain('duplicate');
    render(<ShortcutsHelpSection searchQuery="duplicate" />);
    expect(screen.getByText('Duplicate Annotation').parentElement).toHaveTextContent('D');
    expect(screen.queryByText('Copy Annotation')).not.toBeInTheDocument();
  });
  it.each([{ ctrlKey: true }, { metaKey: true }])('duplicates on the platform modifier: %j', modifier => {
    const { container, result, onSaveHistory } = setup();
    setAnnotationClipboard({ ...original, id: 'clipboard' });
    const clipboard = getAnnotationClipboard();
    fireEvent.keyDown(container, { key: 'd', ...modifier });
    const copy = result.current.annotations[1];
    expect(copy).toEqual({ ...original, id: expect.any(String), x: 0.22, y: 0.32 });
    expect(copy.id).not.toBe(original.id);
    expect(copy.points).not.toBe(original.points);
    expect(copy.points?.[0]).not.toBe(original.points?.[0]);
    expect(result.current.selectedId).toBe(copy.id);
    expect(result.current.annotations[0]).toBe(original);
    expect(getAnnotationClipboard()).toBe(clipboard);
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([original]);
    act(() => result.current.history.handleRedo());
    expect(result.current.annotations[1]).toEqual(copy);
    expect(result.current.history.history[1].imageSrc).toBe('image');
  });

  it('cascades distinct duplicates but ignores held-key repeats', () => {
    const { container, result, onSaveHistory } = setup();
    fireEvent.keyDown(container, { key: 'D', ctrlKey: true });
    fireEvent.keyDown(container, { key: 'd', ctrlKey: true, repeat: true });
    expect(result.current.annotations).toHaveLength(2);
    fireEvent.keyDown(container, { key: 'd', ctrlKey: true });
    expect(result.current.annotations).toHaveLength(3);
    expect(result.current.annotations[2].x).toBeCloseTo(0.24);
    expect(new Set(result.current.annotations.map(ann => ann.id)).size).toBe(3);
    expect(onSaveHistory).toHaveBeenCalledTimes(2);
  });

  it('preserves relative placement for oversized, inverted and off-canvas annotations', () => {
    const source = { ...original, x: -0.1, y: 0.99, w: -1.4, h: 1.5 };
    const { container, result } = setup(source);
    fireEvent.keyDown(container, { key: 'd', ctrlKey: true });
    expect(result.current.annotations[1]).toMatchObject({ x: -0.08, y: 1.01, w: -1.4, h: 1.5 });
  });

  it.each([{ x: 0.98, y: 0.98, w: 0.01, h: 0.01 }, { x: 0.99, y: 0.99, w: -0.2, h: -0.1 }])('keeps an on-canvas duplicate inside the edges (%j)', bounds => {
    const { container, result } = setup({ ...original, ...bounds });
    for (let i = 0; i < 3; i++) fireEvent.keyDown(container, { key: 'd', ctrlKey: true });
    for (const copy of result.current.annotations) {
      expect(Math.min(copy.x, copy.x + copy.w)).toBeGreaterThanOrEqual(0);
      expect(Math.max(copy.x, copy.x + copy.w)).toBeLessThanOrEqual(1);
      expect(Math.min(copy.y, copy.y + copy.h)).toBeGreaterThanOrEqual(0);
      expect(Math.max(copy.y, copy.y + copy.h)).toBeLessThanOrEqual(1);
    }
  });

  it.each(['input', 'textarea', 'button', 'select', 'editable', 'outside'])('leaves %s shortcuts untouched', kind => {
    const { container, result } = setup();
    const target = document.createElement(['editable', 'outside'].includes(kind) ? 'div' : kind);
    if (kind === 'editable') target.setAttribute('contenteditable', 'true');
    (kind === 'outside' ? document.body : container).append(target);
    expect(fireEvent.keyDown(target, { key: 'd', ctrlKey: true })).toBe(true);
    expect(result.current.annotations).toHaveLength(1);
  });

  it.each([{ shiftKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }])('does not intercept other modifiers or IME: %j', options => {
    const { container, result } = setup();
    expect(fireEvent.keyDown(container, { key: 'd', ctrlKey: true, ...options })).toBe(true);
    expect(result.current.annotations).toHaveLength(1);
  });

  it('requires a valid pointer-mode selection and no active text edit', () => {
    const { container, result, rerender } = setup();
    act(() => result.current.setEditingTextId(original.id));
    expect(fireEvent.keyDown(container, { key: 'd', ctrlKey: true })).toBe(true);
    act(() => result.current.setEditingTextId(null));
    rerender({ activeTool: 'rect' });
    expect(fireEvent.keyDown(container, { key: 'd', ctrlKey: true })).toBe(true);
    rerender({ activeTool: 'pointer' });
    act(() => result.current.setSelectedId('missing'));
    expect(fireEvent.keyDown(container, { key: 'd', ctrlKey: true })).toBe(true);
    expect(result.current.annotations).toHaveLength(1);
  });

  it('finishes a pending nudge before duplicating and keeps separate Undo steps', () => {
    const { container, result } = setup();
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    const nudged = result.current.annotations[0];
    fireEvent.keyDown(container, { key: 'd', ctrlKey: true });
    expect(result.current.annotations[1].x).toBeCloseTo(nudged.x + 0.02);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([nudged]);
    act(() => result.current.history.handleUndo());
    expect(result.current.annotations).toEqual([original]);
  });
});
