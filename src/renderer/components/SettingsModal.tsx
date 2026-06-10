import React from 'react';
import { useAppContext } from '../AppContext';
import { X, Sliders, Cpu, Keyboard } from 'lucide-react';
import { updateUserDefault, clearUserDefaults, DEFAULT_SETTINGS } from '../utils/storageUtils';
import AiIntegrationsSection from './AiIntegrationsSection';
import ShortcutsHelpSection from './ShortcutsHelpSection';

export default function SettingsModal() {
  const {
    settingsVisible,
    setSettingsVisible,
    padding, setPadding,
    rounded, setRounded,
    shadow, setShadow,
    watermarkEnabled, setWatermarkEnabled,
    watermarkText, setWatermarkText,
    watermarkPosition, setWatermarkPosition,
    watermarkOpacity, setWatermarkOpacity,
    watermarkFont = 'sans-serif', setWatermarkFont,
    watermarkBold = false, setWatermarkBold,
    watermarkItalic = false, setWatermarkItalic,
    systemFonts = [],
    exportFormat, setExportFormat,
    jpegQuality, setJpegQuality,
    compressionMode, setCompressionMode,
    pushHistory,
    getCurrentConfig,
    sidebarPosition, setSidebarPosition,
    secondarySidebarPosition, setSecondarySidebarPosition,
    autoImportCaptured, setAutoImportCaptured,
    captureShortcut, setCaptureShortcut,
  } = useAppContext();

  const [activeTab, setActiveTab] = React.useState<'general' | 'ai' | 'shortcuts'>('general');

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
    setWatermarkPosition(DEFAULT_SETTINGS.watermarkPosition as any);
    setWatermarkOpacity(DEFAULT_SETTINGS.watermarkOpacity);
    setWatermarkFont(DEFAULT_SETTINGS.watermarkFont);
    setWatermarkBold(DEFAULT_SETTINGS.watermarkBold);
    setWatermarkItalic(DEFAULT_SETTINGS.watermarkItalic);
    setExportFormat(DEFAULT_SETTINGS.exportFormat);
    setJpegQuality(DEFAULT_SETTINGS.jpegQuality);
    setCompressionMode(DEFAULT_SETTINGS.compressionMode);
    setSidebarPosition(DEFAULT_SETTINGS.sidebarPosition);
    setSecondarySidebarPosition(DEFAULT_SETTINGS.secondarySidebarPosition);
    setAutoImportCaptured(true);
    setCaptureShortcut('PrintScreen');
    pushHistory({
      ...getCurrentConfig(),
      padding: DEFAULT_SETTINGS.padding,
      rounded: DEFAULT_SETTINGS.rounded,
      shadow: DEFAULT_SETTINGS.shadow,
      watermarkEnabled: DEFAULT_SETTINGS.watermarkEnabled,
      watermarkText: DEFAULT_SETTINGS.watermarkText,
      watermarkPosition: DEFAULT_SETTINGS.watermarkPosition as any,
      watermarkOpacity: DEFAULT_SETTINGS.watermarkOpacity,
      watermarkFont: DEFAULT_SETTINGS.watermarkFont,
      watermarkBold: DEFAULT_SETTINGS.watermarkBold,
      watermarkItalic: DEFAULT_SETTINGS.watermarkItalic,
      autoImportCaptured: true,
      captureShortcut: 'PrintScreen',
    });
  };

  return (
    <div className="modal-overlay" onClick={() => setSettingsVisible(false)}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '500px',
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
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs" style={{ flexShrink: 0 }}>
          <button
            className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            type="button"
          >
            <Sliders className="w-3.5 h-3.5" /> General
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            type="button"
          >
            <Cpu className="w-3.5 h-3.5" /> AI Integrations
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            type="button"
          >
            <Keyboard className="w-3.5 h-3.5" /> Shortcuts & Support
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px', paddingBottom: '8px' }}>
          
          {activeTab === 'general' && (
            <>
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
                      type="button"
                    >
                      Left
                    </button>
                    <button
                      className={`format-toggle-btn ${sidebarPosition === 'right' ? 'active' : ''}`}
                      onClick={() => updateSetting('sidebarPosition', 'right', setSidebarPosition)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Right
                    </button>
                  </div>
                </div>

                <div className="control-group">
                  <span className="control-label">AI & OCR Sidebar Position</span>
                  <div className="format-toggle" style={{ marginTop: '4px' }}>
                    <button
                      className={`format-toggle-btn ${secondarySidebarPosition === 'left' ? 'active' : ''}`}
                      onClick={() => updateSetting('secondarySidebarPosition', 'left', setSecondarySidebarPosition)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Left
                    </button>
                    <button
                      className={`format-toggle-btn ${secondarySidebarPosition === 'right' ? 'active' : ''}`}
                      onClick={() => updateSetting('secondarySidebarPosition', 'right', setSecondarySidebarPosition)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>

              {/* Screen Capture Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>Screen Capture</h3>
                
                <div className="switch-container">
                  <span className="control-label">Auto-Import from Clipboard on Focus</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={autoImportCaptured}
                      onChange={(e) => updateSetting('autoImportCaptured', e.target.checked, setAutoImportCaptured)}
                    />
                    <span className="slider-switch" />
                  </label>
                </div>

                <div className="control-group">
                  <span className="control-label">Global Capture Shortcut</span>
                  <select
                    value={captureShortcut}
                    onChange={(e) => updateSetting('captureShortcut', e.target.value, setCaptureShortcut)}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="PrintScreen">Print Screen</option>
                    <option value="CommandOrControl+Shift+S">Ctrl + Shift + S</option>
                    <option value="CommandOrControl+Alt+S">Ctrl + Alt + S</option>
                    <option value="Disabled">Disabled</option>
                  </select>
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
                      type="button"
                    >
                      PNG
                    </button>
                    <button
                      className={`format-toggle-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
                      onClick={() => updateSetting('exportFormat', 'jpeg', setExportFormat)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      JPEG
                    </button>
                    <button
                      className={`format-toggle-btn ${exportFormat === 'webp' ? 'active' : ''}`}
                      onClick={() => updateSetting('exportFormat', 'webp', setExportFormat)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      WebP
                    </button>
                  </div>
                </div>
                {(exportFormat === 'jpeg' || exportFormat === 'webp') && (
                  <div className="control-group">
                    <div className="control-label-container">
                      <span className="control-label">Quality</span>
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
                <div className="control-group">
                  <span className="control-label">Default Optimization</span>
                  <div className="format-toggle" style={{ marginTop: '4px' }}>
                    <button
                      className={`format-toggle-btn ${compressionMode === 'original' ? 'active' : ''}`}
                      onClick={() => updateSetting('compressionMode', 'original', setCompressionMode)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Original
                    </button>
                    <button
                      className={`format-toggle-btn ${compressionMode === 'balanced' ? 'active' : ''}`}
                      onClick={() => updateSetting('compressionMode', 'balanced', setCompressionMode)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Balanced
                    </button>
                    <button
                      className={`format-toggle-btn ${compressionMode === 'small' ? 'active' : ''}`}
                      onClick={() => updateSetting('compressionMode', 'small', setCompressionMode)}
                      style={{ flex: 1 }}
                      type="button"
                    >
                      Small
                    </button>
                  </div>
                </div>
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
                  <span className="control-label">Default Font Family</span>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <select
                      value={watermarkFont}
                      onChange={(e) => updateSetting('watermarkFont', e.target.value, setWatermarkFont)}
                      style={{ flex: 1 }}
                    >
                      {systemFonts.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <button
                      className={`btn btn-secondary ${watermarkBold ? 'active' : ''}`}
                      style={{
                        padding: '0 8px',
                        fontWeight: 'bold',
                        backgroundColor: watermarkBold ? 'var(--accent)' : 'var(--surface-2)',
                        color: watermarkBold ? 'var(--on-accent)' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        height: '28px',
                      }}
                      onClick={() => updateSetting('watermarkBold', !watermarkBold, setWatermarkBold)}
                      title="Bold"
                      type="button"
                    >
                      B
                    </button>
                    <button
                      className={`btn btn-secondary ${watermarkItalic ? 'active' : ''}`}
                      style={{
                        padding: '0 8px',
                        fontStyle: 'italic',
                        backgroundColor: watermarkItalic ? 'var(--accent)' : 'var(--surface-2)',
                        color: watermarkItalic ? 'var(--on-accent)' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '4px',
                        height: '28px',
                      }}
                      onClick={() => updateSetting('watermarkItalic', !watermarkItalic, setWatermarkItalic)}
                      title="Italic"
                      type="button"
                    >
                      I
                    </button>
                  </div>
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
            </>
          )}

          {activeTab === 'ai' && <AiIntegrationsSection />}

          {activeTab === 'shortcuts' && <ShortcutsHelpSection />}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.8rem', padding: '0 8px' }} type="button">
            Reset Defaults
          </button>
          <button className="btn btn-primary" onClick={() => setSettingsVisible(false)} style={{ padding: '0 16px' }} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
