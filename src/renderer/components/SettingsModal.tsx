import React from 'react';
import { useAppContext } from '../AppContext';
import { X, Keyboard, Heart, Github } from 'lucide-react';

export default function SettingsModal() {
  const {
    settingsVisible,
    setSettingsVisible,
    padding,
    setPadding,
    rounded,
    setRounded,
    shadow,
    setShadow,
    watermarkEnabled,
    setWatermarkEnabled,
    watermarkText,
    setWatermarkText,
    exportFormat,
    setExportFormat,
    jpegQuality,
    setJpegQuality,
    pushHistory,
    getCurrentConfig,
  } = useAppContext();

  if (!settingsVisible) return null;

  const updateSetting = (key: string, val: any, setter: (v: any) => void) => {
    setter(val);
    try {
      const saved = localStorage.getItem('snapframe-user-defaults');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[key] = val;
      localStorage.setItem('snapframe-user-defaults', JSON.stringify(parsed));
    } catch (e) {}
    pushHistory(getCurrentConfig());
  };

  const handleReset = () => {
    localStorage.removeItem('snapframe-user-defaults');
    setPadding(38);
    setRounded(20);
    setShadow(30);
    setWatermarkEnabled(false);
    setWatermarkText('Achu');
    setExportFormat('png');
    setJpegQuality(90);
    pushHistory({
      ...getCurrentConfig(),
      padding: 38,
      rounded: 20,
      shadow: 30,
      watermarkEnabled: false,
      watermarkText: 'Achu',
    });
  };

  return (
    <div className="modal-overlay" onClick={() => setSettingsVisible(false)}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h2 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Preferences</h2>
          <button
            className="preset-delete-btn"
            onClick={() => setSettingsVisible(false)}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
          
          {/* Canvas Defaults Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>Canvas Defaults</h3>
            
            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Default Padding</span>
                <span className="control-value">{padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={padding}
                onChange={(e) => updateSetting('padding', parseInt(e.target.value, 10), setPadding)}
              />
            </div>

            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Default Border Radius</span>
                <span className="control-value">{rounded}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={rounded}
                onChange={(e) => updateSetting('rounded', parseInt(e.target.value, 10), setRounded)}
              />
            </div>

            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Default Shadow Blur</span>
                <span className="control-value">{shadow}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={shadow}
                onChange={(e) => updateSetting('shadow', parseInt(e.target.value, 10), setShadow)}
              />
            </div>
          </div>

          {/* Export Defaults Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>Export Preferences</h3>
            
            <div className="control-group">
              <span className="control-label">Default Format</span>
              <div className="format-toggle" style={{ marginTop: '4px' }}>
                <button
                  className={`format-toggle-btn ${exportFormat === 'png' ? 'active' : ''}`}
                  onClick={() => updateSetting('exportFormat', 'png', setExportFormat)}
                  style={{ flex: 1 }}
                >
                  PNG
                </button>
                <button
                  className={`format-toggle-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
                  onClick={() => updateSetting('exportFormat', 'jpeg', setExportFormat)}
                  style={{ flex: 1 }}
                >
                  JPEG
                </button>
              </div>
            </div>

            {exportFormat === 'jpeg' && (
              <div className="control-group">
                <div className="control-label-container">
                  <span className="control-label">JPEG Quality</span>
                  <span className="control-value">{jpegQuality}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={jpegQuality}
                  onChange={(e) => updateSetting('jpegQuality', parseInt(e.target.value, 10), setJpegQuality)}
                />
              </div>
            )}
          </div>

          {/* Watermark Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>Watermark Defaults</h3>
            
            <div className="switch-container">
              <span className="control-label">Enable Watermark by Default</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => updateSetting('watermarkEnabled', e.target.checked, setWatermarkEnabled)}
                />
                <span className="slider-switch" />
              </label>
            </div>

            <div className="control-group">
              <span className="control-label">Default Text</span>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => updateSetting('watermarkText', e.target.value, setWatermarkText)}
                style={{ marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Keyboard Shortcuts Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Keyboard className="w-3.5 h-3.5" /> Keyboard Shortcuts
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Paste Image</span>
                <div><kbd>Ctrl</kbd> <kbd>V</kbd> or <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>V</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Undo / Redo</span>
                <div><kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>Y</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Copy beautified snap</span>
                <div><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>S</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Delete Annotation</span>
                <div><kbd>Delete</kbd> or <kbd>Backspace</kbd></div>
              </div>
            </div>
          </div>

          {/* Support & Project Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0' }}>Support & Project</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, gap: '8px', fontSize: '0.8rem', height: '32px' }}
                onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://buymeacoffee.com/qainsights') : window.open('https://buymeacoffee.com/qainsights', '_blank')}
                title="Donate to QAInsights"
              >
                <Heart className="w-3.5 h-3.5" style={{ color: '#ec4899' }} /> Donate
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, gap: '8px', fontSize: '0.8rem', height: '32px' }}
                onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://github.com/QAInsights/achu') : window.open('https://github.com/QAInsights/achu', '_blank')}
                title="GitHub Repository"
              >
                <Github className="w-3.5 h-3.5" /> GitHub Repo
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.8rem', padding: '0 8px' }}>
            Reset Defaults
          </button>
          <button className="btn btn-primary" onClick={() => setSettingsVisible(false)} style={{ padding: '0 16px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
