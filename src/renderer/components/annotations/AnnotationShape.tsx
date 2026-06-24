import { Annotation } from '../../canvasRenderer';
import { getCurvedArrowPoints, getTaperedCurvedArrowPoints } from '../../arrowUtils';

interface AnnotationShapeProps {
  ann: Annotation;
  dimensions: { width: number; height: number };
  rectW: number;
  rectH: number;
  w: number;
  h: number;
  strokeW: number;
  editingTextId: string | null;
  previewFont?: string | null;
}

export default function AnnotationShape({
  ann,
  rectW,
  rectH,
  w,
  h,
  strokeW,
  editingTextId,
  previewFont,
}: AnnotationShapeProps) {
  if (ann.type === 'rect') {
    return (
      <rect
        x={-rectW / 2}
        y={-rectH / 2}
        width={rectW}
        height={rectH}
        stroke={ann.color}
        strokeWidth={strokeW}
        fill="none"
      />
    );
  }

  if (ann.type === 'filled-rect') {
    return (
      <rect
        x={-rectW / 2}
        y={-rectH / 2}
        width={rectW}
        height={rectH}
        rx={Math.min(8, rectW * 0.1, rectH * 0.1)}
        ry={Math.min(8, rectW * 0.1, rectH * 0.1)}
        fill={ann.color}
      />
    );
  }

  if (ann.type === 'circle') {
    return (
      <ellipse
        cx={0}
        cy={0}
        rx={rectW / 2}
        ry={rectH / 2}
        stroke={ann.color}
        strokeWidth={strokeW}
        fill="none"
      />
    );
  }

  if (ann.type === 'filled-circle') {
    return (
      <ellipse
        cx={0}
        cy={0}
        rx={rectW / 2}
        ry={rectH / 2}
        fill={ann.color}
      />
    );
  }

  if (ann.type === 'line') {
    return (
      <line
        x1={-w / 2}
        y1={-h / 2}
        x2={w / 2}
        y2={h / 2}
        stroke={ann.color}
        strokeWidth={strokeW}
      />
    );
  }

  if (ann.type === 'arrow') {
    const style = ann.arrowStyle || 'classic';
    if (style === 'tapered') {
      const pts = getTaperedCurvedArrowPoints(-w / 2, -h / 2, w / 2, h / 2, strokeW);
      if (pts) {
        const leftPath = pts.leftPoints.map(p => `${p.x},${p.y}`).join(' ');
        const rightPath = [...pts.rightPoints].reverse().map(p => `${p.x},${p.y}`).join(' ');
        const pointsStr = `${leftPath} ${pts.H_left.x},${pts.H_left.y} ${pts.tip.x},${pts.tip.y} ${pts.H_right.x},${pts.H_right.y} ${rightPath}`;
        return (
          <polygon
            points={pointsStr}
            fill={ann.color}
          />
        );
      }
    } else if (style === 'curved') {
      const info = getCurvedArrowPoints(-w / 2, -h / 2, w / 2, h / 2, strokeW);
      if (info) {
        return (
          <g>
            <path
              d={`M ${info.x0} ${info.y0} Q ${info.cx} ${info.cy} ${info.x_h} ${info.y_h}`}
              stroke={ann.color}
              strokeWidth={strokeW}
              fill="none"
              strokeLinecap="round"
            />
            <polygon
              points={`${info.x1},${info.y1} ${info.arrow1X},${info.arrow1Y} ${info.arrow2X},${info.arrow2Y}`}
              fill={ann.color}
            />
          </g>
        );
      }
    } else {
      const isDashed = style === 'dashed';
      const angle = Math.atan2(h, w);
      const headLen = Math.max(12, strokeW * 3);
      const endX = w / 2;
      const endY = h / 2;
      const arrow1X = endX - headLen * Math.cos(angle - Math.PI / 6);
      const arrow1Y = endY - headLen * Math.sin(angle - Math.PI / 6);
      const arrow2X = endX - headLen * Math.cos(angle + Math.PI / 6);
      const arrow2Y = endY - headLen * Math.sin(angle + Math.PI / 6);

      return (
        <g>
          <line
            x1={-w / 2}
            y1={-h / 2}
            x2={endX - (headLen * 0.5) * Math.cos(angle)}
            y2={endY - (headLen * 0.5) * Math.sin(angle)}
            stroke={ann.color}
            strokeWidth={strokeW}
            strokeDasharray={isDashed ? `${strokeW * 2} ${strokeW * 1.5}` : undefined}
          />
          <polygon
            points={`${endX},${endY} ${arrow1X},${arrow1Y} ${arrow2X},${arrow2Y}`}
            fill={ann.color}
          />
        </g>
      );
    }
  }

  if (ann.type === 'text' && ann.text && ann.id !== editingTextId) {
    const fSize = ann.fontSize || Math.max(12, rectH * 0.7);
    const style = ann.fontItalic ? 'italic' : 'normal';
    const weight = ann.fontBold !== false ? 'bold' : 'normal';
    const outlineEnabled = ann.outlineEnabled === true;
    const outlineColor = ann.outlineColor || '#000000';
    const outlineW = ann.outlineWidth !== undefined
      ? ann.outlineWidth
      : Math.max(2, fSize * 0.15);
    return (
      <text
        x={0}
        y={0}
        fill={ann.color}
        fontSize={`${fSize}px`}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: previewFont || ann.fontFamily || 'var(--font-sans)',
          fontWeight: weight,
          fontStyle: style,
          paintOrder: 'stroke',
          stroke: outlineEnabled ? outlineColor : 'none',
          strokeWidth: outlineEnabled ? `${outlineW}px` : 0,
          strokeLinejoin: 'round',
        }}
      >
        {ann.text}
      </text>
    );
  }

  if (ann.type === 'emoji' && ann.text) {
    return (
      <text
        x={0}
        y={0}
        fill="black"
        fontSize={`${Math.min(rectW, rectH)}px`}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif'
        }}
      >
        {ann.text}
      </text>
    );
  }

  if (ann.type === 'pen' && ann.points) {
    const pathData = ann.points.length > 0
      ? `M ${-w / 2 + ann.points[0].x * w} ${-h / 2 + ann.points[0].y * h} ` +
        ann.points.slice(1).map(p => `L ${-w / 2 + p.x * w} ${-h / 2 + p.y * h}`).join(' ')
      : '';
    return (
      <path
        d={pathData}
        stroke={ann.color}
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }

  if (ann.type === 'image' && ann.imageSrc) {
    return (
      <image
        href={ann.imageSrc}
        x={-rectW / 2}
        y={-rectH / 2}
        width={rectW}
        height={rectH}
        preserveAspectRatio="none"
      />
    );
  }

  return null;
}
