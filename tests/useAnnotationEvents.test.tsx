import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnnotationEvents } from '../src/renderer/hooks/useAnnotationEvents';
import { Annotation } from '../src/renderer/canvasRenderer';

describe('useAnnotationEvents', () => {
  let containerRef: any;
  let setAnnotations: ReturnType<typeof vi.fn>;
  let onSaveHistory: ReturnType<typeof vi.fn>;
  let customPrompt: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    containerRef = { current: null };
    setAnnotations = vi.fn((val: any) => {
      if (typeof val === 'function') return val([]);
      return val;
    });
    onSaveHistory = vi.fn();
    customPrompt = vi.fn().mockResolvedValue('😀');
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    expect(result.current.dimensions).toEqual({ width: 1, height: 1 });
    expect(result.current.drawingAnnotation).toBeNull();
    expect(result.current.selectedId).toBeNull();
    expect(result.current.editingTextId).toBeNull();
    expect(result.current.editingTextValue).toBe('');
    expect(result.current.penPoints).toEqual([]);
  });

  it('handles pointer down for rect tool', () => {
    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'rect',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    // set containerRef so pointer down works
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    act(() => {
      result.current.handlePointerDown({
        clientX: 100,
        clientY: 150,
        pointerId: 1,
        target: { tagName: 'DIV' },
        currentTarget: { tagName: 'DIV' },
      } as any);
    });

    expect(result.current.drawingAnnotation).not.toBeNull();
    expect(result.current.drawingAnnotation?.type).toBe('rect');
    expect(result.current.drawingAnnotation?.color).toBe('#ff0000');
  });

  it('handles pointer down for arrow tool with arrowStyle', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'arrow',
        color: '#0000ff',
        strokeWidth: 2,
        arrowStyle: 'tapered',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.handlePointerDown({
        clientX: 200,
        clientY: 300,
        pointerId: 1,
        target: { tagName: 'DIV' },
        currentTarget: { tagName: 'DIV' },
      } as any);
    });

    expect(result.current.drawingAnnotation?.type).toBe('arrow');
    expect(result.current.drawingAnnotation?.arrowStyle).toBe('tapered');
  });

  it('handles pointer down for pen tool with points', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'pen',
        color: '#00ff00',
        strokeWidth: 3,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.handlePointerDown({
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        target: { tagName: 'DIV' },
        currentTarget: { tagName: 'DIV' },
      } as any);
    });

    expect(result.current.drawingAnnotation?.type).toBe('pen');
  });

  it('deselects when clicking background with pointer tool', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.setSelectedId('test-id');
    });

    const e = {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      target: mockDiv,
      currentTarget: mockDiv,
    };

    act(() => {
      result.current.handlePointerDown(e as any);
    });

    expect(result.current.selectedId).toBeNull();
  });

  it('handles pointer move for shape drawing', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: [],
        setAnnotations,
        activeTool: 'rect',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    // Create drawingAnnotation first
    act(() => {
      result.current.handlePointerDown({
        clientX: 100,
        clientY: 100,
        pointerId: 1,
        target: { tagName: 'DIV' },
        currentTarget: { tagName: 'DIV' },
      } as any);
    });

    act(() => {
      result.current.handlePointerMove({
        clientX: 200,
        clientY: 250,
      } as any);
    });

    expect(result.current.drawingAnnotation).toBeDefined();
  });

  it('deletes annotation on Delete key', () => {
    const annotations: Annotation[] = [{
      id: 'ann-1', type: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.15,
      color: '#ff0000', strokeWidth: 4,
    }];

    let currentAnnotations = annotations;
    const wrappedSetAnnotations = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        currentAnnotations = updater(currentAnnotations);
        return currentAnnotations;
      }
      currentAnnotations = updater;
      return updater;
    });

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations: currentAnnotations,
        setAnnotations: wrappedSetAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.setSelectedId('ann-1');
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    });

    expect(onSaveHistory).toHaveBeenCalled();
    expect(result.current.selectedId).toBeNull();
  });

  it('calls deleteAnnotation and removes annotation', () => {
    const annotations: Annotation[] = [{
      id: 'ann-1', type: 'rect', x: 0.1, y: 0.1, w: 0.2, h: 0.15,
      color: '#ff0000', strokeWidth: 4,
    }];

    let currentAnnotations = [...annotations];
    const wrappedSetAnnotations = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        currentAnnotations = updater(currentAnnotations);
        return currentAnnotations;
      }
      currentAnnotations = updater;
      return updater;
    });

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations,
        setAnnotations: wrappedSetAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.setSelectedId('ann-1');
    });

    act(() => {
      result.current.deleteAnnotation({ stopPropagation: vi.fn() } as any, 'ann-1');
    });

    expect(result.current.selectedId).toBeNull();
    expect(onSaveHistory).toHaveBeenCalled();
    expect(currentAnnotations).toEqual([]);
  });

  it('starts drag on annotation', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const annotations: Annotation[] = [{
      id: 'ann-1', type: 'rect', x: 0.2, y: 0.2, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4,
    }];

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations,
        setAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.startDrag(
        { stopPropagation: vi.fn(), clientX: 200, clientY: 150, pointerId: 1, detail: 1 } as any,
        annotations[0]
      );
    });

    expect(result.current.selectedId).toBe('ann-1');
  });

  it('starts resize on annotation handle', () => {
    const mockDiv = document.createElement('div');
    mockDiv.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} });
    containerRef.current = mockDiv;

    const annotations: Annotation[] = [{
      id: 'ann-1', type: 'rect', x: 0.2, y: 0.2, w: 0.3, h: 0.2,
      color: '#ff0000', strokeWidth: 4,
    }];

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations,
        setAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.startResize(
        { stopPropagation: vi.fn(), clientX: 400, clientY: 300, pointerId: 1 } as any,
        annotations[0],
        'br'
      );
    });

    expect(result.current.selectedId).toBe('ann-1');
  });

  it('handles double click on text annotation', () => {
    const annotations: Annotation[] = [{
      id: 'ann-1', type: 'text', x: 0.2, y: 0.2, w: 0.3, h: 0.1,
      color: '#ffffff', strokeWidth: 4, text: 'Hello',
    }];

    const { result } = renderHook(() =>
      useAnnotationEvents({
        annotations,
        setAnnotations,
        activeTool: 'pointer',
        color: '#ff0000',
        strokeWidth: 4,
        arrowStyle: 'classic',
        onSaveHistory,
        customPrompt,
        containerRef,
      })
    );

    act(() => {
      result.current.handleDoubleClick(
        { stopPropagation: vi.fn() } as any,
        annotations[0]
      );
    });

    expect(result.current.editingTextId).toBe('ann-1');
    expect(result.current.editingTextValue).toBe('Hello');
  });
});
