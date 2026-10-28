import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnnotationsLayer from '../src/renderer/AnnotationsLayer';
import type { Annotation } from '../src/renderer/canvasRenderer';

const mockTrackFeature = vi.hoisted(() => vi.fn());
const mockContext = vi.hoisted(() => ({ value: {} as any }));

vi.mock('../src/renderer/utils/telemetry', () => ({
  trackFeature: mockTrackFeature,
}));

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext.value,
}));

const contextDefaults = {
  arrowStyle: 'classic',
  annotationFont: 'sans-serif',
  setAnnotationFont: vi.fn(),
  annotationFontSize: 24,
  setAnnotationFontSize: vi.fn(),
  annotationBold: true,
  setAnnotationBold: vi.fn(),
  annotationItalic: false,
  setAnnotationItalic: vi.fn(),
  annotationOutlineEnabled: false,
  setAnnotationOutlineEnabled: vi.fn(),
  annotationOutlineColor: '#000000',
  setAnnotationOutlineColor: vi.fn(),
  annotationOutlineWidth: 3,
  setAnnotationOutlineWidth: vi.fn(),
  annotationGradientEnabled: false,
  setAnnotationGradientEnabled: vi.fn(),
  annotationGradientColor1: '#ff0080',
  setAnnotationGradientColor1: vi.fn(),
  annotationGradientColor2: '#7928ca',
  setAnnotationGradientColor2: vi.fn(),
  annotationGradientAngle: 135,
  setAnnotationGradientAngle: vi.fn(),
  previewFont: null,
};

function renderLayer(initialAnnotations: Annotation[] = [], activeTool: 'pointer' | 'text' = 'text') {
  const onSaveHistory = vi.fn();
  function Harness() {
    const [annotations, setAnnotations] = useState(initialAnnotations);
    return (
      <AnnotationsLayer
        annotations={annotations}
        setAnnotations={setAnnotations}
        activeTool={activeTool}
        setActiveTool={vi.fn()}
        color="#ff0000"
        setAnnotationColor={vi.fn()}
        strokeWidth={4}
        onSaveHistory={onSaveHistory}
        customPrompt={vi.fn().mockResolvedValue(null)}
      />
    );
  }

  const rendered = render(<Harness />);
  const layer = rendered.container.querySelector('.annotations-layer') as HTMLDivElement;
  Object.defineProperties(layer, { offsetWidth: { value: 800 }, offsetHeight: { value: 600 } });
  layer.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON: () => ({}),
  });
  return { ...rendered, layer, onSaveHistory };
}

function createTextAnnotation(text?: string): Annotation {
  return {
    id: 'existing-text',
    type: 'text',
    x: 0.2,
    y: 0.2,
    w: 0.3,
    h: 0.1,
    color: '#ff0000',
    strokeWidth: 4,
    text,
  };
}

function beginTextAnnotation(layer: HTMLDivElement) {
  fireEvent.pointerDown(layer, { clientX: 100, clientY: 100, pointerId: 1 });
  fireEvent.pointerUp(layer, { clientX: 100, clientY: 100, pointerId: 1 });
  return screen.getByRole('textbox');
}

beforeEach(() => {
  mockTrackFeature.mockClear();
  mockContext.value = contextDefaults;
});

describe('AnnotationsLayer text telemetry', () => {
  it('records a new text annotation once when committed with text', () => {
    const { layer } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: '  Caption  ' } });
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true });

    expect(mockTrackFeature).toHaveBeenCalledTimes(1);
    expect(mockTrackFeature).toHaveBeenCalledWith('annot_text');
  });

  it('records a new text annotation on blur when committed with text', () => {
    const { layer } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: 'Caption' } });
    fireEvent.blur(editor);

    expect(mockTrackFeature).toHaveBeenCalledTimes(1);
    expect(mockTrackFeature).toHaveBeenCalledWith('annot_text');
  });

  it('does not record a blank placeholder removed on blur', () => {
    const { layer } = renderLayer();
    fireEvent.blur(beginTextAnnotation(layer));

    expect(mockTrackFeature).not.toHaveBeenCalled();
  });

  it('does not record a blank placeholder cancelled with Escape', () => {
    const { layer } = renderLayer();
    fireEvent.keyDown(beginTextAnnotation(layer), { key: 'Escape' });

    expect(mockTrackFeature).not.toHaveBeenCalled();
  });

  it('does not record edits to existing text annotations', () => {
    renderLayer([createTextAnnotation('Existing caption')], 'pointer');
    fireEvent.doubleClick(screen.getByText('Existing caption'));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'Updated caption' } });
    fireEvent.keyDown(editor, { key: 'Enter', metaKey: true });

    expect(mockTrackFeature).not.toHaveBeenCalled();
  });
});

describe('AnnotationsLayer multiline editing', () => {
  it.each([{}, { shiftKey: true }])('leaves Enter available for newlines (%j)', modifiers => {
    const { layer, onSaveHistory } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: 'First' } });
    expect(fireEvent.keyDown(editor, { key: 'Enter', ...modifiers })).toBe(true);
    expect(screen.getByRole('textbox')).toHaveValue('First');
    expect(onSaveHistory).not.toHaveBeenCalled();
    expect(mockTrackFeature).not.toHaveBeenCalled();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])('commits multiline text once with the primary modifier (%j)', modifiers => {
    const { layer, onSaveHistory, container } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: 'First\n\nLast' } });
    fireEvent.keyDown(editor, { key: 'Enter', ...modifiers });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(onSaveHistory).toHaveBeenCalledTimes(1);
    const [annotation] = onSaveHistory.mock.calls[0][0] as Annotation[];
    expect(annotation.text).toBe('First\n\nLast');
    expect(annotation.h * 600).toBeGreaterThanOrEqual(24 * 1.2 * 3);
    expect(container.querySelectorAll('tspan')).toHaveLength(3);
    expect(mockTrackFeature).toHaveBeenCalledTimes(1);
  });

  it('preserves intentional leading/trailing blank lines and indentation on blur', () => {
    const { layer, onSaveHistory } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: '\n  First\nSecond\n' } });
    fireEvent.blur(editor);
    expect(onSaveHistory).toHaveBeenLastCalledWith([expect.objectContaining({ text: '\n  First\nSecond\n' })]);
  });

  it('reopens existing multiline text and cancels changes without saving them', () => {
    const { onSaveHistory } = renderLayer([createTextAnnotation('First\nSecond')], 'pointer');
    fireEvent.doubleClick(screen.getByText('First'));
    expect(screen.getByRole('textbox')).toHaveValue('First\nSecond');
    onSaveHistory.mockClear();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Changed\nCaption' } });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(onSaveHistory).not.toHaveBeenCalled();
  });

  it.each([{ isComposing: true }, { keyCode: 229 }])('does not commit during IME composition (%j)', composition => {
    const { layer, onSaveHistory } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: 'Caption' } });
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true, ...composition });
    expect(screen.getByRole('textbox')).toHaveValue('Caption');
    expect(onSaveHistory).not.toHaveBeenCalled();
  });

  it('removes whitespace-only multiline text rather than storing a blank annotation', () => {
    const { layer, onSaveHistory } = renderLayer();
    const editor = beginTextAnnotation(layer);
    fireEvent.change(editor, { target: { value: ' \n \n ' } });
    fireEvent.blur(editor);
    expect(onSaveHistory).toHaveBeenLastCalledWith([]);
    expect(mockTrackFeature).not.toHaveBeenCalled();
  });
});
