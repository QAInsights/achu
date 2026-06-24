import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BringToFront, ArrowUp, ArrowDown, SendToBack } from 'lucide-react';
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
}

const MENU_WIDTH = 180;
const MENU_HEIGHT = 184;

/**
 * Right-click layer-order menu for a single annotation object.
 *
 * Reuses the existing `.custom-context-menu` / `.context-menu-item` /
 * `.context-menu-divider` styles from GrabTextModal.css so it visually matches
 * the app's other context menu. All four actions are always enabled; the
 * underlying helpers are no-op safe when the object is already at an edge.
 */
export default function AnnotationContextMenu({
  x,
  y,
  onClose,
  onOrder,
}: AnnotationContextMenuProps) {
  const [coords, setCoords] = useState({ x, y });

  useEffect(() => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let adjustedX = x;
    let adjustedY = y;
    if (x + MENU_WIDTH > screenWidth) {
      adjustedX = Math.max(8, screenWidth - MENU_WIDTH - 8);
    }
    if (y + MENU_HEIGHT > screenHeight) {
      adjustedY = Math.max(8, screenHeight - MENU_HEIGHT - 8);
    }
    setCoords({ x: adjustedX, y: adjustedY });
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

  const run = (action: LayerOrderAction) => {
    onOrder(action);
    onClose();
  };

  return createPortal(
    <div
      className="custom-context-menu"
      style={{ top: `${coords.y}px`, left: `${coords.x}px` }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        className="context-menu-item"
        onClick={() => run('bring-to-front')}
        title="Bring to Front"
      >
        <BringToFront className="w-4 h-4" />
        <span>Bring to Front</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => run('bring-forward')}
        title="Bring Forward"
      >
        <ArrowUp className="w-4 h-4" />
        <span>Bring Forward</span>
      </button>

      <div className="context-menu-divider" />

      <button
        className="context-menu-item"
        onClick={() => run('send-backward')}
        title="Send Backward"
      >
        <ArrowDown className="w-4 h-4" />
        <span>Send Backward</span>
      </button>

      <button
        className="context-menu-item"
        onClick={() => run('send-to-back')}
        title="Send to Back"
      >
        <SendToBack className="w-4 h-4" />
        <span>Send to Back</span>
      </button>
    </div>,
    document.body,
  );
}
