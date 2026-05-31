import React from 'react';
import { useAppContext } from '../AppContext';
import { X, Keyboard, Heart, Github } from 'lucide-react';
import { updateUserDefault, clearUserDefaults, DEFAULT_SETTINGS } from '../utils/storageUtils';
import Tooltip from './Tooltip';

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
    watermarkPosition,
    setWatermarkPosition,
    watermarkOpacity,
    setWatermarkOpacity,
    exportFormat,
    setExportFormat,
    jpegQuality,
    setJpegQuality,
    pushHistory,
    getCurrentConfig,
    sidebarPosition,
    setSidebarPosition,
  } = useAppContext();

  if (!settingsVisible) return null;

  const updateSetting = (key: string, val: any, setter: (v: any) => void) => {
    setter(val);
    updateUserDefault(key, val);
    pushHistory(getCurrentConfig());
  };

  const handleReset = () => {
    clearUserDefaults();
    setPadding(DEFAULT_SETTINGS.padding);
    setRounded(DEFAULT_SETTINGS.rounded);
    setShadow(DEFAULT_SETTINGS.shadow);
    setWatermarkEnabled(DEFAULT_SETTINGS.watermarkEnabled);
    setWatermarkText(DEFAULT_SETTINGS.watermarkText);
    setWatermarkPosition(DEFAULT_SETTINGS.watermarkPosition);
    setWatermarkOpacity(DEFAULT_SETTINGS.watermarkOpacity);
    setExportFormat(DEFAULT_SETTINGS.exportFormat);
    setJpegQuality(DEFAULT_SETTINGS.jpegQuality);
    setSidebarPosition(DEFAULT_SETTINGS.sidebarPosition);
    pushHistory({
      ...getCurrentConfig(),
      padding: DEFAULT_SETTINGS.padding,
      rounded: DEFAULT_SETTINGS.rounded,
      shadow: DEFAULT_SETTINGS.shadow,
      watermarkEnabled: DEFAULT_SETTINGS.watermarkEnabled,
      watermarkText: DEFAULT_SETTINGS.watermarkText,
      watermarkPosition: DEFAULT_SETTINGS.watermarkPosition,
      watermarkOpacity: DEFAULT_SETTINGS.watermarkOpacity,
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
          
          {/* General Settings Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>General Settings</h3>
            
            <div className="control-group">
              <span className="control-label">Sidebar Position</span>
              <div className="format-toggle" style={{ marginTop: '4px' }}>
                <button
                  className={`format-toggle-btn ${sidebarPosition === 'left' ? 'active' : ''}`}
                  onClick={() => updateSetting('sidebarPosition', 'left', setSidebarPosition)}
                  style={{ flex: 1 }}
                >
                  Left
                </button>
                <button
                  className={`format-toggle-btn ${sidebarPosition === 'right' ? 'active' : ''}`}
                  onClick={() => updateSetting('sidebarPosition', 'right', setSidebarPosition)}
                  style={{ flex: 1 }}
                >
                  Right
                </button>
              </div>
            </div>
          </div>

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

            <div className="control-group">
              <span className="control-label">Default Position</span>
              <select
                value={watermarkPosition}
                onChange={(e) => updateSetting('watermarkPosition', e.target.value, setWatermarkPosition)}
                style={{ marginTop: '4px' }}
              >
                <option value="left">Bottom Left</option>
                <option value="middle">Bottom Center</option>
                <option value="right">Bottom Right</option>
                <option value="top left">Top Left</option>
                <option value="top middle">Top Center</option>
                <option value="top right">Top Right</option>
              </select>
            </div>

            <div className="control-group">
              <div className="control-label-container">
                <span className="control-label">Default Opacity</span>
                <span className="control-value">{Math.round(watermarkOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(watermarkOpacity * 100)}
                onChange={(e) => updateSetting('watermarkOpacity', parseFloat(e.target.value) / 100, setWatermarkOpacity)}
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
              <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0', paddingTop: '6px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Toolbar Shortcuts</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Select / Move</span>
                <div><kbd>V</kbd> or <kbd>1</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rectangle (Outline / Filled)</span>
                <div><kbd>R</kbd> (<kbd>Shift+R</kbd> / <kbd>F</kbd> for Filled) or <kbd>2</kbd> / <kbd>3</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Circle (Outline / Filled)</span>
                <div><kbd>C</kbd> / <kbd>O</kbd> (<kbd>Shift+C</kbd> / <kbd>Shift+O</kbd> for Filled) or <kbd>4</kbd> / <kbd>5</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Straight Line / Arrow</span>
                <div><kbd>L</kbd> / <kbd>A</kbd> or <kbd>6</kbd> / <kbd>7</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Draw Text / Freehand Pen</span>
                <div><kbd>T</kbd> / <kbd>P</kbd> / <kbd>D</kbd> or <kbd>8</kbd> / <kbd>9</kbd></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Add Emoji</span>
                <div><kbd>E</kbd> or <kbd>0</kbd></div>
              </div>
            </div>
          </div>

          {/* Support & Project Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0' }}>Support & Project</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Tooltip position="top">
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, gap: '8px', fontSize: '0.8rem', height: '32px' }}
                  onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://buymeacoffee.com/qainsights') : window.open('https://buymeacoffee.com/qainsights', '_blank')}
                  title="Donate to QAInsights"
                >
                  <Heart className="w-3.5 h-3.5" style={{ color: '#ec4899' }} /> Donate
                </button>
              </Tooltip>
              <Tooltip position="top">
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, gap: '8px', fontSize: '0.8rem', height: '32px' }}
                  onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://github.com/QAInsights/achu') : window.open('https://github.com/QAInsights/achu', '_blank')}
                  title="GitHub Repository"
                >
                  <Github className="w-3.5 h-3.5" /> GitHub Repo
                </button>
              </Tooltip>
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
