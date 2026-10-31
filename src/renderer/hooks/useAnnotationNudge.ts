import { useEffect, useLayoutEffect, useRef, RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { Annotation } from '../canvasRenderer';

interface NudgeProps {
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  selectedId: string | null;
  enabled: boolean;
  dimensions: { width: number; height: number };
  containerRef: RefObject<HTMLDivElement | null>;
  onSaveHistory: (annotations: Annotation[]) => void;
}

const DIRECTIONS = new Map<string, { x: number; y: number }>([
  ['ArrowLeft', { x: -1, y: 0 }],
  ['ArrowRight', { x: 1, y: 0 }],
  ['ArrowUp', { x: 0, y: -1 }],
  ['ArrowDown', { x: 0, y: 1 }],
]);

interface NudgeSession {
  id: string;
  keys: Set<string>;
  annotations: Annotation[];
  start: { x: number; y: number };
  offset: { x: number; y: number };
  dimensions: NudgeProps['dimensions'];
}

export function useAnnotationNudge(props: NudgeProps) {
  const latest = useRef(props);
  const pending = useRef<NudgeSession | null>(null);

  useLayoutEffect(() => {
    latest.current = props;
    const session = pending.current;
    if (!session) return;
    if (props.annotations !== session.annotations) {
      pending.current = null;
    } else if (!props.enabled || props.selectedId !== session.id ||
      props.dimensions.width !== session.dimensions.width || props.dimensions.height !== session.dimensions.height) {
      pending.current = null;
      if (session.offset.x || session.offset.y) props.onSaveHistory(session.annotations);
    }
  });

  useEffect(() => {
    const finish = (synchronous = false) => {
      const session = pending.current;
      pending.current = null;
      if (!session || (!session.offset.x && !session.offset.y)) return;
      const save = () => latest.current.onSaveHistory(session.annotations);
      // Commands such as Undo must see the finished gesture before their handlers run.
      if (synchronous) flushSync(save);
      else save();
    };

    const keyDown = (e: KeyboardEvent) => {
      const direction = DIRECTIONS.get(e.key);
      if (!direction) {
        if (e.key !== 'Shift') finish(true);
        return;
      }
      const { annotations, setAnnotations, selectedId, enabled, dimensions, containerRef } = latest.current;
      const target = e.target;
      const container = containerRef.current;
      if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey ||
        !enabled || !selectedId || !container || !(target instanceof Element) ||
        (target !== container && target !== container.closest('.canvas-viewport')) ||
        target.closest('dialog, [role="dialog"], [role="alertdialog"], [contenteditable]:not([contenteditable="false"]), [inert]')) {
        finish(true);
        return;
      }
      const source = pending.current?.annotations ?? annotations;
      const selected = source.find(ann => ann.id === selectedId);
      if (!selected) return;
      e.preventDefault();
      const session = pending.current ?? {
        id: selectedId, keys: new Set<string>(), annotations: source,
        start: { x: selected.x, y: selected.y }, offset: { x: 0, y: 0 }, dimensions,
      };
      const step = e.shiftKey ? 10 : 1;
      session.keys.add(e.key);
      session.offset.x += direction.x * step;
      session.offset.y += direction.y * step;
      session.annotations = source.map(ann => ann.id === selectedId ? {
        ...ann,
        x: session.start.x + session.offset.x / dimensions.width,
        y: session.start.y + session.offset.y / dimensions.height,
      } : ann);
      pending.current = session;
      setAnnotations(session.annotations);
    };
    const keyUp = (e: KeyboardEvent) => {
      if (!DIRECTIONS.has(e.key)) return;
      const session = pending.current;
      session?.keys.delete(e.key);
      if (session?.keys.size === 0) finish();
    };
    const interrupt = () => finish(true);
    const blur = () => finish();
    const visibility = () => { if (document.hidden) finish(); };

    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    window.addEventListener('pointerdown', interrupt, true);
    window.addEventListener('focusout', interrupt, true);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('pointerdown', interrupt, true);
      window.removeEventListener('focusout', interrupt, true);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      finish();
    };
  }, []);
}
