import React from 'react';
import { useAppContext } from '../AppContext';
import { X, Sliders, Cpu, Keyboard, Search } from 'lucide-react';
import { clearUserDefaults, DEFAULT_SETTINGS } from '../utils/storageUtils';
import { getKeywordsForTab } from '../utils/settingsRegistry';
import AiIntegrationsSection from './AiIntegrationsSection';
import ShortcutsHelpSection from './ShortcutsHelpSection';
import GeneralSettingsTab from './GeneralSettingsTab';

type Tab = 'general' | 'ai' | 'shortcuts';

function countMatches(keywords: string, q: string): number {
  if (!q) return 0;
  return q.split(' ').filter(word => word && keywords.includes(word)).length;
}

export default function SettingsModal() {
  const {
    settingsVisible,
    setSettingsVisible,
    setPadding, setRounded, setShadow,
    setWatermarkEnabled, setWatermarkText, setWatermarkPosition,
    setWatermarkOpacity, setWatermarkFont, setWatermarkBold, setWatermarkItalic,
    setExportFormat, setJpegQuality, setCompressionMode,
    setSidebarPosition, setSecondarySidebarPosition,
    setAutoImportCaptured, setCaptureShortcut,
    pushHistory, getCurrentConfig,
  } = useAppContext();

  const [activeTab, setActiveTab] = React.useState<Tab>('general');
  const [searchQuery, setSearchQuery] = React.useState('');

  const q = searchQuery.toLowerCase().trim();

  React.useEffect(() => {
    if (!q) return;
    const scores: Record<Tab, number> = {
      general: countMatches(getKeywordsForTab('general'), q),
      ai: countMatches(getKeywordsForTab('ai'), q),
      shortcuts: countMatches(getKeywordsForTab('shortcuts'), q),
    };
    const best = (Object.entries(scores) as [Tab, number][])
      .sort((a, b) => b[1] - a[1])[0];
    if (best[1] > 0) setActiveTab(best[0]);
  }, [q]);

  if (!settingsVisible) return null;

  const handleClose = () => {
    setSettingsVisible(false);
    setSearchQuery('');
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
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '640px',
          height: 'min(680px, 85vh)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
          <h2 className="modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Preferences</h2>
          <button
            className="preset-delete-btn"
            onClick={handleClose}
            aria-label="Close preferences"
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="settings-search" style={{ marginBottom: '8px', flexShrink: 0, maxWidth: '100%', alignSelf: 'stretch', height: '28px' }}>
          <Search className="w-3 h-3" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            className="settings-search-input"
            type="text"
            placeholder="Search settings…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="settings-search-clear" onClick={() => setSearchQuery('')} type="button">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Two-column body: vertical tabs + scrollable content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', marginBottom: '8px' }}>
          {/* Tab Navigation */}
          <div className="settings-tabs" style={{ flexShrink: 0, width: '180px', overflowY: 'auto' }}>
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
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarGutter: 'stable', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px', paddingBottom: '8px' }}>

          {activeTab === 'general' && <GeneralSettingsTab searchQuery={searchQuery} />}

          {activeTab === 'ai' && <AiIntegrationsSection searchQuery={searchQuery} />}

          {activeTab === 'shortcuts' && <ShortcutsHelpSection searchQuery={searchQuery} />}
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.8rem', padding: '0 8px' }} type="button">
          Reset Defaults
        </button>
        <button className="btn btn-primary" onClick={handleClose} style={{ padding: '0 16px' }} type="button">
          Done
        </button>
      </div>
    </div>
  </div>
  );
}
