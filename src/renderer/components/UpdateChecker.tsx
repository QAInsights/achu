import { useState, useEffect } from 'react';
import { ArrowUpCircle, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';

export default function UpdateChecker() {
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'no-update' | 'update-available' | 'downloading' | 'error' | 'success'>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<boolean>(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (updateStatus === 'downloading') {
      unsubscribe = window.snapFrameAPI?.onUpdateProgress((progress: number) => {
        setDownloadProgress(progress);
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [updateStatus]);

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      if (!window.snapFrameAPI || typeof window.snapFrameAPI.checkForUpdates !== 'function') {
        throw new Error('Update API is not available in this environment');
      }
      const result = await window.snapFrameAPI.checkForUpdates();
      if (result.available) {
        setLatestVersion(result.version);
        setReleaseNotes(result.releaseNotes);
        setDownloadUrl(result.downloadUrl);
        setUpdateStatus('update-available');
      } else {
        setUpdateStatus('no-update');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to check for updates');
      setUpdateStatus('error');
    }
  };

  const handleStartUpdate = async () => {
    if (!downloadUrl) return;
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    try {
      const result = await window.snapFrameAPI.startUpdate(downloadUrl);
      if (result && result.simulated) {
        setSimulated(true);
        setUpdateStatus('success');
      } else if (result && result.opened) {
        setUpdateStatus('success');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to download and install update');
      setUpdateStatus('error');
    }
  };

  return (
    <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {updateStatus === 'idle' && (
        <button
          className="btn btn-secondary"
          style={{ width: '100%', fontSize: '0.85rem', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleCheckUpdates}
          type="button"
        >
          <RefreshCw className="w-4 h-4" /> Check for Updates
        </button>
      )}

      {updateStatus === 'checking' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '10px'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid var(--text-tertiary)',
            borderTopColor: 'var(--accent, #3b82f6)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Checking for updates...
        </div>
      )}

      {updateStatus === 'no-update' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '6px',
          padding: '10px'
        }}>
          <CheckCircle className="w-4 h-4" />
          achu is up to date!
        </div>
      )}

      {updateStatus === 'update-available' && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            <ArrowUpCircle className="w-4 h-4" style={{ color: 'var(--accent, #3b82f6)' }} />
            New Version Available: v{latestVersion}
          </div>
          {releaseNotes && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              maxHeight: '100px',
              overflowY: 'auto',
              background: 'var(--surface-3, #151b26)',
              border: '1px solid var(--border)',
              padding: '8px',
              borderRadius: '4px',
              whiteSpace: 'pre-wrap',
              textAlign: 'left'
            }}>
              {releaseNotes}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, height: '32px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleStartUpdate}
              type="button"
            >
              <Download className="w-3.5 h-3.5" /> Upgrade Now
            </button>
            <button
              className="btn btn-secondary"
              style={{ height: '32px', fontSize: '0.8rem' }}
              onClick={() => setUpdateStatus('idle')}
              type="button"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      )}

      {updateStatus === 'downloading' && (
        <div style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span>Downloading update...</span>
            <span style={{ fontWeight: 600 }}>{downloadProgress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--surface-3, #151b26)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${downloadProgress}%`, height: '100%', background: 'var(--accent, #3b82f6)', transition: 'width 0.1s linear' }} />
          </div>
        </div>
      )}

      {updateStatus === 'success' && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>
            <CheckCircle className="w-4 h-4" />
            Update Downloaded!
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {simulated 
              ? 'In development mode: auto-restart is simulated.' 
              : 'The update will be applied when you restart achu.'}
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem', height: '30px', marginTop: '4px' }}
            onClick={() => setUpdateStatus('idle')}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      {updateStatus === 'error' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>
            <AlertCircle className="w-4 h-4" />
            Update Error
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {updateError || 'An error occurred during update.'}
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.8rem', height: '30px', marginTop: '4px' }}
            onClick={handleCheckUpdates}
            type="button"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
