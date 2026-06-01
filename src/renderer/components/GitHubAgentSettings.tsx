import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Copy, 
  ExternalLink, 
  Plus, 
  X, 
  Info,
  Play
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';
import Tooltip from './Tooltip';
import { fetchInstalledModels } from '../utils/ollamaUtils';
import { fetchUserRepos } from '../utils/githubApiUtils';
import { buildMarkdown, GitHubIssuePayload } from '../utils/githubAgentUtils';

export default function GitHubAgentSettings() {
  const {
    imageSrc = null,
    issuePayload = null,
    setIssuePayload = () => {},
    isGeneratingIssue = false,
    issueError = null,
    ollamaEndpoint = 'http://localhost:11434',
    ollamaModel = 'llava-phi3',
    setOllamaModel = () => {},
    ollamaAvailable = false,
    githubRepo = '',
    setGithubRepo = () => {},
    githubRepoList = [],
    setGithubRepoList = () => {},
    showComponentHighlights = true,
    setShowComponentHighlights = () => {},
    burnHighlights = true,
    setBurnHighlights = () => {},
    appendAttribution = true,
    setAppendAttribution = () => {},
    highlightedComponents = [],
    setHighlightedComponents = () => {},
    generateIssue = async () => {},
    pushIssueToGitHub = async () => {},
    resetIssue = () => {},
    setSettingsVisible = () => {},
    cachedOcrResult = null
  } = useAppContext() || {};

  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [newComponentText, setNewComponentText] = useState('');
  const [newLabelText, setNewLabelText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load models on endpoint availability
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      if (ollamaAvailable) {
        const models = await fetchInstalledModels(ollamaEndpoint);
        if (active) {
          setInstalledModels(models);
          // Auto select model if not set or not in list
          if (models.length > 0 && (!ollamaModel || !models.includes(ollamaModel))) {
            setOllamaModel(models[0]);
          }
        }
      } else {
        if (active) {
          setInstalledModels(prev => prev.length > 0 ? [] : prev);
        }
      }
    };
    loadModels();
    return () => {
      active = false;
    };
  }, [ollamaAvailable, ollamaEndpoint]);

  // Load user repositories
  const loadRepos = async () => {
    try {
      const token = await window.snapFrameAPI?.getGitHubToken?.();
      if (token) {
        setReposLoading(true);
        const list = await fetchUserRepos(token);
        setGithubRepoList(list);
        if (list.length > 0 && !githubRepo) {
          setGithubRepo(list[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to load GitHub repos:', e);
    } finally {
      setReposLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleGenerate = async () => {
    await generateIssue();
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await pushIssueToGitHub();
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!issuePayload) return;
    navigator.clipboard.writeText(issuePayload.markdownBody);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Field Edit Handlers
  const updateField = (updater: (p: GitHubIssuePayload) => GitHubIssuePayload) => {
    if (!issuePayload) return;
    const updated = updater(issuePayload);
    updated.markdownBody = buildMarkdown(updated);
    setIssuePayload(updated);
  };

  const updateTitle = (val: string) => updateField(p => ({ ...p, title: val }));
  const updateSeverity = (val: GitHubIssuePayload['severity']) => updateField(p => ({ ...p, severity: val }));
  const updateExpected = (val: string) => updateField(p => ({ ...p, expected: val }));
  const updateActual = (val: string) => updateField(p => ({ ...p, actual: val }));

  const updateStep = (idx: number, val: string) => {
    updateField(p => {
      const steps = [...p.reproSteps];
      steps[idx] = val;
      return { ...p, reproSteps: steps };
    });
  };

  const addStep = () => {
    updateField(p => ({ ...p, reproSteps: [...p.reproSteps, ''] }));
  };

  const removeStep = (idx: number) => {
    updateField(p => ({ ...p, reproSteps: p.reproSteps.filter((_, i) => i !== idx) }));
  };

  const removeComponent = (comp: string) => {
    updateField(p => {
      const filtered = p.components.filter(c => c !== comp);
      setHighlightedComponents(filtered);
      return { ...p, components: filtered };
    });
  };

  const addComponent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentText.trim() || !issuePayload) return;
    const comp = newComponentText.trim();
    if (!issuePayload.components.includes(comp)) {
      updateField(p => {
        const list = [...p.components, comp];
        setHighlightedComponents(list);
        return { ...p, components: list };
      });
    }
    setNewComponentText('');
  };

  const removeLabel = (label: string) => {
    updateField(p => ({ ...p, labels: p.labels.filter(l => l !== label) }));
  };

  const addLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim() || !issuePayload) return;
    const label = newLabelText.trim();
    if (!issuePayload.labels.includes(label)) {
      updateField(p => ({ ...p, labels: [...p.labels, label] }));
    }
    setNewLabelText('');
  };

  // UI status colors
  const severityEmojis: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢'
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Filter repos based on search
  const filteredRepos = githubRepoList.filter(r => 
    r.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <InspectorSection 
      title="Issue Agent" 
      icon={<Bug className="w-3.5 h-3.5" />}
      headerActions={
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={(e) => {
            e.stopPropagation();
            setSettingsVisible(true);
          }}
          style={{ width: '20px', height: '20px', padding: 0 }}
          title="Issue Agent settings"
        >
          <Settings className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
        </button>
      }
    >
      {!imageSrc ? (
        <div className="control-group" style={{ padding: '0.25rem 0' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', display: 'block' }}>
            Load a screenshot to generate issue reports
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Ollama Health Status Bar */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span 
                style={{ 
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: ollamaAvailable ? '#10b981' : '#ef4444'
                }} 
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                {ollamaAvailable ? 'Ollama running' : 'Ollama offline'}
              </span>
            </div>
            
            {ollamaAvailable ? (
              <select 
                value={ollamaModel} 
                onChange={(e) => setOllamaModel(e.target.value)}
                style={{ 
                  padding: '2px 4px', 
                  fontSize: '0.72rem', 
                  background: 'var(--surface-3)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: '3px',
                  width: '120px'
                }}
              >
                {installedModels.length > 0 ? (
                  installedModels.map(m => <option key={m} value={m}>{m}</option>)
                ) : (
                  <option value={ollamaModel}>{ollamaModel}</option>
                )}
              </select>
            ) : (
              <a 
                href="https://ollama.com" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                Install ↗
              </a>
            )}
          </div>

          {!ollamaAvailable && (
            <div 
              style={{ 
                padding: '0.5rem 0.75rem', 
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.7rem',
                color: '#fca5a5',
                lineHeight: '1.4'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f87171' }} /> Setup Required
              </div>
              Start Ollama on your machine and run:
              <code style={{ display: 'block', background: 'var(--surface-3)', padding: '2px 4px', borderRadius: '3px', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                ollama pull llava-phi3
              </code>
            </div>
          )}

          {/* Generate Button */}
          {!issuePayload && (
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={isGeneratingIssue}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {isGeneratingIssue ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> 
                  Generating issue report...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> 
                  Generate Issue
                </>
              )}
            </button>
          )}

          {/* Inline progress bar */}
          {isGeneratingIssue && (
            <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden', marginTop: '-4px' }}>
              <div 
                style={{ 
                  height: '100%', 
                  background: 'var(--accent)', 
                  width: '50%',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }} 
              />
            </div>
          )}

          {issueError && (
            <div 
              style={{ 
                padding: '0.5rem', 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#f87171',
                borderRadius: '4px',
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{issueError}</span>
            </div>
          )}

          {/* Issue Review & Edit Form */}
          {issuePayload && (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.8rem',
                maxHeight: '450px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {/* Form Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Review Generated Issue
                </span>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={resetIssue} 
                  style={{ padding: '2px 4px', fontSize: '0.7rem' }}
                >
                  Clear
                </button>
              </div>

              {/* Bug Title */}
              <div className="control-group">
                <span className="control-label">Bug Title</span>
                <input 
                  type="text" 
                  value={issuePayload.title} 
                  onChange={(e) => updateTitle(e.target.value)}
                  style={{ width: '100%', marginTop: '3px' }}
                />
              </div>

              {/* Severity Selector */}
              <div className="control-group">
                <span className="control-label">Severity</span>
                <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                  {(['critical', 'high', 'medium', 'low'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateSeverity(s)}
                      style={{
                        flex: 1,
                        padding: '4px 2px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        borderRadius: '3px',
                        border: '1px solid var(--border)',
                        background: issuePayload.severity === s ? 'var(--surface-3)' : 'var(--surface-2)',
                        color: issuePayload.severity === s ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: issuePayload.severity === s ? '0 0 6px var(--accent)' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {severityEmojis[s]} {capitalize(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repro Steps */}
              <div className="control-group">
                <span className="control-label">Steps to Reproduce</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {issuePayload.reproSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', width: '14px', textAlign: 'right' }}>
                        {idx + 1}
                      </span>
                      <input 
                        type="text" 
                        value={step} 
                        onChange={(e) => updateStep(idx, e.target.value)}
                        style={{ flex: 1, padding: '3px 6px', fontSize: '0.76rem' }}
                      />
                      <button 
                        onClick={() => removeStep(idx)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '0.9rem'
                        }}
                        title="Remove step"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={addStep}
                    style={{ 
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '2px 4px',
                      fontWeight: 600
                    }}
                  >
                    <Plus className="w-3 h-3" /> Add step
                  </button>
                </div>
              </div>

              {/* Expected & Actual */}
              <div className="control-group">
                <span className="control-label">Expected Behavior</span>
                <textarea 
                  value={issuePayload.expected}
                  onChange={(e) => updateExpected(e.target.value)}
                  style={{ width: '100%', minHeight: '50px', fontSize: '0.76rem', marginTop: '3px', resize: 'vertical' }}
                />
              </div>

              <div className="control-group">
                <span className="control-label">Actual Behavior</span>
                <textarea 
                  value={issuePayload.actual}
                  onChange={(e) => updateActual(e.target.value)}
                  style={{ width: '100%', minHeight: '50px', fontSize: '0.76rem', marginTop: '3px', resize: 'vertical' }}
                />
              </div>

              {/* Detected UI Components */}
              <div className="control-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="control-label">Detected UI Components</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      id="toggle-highlights"
                      checked={showComponentHighlights} 
                      onChange={(e) => setShowComponentHighlights(e.target.checked)} 
                    />
                    <label htmlFor="toggle-highlights" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Show Canvas Overlay</label>
                  </div>
                </div>

                {/* Component Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {issuePayload.components.map(comp => (
                    <span 
                      key={comp} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '2px', 
                        padding: '2px 6px',
                        background: 'rgba(250, 204, 21, 0.12)',
                        color: '#facc15',
                        border: '1px solid rgba(250, 204, 21, 0.25)',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 500
                      }}
                    >
                      {comp}
                      <button 
                        onClick={() => removeComponent(comp)}
                        style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <form onSubmit={addComponent} style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="Add component tag..." 
                    value={newComponentText}
                    onChange={(e) => setNewComponentText(e.target.value)}
                    style={{ flex: 1, padding: '2px 6px', fontSize: '0.74rem' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 8px' }}>Add</button>
                </form>
              </div>

              {/* Suggested Labels */}
              <div className="control-group">
                <span className="control-label">GitHub Labels</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {issuePayload.labels.map(lbl => (
                    <span 
                      key={lbl} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '2px', 
                        padding: '2px 6px',
                        background: 'var(--surface-3)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        fontSize: '0.7rem'
                      }}
                    >
                      {lbl}
                      <button 
                        onClick={() => removeLabel(lbl)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <form onSubmit={addLabel} style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="Add label..." 
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    style={{ flex: 1, padding: '2px 6px', fontSize: '0.74rem' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 8px' }}>Add</button>
                </form>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

              {/* Publish & Export Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleCopyMarkdown}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '32px', fontSize: '0.8rem' }}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" style={{ color: '#10b981' }} /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? 'Copied!' : 'Copy Markdown'}
                  </button>
                </div>

                {/* Repository Search & Selector */}
                <div className="control-group">
                  <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Publish to Repository
                    {reposLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </span>

                  <input 
                    type="text"
                    placeholder="Search or enter owner/repo..."
                    value={repoSearch || githubRepo}
                    onChange={(e) => {
                      setRepoSearch(e.target.value);
                      setGithubRepo(e.target.value);
                    }}
                    style={{ width: '100%', marginTop: '3px' }}
                  />

                  {filteredRepos.length > 0 && repoSearch && repoSearch !== githubRepo && (
                    <div 
                      style={{ 
                        background: 'var(--surface-3)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '4px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        marginTop: '2px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {filteredRepos.map(repo => (
                        <div 
                          key={repo}
                          onClick={() => {
                            setGithubRepo(repo);
                            setRepoSearch('');
                          }}
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '0.74rem', 
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            borderBottom: '1px solid var(--border)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          {repo}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.74rem', 
                    color: 'var(--text-secondary)',
                    margin: '2px 0' 
                  }}
                >
                  <input 
                    type="checkbox" 
                    id="toggle-burn"
                    checked={burnHighlights} 
                    onChange={(e) => setBurnHighlights(e.target.checked)} 
                  />
                  <label htmlFor="toggle-burn">Burn highlights into screenshot</label>
                </div>

                {/* Push to GitHub Button */}
                <button 
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={isPublishing || !githubRepo}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px',
                    height: '34px',
                    fontSize: '0.82rem',
                    background: 'linear-gradient(135deg, var(--accent) 0%, #a855f7 100%)'
                  }}
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" /> Push to GitHub
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      )}
    </InspectorSection>
  );
}
