import { Image as ImageIcon, Sparkles, Minus, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import AnnotationsLayer from '../AnnotationsLayer';

export default function CanvasPreview() {
  const {
    padding,
    rounded,
    shadow,
    shadowColor,
    shadowEnabled,
    inset,
    insetColor,
    border,
    borderColor,
    scale,
    backgroundType,
    setBackgroundType,
    backgroundValue,
    aspectRatio,
    canvasWidth,
    canvasHeight,
    chromeStyle,
    chromeTheme,
    blurDensity,
    noImageMode,
    setNoImageMode,
    meshPoints,
    meshDataUrl,
    activePointIdx,
    watermarkEnabled,
    watermarkText,
    position,
    activeTool,
    setActiveTool,
    annotations,
    setAnnotations,
    annotationColor,
    annotationStrokeWidth,
    imageSrc,
    setImageSrc,
    pushHistory,
    getCurrentConfig,
    selectFile,
    getZoomStyle,
    zoomLevel, setZoomLevel,
    customPrompt,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useAppContext();

  const handleZoomIn = () => {
    if (zoomLevel === 'Zoom to fit') {
      setZoomLevel('110%');
      return;
    }
    const currentVal = parseInt(zoomLevel, 10);
    if (isNaN(currentVal)) {
      setZoomLevel('100%');
      return;
    }
    const nextVal = Math.min(500, Math.floor(currentVal / 10) * 10 + 10);
    setZoomLevel(`${nextVal}%`);
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'Zoom to fit') {
      setZoomLevel('90%');
      return;
    }
    const currentVal = parseInt(zoomLevel, 10);
    if (isNaN(currentVal)) {
      setZoomLevel('100%');
      return;
    }
    const nextVal = Math.max(10, Math.ceil(currentVal / 10) * 10 - 10);
    setZoomLevel(`${nextVal}%`);
  };

  return (
    <div className="workspace-canvas-container">
      {(imageSrc || noImageMode) ? (
        <div className="preview-card-wrapper" style={getZoomStyle()}>
          
          {/* Output Preview Container Card */}
          <div 
            className="preview-background-card"
            style={{
              padding: `${padding}px`,
              backgroundColor: backgroundType === 'color' ? backgroundValue : undefined,
              backgroundImage: backgroundType === 'gradient' 
                ? backgroundValue 
                : backgroundType === 'blur' && imageSrc 
                  ? `url(${imageSrc})` 
                  : backgroundType === 'mesh' 
                    ? `url(${meshDataUrl})` 
                    : undefined,
              alignItems: (position || 'Middle center').includes('Top') ? 'flex-start' : (position || 'Middle center').includes('Bottom') ? 'flex-end' : 'center',
              justifyContent: (position || 'Middle center').includes('left') ? 'flex-start' : (position || 'Middle center').includes('right') ? 'flex-end' : 'center',
              borderRadius: '12px',
              // Fixed sizes mapping
              width: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '800px' : aspectRatio === '4:3' ? '700px' : aspectRatio === '3:2' ? '750px' : aspectRatio === 'Custom' ? `${canvasWidth}px` : (noImageMode ? '800px' : 'auto'),
              height: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '450px' : aspectRatio === '4:3' ? '525px' : aspectRatio === '3:2' ? '500px' : aspectRatio === 'Custom' ? `${canvasHeight}px` : (noImageMode ? '450px' : 'auto'),
            }}
          >
            
            {/* Embedded Blurred overlay if blur background */}
            {backgroundType === 'blur' && imageSrc && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backdropFilter: `blur(${blurDensity}px) saturate(1.4)`,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                zIndex: 0
              }} />
            )}

            {/* Draggable Point Handles for Mesh Gradient */}
            {backgroundType === 'mesh' && (
              <div 
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto', zIndex: 10 }}
              >
                {meshPoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    onPointerDown={(e) => handlePointerDown(e, idx)}
                    style={{
                      position: 'absolute',
                      left: `${pt.x * 100}%`,
                      top: `${pt.y * 100}%`,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: pt.color,
                      border: idx === activePointIdx ? '3px solid #ffffff' : '2px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      transform: 'translate(-50%, -50%)',
                      cursor: 'move',
                      zIndex: idx === activePointIdx ? 12 : 11,
                    }}
                    title={`Point ${idx + 1}`}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      margin: '6px auto 0 auto',
                    }} />
                  </div>
                ))}
              </div>
            )}

            {/* Main Screenshot card box */}
            {!noImageMode && imageSrc && (
              <div 
                className="preview-container-box"
                style={{
                  borderRadius: `${rounded}px`,
                  boxShadow: shadowEnabled ? `0 ${shadow * 0.8}px ${shadow * 1.5}px ${shadowColor}` : 'none',
                  border: border > 0 ? `${border}px solid ${borderColor}` : 'none',
                  outline: inset > 0 ? `${inset}px solid ${insetColor}` : 'none',
                  outlineOffset: `-${inset}px`,
                  width: scale === 100 ? '100%' : `${scale}%`,
                  maxWidth: '100%',
                  zIndex: 1,
                }}
              >
                
                {/* macOS Title Bar Mockup */}
                {chromeStyle === 'mac' && (
                  <div 
                    className="preview-chrome-mac"
                    style={{
                      backgroundColor: chromeTheme === 'light' ? '#f3f3f3' : '#21252b',
                      borderBottom: chromeTheme === 'light' ? '1px solid #e1e1e1' : 'none'
                    }}
                  >
                    <div className="dot dot-red" />
                    <div className="dot dot-yellow" />
                    <div className="dot dot-green" />
                  </div>
                )}

                {/* Windows Title Bar Mockup */}
                {chromeStyle === 'windows' && (
                  <div 
                    className="preview-chrome-win"
                    style={{
                      backgroundColor: chromeTheme === 'light' ? '#ffffff' : '#1e1e1e',
                      borderBottom: chromeTheme === 'light' ? '1px solid #e5e5e5' : 'none',
                      ['--win-icon-color' as any]: chromeTheme === 'light' ? '#333333' : '#cccccc'
                    }}
                  >
                    <div className="win-min" />
                    <div className="win-icon" />
                    <div className="win-close" />
                  </div>
                )}

                {/* Image render element with Annotations layer */}
                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: aspectRatio === 'Auto' ? '65vh' : '100%' }}>
                  <img 
                    src={imageSrc} 
                    alt="Screenshot" 
                    className="preview-screenshot-img" 
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      width: 'auto',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                  <AnnotationsLayer
                    annotations={annotations}
                    setAnnotations={setAnnotations}
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    color={annotationColor}
                    strokeWidth={annotationStrokeWidth}
                    onSaveHistory={() => pushHistory(getCurrentConfig())}
                    customPrompt={customPrompt}
                  />
                </div>
              </div>
            )}

            {/* Floating Watermark text */}
            {watermarkEnabled && watermarkText && (
              <div className="preview-watermark" style={{ zIndex: 2 }}>
                {watermarkText}
              </div>
            )}

          </div>
        </div>
      ) : (

        /* File Dropzone Empty State */
        <div className="empty-state">
          <div onClick={selectFile} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ImageIcon className="empty-state-icon" />
            <h3 className="empty-state-title">Drag & Drop screenshot here</h3>
            <p className="empty-state-subtitle">Or click to select an image, or copy-paste directly (Ctrl+V)</p>
          </div>

          <div className="empty-state-actions">
            <div className="empty-state-divider">— OR —</div>
            <button
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setNoImageMode(true);
                setBackgroundType('gradient');
                setImageSrc(null);              
                pushHistory({
                  ...getCurrentConfig(),
                  noImage: true,
                  backgroundType: 'gradient',
                });
              }}
            >
              <Sparkles className="w-4 h-4" /> Create Blank Gradient
            </button>
          </div>

          <div className="empty-state-hotkeys">
            <span>Hotkey:</span> <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>V</kbd> <span>to snap from clipboard</span>
          </div>
        </div>
      )}

      {/* Zoom Cluster */}
      {(imageSrc || noImageMode) && (
        <div className="zoom-cluster" style={{ gap: '4px' }}>
          <button
            className="zoom-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel !== 'Zoom to fit' && parseInt(zoomLevel, 10) <= 10}
            title="Zoom out (10%)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            className={`zoom-btn ${zoomLevel === 'Zoom to fit' ? 'active' : ''}`}
            style={{ minWidth: '48px', fontWeight: 'bold' }}
            onClick={() => setZoomLevel('Zoom to fit')}
            title="Reset to Zoom to fit"
          >
            {zoomLevel === 'Zoom to fit' ? 'Fit' : zoomLevel}
          </button>
          <button
            className="zoom-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel !== 'Zoom to fit' && parseInt(zoomLevel, 10) >= 500}
            title="Zoom in (10%)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
