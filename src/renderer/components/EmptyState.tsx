import { Image as ImageIcon, Sparkles, Code } from 'lucide-react';
import { useAppContext } from '../AppContext';

export default function EmptyState() {
  const {
    selectFile,
    setNoImageMode,
    setBackgroundType,
    setImageSrc,
    pushHistory,
    getCurrentConfig,
    setCodeStudioActive,
  } = useAppContext();

  return (
    <div className="empty-state">
      <div onClick={selectFile} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ImageIcon className="empty-state-icon" />
        <h3 className="empty-state-title">Drag & Drop screenshot here</h3>
        <p className="empty-state-subtitle">Or click to select an image, or copy-paste directly (Ctrl+V)</p>
      </div>

      <div className="empty-state-actions">
        <div className="empty-state-divider">— OR —</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
          <button
            className="btn btn-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setCodeStudioActive(true);
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
            <Code className="w-4 h-4" /> Beautify Code
          </button>
        </div>
      </div>

      <div className="empty-state-hotkeys">
        <span>Hotkey:</span> <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>V</kbd> <span>to snap from clipboard</span>
      </div>
    </div>
  );
}
