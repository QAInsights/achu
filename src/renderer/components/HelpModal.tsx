import React from 'react';
import { useAppContext } from '../AppContext';
import { X, Heart, Github } from 'lucide-react';
import logoUrl from '../../../assets/logo.svg';
import packageJson from '../../../package.json';

export default function HelpModal() {
  const { helpVisible, setHelpVisible } = useAppContext();

  if (!helpVisible) return null;

  const currentYear = new Date().getFullYear();
  const platformName = window.snapFrameAPI ? window.snapFrameAPI.platform : navigator.platform;

  return (
    <div className="modal-overlay" onClick={() => setHelpVisible(false)}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '420px',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          className="preset-delete-btn"
          onClick={() => setHelpVisible(false)}
          title="Close help"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Row: Logo on left, App name & Version info on right */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', marginTop: '8px' }}>
          <img src={logoUrl} alt="Achu Logo" style={{ width: '64px', height: '64px' }} />
          <div>
            <h2 className="modal-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Achu
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Version {packageJson.version} ({platformName})
            </div>
          </div>
        </div>

        {/* Description */}
        <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          A lightweight, beautiful, and feature-rich screenshot beautifier designed to instantly elevate your snaps with layouts, mesh gradients, borders, shadows, and annotations.
        </p>

        {/* Link / Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, gap: '8px', fontSize: '0.85rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://buymeacoffee.com/qainsights') : window.open('https://buymeacoffee.com/qainsights', '_blank')}
            title="Donate"
          >
            <Heart className="w-4 h-4" style={{ color: '#ec4899' }} /> Donate
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, gap: '8px', fontSize: '0.85rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => window.snapFrameAPI ? window.snapFrameAPI.openURL('https://github.com/QAInsights/achu') : window.open('https://github.com/QAInsights/achu', '_blank')}
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" /> GitHub Repo
          </button>
        </div>

        {/* Footer info: Copyright and dynamic year */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>&copy; {currentYear} QAInsights</span>
          <button className="btn btn-primary" onClick={() => setHelpVisible(false)} style={{ padding: '0 16px', height: '32px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
