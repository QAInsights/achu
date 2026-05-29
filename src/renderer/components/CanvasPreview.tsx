import { Image as ImageIcon, Sparkles } from 'lucide-react';
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
    customPrompt,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  } = useAppContext();

  return (
    <div className="workspace-canvas-container workspace-grid">
      {(imageSrc || noImageMode) ? (
        <div className="preview-card-wrapper" style={getZoomStyle()}>
          
          {/* Output Preview Container Card */}
          <div 
            className="preview-background-card"
            style={{
              padding: `${padding}px`,
              background: backgroundType === 'gradient' ? backgroundValue : undefined,
              backgroundColor: backgroundType === 'color' ? backgroundValue : undefined,
              backgroundImage: backgroundType === 'blur' && imageSrc ? `url(${imageSrc})` : backgroundType === 'mesh' ? `url(${meshDataUrl})` : undefined,
              alignItems: (position || 'Middle center').includes('Top') ? 'flex-start' : (position || 'Middle center').includes('Bottom') ? 'flex-end' : 'center',
              justifyContent: (position || 'Middle center').includes('left') ? 'flex-start' : (position || 'Middle center').includes('right') ? 'flex-end' : 'center',
              borderRadius: '12px',
              // Fixed sizes mapping
              width: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '800px' : aspectRatio === '4:3' ? '700px' : aspectRatio === '3:2' ? '750px' : aspectRatio === 'Custom' ? `${canvasWidth}px` : 'auto',
              height: aspectRatio === '1:1' ? '600px' : aspectRatio === '16:9' ? '450px' : aspectRatio === '4:3' ? '525px' : aspectRatio === '3:2' ? '500px' : aspectRatio === 'Custom' ? `${canvasHeight}px` : 'auto',
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

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.2rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>— OR —</div>
            <button
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                setNoImageMode(true);
                setBackgroundType('mesh');
                setImageSrc(null);
                pushHistory({
                  ...getCurrentConfig(),
                  noImage: true,
                  backgroundType: 'mesh',
                });
              }}
            >
              <Sparkles className="w-4 h-4" /> Create Blank Gradient
            </button>
          </div>

          <div className="empty-state-hotkey" style={{ marginTop: '1.5rem' }}>
            Hotkey: <code>Ctrl + Alt + V</code> to snap from clipboard instantly
          </div>
        </div>
      )}
    </div>
  );
}
