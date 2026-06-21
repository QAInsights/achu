import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  EyeOff, 
  Eye, 
  Mail, 
  Key, 
  CreditCard, 
  Phone, 
  Network, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Lock,
  Shield
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';

export default function PrivacyGuardSettings() {
  const {
    imageSrc,
    redactions = [],
    isScanningSecrets = false,
    scanProgress = 0,
    scanForSecrets = async () => {},
    toggleRedaction = () => {},
    redactAll = () => {},
    revealAll = () => {},
    hoveredRedactionId = null,
    setHoveredRedactionId = () => {},
    exportFormat,
    setExportFormat = () => {},
    redactionStyle = 'solid',
    setRedactionStyle = () => {},
    pushHistory = () => {},
    getCurrentConfig = () => ({} as any)
  } = useAppContext();

  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    setHasScanned(false);
  }, [imageSrc]);

  const handleScan = async () => {
    await scanForSecrets();
    setHasScanned(true);
    // Recommend PNG format for export to ensure unrecoverable pixels
    if (exportFormat !== 'png') {
      setExportFormat('png');
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-3.5 h-3.5" />;
      case 'api-key': return <Key className="w-3.5 h-3.5" />;
      case 'card': return <CreditCard className="w-3.5 h-3.5" />;
      case 'phone': return <Phone className="w-3.5 h-3.5" />;
      case 'ip': return <Network className="w-3.5 h-3.5" />;
      case 'address': return <MapPin className="w-3.5 h-3.5" />;
      case 'password': return <Lock className="w-3.5 h-3.5" />;
      default: return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Emails';
      case 'api-key': return 'API Keys';
      case 'card': return 'Credit Cards';
      case 'phone': return 'Phones';
      case 'ip': return 'IP Addresses';
      case 'address': return 'Addresses';
      case 'password': return 'Passwords';
      default: return 'Sensitive Info';
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'email': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' };
      case 'api-key': return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc' };
      case 'card': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      case 'phone': return { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15' };
      case 'ip': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399' };
      case 'address': return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c' };
      case 'password': return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' };
      default: return { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af' };
    }
  };

  // Group redactions by type
  const groups = redactions.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, typeof redactions>);

  const redactedCount = redactions.filter(r => r.status === 'redacted').length;

  return (
    <InspectorSection title="Privacy Guard" icon={<Shield className="w-3.5 h-3.5" />}>
      {!imageSrc ? (
        <div className="control-group" style={{ padding: '0.25rem 0' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', display: 'block' }}>
            Upload a screenshot to scan for secrets
          </span>
        </div>
      ) : (
        <div className="control-group">
          {/* Redaction Style Config */}
          <div className="switch-container" style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Redaction Style</span>
            <select
              value={redactionStyle}
              onChange={(e) => {
                const nextStyle = e.target.value as 'blur' | 'solid';
                setRedactionStyle(nextStyle);
                pushHistory({ ...getCurrentConfig(), redactionStyle: nextStyle });
              }}
              className="input-sm"
              style={{ width: '120px' }}
            >
              <option value="solid">Solid Mask (100%)</option>
              <option value="blur">Gaussian Blur</option>
            </select>
          </div>

          {/* Main Scan Trigger */}
          {!hasScanned && !isScanningSecrets && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-primary" onClick={handleScan}>
                <Sparkles className="w-4 h-4" /> Scan Screenshot
              </button>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: '1.4', textAlign: 'center' }}>
                Text detection runs locally on your device. A small one-time download (~12MB) is needed, then it works fully offline.
              </span>
            </div>
          )}

          {/* Scanning Progress */}
          {isScanningSecrets && (
            <div 
              style={{ 
                padding: '0.75rem', 
                background: 'var(--surface-2)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning screenshot...
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{scanProgress}%</span>
              </div>
              <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: 'var(--accent)', 
                    width: `${scanProgress}%`,
                    transition: 'width 0.1s ease-out'
                  }} 
                />
              </div>
            </div>
          )}

          {/* Results Review Panel */}
          {hasScanned && !isScanningSecrets && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Scan Info Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {redactions.length > 0 ? (
                    <>
                      <ShieldAlert className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {redactions.length} items detected
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                        No secrets detected
                      </span>
                    </>
                  )}
                </div>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={handleScan}
                  title="Rescan image"
                  style={{ height: '24px', padding: '0 0.4rem' }}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {redactions.length > 0 && (
                <>
                  {/* Bulk Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', margin: '0.25rem 0' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '120px', fontSize: '0.72rem', height: '28px' }}
                      onClick={redactAll}
                    >
                      <EyeOff className="w-3 h-3" /> Redact All
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '120px', fontSize: '0.72rem', height: '28px' }}
                      onClick={revealAll}
                    >
                      <Eye className="w-3 h-3" /> Reveal All
                    </button>
                  </div>

                  {/* Recommendation Tag */}
                  {redactedCount > 0 && exportFormat !== 'png' && (
                    <div 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '0.25rem',
                        padding: '0.4rem 0.5rem',
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        color: '#fef08a'
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5" style={{ color: '#facc15', flexShrink: 0, marginTop: '1px' }} />
                      <span>
                        PNG format is recommended for redacted snapshots to guarantee absolute, uncompressed pixel security.
                      </span>
                    </div>
                  )}

                  {/* Grouped Items List */}
                  <div 
                    style={{ 
                      maxHeight: '280px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem',
                      padding: '0 0.5rem',
                      paddingRight: '6px'
                    }}
                  >
                    {Object.keys(groups).map((type) => {
                      const list = groups[type];
                      const badge = getBadgeColor(type);
                      return (
                        <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.25rem', 
                              fontSize: '0.7rem', 
                              fontWeight: 600,
                              color: 'var(--text-tertiary)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            <span 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: '18px', 
                                height: '18px', 
                                borderRadius: '4px',
                                background: badge.bg, 
                                color: badge.text 
                              }}
                            >
                              {getEntityIcon(type)}
                            </span>
                            <span>{getEntityLabel(type)} ({list.length})</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {list.map((item) => {
                              const isHovered = item.id === hoveredRedactionId;
                              const isRedacted = item.status === 'redacted';
                              
                              return (
                                <div
                                  key={item.id}
                                  onMouseEnter={() => setHoveredRedactionId(item.id)}
                                  onMouseLeave={() => setHoveredRedactionId(null)}
                                  onClick={() => toggleRedaction(item.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isHovered ? 'var(--surface-3)' : 'var(--surface-2)',
                                    border: isHovered ? '1px solid var(--accent)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <span 
                                    style={{ 
                                      fontSize: '0.74rem', 
                                      color: isRedacted ? 'var(--text-secondary)' : 'var(--text-primary)',
                                      textDecoration: isRedacted ? 'line-through' : 'none',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '80%',
                                      fontFamily: 'var(--font-mono)'
                                    }}
                                    title={item.text}
                                  >
                                    {item.text}
                                  </span>

                                  <button
                                    className="btn btn-ghost"
                                    style={{ 
                                      padding: 0, 
                                      width: '20px', 
                                      height: '20px', 
                                      borderRadius: '4px',
                                      color: isRedacted ? 'oklch(0.55 0.18 25)' : 'rgba(16, 185, 129, 0.8)'
                                    }}
                                    title={isRedacted ? 'Redacted (Click to reveal)' : 'Visible (Click to redact)'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleRedaction(item.id);
                                    }}
                                  >
                                    {isRedacted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </InspectorSection>
  );
}
