import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Settings, 
  AlertCircle, 
  RefreshCw, 
  Info,
  Play
} from 'lucide-react';
import { useAppContext } from '../AppContext';
import InspectorSection from './InspectorSection';
import { fetchInstalledModels } from '../utils/ollamaUtils';
import IssueReviewForm from './IssueReviewForm';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function GitHubAgentSettings() {
  const {
    imageSrc = null,
    issuePayload = null,
    isGeneratingIssue = false,
    issueError = null,
    aiProvider = 'ollama',
    setAiProvider = () => {},
    ollamaEndpoint = 'http://localhost:11434',
    ollamaModel = 'llava-phi3',
    setOllamaModel = () => {},
    openaiModel = 'gpt-4o-mini',
    setOpenaiModel = () => {},
    googleModel = 'gemini-2.5-flash',
    setGoogleModel = () => {},
    claudeModel = 'claude-3-5-sonnet-latest',
    setClaudeModel = () => {},
    ollamaAvailable = false,
    generateIssue = async () => {},
    generateIssueOffline = () => {},
    setSettingsVisible = () => {},
    localFallbackAvailable = false,
    userInstruction = '',
    setUserInstruction = () => {},
    openaiModelsList = [],
    googleModelsList = [],
    claudeModelsList = []
  } = useAppContext() || {};

  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [hasApiKey, setHasApiKey] = useState(true);

  // Load models on endpoint availability
  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      if (aiProvider === 'ollama' && ollamaAvailable) {
        const models = await fetchInstalledModels(ollamaEndpoint);
        if (active) {
          setInstalledModels(models);
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
  }, [ollamaAvailable, ollamaEndpoint, aiProvider]);

  // Check key presence
  useEffect(() => {
    const checkKey = async () => {
      if (aiProvider === 'ollama') {
        setHasApiKey(true);
        return;
      }
      if (window.snapFrameAPI) {
        const key = await window.snapFrameAPI.getSecureKey(aiProvider);
        setHasApiKey(!!key);
      } else {
        setHasApiKey(false);
      }
    };
    checkKey();
  }, [aiProvider]);

  const handleGenerate = async () => {
    await generateIssue();
  };

  // Provider display name helper
  const getProviderName = () => {
    if (aiProvider === 'google') return 'Gemini';
    return capitalize(aiProvider);
  };

  // Check if standard model
  const isStandardModel = () => {
    if (aiProvider === 'openai') return openaiModelsList.some(m => m.value === openaiModel);
    if (aiProvider === 'google') return googleModelsList.some(m => m.value === googleModel);
    if (aiProvider === 'claude') return claudeModelsList.some(m => m.value === claudeModel);
    return true;
  };

  const getActiveModelName = () => {
    if (aiProvider === 'openai') return openaiModel;
    if (aiProvider === 'google') return googleModel;
    if (aiProvider === 'claude') return claudeModel;
    return ollamaModel;
  };

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
          type="button"
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
          
          {/* Provider Health Status Bar */}
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
                {getProviderName()} {ollamaAvailable ? 'online' : 'offline'}
              </span>
            </div>
            
            {aiProvider === 'ollama' && ollamaAvailable && (
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
            )}

            {aiProvider === 'openai' && (
              <select
                value={isStandardModel() ? openaiModel : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== 'custom') setOpenaiModel(val);
                }}
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
                {openaiModelsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                {!isStandardModel() && <option value="custom">Custom...</option>}
              </select>
            )}

            {aiProvider === 'google' && (
              <select
                value={isStandardModel() ? googleModel : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== 'custom') setGoogleModel(val);
                }}
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
                {googleModelsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                {!isStandardModel() && <option value="custom">Custom...</option>}
              </select>
            )}

            {aiProvider === 'claude' && (
              <select
                value={isStandardModel() ? claudeModel : 'custom'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== 'custom') setClaudeModel(val);
                }}
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
                {claudeModelsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                {!isStandardModel() && <option value="custom">Custom...</option>}
              </select>
            )}
          </div>

          {/* Custom model name tag if custom model selected */}
          {aiProvider !== 'ollama' && !isStandardModel() && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: '-4px' }}>
              <span>Custom Model:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{getActiveModelName()}</span>
            </div>
          )}

          {/* Warning Banner if API Key missing */}
          {!hasApiKey && (
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
              API Key is missing for {getProviderName()}. Configure it in Preferences.
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setSettingsVisible(true)}
                style={{ display: 'block', marginTop: '6px', fontSize: '0.7rem', padding: '2px 6px', color: 'var(--accent)' }}
                type="button"
              >
                Open Preferences
              </button>
            </div>
          )}

          {/* Ollama specific offline warning */}
          {aiProvider === 'ollama' && !ollamaAvailable && (
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

          {/* Optional Prompt Input */}
          {!issuePayload && (
            <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="control-label" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Custom Instructions (Optional)</span>
              <textarea
                placeholder="e.g. Focus on the button error, explain how it affects the flow..."
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  maxHeight: '100px',
                  padding: '6px 8px',
                  fontSize: '0.72rem',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Generate Button */}
          {!issuePayload && (
            <button 
              className="btn btn-primary" 
              onClick={handleGenerate}
              disabled={isGeneratingIssue || (!hasApiKey && aiProvider !== 'ollama')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              type="button"
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

          {/* Error & Fallback Banner */}
          {issueError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              
              {localFallbackAvailable && (
                <div 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    padding: '8px', 
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.74rem'
                  }}
                >
                  <div style={{ color: '#fca5a5' }}>
                    Generation failed. You can fallback to local templates or switch to local Ollama.
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={generateIssueOffline}
                      style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem' }}
                      type="button"
                    >
                      Use Offline Template
                    </button>
                    {aiProvider !== 'ollama' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setAiProvider('ollama')}
                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem' }}
                        type="button"
                      >
                        Switch to Ollama
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Issue Review & Edit Form */}
          {issuePayload && <IssueReviewForm />}

        </div>
      )}
    </InspectorSection>
  );
}
