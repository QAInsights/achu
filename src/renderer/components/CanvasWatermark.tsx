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

  const opacity = watermarkOpacity !== undefined ? watermarkOpacity / 100 : 0.45;
  const fontSize = `${watermarkSize || 20}px`;
  const pad = `${padding / 2}px`;

  const getPositionStyles = () => {
    const pos = watermarkPosition || 'middle';
    const styles: React.CSSProperties = {
      position: 'absolute',
      opacity,
      fontSize,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: 2,
    };

    if (pos === 'left' || pos === 'top left') {
      styles.left = pad;
      styles.textAlign = 'left';
    } else if (pos === 'right' || pos === 'top right') {
      styles.right = pad;
      styles.textAlign = 'right';
    } else {
      styles.left = '50%';
      styles.transform = 'translateX(-50%)';
      styles.textAlign = 'center';
    }

    if (pos.startsWith('top')) {
      styles.top = pad;
    } else {
      styles.bottom = pad;
    }

    return styles;
  };

  return (
    <div className="preview-watermark" style={getPositionStyles()}>
      {watermarkText}
    </div>
  );
}
