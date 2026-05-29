import React, { useState, useEffect, useRef } from 'react';
import { Annotation } from './canvasRenderer';

interface AnnotationsLayerProps {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  activeTool: 'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji';
  setActiveTool: (tool: 'pointer' | 'rect' | 'filled-rect' | 'circle' | 'filled-circle' | 'line' | 'arrow' | 'text' | 'pen' | 'emoji') => void;
  color: string;
  strokeWidth: number;
  onSaveHistory: () => void;
  customPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

// Coordinate rotation helper: Rotates a point (x, y) around (cx, cy) by angleDeg
function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number) {
  const rad = (-angleDeg * Math.PI) / 180; // Negative for reverse rotation
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export default function AnnotationsLayer({
  annotations,
  setAnnotations,
  activeTool,
  color,
  strokeWidth,
  onSaveHistory,
  customPrompt,
}: AnnotationsLayerProps) {
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [drawingAnnotation, setDrawingAnnotation] = useState<Annotation | null>(null);
  const [penPoints, setPenPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Interaction states
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; annX: number; annY: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    mouseX: number;
    mouseY: number;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // ResizeObserver to track container boundaries (prevents stretch distortions)
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width: width || 1, height: height || 1 });
      }
    });
    observer.observe(containerRef.current);
    
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width || 1, height: rect.height || 1 });
    
    return () => observer.disconnect();
  }, []);

  // Handle Delete keypress to remove selected annotation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        setAnnotations(prev => prev.filter(ann => ann.id !== selectedId));
        setSelectedId(null);
        onSaveHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, setAnnotations, onSaveHistory]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / dimensions.width;
    const mouseY = (e.clientY - rect.top) / dimensions.height;

    if (activeTool === 'pointer') {
      if (e.target === e.currentTarget) {
        setSelectedId(null);
      }
      return;
    }

    if (activeTool === 'pen') {
      setPenPoints([{ x: mouseX, y: mouseY }]);
      const newAnn: Annotation = {
        id: `ann-${Date.now()}`,
        type: 'pen',
        x: mouseX,
        y: mouseY,
        w: 0,
        h: 0,
        color,
        strokeWidth,
        points: [{ x: 0, y: 0 }],
      };
      setDrawingAnnotation(newAnn);
    } else {
      const newAnn: Annotation = {
        id: `ann-${Date.now()}`,
        type: activeTool,
        x: mouseX,
        y: mouseY,
        w: 0,
        h: 0,
        color,
        strokeWidth,
        rotation: 0,
      };
      setDrawingAnnotation(newAnn);
    }
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / dimensions.width;
    const mouseY = (e.clientY - rect.top) / dimensions.height;

    // Handle freehand pen drawing
    if (drawingAnnotation && activeTool === 'pen') {
      const newPoints = [...penPoints, { x: mouseX, y: mouseY }];
      setPenPoints(newPoints);
      
      const startX = drawingAnnotation.x;
      const startY = drawingAnnotation.y;
      
      setDrawingAnnotation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          points: newPoints.map(p => ({ x: p.x - startX, y: p.y - startY })),
        };
      });
      return;
    }

    // Handle standard shape drawing
    if (drawingAnnotation) {
      setDrawingAnnotation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          w: mouseX - prev.x,
          h: mouseY - prev.y,
        };
      });
      return;
    }

    // Handle dragging/moving of selected object
    if (dragStart && selectedId && !resizeHandle) {
      const deltaX = mouseX - dragStart.mouseX;
      const deltaY = mouseY - dragStart.mouseY;
      setAnnotations(prev =>
        prev.map(ann => {
          if (ann.id === selectedId) {
            return {
              ...ann,
              x: dragStart.annX + deltaX,
              y: dragStart.annY + deltaY,
            };
          }
          return ann;
        })
      );
      return;
    }

    // Handle rotation and resizing
    if (resizeStart && selectedId && resizeHandle) {
      const ann = annotations.find(a => a.id === selectedId);
      if (!ann) return;

      const cx = resizeStart.x + resizeStart.w / 2;
      const cy = resizeStart.y + resizeStart.h / 2;

      if (resizeHandle === 'rot') {
        const rad = Math.atan2(mouseY - cy, mouseX - cx);
        let deg = rad * (180 / Math.PI) + 90;
        if (deg < 0) deg += 360;
        
        setAnnotations(prev =>
          prev.map(a => (a.id === selectedId ? { ...a, rotation: Math.round(deg) } : a))
        );
        return;
      }

      // Dragging a resize handle: project coordinates in unrotated space
      const unrotated = rotatePoint(mouseX, mouseY, cx, cy, resizeStart.rotation);

      setAnnotations(prev =>
        prev.map(a => {
          if (a.id !== selectedId) return a;
          let { x, y, w, h } = resizeStart;

          if (resizeHandle.includes('r')) {
            w = unrotated.x - x;
          }
          if (resizeHandle.includes('l')) {
            const right = x + w;
            x = unrotated.x;
            w = right - x;
          }
          if (resizeHandle.includes('b')) {
            h = unrotated.y - y;
          }
          if (resizeHandle.includes('t')) {
            const bottom = y + h;
            y = unrotated.y;
            h = bottom - y;
          }

          return {
            ...a,
            x,
            y,
            w,
            h,
          };
        })
      );
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (drawingAnnotation) {
      containerRef.current?.releasePointerCapture(e.pointerId);
      
      if (activeTool === 'pen' && penPoints.length > 1) {
        const xs = penPoints.map(p => p.x);
        const ys = penPoints.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = Math.max(0.001, maxX - minX);
        const h = Math.max(0.001, maxY - minY);
        
        const finalPoints = penPoints.map(p => ({
          x: (p.x - minX) / w,
          y: (p.y - minY) / h,
        }));

        const finalAnn: Annotation = {
          ...drawingAnnotation,
          x: minX,
          y: minY,
          w,
          h,
          points: finalPoints,
        };
        setAnnotations(prev => [...prev, finalAnn]);
        onSaveHistory();
      } else if (activeTool === 'text') {
        const textVal = await customPrompt('Enter annotation text:');
        if (textVal && textVal.trim()) {
          const w = 0.16;
          const h = 0.04;
          const finalAnn: Annotation = {
            ...drawingAnnotation,
            text: textVal.trim(),
            x: drawingAnnotation.x - w / 2,
            y: drawingAnnotation.y - h / 2,
            w,
            h,
          };
          setAnnotations(prev => [...prev, finalAnn]);
          onSaveHistory();
        }
      } else if (activeTool === 'emoji') {
        const emojiVal = await customPrompt('Enter an emoji (e.g. 😊, 👍, 🔥, ❌):', '😊');
        if (emojiVal && emojiVal.trim()) {
          const w = 0.06;
          const h = 0.06;
          const finalAnn: Annotation = {
            ...drawingAnnotation,
            text: emojiVal.trim(),
            x: drawingAnnotation.x - w / 2,
            y: drawingAnnotation.y - h / 2,
            w,
            h,
          };
          setAnnotations(prev => [...prev, finalAnn]);
          onSaveHistory();
        }
      } else {
        const width = Math.abs(drawingAnnotation.w);
        const height = Math.abs(drawingAnnotation.h);
        if (width > 0.005 || height > 0.005) {
          let finalAnn = { ...drawingAnnotation };
          if (!activeTool.includes('line') && !activeTool.includes('arrow')) {
            finalAnn = {
              ...drawingAnnotation,
              x: drawingAnnotation.w < 0 ? drawingAnnotation.x + drawingAnnotation.w : drawingAnnotation.x,
              y: drawingAnnotation.h < 0 ? drawingAnnotation.y + drawingAnnotation.h : drawingAnnotation.y,
              w: Math.abs(drawingAnnotation.w),
              h: Math.abs(drawingAnnotation.h),
            };
          }
          setAnnotations(prev => [...prev, finalAnn]);
          onSaveHistory();
        }
      }
      setDrawingAnnotation(null);
      setPenPoints([]);
    }

    if (dragStart) {
      containerRef.current?.releasePointerCapture(e.pointerId);
      setDragStart(null);
      onSaveHistory();
    }

    if (resizeStart) {
      containerRef.current?.releasePointerCapture(e.pointerId);
      setResizeStart(null);
      setResizeHandle(null);
      onSaveHistory();
    }
  };

  const startDrag = (e: React.PointerEvent, ann: Annotation) => {
    if (activeTool !== 'pointer') return;
    e.stopPropagation();
    setSelectedId(ann.id);
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / dimensions.width;
    const mouseY = (e.clientY - rect.top) / dimensions.height;

    setDragStart({
      mouseX,
      mouseY,
      annX: ann.x,
      annY: ann.y,
    });
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const startResize = (e: React.PointerEvent, ann: Annotation, handle: string) => {
    e.stopPropagation();
    setSelectedId(ann.id);
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / dimensions.width;
    const mouseY = (e.clientY - rect.top) / dimensions.height;

    setResizeHandle(handle);
    setResizeStart({
      mouseX,
      mouseY,
      x: ann.x,
      y: ann.y,
      w: ann.w,
      h: ann.h,
      rotation: ann.rotation || 0,
    });
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handleDoubleClick = async (e: React.MouseEvent, ann: Annotation) => {
    if (activeTool !== 'pointer') return;
    e.stopPropagation();
    
    if (ann.type === 'text') {
      const val = await customPrompt('Edit text:', ann.text);
      if (val !== null) {
        setAnnotations(prev =>
          prev.map(a => (a.id === ann.id ? { ...a, text: val.trim() } : a))
        );
        onSaveHistory();
      }
    } else if (ann.type === 'emoji') {
      const val = await customPrompt('Edit emoji:', ann.text);
      if (val !== null) {
        setAnnotations(prev =>
          prev.map(a => (a.id === ann.id ? { ...a, text: val.trim() } : a))
        );
        onSaveHistory();
      }
    }
  };

  const deleteAnnotation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    if (selectedId === id) setSelectedId(null);
    onSaveHistory();
  };

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
          pointerEvents: 'none',
        }}
      >
        {allAnnotations.map((ann) => {
          const isSelected = ann.id === selectedId && activeTool === 'pointer';
          const strokeW = ann.strokeWidth;
          
          const x1 = ann.x * dimensions.width;
          const y1 = ann.y * dimensions.height;
          const w = ann.w * dimensions.width;
          const h = ann.h * dimensions.height;

          const rectW = Math.abs(w);
          const rectH = Math.abs(h);

          const cx = x1 + w / 2;
          const cy = y1 + h / 2;

          const pointerEvents = activeTool === 'pointer' ? 'auto' : 'none';

          let shapeElement: React.ReactNode = null;

          if (ann.type === 'rect') {
            shapeElement = (
              <rect
                x={-rectW / 2}
                y={-rectH / 2}
                width={rectW}
                height={rectH}
                stroke={ann.color}
                strokeWidth={strokeW}
                fill="none"
              />
            );
          } else if (ann.type === 'filled-rect') {
            shapeElement = (
              <rect
                x={-rectW / 2}
                y={-rectH / 2}
                width={rectW}
                height={rectH}
                rx={Math.min(8, rectW * 0.1, rectH * 0.1)}
                ry={Math.min(8, rectW * 0.1, rectH * 0.1)}
                fill={ann.color}
              />
            );
          } else if (ann.type === 'circle') {
            shapeElement = (
              <ellipse
                cx={0}
                cy={0}
                rx={rectW / 2}
                ry={rectH / 2}
                stroke={ann.color}
                strokeWidth={strokeW}
                fill="none"
              />
            );
          } else if (ann.type === 'filled-circle') {
            shapeElement = (
              <ellipse
                cx={0}
                cy={0}
                rx={rectW / 2}
                ry={rectH / 2}
                fill={ann.color}
              />
            );
          } else if (ann.type === 'line') {
            shapeElement = (
              <line
                x1={-w / 2}
                y1={-h / 2}
                x2={w / 2}
                y2={h / 2}
                stroke={ann.color}
                strokeWidth={strokeW}
              />
            );
          } else if (ann.type === 'arrow') {
            const angle = Math.atan2(h, w);
            const headLen = Math.max(12, strokeW * 3);
            const endX = w / 2;
            const endY = h / 2;
            const arrow1X = endX - headLen * Math.cos(angle - Math.PI / 6);
            const arrow1Y = endY - headLen * Math.sin(angle - Math.PI / 6);
            const arrow2X = endX - headLen * Math.cos(angle + Math.PI / 6);
            const arrow2Y = endY - headLen * Math.sin(angle + Math.PI / 6);

            shapeElement = (
              <g>
                <line
                  x1={-w / 2}
                  y1={-h / 2}
                  x2={endX - (headLen * 0.5) * Math.cos(angle)}
                  y2={endY - (headLen * 0.5) * Math.sin(angle)}
                  stroke={ann.color}
                  strokeWidth={strokeW}
                />
                <polygon
                  points={`${endX},${endY} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
                  fill={ann.color}
                />
              </g>
            );
          } else if (ann.type === 'text' && ann.text) {
            shapeElement = (
              <text
                x={0}
                y={0}
                fill={ann.color}
                fontSize={`${Math.max(12, 14 + strokeW)}px`}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  paintOrder: 'stroke',
                  stroke: '#0f172a',
                  strokeWidth: '4px',
                  strokeLinejoin: 'round',
                }}
              >
                {ann.text}
              </text>
            );
          } else if (ann.type === 'emoji' && ann.text) {
            shapeElement = (
              <text
                x={0}
                y={0}
                fill="black"
                fontSize={`${Math.min(rectW, rectH)}px`}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif'
                }}
              >
                {ann.text}
              </text>
            );
          } else if (ann.type === 'pen' && ann.points) {
            const pathData = ann.points.length > 0
              ? `M ${-w / 2 + ann.points[0].x * w} ${-h / 2 + ann.points[0].y * h} ` +
                ann.points.slice(1).map(p => `L ${-w / 2 + p.x * w} ${-h / 2 + p.y * h}`).join(' ')
              : '';
            shapeElement = (
              <path
                d={pathData}
                stroke={ann.color}
                strokeWidth={strokeW}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          }

          return (
            <g key={ann.id}>
              {/* Rotatable shape group */}
              <g
                transform={`translate(${cx}, ${cy}) rotate(${ann.rotation || 0})`}
                style={{ pointerEvents, cursor: activeTool === 'pointer' ? 'move' : 'crosshair' }}
                onPointerDown={(e) => startDrag(e, ann)}
                onDoubleClick={(e) => handleDoubleClick(e, ann)}
              >
                {/* Wider invisible duplicate element to make thin lines easier to select */}
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
                    {ann.type === 'pen' && shapeElement}
                  </g>
                )}

                {shapeElement}

                {/* Draw selection frame inside the rotated group */}
                {isSelected && (
                  <>
                    <rect
                      x={-rectW / 2 - 8}
                      y={-rectH / 2 - 8}
                      width={rectW + 16}
                      height={rectH + 16}
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      fill="none"
                    />

                    {/* Resize handles */}
                    {/* Top-Left */}
                    <rect
                      x={-rectW / 2 - 14}
                      y={-rectH / 2 - 14}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'nwse-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'tl')}
                    />
                    {/* Top-Center */}
                    <rect
                      x={-6}
                      y={-rectH / 2 - 14}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'ns-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'tc')}
                    />
                    {/* Top-Right */}
                    <rect
                      x={rectW / 2 + 2}
                      y={-rectH / 2 - 14}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'nesw-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'tr')}
                    />
                    {/* Middle-Left */}
                    <rect
                      x={-rectW / 2 - 14}
                      y={-6}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'ew-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'ml')}
                    />
                    {/* Middle-Right */}
                    <rect
                      x={rectW / 2 + 2}
                      y={-6}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'ew-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'mr')}
                    />
                    {/* Bottom-Left */}
                    <rect
                      x={-rectW / 2 - 14}
                      y={rectH / 2 + 2}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'nesw-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'bl')}
                    />
                    {/* Bottom-Center */}
                    <rect
                      x={-6}
                      y={rectH / 2 + 2}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'ns-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'bc')}
                    />
                    {/* Bottom-Right */}
                    <rect
                      x={rectW / 2 + 2}
                      y={rectH / 2 + 2}
                      width="12"
                      height="12"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'nwse-resize' }}
                      onPointerDown={(e) => startResize(e, ann, 'br')}
                    />

                    {/* Rotation stem & handle */}
                    <line
                      x1={0}
                      y1={-rectH / 2 - 14}
                      x2={0}
                      y2={-rectH / 2 - 40}
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                    />
                    <circle
                      cx={0}
                      cy={-rectH / 2 - 46}
                      r="7"
                      fill="white"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => startResize(e, ann, 'rot')}
                    />
                  </>
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {/* Floating delete button under the selected shape */}
      {selectedId && activeTool === 'pointer' && (() => {
        const ann = annotations.find(a => a.id === selectedId);
        if (!ann) return null;
        
        const percentX = (ann.x + ann.w / 2) * 100;
        const percentY = (ann.y + ann.h) * 100;

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
    </div>
  );
}
