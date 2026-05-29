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
    zoomLevel, setZoomLevel,
    pushHistory, getCurrentConfig, selectFile, setImageSrc, colorInputRef,
    appTheme, setAppTheme
  } = useAppContext();

  return (
    <div className="workspace-header">
      {/* Undo/Redo tools */}
      <div className="workspace-actions">
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem' }} 
          onClick={() => setSidebarVisible(prev => !prev)} 
          title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
        >
          {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>
        
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem 0 0.25rem' }}></div>

        {noImageMode && (
          <>
            <button
              className="btn btn-secondary text-indigo-400"
              style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem', display: 'flex', alignItems: 'center' }}
              onClick={selectFile}
              title="Upload Screenshot"
            >
              <ImageIcon className="w-4 h-4" style={{ marginRight: '0.25rem' }} /> Add Image
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem', marginRight: '0.25rem', color: 'var(--color-danger)' }}
              onClick={() => {
                setNoImageMode(false);
                setImageSrc(null);
                pushHistory({
                  ...getCurrentConfig(),
                  noImage: false,
                });
              }}
              title="Exit Gradient Mode"
            >
              Exit Gradient
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', marginRight: '0.5rem' }}></div>
          </>
        )}

        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem' }} onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </button>
        
        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
        
        {/* Visual Drawing Toolbar Match */}
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'pointer' ? 'var(--color-primary)' : undefined, color: activeTool === 'pointer' ? 'white' : undefined }} 
          onClick={() => setActiveTool('pointer')} 
          title="Select / Move"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'rect' ? 'var(--color-primary)' : undefined, color: activeTool === 'rect' ? 'white' : undefined }} 
          onClick={() => setActiveTool('rect')} 
          title="Rectangle Outline"
        >
          <Square className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'filled-rect' ? 'var(--color-primary)' : undefined, color: activeTool === 'filled-rect' ? 'white' : undefined }} 
          onClick={() => setActiveTool('filled-rect')} 
          title="Rectangle Filled"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="4" />
          </svg>
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'circle' ? 'var(--color-primary)' : undefined, color: activeTool === 'circle' ? 'white' : undefined }} 
          onClick={() => setActiveTool('circle')} 
          title="Circle Outline"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'filled-circle' ? 'var(--color-primary)' : undefined, color: activeTool === 'filled-circle' ? 'white' : undefined }} 
          onClick={() => setActiveTool('filled-circle')} 
          title="Circle Filled"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'line' ? 'var(--color-primary)' : undefined, color: activeTool === 'line' ? 'white' : undefined }} 
          onClick={() => setActiveTool('line')} 
          title="Straight Line"
        >
          <Slash className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'arrow' ? 'var(--color-primary)' : undefined, color: activeTool === 'arrow' ? 'white' : undefined }} 
          onClick={() => setActiveTool('arrow')} 
          title="Draw Arrow"
        >
          <ArrowUpRight className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'text' ? 'var(--color-primary)' : undefined, color: activeTool === 'text' ? 'white' : undefined }} 
          onClick={() => setActiveTool('text')} 
          title="Draw Text"
        >
          <Type className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'pen' ? 'var(--color-primary)' : undefined, color: activeTool === 'pen' ? 'white' : undefined }} 
          onClick={() => setActiveTool('pen')} 
          title="Freehand Draw"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', backgroundColor: activeTool === 'emoji' ? 'var(--color-primary)' : undefined, color: activeTool === 'emoji' ? 'white' : undefined }} 
          onClick={() => setActiveTool('emoji')} 
          title="Add Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>
        
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
        
        {/* Color Palette Picker */}
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem', border: `1px solid ${annotationColor}` }} 
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

        {/* Stroke Width Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Size:</span>
          <input 
            type="range" 
            min="2" 
            max="16" 
            value={annotationStrokeWidth} 
            onChange={(e) => setAnnotationStrokeWidth(parseInt(e.target.value, 10))}
            style={{ width: '70px', height: '4px', padding: 0 }}
            title={`Stroke Width: ${annotationStrokeWidth}px`}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '24px' }}>{annotationStrokeWidth}px</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="workspace-actions">
        <select 
          value={zoomLevel} 
          onChange={(e) => setZoomLevel(e.target.value)}
          style={{ width: '130px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
        >
          <option>Zoom to fit</option>
          <option>50%</option>
          <option>100%</option>
          <option>200%</option>
        </select>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.4rem' }}
          onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
          title={appTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {appTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
        <button className="btn btn-secondary" style={{ padding: '0.4rem' }}>
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
