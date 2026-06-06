import React from 'react';

interface CanvasWatermarkProps {
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkSize?: number;
  watermarkPosition?: string;
  watermarkOpacity?: number;
  padding: number;
}

export default function CanvasWatermark({
  watermarkEnabled,
  watermarkText,
  watermarkSize,
  watermarkPosition,
  watermarkOpacity,
  padding
}: CanvasWatermarkProps) {
  if (!watermarkEnabled || !watermarkText) return null;

  const opacity = watermarkOpacity !== undefined ? watermarkOpacity : 0.45;
  const fontSizeNum = watermarkSize || 20;
  const fontSize = `${fontSizeNum}px`;
  // Safe inset: mirrors canvas drawWatermark logic — at least half a font-height so
  // the text never gets clipped by the card's border-radius / overflow:hidden
  const safeInset = `${Math.max(padding / 2, fontSizeNum * 0.5)}px`;

  const getPositionStyles = () => {
    const pos = watermarkPosition || 'middle';
    // Start by resetting all CSS-class position properties so .preview-watermark's
    // `left: 50%; transform: translateX(-50%); bottom: 12px` never leaks into non-center positions.
    const styles: React.CSSProperties = {
      position: 'absolute',
      opacity,
      fontSize,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 2,
      left: 'auto',
      right: 'auto',
      top: 'auto',
      bottom: 'auto',
      transform: 'none',
    };

    if (pos === 'left' || pos === 'top left') {
      styles.left = safeInset;
      styles.textAlign = 'left';
    } else if (pos === 'right' || pos === 'top right') {
      styles.right = safeInset;
      styles.textAlign = 'right';
    } else {
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      styles.textAlign = 'center';
    }

    if (pos.startsWith('top')) {
      styles.top = safeInset;
    } else {
      styles.bottom = safeInset;
    }

    return styles;
  };

  return (
    <div className="preview-watermark" style={getPositionStyles()}>
      {watermarkText}
    </div>
  );
}
