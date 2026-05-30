import {
  PanelLeftClose,
  PanelLeft,
  Image as ImageIcon,
  Undo2,
  Redo2,
  MousePointer,
  Square,
  Circle,
  Slash,
  ArrowUpRight,
  Type,
  Pencil,
  Smile,
  Palette,
  HelpCircle,
  Sun,
  Moon,
  Settings
} from 'lucide-react';
import { useAppContext } from '../AppContext';

export default function WorkspaceToolbar() {
  const {
    sidebarVisible, setSidebarVisible,
    noImageMode, setNoImageMode,
    historyIndex, history,
    handleUndo, handleRedo,
    activeTool, setActiveTool,
    arrowStyle, setArrowStyle,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    pushHistory, getCurrentConfig, selectFile, setImageSrc, colorInputRef,
    appTheme, setAppTheme,
    settingsVisible, setSettingsVisible
  } = useAppContext();

  const tools: Array<{ id: typeof activeTool; icon: React.ReactNode; title: string }> = [
    { id: 'pointer', icon: <MousePointer className="w-4 h-4" />, title: 'Select / Move' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, title: 'Rectangle Outline' },
    { id: 'filled-rect', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4" /></svg>, title: 'Rectangle Filled' },
    { id: 'circle', icon: <Circle className="w-4 h-4" />, title: 'Circle Outline' },
    { id: 'filled-circle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>, title: 'Circle Filled' },
    { id: 'line', icon: <Slash className="w-4 h-4" />, title: 'Straight Line' },
    { id: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, title: 'Draw Arrow' },
    { id: 'text', icon: <Type className="w-4 h-4" />, title: 'Draw Text' },
    { id: 'pen', icon: <Pencil className="w-4 h-4" />, title: 'Freehand Draw' },
    { id: 'emoji', icon: <Smile className="w-4 h-4" />, title: 'Add Emoji' },
  ];

  return (
    <div className="toolbar-dock">
      {/* Left: Sidebar toggle + Undo/Redo */}
      <div className="toolbar-group">
        <button
          className={`tool-btn ${sidebarVisible ? '' : ''}`}
          onClick={() => setSidebarVisible(prev => !prev)}
          title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {noImageMode && (
          <>
            <button
              className="tool-btn"
              onClick={selectFile}
              title="Upload Screenshot"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              className="tool-btn"
              onClick={() => {
                setNoImageMode(false);
                setImageSrc(null);
                pushHistory({ ...getCurrentConfig(), noImage: false });
              }}
              title="Exit Gradient Mode"
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Exit</span>
            </button>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="tool-btn" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="tool-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Center: Annotation tools */}
      <div className="toolbar-group">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={tool.title}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {activeTool === 'arrow' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <button
              className={`tool-btn ${arrowStyle === 'classic' ? 'active' : ''}`}
              onClick={() => setArrowStyle('classic')}
              title="Classic Arrow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="19" x2="19" y2="5" />
                <polyline points="12 5 19 5 19 12" />
              </svg>
            </button>
            <button
              className={`tool-btn ${arrowStyle === 'dashed' ? 'active' : ''}`}
              onClick={() => setArrowStyle('dashed')}
              title="Dashed Arrow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3">
                <line x1="5" y1="19" x2="19" y2="5" />
                <polyline points="12 5 19 5 19 12" strokeDasharray="none" />
              </svg>
            </button>
            <button
              className={`tool-btn ${arrowStyle === 'tapered' ? 'active' : ''}`}
              onClick={() => setArrowStyle('tapered')}
              title="Tapered Curved Arrow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.5 19.5 C 5.5 18.5, 12 11, 15 8 L 13.5 6.5 L 20.5 5.5 L 19.5 12.5 L 18 11 C 15 14, 4.5 19.5, 4.5 19.5 Z" />
              </svg>
            </button>
            <button
              className={`tool-btn ${arrowStyle === 'curved' ? 'active' : ''}`}
              onClick={() => setArrowStyle('curved')}
              title="Curved Arrow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20 Q 14 16 19 5" />
                <polyline points="12 5 19 5 19 12" />
              </svg>
            </button>
          </div>
        </>
      )}

      <div className="toolbar-divider" />

      {/* Color + Size */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <button
          className="tool-btn"
          style={{ border: `1px solid ${annotationColor}` }}
          title="Annotation Color"
        >
          <Palette className="w-4 h-4" style={{ color: annotationColor }} />
          <input
            type="color"
            ref={colorInputRef as any}
            value={annotationColor}
            onChange={(e) => setAnnotationColor(e.target.value)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </button>
      </div>

      <div className="toolbar-control">
        <span className="toolbar-control-label">Size</span>
        <input
          type="range"
          min="2"
          max="16"
          value={annotationStrokeWidth}
          onChange={(e) => setAnnotationStrokeWidth(parseInt(e.target.value, 10))}
          title={`Stroke Width: ${annotationStrokeWidth}px`}
        />
        <span className="toolbar-control-value">{annotationStrokeWidth}px</span>
      </div>

      <div className="toolbar-divider" />

      {/* Right: Theme + Settings + Help */}
      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
          title={appTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          className={`tool-btn ${settingsVisible ? 'active' : ''}`}
          onClick={() => setSettingsVisible(prev => !prev)}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button className="tool-btn" title="Help">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
