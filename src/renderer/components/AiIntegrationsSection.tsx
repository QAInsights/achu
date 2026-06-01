import React from 'react';
import { useAppContext } from '../AppContext';
import { Cpu } from 'lucide-react';
import { updateUserDefault } from '../utils/storageUtils';

const OPENAI_MODELS = [
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini (Default)' },
  { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'custom', label: 'Custom Model...' }
];

const GEMINI_MODELS = [
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (Default)' },
  { value: 'gemini-3.5-pro', label: 'Gemini 3.5 Pro' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'custom', label: 'Custom Model...' }
];

const CLAUDE_MODELS = [
  { value: 'claude-4-6-sonnet', label: 'Claude 4.6 Sonnet (Default)' },
  { value: 'claude-4-8-opus', label: 'Claude 4.8 Opus' },
  { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
  { value: 'custom', label: 'Custom Model...' }
];

export default function AiIntegrationsSection() {
  const {
    aiProvider, setAiProvider,
    ollamaEndpoint, setOllamaEndpoint,
    ollamaModel, setOllamaModel,
    openaiModel, setOpenaiModel,
    googleModel, setGoogleModel,
    claudeModel, setClaudeModel,
    githubRepo, setGithubRepo,
    appendAttribution, setAppendAttribution,
    pushHistory, getCurrentConfig,
    triggerAiHealthCheck
  } = useAppContext();

  const [githubTokenInput, setGithubTokenInput] = React.useState('');
  const [openaiKeyInput, setOpenaiKeyInput] = React.useState('');
  const [googleKeyInput, setGoogleKeyInput] = React.useState('');
  const [claudeKeyInput, setClaudeKeyInput] = React.useState('');
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  React.useEffect(() => {
    setTestStatus('idle');
  }, [aiProvider, ollamaEndpoint, openaiKeyInput, googleKeyInput, claudeKeyInput]);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    try {
      if (window.snapFrameAPI && typeof window.snapFrameAPI.checkAIHealth === 'function') {
        const endpoint = aiProvider === 'ollama' ? ollamaEndpoint : '';
        const ok = await window.snapFrameAPI.checkAIHealth(aiProvider, endpoint);
        setTestStatus(ok ? 'success' : 'failed');
      } else {
        console.error('[Renderer] window.snapFrameAPI.checkAIHealth is not defined or not a function');
        setTestStatus('failed');
      }
    } catch (err) {
      console.error('[Renderer] Exception during handleTestConnection:', err);
      setTestStatus('failed');
    }
  };

  React.useEffect(() => {
    const loadKeys = async () => {
      if (window.snapFrameAPI) {
        const [token, openaiKey, googleKey, claudeKey] = await Promise.all([
          window.snapFrameAPI.getGitHubToken(),
          window.snapFrameAPI.getSecureKey('openai'),
          window.snapFrameAPI.getSecureKey('google'),
          window.snapFrameAPI.getSecureKey('claude')
        ]);
        if (token) setGithubTokenInput(token);
        if (openaiKey) setOpenaiKeyInput(openaiKey);
        if (googleKey) setGoogleKeyInput(googleKey);
        if (claudeKey) setClaudeKeyInput(claudeKey);
      }
    };
    loadKeys();
  }, []);

  const handleSaveToken = async (val: string) => {
    setGithubTokenInput(val);
    if (window.snapFrameAPI) {
      await window.snapFrameAPI.setGitHubToken(val);
    }
  };

  const handleSaveSecureKey = async (provider: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (window.snapFrameAPI) {
      await window.snapFrameAPI.setSecureKey(provider, val);
      triggerAiHealthCheck();
    }
  };

  const updateSetting = (key: string, val: any, setter: (v: any) => void) => {
    setter(val);
    updateUserDefault(key, val);
    pushHistory(getCurrentConfig());
  };

  // Model detection helpers
  const isStandardOpenaiModel = ['gpt-5.4-mini', 'gpt-5.4-pro', 'gpt-4o-mini', 'gpt-4o'].includes(openaiModel);
  const openaiSelectValue = isStandardOpenaiModel ? openaiModel : 'custom';

  const isStandardGoogleModel = ['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-2.5-flash', 'gemini-2.5-pro'].includes(googleModel);
  const googleSelectValue = isStandardGoogleModel ? googleModel : 'custom';

  const isStandardClaudeModel = ['claude-4-6-sonnet', 'claude-4-8-opus', 'claude-3-5-sonnet-latest'].includes(claudeModel);
  const claudeSelectValue = isStandardClaudeModel ? claudeModel : 'custom';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 4px 0' }}>AI Provider Configuration</h3>
        
        <div className="control-group">
          <span className="control-label">Active AI Provider</span>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as any)}
            style={{ marginTop: '4px', width: '100%' }}
          >
            <option value="ollama">Ollama (Local Offline)</option>
            <option value="openai">OpenAI (Cloud)</option>
            <option value="google">Google Gemini (Cloud)</option>
            <option value="claude">Anthropic Claude (Cloud)</option>
          </select>
        </div>

        {/* Ollama Config */}
        {aiProvider === 'ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ollama Settings</div>
            <div className="control-group">
              <span className="control-label">Ollama Endpoint</span>
              <input
                type="text"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
                style={{ marginTop: '4px', width: '100%' }}
              />
            </div>
            <div className="control-group">
              <span className="control-label">Default Model</span>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                style={{ marginTop: '4px', width: '100%' }}
              />
            </div>
          </div>
        )}

        {/* OpenAI Config */}
        {aiProvider === 'openai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OpenAI Settings</div>
            <div className="control-group">
              <span className="control-label">OpenAI API Key</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="sk-..."
                value={openaiKeyInput}
                onChange={(e) => handleSaveSecureKey('openai', e.target.value, setOpenaiKeyInput)}
                style={{ marginTop: '4px', width: '100%' }}
              />
            </div>
            <div className="control-group">
              <span className="control-label">Default Model</span>
              <select
                value={openaiSelectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setOpenaiModel(val === 'custom' ? 'custom-model' : val);
                }}
                style={{ marginTop: '4px', width: '100%' }}
              >
                {OPENAI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {!isStandardOpenaiModel && (
              <div className="control-group">
                <span className="control-label">Custom Model Name</span>
                <input
                  type="text"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Google Gemini Config */}
        {aiProvider === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Gemini Settings</div>
            <div className="control-group">
              <span className="control-label">Gemini API Key</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="AIzaSy..."
                value={googleKeyInput}
                onChange={(e) => handleSaveSecureKey('google', e.target.value, setGoogleKeyInput)}
                style={{ marginTop: '4px', width: '100%' }}
              />
            </div>
            <div className="control-group">
              <span className="control-label">Default Model</span>
              <select
                value={googleSelectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setGoogleModel(val === 'custom' ? 'custom-model' : val);
                }}
                style={{ marginTop: '4px', width: '100%' }}
              >
                {GEMINI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {!isStandardGoogleModel && (
              <div className="control-group">
                <span className="control-label">Custom Model Name</span>
                <input
                  type="text"
                  value={googleModel}
                  onChange={(e) => setGoogleModel(e.target.value)}
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Claude Config */}
        {aiProvider === 'claude' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Claude Settings</div>
            <div className="control-group">
              <span className="control-label">Claude API Key</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="sk-ant-..."
                value={claudeKeyInput}
                onChange={(e) => handleSaveSecureKey('claude', e.target.value, setClaudeKeyInput)}
                style={{ marginTop: '4px', width: '100%' }}
              />
            </div>
            <div className="control-group">
              <span className="control-label">Default Model</span>
              <select
                value={claudeSelectValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setClaudeModel(val === 'custom' ? 'custom-model' : val);
                }}
                style={{ marginTop: '4px', width: '100%' }}
              >
                {CLAUDE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            {!isStandardClaudeModel && (
              <div className="control-group">
                <span className="control-label">Custom Model Name</span>
                <input
                  type="text"
                  value={claudeModel}
                  onChange={(e) => setClaudeModel(e.target.value)}
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Test Connection Button */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              style={{ fontSize: '0.75rem', padding: '4px 10px', height: '28px' }}
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus === 'success' && <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 500 }}>✓ Connected successfully</span>}
            {testStatus === 'failed' && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 500 }}>✗ Connection failed</span>}
          </div>
          {aiProvider !== 'ollama' && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.7rem', 
              color: 'var(--text-tertiary)',
              background: 'var(--surface-2)',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px dashed var(--border)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>API usage cost applies. Check provider website for up-to-date pricing.</span>
            </div>
          )}
        </div>
      </div>

      {/* GitHub Settings Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0' }}>GitHub Integration</h3>
        
        <div className="control-group">
          <span className="control-label">Default Repository (owner/repo)</span>
          <input
            type="text"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            style={{ marginTop: '4px', width: '100%' }}
          />
        </div>

        <div className="control-group">
          <span className="control-label">GitHub Personal Access Token (PAT)</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="ghp_..."
            value={githubTokenInput}
            onChange={(e) => handleSaveToken(e.target.value)}
            style={{ marginTop: '4px', width: '100%' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
            Stored locally and encrypted via OS-level safe storage. Never shared.
          </span>
        </div>

        <div className="control-group">
          <span className="control-label">Append Achu attribution in Markdown</span>
          <div className="format-toggle" style={{ marginTop: '4px' }}>
            <button
              className={`format-toggle-btn ${appendAttribution ? 'active' : ''}`}
              onClick={() => updateSetting('appendAttribution', true, setAppendAttribution)}
              style={{ flex: 1 }}
              type="button"
            >
              Yes
            </button>
            <button
              className={`format-toggle-btn ${!appendAttribution ? 'active' : ''}`}
              onClick={() => updateSetting('appendAttribution', false, setAppendAttribution)}
              style={{ flex: 1 }}
              type="button"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
