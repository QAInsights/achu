import React from 'react';
import { Keyboard, Heart, Github } from 'lucide-react';
import Tooltip from './Tooltip';
import { getModKeyLabel } from '../utils/shortcutLabels';
import { registerSettingsSection } from '../utils/settingsRegistry';

const SHORTCUTS = [
  { label: 'Paste Image', keys: 'ctrl v alt' },
  { label: 'Undo / Redo', keys: 'ctrl z y' },
  { label: 'Save to Gallery', keys: 'mod s save' },
  { label: 'Export to file', keys: 'mod shift s export' },
  { label: 'Delete Annotation', keys: 'delete backspace annotation' },
];

const TOOLBAR_SHORTCUTS = [
  { label: 'Select / Move', keys: 'v 1 select move' },
  { label: 'Rectangle (Outline / Filled)', keys: 'r f 2 3 rectangle outline filled' },
  { label: 'Circle (Outline / Filled)', keys: 'c o 4 5 circle outline filled' },
  { label: 'Straight Line / Arrow', keys: 'l a 6 7 line arrow straight' },
  { label: 'Draw Text / Freehand Pen', keys: 't p d 8 9 text freehand pen draw' },
  { label: 'Add Emoji', keys: 'e 0 emoji' },
];

const SUPPORT_KEYWORDS = 'support project donate donation github repo repository buy coffee';

registerSettingsSection({ tab: 'shortcuts', label: 'Keyboard Shortcuts', keywords: 'keyboard shortcut paste undo redo save delete export select move rectangle circle line arrow text pen emoji' });
registerSettingsSection({ tab: 'shortcuts', label: 'Support & Project', keywords: SUPPORT_KEYWORDS });

export default function ShortcutsHelpSection({ searchQuery = '' }: { searchQuery?: string }) {
  const q = searchQuery.toLowerCase();
  const matchItem = (text: string) => !q || text.toLowerCase().includes(q);
  const filteredShortcuts = SHORTCUTS.filter(s => matchItem(s.label) || matchItem(s.keys));
  const filteredToolbar = TOOLBAR_SHORTCUTS.filter(s => matchItem(s.label) || matchItem(s.keys));
  const showShortcuts = filteredShortcuts.length > 0 || filteredToolbar.length > 0;
  const showSupport = !q || SUPPORT_KEYWORDS.split(' ').some(w => w.includes(q));

  if (!showShortcuts && !showSupport) {
    return <div className="settings-no-results">No settings match "{searchQuery}"</div>;
  }

  return (
    <>
      {showShortcuts && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Keyboard className="w-3.5 h-3.5" /> Keyboard Shortcuts
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
          {filteredShortcuts.map((s, i) => (
            <React.Fragment key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                {s.label === 'Paste Image' && <div><kbd>Ctrl</kbd> <kbd>V</kbd> or <kbd>Ctrl</kbd> <kbd>Alt</kbd> <kbd>V</kbd></div>}
                {s.label === 'Undo / Redo' && <div><kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>Y</kbd></div>}
                {s.label === 'Save to Gallery' && <div><kbd>{getModKeyLabel()}</kbd> <kbd>S</kbd></div>}
                {s.label === 'Export to file' && <div><kbd>{getModKeyLabel()}</kbd> <kbd>Shift</kbd> <kbd>S</kbd></div>}
                {s.label === 'Delete Annotation' && <div><kbd>Delete</kbd> or <kbd>Backspace</kbd></div>}
              </div>
              {i === filteredShortcuts.length - 1 && filteredToolbar.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0', paddingTop: '6px' }} />
              )}
            </React.Fragment>
          ))}
          {filteredToolbar.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Toolbar Shortcuts</div>
              {filteredToolbar.map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  {s.label === 'Select / Move' && <div><kbd>V</kbd> or <kbd>1</kbd></div>}
                  {s.label === 'Rectangle (Outline / Filled)' && <div><kbd>R</kbd> (<kbd>Shift+R</kbd> / <kbd>F</kbd> for Filled) or <kbd>2</kbd> / <kbd>3</kbd></div>}
                  {s.label === 'Circle (Outline / Filled)' && <div><kbd>C</kbd> / <kbd>O</kbd> (<kbd>Shift+C</kbd> / <kbd>Shift+O</kbd> for Filled) or <kbd>4</kbd> / <kbd>5</kbd></div>}
                  {s.label === 'Straight Line / Arrow' && <div><kbd>L</kbd> / <kbd>A</kbd> or <kbd>6</kbd> / <kbd>7</kbd></div>}
                  {s.label === 'Draw Text / Freehand Pen' && <div><kbd>T</kbd> / <kbd>P</kbd> / <kbd>D</kbd> or <kbd>8</kbd> / <kbd>9</kbd></div>}
                  {s.label === 'Add Emoji' && <div><kbd>E</kbd> or <kbd>0</kbd></div>}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      )}

      {showSupport && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0' }}>Support & Project</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Tooltip position="top">
            <button
              className="btn btn-secondary"
              style={{ flex: 1, gap: '8px', fontSize: '0.8rem', height: '32px' }}
              onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://buymeacoffee.com/qainsights') : window.open('https://buymeacoffee.com/qainsights', '_blank')}
              title="Donate to QAInsights"
              type="button"
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
              type="button"
            >
              <Github className="w-3.5 h-3.5" /> GitHub Repo
            </button>
          </Tooltip>
        </div>
      </div>
      )}
    </>
  );
}
