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
        onSaveHistory={vi.fn()}
        customPrompt={vi.fn().mockResolvedValue(null)}
      />
    );
  }

  const rendered = render(<Harness />);
  const layer = rendered.container.querySelector('.annotations-layer') as HTMLDivElement;
  layer.getBoundingClientRect = () => ({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0,
    toJSON: () => ({}),
  });
  return { ...rendered, layer };
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
    fireEvent.keyDown(editor, { key: 'Enter', shiftKey: false });

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
    fireEvent.keyDown(editor, { key: 'Enter', shiftKey: false });

    expect(mockTrackFeature).not.toHaveBeenCalled();
  });
});
