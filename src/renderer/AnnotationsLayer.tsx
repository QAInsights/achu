import React, { useRef } from 'react';
import { Annotation } from './canvasRenderer';
import { useAppContext } from './AppContext';
import { useAnnotationEvents } from './hooks/useAnnotationEvents';
import AnnotationShape from './components/annotations/AnnotationShape';
import SelectionBox from './components/annotations/SelectionBox';
import TextEditor from './components/annotations/TextEditor';
import SnapGuides from './components/annotations/SnapGuides';
import { transformCoordinates, getDeleteButtonPosition } from './utils/layoutUtils';

interface AnnotationsLayerProps {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  activeTool: 'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji';
  setActiveTool: (tool: 'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji') => void;
  color: string;
  setAnnotationColor: (color: string) => void;
  strokeWidth: number;
  onSaveHistory: (newAnns?: Annotation[]) => void;
  customPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

export default function AnnotationsLayer({
  annotations,
  setAnnotations,
  activeTool,
  color,
  setAnnotationColor,
  strokeWidth,
  onSaveHistory,
  customPrompt,
}: AnnotationsLayerProps) {
  const {
    arrowStyle,
    annotationFont,
    setAnnotationFont,
    annotationFontSize,
    setAnnotationFontSize,
    annotationBold,
    setAnnotationBold,
    annotationItalic,
    setAnnotationItalic,
    previewFont,
  } = useAppContext();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    dimensions,
    drawingAnnotation,
    selectedId,
    activeGuides,
    editingTextId,
    setEditingTextId,
    editingTextValue,
    setEditingTextValue,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    startDrag,
    startResize,
    handleDoubleClick,
    deleteAnnotation,
  } = useAnnotationEvents({
    annotations,
    setAnnotations,
    activeTool,
    color,
    setAnnotationColor,
    strokeWidth,
    arrowStyle,
    annotationFont,
    setAnnotationFont,
    annotationFontSize,
    setAnnotationFontSize,
    annotationBold,
    setAnnotationBold,
    annotationItalic,
    setAnnotationItalic,
    onSaveHistory,
    customPrompt,
    containerRef,
  });

  const allAnnotations = [...annotations];
  if (drawingAnnotation) {
    allAnnotations.push(drawingAnnotation);
  }

  return (
    <div
      ref={containerRef}
      className="annotations-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 10,
        cursor: activeTool === 'pointer' ? 'default' : 'crosshair',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <svg
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: activeTool === 'pointer' ? 'auto' : 'none',
        }}
      >
        {allAnnotations.map((ann) => {
          const isSelected = ann.id === selectedId && activeTool === 'pointer';
          const strokeW = ann.strokeWidth;
          
          const { x1, y1, w, h, rectW, rectH } = transformCoordinates(ann, dimensions);

          const cx = x1 + w / 2;
          const cy = y1 + h / 2;
          const pointerEvents = activeTool === 'pointer' ? 'auto' : 'none';

          return (
            <g key={ann.id}>
              <g
                transform={`translate(${cx}, ${cy}) rotate(${ann.rotation || 0})`}
                style={{ pointerEvents, cursor: activeTool === 'pointer' ? 'move' : 'crosshair' }}
                onPointerDown={(e) => startDrag(e, ann)}
                onDoubleClick={(e) => handleDoubleClick(e, ann)}
              >
                {(ann.type === 'line' || ann.type === 'arrow' || ann.type === 'pen') && (
                  <g style={{ opacity: 0 }}>
                    {ann.type === 'line' && (
                      <line
                        x1={-w / 2}
                        y1={-h / 2}
                        x2={w / 2}
                        y2={h / 2}
                        stroke="black"
                        strokeWidth={strokeW * 3}
                      />
                    )}
                    {ann.type === 'arrow' && (
                      <line
                        x1={-w / 2}
                        y1={-h / 2}
                        x2={w / 2}
                        y2={h / 2}
                        stroke="black"
                        strokeWidth={strokeW * 3}
                      />
                    )}
                    {ann.type === 'pen' && (
                      <AnnotationShape
                        ann={ann}
                        dimensions={dimensions}
                        rectW={rectW}
                        rectH={rectH}
                        w={w}
                        h={h}
                        strokeW={strokeW}
                        editingTextId={editingTextId}
                        previewFont={ann.id === selectedId ? previewFont : null}
                      />
                    )}
                  </g>
                )}

                <AnnotationShape
                  ann={ann}
                  dimensions={dimensions}
                  rectW={rectW}
                  rectH={rectH}
                  w={w}
                  h={h}
                  strokeW={strokeW}
                  editingTextId={editingTextId}
                  previewFont={ann.id === selectedId ? previewFont : null}
                />

                {isSelected && (
                  <SelectionBox
                    ann={ann}
                    rectW={rectW}
                    rectH={rectH}
                    startResize={startResize}
                  />
                )}
              </g>
            </g>
          );
        })}

        <SnapGuides
          guides={activeGuides}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      </svg>

      {selectedId && activeTool === 'pointer' && (() => {
        const ann = annotations.find(a => a.id === selectedId);
        if (!ann) return null;
        
        const { percentX, percentY } = getDeleteButtonPosition(ann);

        return (
          <div
            style={{
              position: 'absolute',
              left: `${percentX}%`,
              top: `calc(${percentY}% + 20px)`,
              transform: 'translateX(-50%)',
              zIndex: 100,
            }}
          >
            <button
              onClick={(e) => deleteAnnotation(e, ann.id)}
              style={{
                backgroundColor: 'var(--color-danger)',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              Delete
            </button>
          </div>
        );
      })()}

      {editingTextId && (() => {
        const ann = annotations.find(a => a.id === editingTextId);
        if (!ann) return null;

        const handleBlur = () => {
          const trimmed = editingTextValue.trim();
          let updated = annotations;
          if (!trimmed) {
            updated = annotations.filter(a => a.id !== ann.id);
          } else {
            updated = annotations.map(a => (a.id === ann.id ? { ...a, text: trimmed } : a));
          }
          setAnnotations(updated);
          setEditingTextId(null);
          setEditingTextValue('');
          onSaveHistory(updated);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const trimmed = editingTextValue.trim();
            let updated = annotations;
            if (!trimmed) {
              updated = annotations.filter(a => a.id !== ann.id);
            } else {
              updated = annotations.map(a => (a.id === ann.id ? { ...a, text: trimmed } : a));
            }
            setAnnotations(updated);
            setEditingTextId(null);
            setEditingTextValue('');
            onSaveHistory(updated);
          } else if (e.key === 'Escape') {
            if (!ann.text) {
              const updated = annotations.filter(a => a.id !== ann.id);
              setAnnotations(updated);
              onSaveHistory(updated);
            }
            setEditingTextId(null);
            setEditingTextValue('');
          }
        };

        return (
          <TextEditor
            ann={ann}
            dimensions={dimensions}
            editingTextValue={editingTextValue}
            setEditingTextValue={setEditingTextValue}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
        );
      })()}
    </div>
  );
}
