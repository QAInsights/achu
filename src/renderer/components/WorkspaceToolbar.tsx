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
  Moon
} from 'lucide-react';
import { useAppContext } from '../AppContext';

export default function WorkspaceToolbar() {
  const {
    sidebarVisible, setSidebarVisible,
    noImageMode, setNoImageMode,
    historyIndex, history,
    handleUndo, handleRedo,
    activeTool, setActiveTool,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    pushHistory, getCurrentConfig, selectFile, setImageSrc, colorInputRef,
    appTheme, setAppTheme
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

      <div className="toolbar-divider" />

      {/* Color + Size */}
      <div className="toolbar-group">
        <button
          className="tool-btn"
          style={{ border: `1px solid ${annotationColor}` }}
          onClick={() => colorInputRef.current?.click()}
          title="Annotation Color"
        >
          <Palette className="w-4 h-4" style={{ color: annotationColor }} />
        </button>
        <input
          type="color"
          ref={colorInputRef as any}
          value={annotationColor}
          onChange={(e) => setAnnotationColor(e.target.value)}
          style={{ display: 'none' }}
        />
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

      {/* Right: Theme + Help */}
      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
          title={appTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button className="tool-btn" title="Help">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
