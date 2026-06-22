import {
  PaintRoller,
  Bot,
  ImagePlus,
  LayoutGrid,
  Undo2,
  Redo2,
  RotateCcw,
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
  Settings,
  Code
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import { useGalleryContext } from '../contexts/GalleryContext';
import { toggleTheme } from '../utils/uiUtils';
import Tooltip from './Tooltip';
import FontSelector from './FontSelector';
import { useToolbarShortcuts } from '../hooks/useToolbarShortcuts';
import { formatModShortcut } from '../utils/shortcutLabels';

export default function WorkspaceToolbar() {
  useToolbarShortcuts();
  const { galleryVisible, openGallery, closeGallery } = useGalleryContext();

  const {
    sidebarVisible, setSidebarVisible,
    secondarySidebarVisible, setSecondarySidebarVisible,
    noImageMode, setNoImageMode,
    historyIndex, history,
    handleUndo, handleRedo,
    activeTool, setActiveTool,
    arrowStyle, setArrowStyle,
    annotationColor, setAnnotationColor,
    annotationStrokeWidth, setAnnotationStrokeWidth,
    annotationFont = 'sans-serif', setAnnotationFont,
    annotationFontSize = 24, setAnnotationFontSize,
    annotationBold = true, setAnnotationBold,
    annotationItalic = false, setAnnotationItalic,
    systemFonts = [],
    pushHistory, getCurrentConfig, selectFile, colorInputRef,
    appTheme, setAppTheme,
    settingsVisible, setSettingsVisible,
    helpVisible, setHelpVisible,
    setImageSrc,
    clearWorkspace,
    codeStudioActive,
    imageSrc, showToast,
    toggleCodeStudio,
  } = useAppContext();

  const tools: Array<{ id: typeof activeTool; icon: React.ReactNode; title: string; tooltip: string }> = [
    { id: 'pointer', icon: <MousePointer className="w-4 h-4" />, title: 'Select / Move', tooltip: 'Select / Move (V or 1)' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, title: 'Rectangle Outline', tooltip: 'Rectangle Outline (R or 2)' },
    { id: 'filled-rect', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4" /></svg>, title: 'Rectangle Filled', tooltip: 'Rectangle Filled (F, Shift+R, or 3)' },
    { id: 'circle', icon: <Circle className="w-4 h-4" />, title: 'Circle Outline', tooltip: 'Circle Outline (O, C, or 4)' },
    { id: 'filled-circle', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" /></svg>, title: 'Circle Filled', tooltip: 'Circle Filled (Shift+O, Shift+C, or 5)' },
    { id: 'line', icon: <Slash className="w-4 h-4" />, title: 'Straight Line', tooltip: 'Straight Line (L or 6)' },
    { id: 'arrow', icon: <ArrowUpRight className="w-4 h-4" />, title: 'Draw Arrow', tooltip: 'Draw Arrow (A or 7)' },
    { id: 'text', icon: <Type className="w-4 h-4" />, title: 'Draw Text', tooltip: 'Draw Text (T or 8)' },
    { id: 'pen', icon: <Pencil className="w-4 h-4" />, title: 'Freehand Draw', tooltip: 'Freehand Draw (P, D, or 9)' },
    { id: 'emoji', icon: <Smile className="w-4 h-4" />, title: 'Add Emoji', tooltip: 'Add Emoji (E or 0)' },
  ];

  return (
    <div className="toolbar-dock">
      {/* Left: Gallery + Undo/Redo */}
      <div className="toolbar-group">
        <Tooltip position="right">
          <button
            className={`tool-btn ${galleryVisible ? 'active' : ''}`}
            onClick={() => galleryVisible ? closeGallery() : openGallery()}
            title={galleryVisible ? `Back to Workspace (${formatModShortcut('G')})` : `Open Gallery (${formatModShortcut('G')})`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </Tooltip>

        {noImageMode && (
          <>
            <Tooltip position="right">
              <button
                className="tool-btn"
                onClick={selectFile}
                title="Upload Screenshot"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip position="right">
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
            </Tooltip>
          </>
        )}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <Tooltip position="right">
          <button className="tool-btn" onClick={handleUndo} disabled={historyIndex <= 0} title={`Undo (${formatModShortcut('Z')})`}>
            <Undo2 className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip position="right">
          <button className="tool-btn" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title={`Redo (${formatModShortcut('Y')})`}>
            <Redo2 className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip position="right">
          <button
            className="tool-btn"
            onClick={clearWorkspace}
            title={`Clear workspace (${formatModShortcut('N')})`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      <div className="toolbar-divider" />

      {/* Center: Annotation tools */}
      <div className="toolbar-group">
        {tools.map((tool) => (
          <Tooltip key={tool.id} content={tool.tooltip} position="right">
            <button
              className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
              title={tool.title}
            >
              {tool.icon}
            </button>
          </Tooltip>
        ))}
      </div>

      {activeTool === 'arrow' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <Tooltip position="right">
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
            </Tooltip>
            <Tooltip position="right">
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
            </Tooltip>
            <Tooltip position="right">
              <button
                className={`tool-btn ${arrowStyle === 'tapered' ? 'active' : ''}`}
                onClick={() => setArrowStyle('tapered')}
                title="Tapered Curved Arrow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.5 19.5 C 5.5 18.5, 12 11, 15 8 L 13.5 6.5 L 20.5 5.5 L 19.5 12.5 L 18 11 C 15 14, 4.5 19.5, 4.5 19.5 Z" />
                </svg>
              </button>
            </Tooltip>
            <Tooltip position="right">
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
            </Tooltip>
          </div>
        </>
      )}

      {activeTool === 'text' && (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-group">
            <Tooltip position="right">
                <FontSelector
                  value={annotationFont}
                  onChange={(val) => {
                    setAnnotationFont(val);
                    pushHistory({ ...getCurrentConfig(), annotationFont: val });
                  }}
                  systemFonts={systemFonts}
                  triggerWidth="110px"
                  styleType="toolbar"
                />
            </Tooltip>
            <Tooltip position="right">
              <div className="toolbar-control" style={{ gap: '4px', paddingRight: '8px' }}>
                <span className="toolbar-control-label">Font Size</span>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={annotationFontSize}
                  onChange={(e) => setAnnotationFontSize(parseInt(e.target.value, 10))}
                  style={{ width: '60px' }}
                  title={`Font Size: ${annotationFontSize}px`}
                />
                <span className="toolbar-control-value">{annotationFontSize}px</span>
              </div>
            </Tooltip>
            <Tooltip position="right">
              <button
                className={`tool-btn ${annotationBold ? 'active' : ''}`}
                style={{
                  fontWeight: 'bold',
                  backgroundColor: annotationBold ? 'var(--accent)' : 'transparent',
                  color: annotationBold ? 'var(--on-accent)' : 'var(--text-secondary)',
                }}
                onClick={() => {
                  setAnnotationBold(!annotationBold);
                  pushHistory({ ...getCurrentConfig(), annotationBold: !annotationBold });
                }}
                title="Bold"
              >
                B
              </button>
            </Tooltip>
            <Tooltip position="right">
              <button
                className={`tool-btn ${annotationItalic ? 'active' : ''}`}
                style={{
                  fontStyle: 'italic',
                  backgroundColor: annotationItalic ? 'var(--accent)' : 'transparent',
                  color: annotationItalic ? 'var(--on-accent)' : 'var(--text-secondary)',
                }}
                onClick={() => {
                  setAnnotationItalic(!annotationItalic);
                  pushHistory({ ...getCurrentConfig(), annotationItalic: !annotationItalic });
                }}
                title="Italic"
              >
                I
              </button>
            </Tooltip>
          </div>
        </>
      )}

      <div className="toolbar-divider" />

      {/* Color + Size */}
      <div className="toolbar-group" style={{ position: 'relative' }}>
        <Tooltip position="right">
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
        </Tooltip>
      </div>

      {['rect', 'filled-rect', 'circle', 'filled-circle', 'line', 'arrow', 'pen'].includes(activeTool) && (
        <Tooltip position="right">
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
        </Tooltip>
      )}

      <div className="toolbar-divider" />

      {/* Sidebar + AI & OCR + Code Studio toggle + controls */}
      <div className="toolbar-group">
        <Tooltip position="right">
          <button
            className={`tool-btn ${sidebarVisible ? 'active' : ''}`}
            onClick={() => setSidebarVisible(prev => !prev)}
            title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <PaintRoller className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip position="right">
          <button
            className={`tool-btn ${secondarySidebarVisible ? 'active' : ''}`}
            onClick={() => setSecondarySidebarVisible(prev => !prev)}
            title={secondarySidebarVisible ? 'Hide AI & OCR Panel' : 'Show AI & OCR Panel'}
          >
            <Bot className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip position="right">
          <button
            className={`tool-btn ${codeStudioActive ? 'active' : ''}`}
            onClick={() => {
              if (!codeStudioActive) {
                toggleCodeStudio(true);
                if (imageSrc) {
                  showToast('Code Studio active. Screenshot preserved.');
                } else {
                  showToast('Code Studio active.');
                }
              } else {
                toggleCodeStudio(false);
                if (imageSrc) {
                  showToast('Restored screenshot and annotations.');
                } else {
                  showToast('Screenshot Beautifier active.');
                }
              }
            }}
            title={codeStudioActive ? `Exit Code Studio (${formatModShortcut('Shift + C')})` : `Code Studio (${formatModShortcut('Shift + C')})`}
          >
            <Code className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>



      <div className="toolbar-divider" />

      {/* Right: Theme + Settings + Help */}
      <div className="toolbar-group">
        <Tooltip position="right">
          <button
            className="tool-btn"
            onClick={() => setAppTheme(toggleTheme(appTheme))}
            title={appTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {appTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </Tooltip>
        <Tooltip position="right">
          <button
            className={`tool-btn ${settingsVisible ? 'active' : ''}`}
            onClick={() => setSettingsVisible(prev => !prev)}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Tooltip>
        <Tooltip position="right">
          <button
            className={`tool-btn ${helpVisible ? 'active' : ''}`}
            onClick={() => setHelpVisible(prev => !prev)}
            title="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
