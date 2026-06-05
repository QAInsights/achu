import { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Minus, Plus } from 'lucide-react';
import { useAppContext } from '../AppContext';
import AnnotationsLayer from '../AnnotationsLayer';
import { zoomIn, zoomOut, getFixedSizeFromAspectRatio } from '../utils/layoutUtils';
import { getCanvasDimensions } from '../canvasRenderer';
import Tooltip from './Tooltip';
import { platformPresets } from '../presetsData';
import ContextMenu from './ContextMenu';
import GrabTextModal from './GrabTextModal';

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
    showSafeZone,
    redactions = [],
    toggleRedaction = () => {},
    hoveredRedactionId = null,
    setHoveredRedactionId = () => {},
    redactionStyle = 'solid',
    showComponentHighlights = true,
    cachedOcrResult = null,
    highlightedComponents = [],
    bgGrain,
    lightRaysStyle,
    lightRaysOpacity,
    lightRaysAngle,
    lightRaysCount,
    lightRaysSourceX,
    lightRaysSourceY,
  } = useAppContext();

  const handleZoomIn = () => setZoomLevel(zoomIn(zoomLevel));
  const handleZoomOut = () => setZoomLevel(zoomOut(zoomLevel));

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [grabTextVisible, setGrabTextVisible] = useState<boolean>(false);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

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

  const getDiagonalBackground = () => {
    const angleRad = ((lightRaysAngle - 90) * Math.PI) / 180;
    const dx = (lightRaysSourceX / 100) - 0.5;
    const dy = (lightRaysSourceY / 100) - 0.5;
    const gx = Math.cos(angleRad);
    const gy = Math.sin(angleRad);
    const proj = dx * gx + dy * gy;
    const maxProj = 0.5 * (Math.abs(gx) + Math.abs(gy));
    const cFraction = 0.5 + (maxProj > 0 ? proj / (maxProj * 2) : 0);
    const C = Math.max(0, Math.min(100, cFraction * 100));

    const BEAM_TEMPLATES = [
      { offset: 0, width: 2, opacity: 0.8 },
      { offset: 2.5, width: 6, opacity: 0.35 },
      { offset: -7, width: 1.5, opacity: 0.4 },
      { offset: 16, width: 1, opacity: 0.25 },
      { offset: 19, width: 0.8, opacity: 0.15 },
      { offset: 22, width: 1.2, opacity: 0.2 },
      { offset: -14, width: 0.8, opacity: 0.18 },
      { offset: 25, width: 0.7, opacity: 0.12 },
      { offset: -20, width: 1.5, opacity: 0.1 },
      { offset: 30, width: 1, opacity: 0.08 },
    ];

    const limit = Math.max(1, Math.min(10, lightRaysCount));
    const layers: string[] = [];

    for (let i = 0; i < limit; i++) {
      const beam = BEAM_TEMPLATES[i];
      const mid = C + beam.offset;
      layers.push(`linear-gradient(${lightRaysAngle}deg, transparent ${mid - beam.width}%, rgba(255, 255, 255, ${beam.opacity}) ${mid}%, transparent ${mid + beam.width}%)`);
    }

    // Perpendicular color sweep
    layers.push(`linear-gradient(${lightRaysAngle + 90}deg, rgba(147, 51, 234, 0) 0%, rgba(147, 51, 234, 0.2) 30%, rgba(59, 130, 246, 0.25) 55%, rgba(6, 182, 212, 0.2) 75%, rgba(6, 182, 212, 0) 100%)`);

    return layers.join(', ');
  };

  const getSpotlightBackground = () => {
    return `radial-gradient(circle at ${lightRaysSourceX}% ${lightRaysSourceY}%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.3) 20%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0) 80%)`;
  };

  const getAuroraBackground = () => {
    const angleRad = ((lightRaysAngle - 90) * Math.PI) / 180;
    const dx = (lightRaysSourceX / 100) - 0.5;
    const dy = (lightRaysSourceY / 100) - 0.5;
    const gx = Math.cos(angleRad);
    const gy = Math.sin(angleRad);
    const proj = dx * gx + dy * gy;
    const maxProj = 0.5 * (Math.abs(gx) + Math.abs(gy));
    const cFraction = 0.5 + (maxProj > 0 ? proj / (maxProj * 2) : 0);
    const C = Math.max(0, Math.min(100, cFraction * 100));

    return `linear-gradient(${lightRaysAngle}deg, rgba(59, 130, 246, 0) ${C - 50}%, rgba(59, 130, 246, 0.2) ${C - 30}%, rgba(147, 51, 234, 0.25) ${C - 10}%, rgba(6, 182, 212, 0.2) ${C + 10}%, rgba(59, 130, 246, 0.1) ${C + 30}%, rgba(59, 130, 246, 0) ${C + 50}%), linear-gradient(${lightRaysAngle + 90}deg, rgba(255, 255, 255, 0) 20%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 80%)`;
  };

  return (
    <div className="workspace-canvas-container">
      {(imageSrc || noImageMode) ? (
        <div className="preview-card-wrapper" style={getZoomStyle()}>
          
          {/* Output Preview Container Card */}
          <div 
            className="preview-background-card"
            onContextMenu={handleContextMenu}
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

            {/* Light Rays CSS Overlay */}
            {lightRaysStyle && lightRaysStyle !== 'none' && (
              <div 
                className="light-rays-overlay" 
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  opacity: lightRaysOpacity / 100,
                  pointerEvents: 'none',
                  zIndex: 0,
                  backgroundImage: (() => {
                    if (lightRaysStyle === 'diagonal') return getDiagonalBackground();
                    if (lightRaysStyle === 'spotlight') return getSpotlightBackground();
                    if (lightRaysStyle === 'aurora') return getAuroraBackground();
                    return undefined;
                  })(),
                }} 
              />
            )}

            {/* Grain Noise CSS Overlay */}
            {bgGrain > 0 && (
              <div 
                className="bg-grain-overlay" 
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  opacity: bgGrain / 100,
                  pointerEvents: 'none',
                  zIndex: 0,
                }} 
              />
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
                  {/* SVG Blur Overlay for Privacy Guard when style is blur */}
                  {redactions && redactionStyle === 'blur' && redactions.some(r => r.status === 'redacted') && (
                    <svg
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 15,
                      }}
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <filter id="privacy-guard-blur">
                          <feGaussianBlur stdDeviation="15" />
                        </filter>
                        <clipPath id="privacy-guard-clip">
                          {redactions
                            .filter((item) => item.status === 'redacted')
                            .map((item) => (
                              <rect
                                key={item.id}
                                x={item.x * 1000}
                                y={item.y * 1000}
                                width={item.w * 1000}
                                height={item.h * 1000}
                              />
                            ))}
                        </clipPath>
                      </defs>
                      <image
                        href={imageSrc || ''}
                        width="1000"
                        height="1000"
                        preserveAspectRatio="none"
                        clipPath="url(#privacy-guard-clip)"
                        filter="url(#privacy-guard-blur)"
                      />
                    </svg>
                  )}
                  {redactions && redactions.map((item) => {
                    const isHovered = item.id === hoveredRedactionId;
                    const isRedacted = item.status === 'redacted';
                    
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredRedactionId(item.id)}
                        onMouseLeave={() => setHoveredRedactionId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRedaction(item.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${item.x * 100}%`,
                          top: `${item.y * 100}%`,
                          width: `${item.w * 100}%`,
                          height: `${item.h * 100}%`,
                          backdropFilter: 'none',
                          backgroundColor: isRedacted 
                            ? (redactionStyle === 'solid' ? '#0f172a' : 'rgba(15, 23, 42, 0.35)') 
                            : 'rgba(16, 185, 129, 0.1)',
                          border: isRedacted 
                            ? (isHovered ? '2px solid var(--accent)' : '1px dashed oklch(0.55 0.18 25)') 
                            : (isHovered ? '2px solid var(--accent)' : '1px dashed rgba(16, 185, 129, 0.6)'),
                          boxShadow: isHovered ? '0 0 12px var(--accent)' : 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          zIndex: isHovered ? 25 : 20,
                          pointerEvents: activeTool === 'pointer' ? 'auto' : 'none',
                          transition: 'backdrop-filter 0.2s, background-color 0.2s, border 0.15s, box-shadow 0.15s',
                        }}
                        title={`${item.type}: ${item.text}\nClick to ${isRedacted ? 'reveal' : 'redact'}`}
                      />
                    );
                  })}
                  {/* Yellow dashed component highlights */}
                  {showComponentHighlights && cachedOcrResult && highlightedComponents && highlightedComponents.length > 0 && 
                    cachedOcrResult.words.map((word, idx) => {
                      const isMatch = highlightedComponents.some(comp => 
                        comp.toLowerCase().includes(word.text.toLowerCase()) || 
                        word.text.toLowerCase().includes(comp.toLowerCase())
                      );
                      if (!isMatch) return null;
                      return (
                        <div
                          key={`highlight-${idx}`}
                          style={{
                            position: 'absolute',
                            left: `${word.x * 100}%`,
                            top: `${word.y * 100}%`,
                            width: `${word.w * 100}%`,
                            height: `${word.h * 100}%`,
                            border: '1.5px dashed #facc15',
                            boxShadow: '0 0 6px rgba(250, 204, 21, 0.4)',
                            backgroundColor: 'rgba(250, 204, 21, 0.05)',
                            borderRadius: '2px',
                            pointerEvents: 'none',
                            zIndex: 22,
                          }}
                        />
                      );
                    })
                  }
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onGrabText={() => setGrabTextVisible(true)}
          hasImage={!!imageSrc}
        />
      )}

      {grabTextVisible && (
        <GrabTextModal onClose={() => setGrabTextVisible(false)} />
      )}
    </div>
  );
}
