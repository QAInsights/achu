import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { X, Heart, Github } from 'lucide-react';
import logoUrl from '../../../assets/logo.svg';
import packageJson from '../../../package.json';

export default function HelpModal() {
  const { helpVisible, setHelpVisible } = useAppContext();
  const [copied, setCopied] = useState(false);

  if (!helpVisible) return null;

  const currentYear = new Date().getFullYear();
  const platformName = window.snapFrameAPI ? window.snapFrameAPI.platform : navigator.platform;
  
  const getVersions = () => {
    const apiVersions = window.snapFrameAPI?.versions;
    // If we have actual Electron version from API, use it
    if (apiVersions && apiVersions.electron && apiVersions.electron !== 'N/A') {
      return apiVersions;
    }
    
    // Fallback: Parse from userAgent if preload script is stale or running in browser
    const ua = navigator.userAgent;
    const electronMatch = ua.match(/Electron\/([\d.]+)/);
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
    return {
      electron: electronMatch ? electronMatch[1] : 'N/A',
      chrome: chromeMatch ? chromeMatch[1] : 'N/A',
      node: apiVersions?.node || 'N/A',
      v8: apiVersions?.v8 || 'N/A'
    };
  };

  const versions = getVersions();
  const osInfo = window.snapFrameAPI?.osInfo || navigator.userAgent || 'Unknown OS';

  const handleCopy = () => {
    const textToCopy = [
      `Achu Version: ${packageJson.version}`,
      `Electron: ${versions.electron}`,
      `Chromium: ${versions.chrome}`,
      `Node.js: ${versions.node}`,
      `V8: ${versions.v8}`,
      `OS: ${osInfo}`
    ].join('\n');

    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

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
        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          A lightweight, beautiful, and feature-rich screenshot beautifier designed to instantly elevate your snaps with layouts, mesh gradients, borders, shadows, and annotations.
        </p>

        {/* System Specs List */}
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '0.78rem',
            fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '20px'
          }}
        >
          <div><strong>Achu Version:</strong> {packageJson.version}</div>
          <div><strong>Electron:</strong> {versions.electron}</div>
          <div><strong>Chromium:</strong> {versions.chrome}</div>
          <div><strong>Node.js:</strong> {versions.node}</div>
          <div><strong>V8:</strong> {versions.v8}</div>
          <div><strong>OS:</strong> {osInfo}</div>
        </div>

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
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCopy}
              style={{ padding: '0 12px', height: '32px', fontSize: '0.8rem' }}
              title="Copy version info"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button className="btn btn-primary" onClick={() => setHelpVisible(false)} style={{ padding: '0 16px', height: '32px' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
