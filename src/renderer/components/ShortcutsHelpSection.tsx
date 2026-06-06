import { Keyboard, Heart, Github } from 'lucide-react';
import Tooltip from './Tooltip';

export default function ShortcutsHelpSection() {
  return (
    <>
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
    </>
  );
}
