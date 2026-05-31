import { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Minus, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import AnnotationsLayer from '../AnnotationsLayer';
import { zoomIn, zoomOut, getFixedSizeFromAspectRatio } from '../utils/layoutUtils';
import { getCanvasDimensions } from '../canvasRenderer';
import Tooltip from './Tooltip';
import { platformPresets } from '../presetsData';

export default function CanvasPreview() {
  const [imgDims, setImgDims] = useState<{ width: number; height: number } | null>(null);
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
    watermarkSize,
    watermarkPosition,
    watermarkOpacity,
    position,
    activeTool,
    setActiveTool,
    annotations,
    setAnnotations,
    annotationColor,
    setAnnotationColor,
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
    handlePointerUp,
    selectedPreset,
    showSafeZone
  } = useAppContext();

  const handleZoomIn = () => setZoomLevel(zoomIn(zoomLevel));
  const handleZoomOut = () => setZoomLevel(zoomOut(zoomLevel));

  useEffect(() => {
    if (!imageSrc) {
      setImgDims(null);
    }
  }, [imageSrc]);

  const getPreviewPositionStyle = (pos: string, paddingVal: number, aspect: string) => {
    if (aspect === 'Auto') {
      return {
        position: 'relative' as const,
        top: undefined,
        bottom: undefined,
        left: undefined,
        right: undefined,
        transform: undefined,
      };
    }
    const pad = `${paddingVal}px`;
    switch (pos || 'Middle center') {
      case 'Top center':
        return {
          position: 'absolute' as const,
          top: pad,
          bottom: undefined,
          left: '50%',
          right: undefined,
          transform: 'translateX(-50%)',
        };
      case 'Bottom center':
        return {
          position: 'absolute' as const,
          top: undefined,
          bottom: pad,
          left: '50%',
          right: undefined,
          transform: 'translateX(-50%)',
        };
      case 'Middle left':
        return {
          position: 'absolute' as const,
          top: '50%',
          bottom: undefined,
          left: pad,
          right: undefined,
          transform: 'translateY(-50%)',
        };
      case 'Middle right':
        return {
          position: 'absolute' as const,
          top: '50%',
          bottom: undefined,
          left: undefined,
          right: pad,
          transform: 'translateY(-50%)',
        };
      case 'Middle center':
      default:
        return {
          position: 'absolute' as const,
          top: '50%',
          bottom: undefined,
          left: '50%',
          right: undefined,
          transform: 'translate(-50%, -50%)',
        };
    }
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
              boxSizing: 'content-box',
              backgroundColor: backgroundType === 'color' ? backgroundValue : undefined,
              backgroundImage: backgroundType === 'gradient' 
                ? backgroundValue 
                : backgroundType === 'blur' && imageSrc 
                  ? `url(${imageSrc})` 
                  : backgroundType === 'mesh' 
                    ? `url(${meshDataUrl})` 
                    : undefined,
              borderRadius: '12px',
              maxWidth: '100%',
              maxHeight: '70vh',
              // Fixed sizes mapping
              ...(() => {
                if (aspectRatio === 'Auto' && !noImageMode && imgDims) {
                  const s = scale / 100;
                  const chromeHeight = chromeStyle !== 'none' ? 32 : 0;
                  const w = Math.round(imgDims.width * s);
                  const h = Math.round((imgDims.height + chromeHeight) * s);
                  return {
                    width: `${w}px`,
                    height: `${h}px`,
                    aspectRatio: `${w} / ${h}`,
                  };
                }
                const { width, height } = getFixedSizeFromAspectRatio(aspectRatio, canvasWidth, canvasHeight, noImageMode);
                const w = typeof width === 'number' ? width : 800;
                const h = typeof height === 'number' ? height : 450;
                return {
                  width: typeof width === 'number' ? `${width}px` : width,
                  height: typeof height === 'number' ? `${height}px` : height,
                  aspectRatio: `${w} / ${h}`,
                };
              })(),
            }}
          >
            {/* Safe Zone Overlay */}
            {showSafeZone && (() => {
              const activePreset = platformPresets.find(p => `${p.platform} - ${p.name}` === selectedPreset);
              if (!activePreset || !activePreset.safeZone) return null;
              return (
                <div 
                  className="safe-zone-overlay"
                  style={{
                    width: `${(activePreset.safeZone.width / activePreset.width) * 100}%`,
                    height: `${(activePreset.safeZone.height / activePreset.height) * 100}%`,
                  }}
                >
                  <div className="safe-zone-label">
                    Safe Area ({activePreset.safeZone.width}×{activePreset.safeZone.height})
                  </div>
                </div>
              );
            })()}

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
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}
              >
                {meshPoints.map((pt, idx) => (
                  <Tooltip key={pt.id} position="top">
                    <div
                      onPointerDown={activeTool === 'pointer' ? (e) => handlePointerDown(e, idx) : undefined}
                      onPointerMove={activeTool === 'pointer' ? handlePointerMove : undefined}
                      onPointerUp={activeTool === 'pointer' ? handlePointerUp : undefined}
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
                        cursor: activeTool === 'pointer' ? 'move' : 'default',
                        pointerEvents: activeTool === 'pointer' ? 'auto' : 'none',
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
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Main Screenshot card box */}
            {!noImageMode && imageSrc ? (
              <div
                className={`preview-container-box ${chromeStyle !== 'none' ? `mockup-${chromeTheme}` : ''}`}
                style={{
                  borderRadius: `${rounded}px`,
                  boxShadow: shadowEnabled ? `0 ${shadow * 0.8}px ${shadow * 1.5}px ${shadowColor}` : 'none',
                  border: border > 0 ? `${border}px solid ${borderColor}` : 'none',
                  outline: inset > 0 ? `${inset}px solid ${insetColor}` : 'none',
                  outlineOffset: `-${inset}px`,
                  width: aspectRatio === 'Auto' ? '100%' : `calc((100% - ${padding * 2}px) * ${scale / 100})`,
                  maxWidth: aspectRatio === 'Auto' ? '100%' : `calc(100% - ${padding * 2}px)`,
                  maxHeight: aspectRatio === 'Auto' ? '100%' : `calc(100% - ${padding * 2}px)`,
                  zIndex: 1,
                  ...getPreviewPositionStyle(position || 'Middle center', padding, aspectRatio),
                }}
              >

                {/* macOS Title Bar Mockup */}
                {chromeStyle === 'mac' && (
                  <div className={`preview-chrome-mac ${chromeTheme}`}>
                    <div className="dot dot-red" />
                    <div className="dot dot-yellow" />
                    <div className="dot dot-green" />
                  </div>
                )}

                {/* Windows Title Bar Mockup */}
                {chromeStyle === 'windows' && (
                  <div className={`preview-chrome-win ${chromeTheme}`}>
                    <div className="win-min" />
                    <div className="win-icon" />
                    <div className="win-close" />
                  </div>
                )}

                {/* Image render element with Annotations layer */}
                <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', maxHeight: '100%' }}>
                  <img
                    src={imageSrc}
                    alt="Screenshot"
                    className="preview-screenshot-img"
                    onLoad={(e) => {
                      setImgDims({
                        width: e.currentTarget.naturalWidth,
                        height: e.currentTarget.naturalHeight
                      });
                    }}
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
                    setAnnotationColor={setAnnotationColor}
                    strokeWidth={annotationStrokeWidth}
                    onSaveHistory={(newAnns) => {
                      const cfg = getCurrentConfig();
                      if (newAnns) cfg.annotations = newAnns;
                      pushHistory(cfg);
                    }}
                    customPrompt={customPrompt}
                  />
                </div>
              </div>
            ) : (
              /* No-image mode: render annotations layer directly on the background */
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                <AnnotationsLayer
                  annotations={annotations}
                  setAnnotations={setAnnotations}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  color={annotationColor}
                  setAnnotationColor={setAnnotationColor}
                  strokeWidth={annotationStrokeWidth}
                  onSaveHistory={(newAnns) => {
                    const cfg = getCurrentConfig();
                    if (newAnns) cfg.annotations = newAnns;
                    pushHistory(cfg);
                  }}
                  customPrompt={customPrompt}
                />
              </div>
            )}

            {/* Floating Watermark text */}
            {watermarkEnabled && watermarkText && (
              <div 
                className="preview-watermark" 
                style={{ 
                  zIndex: 2,
                  opacity: watermarkOpacity,
                  fontSize: (() => {
                    if (noImageMode || !imgDims) {
                      return `${watermarkSize}px`;
                    }
                    const dims = getCanvasDimensions(imgDims.width, imgDims.height, getCurrentConfig());
                    let previewCardWidth = 800;
                    if (aspectRatio === 'Auto') {
                      previewCardWidth = Math.round(imgDims.width * (scale / 100));
                    } else {
                      const size = getFixedSizeFromAspectRatio(aspectRatio, canvasWidth, canvasHeight, noImageMode);
                      previewCardWidth = typeof size.width === 'number' ? size.width : 800;
                    }
                    const ratio = previewCardWidth / (dims.width - padding * 2);
                    return `${Math.max(8, Math.round(watermarkSize * ratio))}px`;
                  })(),
                  ...(() => {
                    const pos = watermarkPosition || 'middle';
                    const halfPadding = padding / 2;
                    const style: React.CSSProperties = {
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      color: '#ffffff',
                      fontWeight: 600,
                      transform: 'none',
                      left: 'auto',
                      right: 'auto',
                      top: 'auto',
                      bottom: 'auto',
                      height: `${padding}px`,
                      width: 'auto',
                    };
                    
                    if (pos === 'left') {
                      style.bottom = 0;
                      style.left = `${halfPadding}px`;
                      style.justifyContent = 'flex-start';
                    } else if (pos === 'middle') {
                      style.bottom = 0;
                      style.left = 0;
                      style.right = 0;
                      style.justifyContent = 'center';
                    } else if (pos === 'right') {
                      style.bottom = 0;
                      style.right = `${halfPadding}px`;
                      style.justifyContent = 'flex-end';
                    } else if (pos === 'top left') {
                      style.top = 0;
                      style.left = `${halfPadding}px`;
                      style.justifyContent = 'flex-start';
                    } else if (pos === 'top middle') {
                      style.top = 0;
                      style.left = 0;
                      style.right = 0;
                      style.justifyContent = 'center';
                    } else if (pos === 'top right') {
                      style.top = 0;
                      style.right = `${halfPadding}px`;
                      style.justifyContent = 'flex-end';
                    }
                    return style;
                  })(),
                }}
              >
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
          <Tooltip position="top">
            <button
              className="zoom-btn"
              onClick={handleZoomOut}
              disabled={zoomLevel !== 'Zoom to fit' && parseInt(zoomLevel, 10) <= 10}
              title="Zoom out (10%)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          <Tooltip position="top">
            <button
              className={`zoom-btn ${zoomLevel === 'Zoom to fit' ? 'active' : ''}`}
              style={{ minWidth: '48px', fontWeight: 'bold' }}
              onClick={() => setZoomLevel('Zoom to fit')}
              title="Reset to Zoom to fit"
            >
              {zoomLevel === 'Zoom to fit' ? 'Fit' : zoomLevel}
            </button>
          </Tooltip>
          <Tooltip position="top">
            <button
              className="zoom-btn"
              onClick={handleZoomIn}
              disabled={zoomLevel !== 'Zoom to fit' && parseInt(zoomLevel, 10) >= 500}
              title="Zoom in (10%)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
