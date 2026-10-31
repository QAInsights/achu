import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BringToFront,
  ArrowUp,
  ArrowDown,
  SendToBack,
  Scissors,
  Copy,
  ClipboardPaste,
  RotateCcw,
} from 'lucide-react';
import { getModKeyLabel } from '../utils/shortcutLabels';
import './GrabTextModal.css';

export type LayerOrderAction =
  | 'bring-to-front'
  | 'bring-forward'
  | 'send-backward'
  | 'send-to-back';

interface AnnotationContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onOrder: (action: LayerOrderAction) => void;
  onResetRotation: () => void;
  canResetRotation: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste?: boolean;
}

const MENU_WIDTH = 200;
const MENU_HEIGHT = 320;

/**
 * Right-click menu for a single annotation: clipboard (Cut/Copy/Paste) plus
 * layer-order actions.
 *
 * Reuses the existing `.custom-context-menu` / `.context-menu-item` /
 * `.context-menu-divider` styles from GrabTextModal.css so it visually matches
 * the app's other context menu. Layer-order actions are always enabled; the
 * underlying helpers are no-op safe when the object is already at an edge.
 * Paste is disabled when the in-app annotation clipboard is empty.
 */
export default function AnnotationContextMenu({
  x,
  y,
  onClose,
  onOrder,
  onResetRotation,
  canResetRotation,
  onCut,
  onCopy,
  onPaste,
  canPaste = false,
}: AnnotationContextMenuProps) {
  const [coords, setCoords] = useState({ x, y });
  const menuRef = useRef<HTMLDivElement>(null);
  const mod = getModKeyLabel();

  useLayoutEffect(() => {
    const updatePosition = () => {
      const width = menuRef.current?.offsetWidth || MENU_WIDTH;
      const height = menuRef.current?.offsetHeight || MENU_HEIGHT;
      setCoords({
        x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [x, y]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClose = () => onClose();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClose);
    window.addEventListener('contextmenu', handleClose);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClose);
      window.removeEventListener('contextmenu', handleClose);
    };
  }, [onClose]);

  const runOrder = (action: LayerOrderAction) => {
    onOrder(action);
    onClose();
  };

  const runClipboard = (fn: () => void) => {
    fn();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="custom-context-menu"
      style={{ top: `${coords.y}px`, left: `${coords.x}px`, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 16px)', overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        className="context-menu-item"
        onClick={() => runClipboard(onCut)}
        title={`Cut (${mod}+X)`}
      >
        <Scissors className="w-4 h-4" />
        <span>Cut</span>
        <span className="context-menu-shortcut">{mod}+X</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => runClipboard(onCopy)}
        title={`Copy (${mod}+C)`}
      >
        <Copy className="w-4 h-4" />
        <span>Copy</span>
        <span className="context-menu-shortcut">{mod}+C</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => runClipboard(onPaste)}
        title={canPaste ? `Paste (${mod}+V)` : 'Nothing to paste'}
        disabled={!canPaste}
      >
        <ClipboardPaste className="w-4 h-4" />
        <span>Paste</span>
        <span className="context-menu-shortcut">{mod}+V</span>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => runClipboard(onResetRotation)}
        title="Reset Rotation"
        disabled={!canResetRotation}
      >
        <RotateCcw className="w-4 h-4" />
        <span>Reset Rotation</span>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => runOrder('bring-to-front')}
        title="Bring to Front"
      >
        <BringToFront className="w-4 h-4" />
        <span>Bring to Front</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => runOrder('bring-forward')}
        title="Bring Forward"
      >
        <ArrowUp className="w-4 h-4" />
        <span>Bring Forward</span>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => runOrder('send-backward')}
        title="Send Backward"
      >
        <ArrowDown className="w-4 h-4" />
        <span>Send Backward</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => runOrder('send-to-back')}
        title="Send to Back"
      >
        <SendToBack className="w-4 h-4" />
        <span>Send to Back</span>
      </button>
    </div>,
    document.body,
  );
}
