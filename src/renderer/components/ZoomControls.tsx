import { Minus, Plus } from 'lucide-react';
import Tooltip from './Tooltip';

interface ZoomControlsProps {
  zoomLevel: string;
  actualZoom: number;
  setZoomLevel: (v: string) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

export default function ZoomControls({
  zoomLevel,
  actualZoom,
  setZoomLevel,
  handleZoomIn,
  handleZoomOut
}: ZoomControlsProps) {
  return (
    <div className="zoom-cluster" role="group" aria-label="Canvas zoom">
      <Tooltip position="top">
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          disabled={actualZoom <= 10}
          title="Zoom out (10%)"
          aria-label="Zoom out"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
      <Tooltip position="top">
        <button
          className={`zoom-btn zoom-value ${zoomLevel === '100%' ? 'active' : ''}`}
          onClick={() => setZoomLevel('100%')}
          title="Actual size (100%)"
          aria-label="Actual size (100%)"
          aria-pressed={zoomLevel === '100%'}
        >
          {Math.round(actualZoom)}%
        </button>
      </Tooltip>
      <Tooltip position="top">
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          disabled={actualZoom >= 500}
          title="Zoom in (10%)"
          aria-label="Zoom in"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </Tooltip>
      <span className="zoom-divider" aria-hidden="true" />
      <Tooltip position="top">
        <button
          className={`zoom-btn ${zoomLevel === 'Zoom to fit' ? 'active' : ''}`}
          onClick={() => setZoomLevel('Zoom to fit')}
          title="Fit canvas to window"
          aria-label="Fit canvas to window"
          aria-pressed={zoomLevel === 'Zoom to fit'}
        >
          Fit
        </button>
      </Tooltip>
    </div>
  );
}
