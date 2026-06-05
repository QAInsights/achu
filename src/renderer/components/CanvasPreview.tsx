import { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import AnnotationsLayer from '../AnnotationsLayer';
import { zoomIn, zoomOut, getFixedSizeFromAspectRatio } from '../utils/layoutUtils';
import Tooltip from './Tooltip';
import { platformPresets } from '../presetsData';
import ContextMenu from './ContextMenu';
import GrabTextModal from './GrabTextModal';

// Modular Subcomponents
import ChromeMockup from './ChromeMockup';
import ZoomControls from './ZoomControls';
import CanvasWatermark from './CanvasWatermark';
import EmptyState from './EmptyState';

// Background Utility functions
import {
  getDiagonalBackground,
  getSpotlightBackground,
  getAuroraBackground,
  getBackgroundStyle
} from '../utils/previewBgUtils';

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
    backgroundValue,
    aspectRatio,
    canvasWidth,
    canvasHeight,
    paddingMode,
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
    imageSrc,
    selectFile,
    getZoomStyle,
    zoomLevel, setZoomLevel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    selectedPreset,
    showSafeZone,
    annotations,
    setAnnotations,
    annotationColor,
    setAnnotationColor,
    annotationStrokeWidth,
    getCurrentConfig,
    pushHistory,
    customPrompt,
    redactions = [],
    toggleRedaction = () => {},
    hoveredRedactionId = null,
    setHoveredRedactionId = () => {},
    redactionStyle = 'solid',
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
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
              padding: paddingMode === 'fill' ? '0px' : `${padding}px`,
              boxSizing: 'content-box',
              ...getBackgroundStyle(backgroundType, backgroundValue, imageSrc, meshDataUrl),
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
                    if (lightRaysStyle === 'diagonal') return getDiagonalBackground(lightRaysAngle, lightRaysSourceX, lightRaysSourceY, lightRaysCount);
                    if (lightRaysStyle === 'spotlight') return getSpotlightBackground(lightRaysSourceX, lightRaysSourceY);
                    if (lightRaysStyle === 'aurora') return getAuroraBackground(lightRaysAngle, lightRaysSourceX, lightRaysSourceY);
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
                  width: aspectRatio === 'Auto'
                    ? '100%'
                    : paddingMode === 'fill'
                      ? imgDims
                        ? `${Math.round(imgDims.width * (scale / 100))}px`
                        : `${scale}%`
                      : imgDims
                        ? `${Math.round(imgDims.width * (scale / 100))}px`
                        : `calc((100% - ${padding * 2}px) * ${scale / 100})`,
                  maxWidth: aspectRatio === 'Auto' ? '100%' : paddingMode === 'fill' ? 'none' : `calc(100% - ${padding * 2}px)`,
                  maxHeight: aspectRatio === 'Auto' ? '100%' : paddingMode === 'fill' ? 'none' : `calc(100% - ${padding * 2}px)`,
                  zIndex: 1,
                  ...getPreviewPositionStyle(position || 'Middle center', padding, aspectRatio),
                }}
              >
                {/* Title Bar Mockup */}
                <ChromeMockup chromeStyle={chromeStyle} chromeTheme={chromeTheme || 'dark'} />

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
                      width: aspectRatio === 'Auto' ? 'auto' : '100%',
                      maxWidth: '100%',
                      maxHeight: aspectRatio === 'Auto' ? '100%' : undefined,
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
                        href={imageSrc}
                        width="1000"
                        height="1000"
                        preserveAspectRatio="none"
                        clipPath="url(#privacy-guard-clip)"
                        filter="url(#privacy-guard-blur)"
                      />
                    </svg>
                  )}

                  {/* SVG Solid Block Overlay for Privacy Guard */}
                  {redactions && redactionStyle === 'solid' && redactions.some(r => r.status === 'redacted') && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 15 }}>
                      {redactions
                        .filter((item) => item.status === 'redacted')
                        .map((item) => (
                          <div
                            key={item.id}
                            style={{
                              position: 'absolute',
                              left: `${item.x * 100}%`,
                              top: `${item.y * 100}%`,
                              width: `${item.w * 100}%`,
                              height: `${item.h * 100}%`,
                              backgroundColor: '#000000',
                              border: hoveredRedactionId === item.id ? '2px dashed #3b82f6' : 'none',
                              cursor: 'pointer',
                              pointerEvents: 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRedaction(item.id);
                            }}
                            onMouseEnter={() => setHoveredRedactionId(item.id)}
                            onMouseLeave={() => setHoveredRedactionId(null)}
                          />
                        ))}
                    </div>
                  )}

                  {/* Annotations drawing layer */}
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

            {/* Watermark Overlay */}
            <CanvasWatermark
              watermarkEnabled={watermarkEnabled}
              watermarkText={watermarkText}
              watermarkSize={watermarkSize}
              watermarkPosition={watermarkPosition}
              watermarkOpacity={watermarkOpacity}
              padding={padding}
            />

          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Zoom controls cluster */}
      {(imageSrc || noImageMode) && (
        <ZoomControls
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
        />
      )}

      {/* OCR/Text modal */}
      {grabTextVisible && (
        <GrabTextModal onClose={() => setGrabTextVisible(false)} />
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onGrabText={() => setGrabTextVisible(true)}
        />
      )}
    </div>
  );
}
