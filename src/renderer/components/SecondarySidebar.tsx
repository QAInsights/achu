import { useState, useRef, useCallback } from 'react';
import { Bot } from 'lucide-react';
import { useAppContext } from '../AppContext';
import PrivacyGuardSettings from './PrivacyGuardSettings';
import GitHubAgentSettings from './GitHubAgentSettings';

const MIN_WIDTH = 340;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 360;

export default function SecondarySidebar() {
  const {
    secondarySidebarVisible,
    secondarySidebarPosition
  } = useAppContext();

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = secondarySidebarPosition === 'right' ? (startX.current - ev.clientX) : (ev.clientX - startX.current);
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth, secondarySidebarPosition]);

  return (
    <div
      className={`sidebar ${secondarySidebarPosition === 'right' ? 'right' : 'left'} ${secondarySidebarVisible ? '' : 'collapsed'}`}
      style={{ width: sidebarWidth, minWidth: sidebarWidth }}
    >
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Bot className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <span>AI & OCR</span>
        </div>
      </div>

      <div className="sidebar-content">
        <GitHubAgentSettings />
        <PrivacyGuardSettings />
      </div>

      <div className="sidebar-resize-handle" onMouseDown={onMouseDown} />
    </div>
  );
}
