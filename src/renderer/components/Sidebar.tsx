import { Plus, Trash2, Clipboard } from 'lucide-react';
import { useAppContext } from '../AppContext';
import logoUrl from '../../../assets/logo.svg';
import LayoutSettings from './LayoutSettings';
import BackgroundSettings from './BackgroundSettings';
import ExtraSettings from './ExtraSettings';
import Tooltip from './Tooltip';

export default function Sidebar() {
  const {
    sidebarVisible,
    customPresets,
    newPresetName, setNewPresetName,
    selectFile,
    pasteFromClipboard,
    saveCustomPreset,
    deleteCustomPreset,
    selectBackgroundPreset
  } = useAppContext();

  return (
    <div className={`sidebar ${sidebarVisible ? '' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title">
          <img src={logoUrl} alt="Achu" className="sidebar-logo" />
          <span>Achu</span>
        </div>
      </div>

      <div className="sidebar-content">
        {/* Snap / Change Actions */}
        <div className="sidebar-actions">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={selectFile}>
            <Plus className="w-4 h-4" /> New snap
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={pasteFromClipboard}>
            <Clipboard className="w-4 h-4" /> Paste
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
              style={{ flex: 1 }}
            />
            <Tooltip position="top">
              <button className="btn btn-secondary" onClick={saveCustomPreset} title="Save current background" style={{ width: '36px', padding: 0, flexShrink: 0 }}>
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {customPresets.length > 0 && (
            <div className="presets-list">
              {customPresets.map((p) => (
                <div key={p.id} className="preset-item" onClick={() => selectBackgroundPreset(p)}>
                  <span>{p.name}</span>
                  <Tooltip content="Delete preset" position="left">
                    <button className="preset-delete-btn" onClick={(e) => deleteCustomPreset(p.id, e)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
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
