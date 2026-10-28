import React, { useRef, useEffect, useId } from 'react';
import { Annotation } from '../../canvasRenderer';
import { getAnnotationTextLayout } from '../../utils/annotationUtils';
import { getModKeyLabel } from '../../utils/shortcutLabels';

interface TextEditorProps {
  ann: Annotation;
  dimensions: { width: number; height: number };
  editingTextValue: string;
  setEditingTextValue: (val: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function TextEditor({
  ann,
  dimensions,
  editingTextValue,
  setEditingTextValue,
  onBlur,
  onKeyDown,
}: TextEditorProps) {
  const x1 = ann.x * dimensions.width;
  const y1 = ann.y * dimensions.height;
  const w = ann.w * dimensions.width;
  const h = ann.h * dimensions.height;

  const rectW = Math.abs(w);
  const rectH = Math.abs(h);
  const fontSize = ann.fontSize || Math.max(12, rectH * 0.7);
  const { editorHeight, lineHeight } = getAnnotationTextLayout(editingTextValue, fontSize);
  const hintId = useId();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: `${x1}px`,
        top: `${y1}px`,
        width: `${rectW}px`,
        height: `${Math.max(rectH, editorHeight)}px`,
        outline: `2px dashed ${ann.color}`,
        borderRadius: '4px',
        transform: `rotate(${ann.rotation || 0}deg)`,
        transformOrigin: 'center center',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <textarea
        ref={textareaRef}
        aria-label="Annotation text"
        aria-describedby={hintId}
        wrap="off"
        value={editingTextValue}
        onChange={(e) => setEditingTextValue(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        style={{
          width: '100%',
          height: `${editorHeight}px`,
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          color: ann.color,
          fontFamily: ann.fontFamily || 'var(--font-sans)',
          fontSize: `${fontSize}px`,
          lineHeight: `${lineHeight}px`,
          whiteSpace: 'pre',
          fontWeight: ann.fontBold !== false ? 'bold' : 'normal',
          fontStyle: ann.fontItalic ? 'italic' : 'normal',
          textAlign: 'center',
          resize: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          overflow: 'auto',
          boxSizing: 'border-box',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      />
      <span
        id={hintId}
        style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          color: 'var(--text-secondary)',
          background: 'var(--surface-1)',
          padding: '3px 6px',
          borderRadius: '4px',
          pointerEvents: 'none',
        }}
      >
        Enter: new line · {getModKeyLabel()}+Enter: save
      </span>
    </div>
  );
}
