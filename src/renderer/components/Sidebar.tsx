import { Plus, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { useAppContext } from '../AppContext';
import LayoutSettings from './LayoutSettings';
import BackgroundSettings from './BackgroundSettings';
import ExtraSettings from './ExtraSettings';

export default function Sidebar() {
  const {
    sidebarVisible,
    customPresets,
    newPresetName, setNewPresetName,
    setImageSrc,
    setHistory,
    setHistoryIndex,
    selectFile,
    pasteFromClipboard,
    saveCustomPreset,
    deleteCustomPreset,
    selectBackgroundPreset
  } = useAppContext();

  return (
    <div 
      className="sidebar"
      style={{
        width: sidebarVisible ? 'var(--sidebar-width)' : '0px',
        minWidth: sidebarVisible ? 'var(--sidebar-width)' : '0px',
        opacity: sidebarVisible ? 1 : 0,
        pointerEvents: sidebarVisible ? 'auto' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: sidebarVisible ? '1px solid var(--border-color)' : 'none',
        boxShadow: sidebarVisible ? '4px 0 24px rgba(0, 0, 0, 0.35)' : 'none',
      }}
    >
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>SnapFrame</span>
        </div>
        <button className="preset-delete-btn" onClick={() => {
          setImageSrc(null);
          setHistory([]);
          setHistoryIndex(-1);
        }}>
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="sidebar-content">
        
        {/* Snap / Change Actions */}
        <div className="btn-group">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={selectFile}>
            <Plus className="w-4 h-4" /> New snap
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={pasteFromClipboard}>
            <RotateCcw className="w-4 h-4" /> Paste
          </button>
        </div>

        {/* User Presets */}
        <div className="control-group">
          <div className="presets-header">
            <span className="control-label">User Presets</span>
          </div>
          
          <div className="color-picker-row">
            <input 
              type="text" 
              placeholder="Preset name..." 
              value={newPresetName} 
              onChange={(e) => setNewPresetName(e.target.value)} 
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
            />
            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={saveCustomPreset} title="Save current background">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {customPresets.length > 0 && (
            <div className="presets-list">
              {customPresets.map((p) => (
                <div key={p.id} className="preset-item" onClick={() => selectBackgroundPreset(p)}>
                  <span>{p.name}</span>
                  <button className="preset-delete-btn" onClick={(e) => deleteCustomPreset(p.id, e)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modular Sidebar Control Groups */}
        <LayoutSettings />
        <BackgroundSettings />
        <ExtraSettings />

      </div>
    </div>
  );
}
