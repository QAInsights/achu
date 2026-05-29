import { Download, Copy, Share2 } from 'lucide-react';
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
      {/* Select Export Options */}
      <div style={{ display: 'flex', gap: '1px', background: 'var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
        <button 
          className="btn btn-secondary" 
          style={{ 
            border: 'none', 
            borderRadius: '0', 
            backgroundColor: exportFormat === 'png' ? 'var(--color-primary)' : 'var(--bg-card)',
            color: exportFormat === 'png' ? 'white' : 'var(--text-muted)'
          }}
          onClick={() => setExportFormat('png')}
        >
          PNG
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ 
            border: 'none', 
            borderRadius: '0', 
            backgroundColor: exportFormat === 'jpeg' ? 'var(--color-primary)' : 'var(--bg-card)',
            color: exportFormat === 'jpeg' ? 'white' : 'var(--text-muted)'
          }}
          onClick={() => setExportFormat('jpeg')}
        >
          JPG
        </button>
      </div>

      {exportFormat === 'jpeg' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quality:</span>
          <input 
            type="range" 
            min="30" 
            max="100" 
            value={jpegQuality} 
            onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
            style={{ width: '70px', height: '4px' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{jpegQuality}%</span>
        </div>
      )}

      <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

      <button className="btn btn-primary" onClick={triggerExport}>
        <Download className="w-4 h-4" /> Save Image
      </button>
      
      <button className="btn btn-secondary" onClick={copyBeautifiedImage}>
        <Copy className="w-4 h-4" /> Copy to Clipboard
      </button>

      <button className="btn btn-secondary" onClick={() => {
        alert('Shared link placeholder triggered! Image copied to clipboard as share item.');
        copyBeautifiedImage();
      }}>
        <Share2 className="w-4 h-4" /> Share
      </button>
    </div>
  );
}
