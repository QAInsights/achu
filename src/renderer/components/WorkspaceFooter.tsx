import { Download, Copy } from 'lucide-react';
import { useAppContext } from '../AppContext';

export default function WorkspaceFooter() {
  const {
    imageSrc,
    noImageMode,
    exportFormat, setExportFormat,
    jpegQuality, setJpegQuality,
    triggerExport,
    copyBeautifiedImage
  } = useAppContext();

  if (!imageSrc && !noImageMode) return null;

  return (
    <div className="workspace-footer">
      {/* Format Toggle */}
      <div className="format-toggle">
        <button
          className={`format-toggle-btn ${exportFormat === 'png' ? 'active' : ''}`}
          onClick={() => setExportFormat('png')}
        >
          PNG
        </button>
        <button
          className={`format-toggle-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
          onClick={() => setExportFormat('jpeg')}
        >
          JPG
        </button>
      </div>

      {exportFormat === 'jpeg' && (
        <div className="quality-control">
          <span className="toolbar-control-label">Quality</span>
          <input
            type="range"
            min="30"
            max="100"
            value={jpegQuality}
            onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
          />
          <span className="quality-label">{jpegQuality}%</span>
        </div>
      )}

      <div className="toolbar-divider" />

      <button className="btn btn-primary" onClick={triggerExport}>
        <Download className="w-4 h-4" /> Export
      </button>

      <button className="btn btn-secondary" onClick={copyBeautifiedImage}>
        <Copy className="w-4 h-4" /> Copy
      </button>
    </div>
  );
}
