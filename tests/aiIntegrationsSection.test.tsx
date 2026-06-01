import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AiIntegrationsSection from '../src/renderer/components/AiIntegrationsSection';

// Mock AppContext
const mockContext = {
  aiProvider: 'openai',
  setAiProvider: vi.fn(),
  ollamaEndpoint: 'http://localhost:11434',
  setOllamaEndpoint: vi.fn(),
  ollamaModel: 'llama3',
  setOllamaModel: vi.fn(),
  openaiModel: 'gpt-4o-mini',
  setOpenaiModel: vi.fn(),
  googleModel: 'gemini-1.5-flash',
  setGoogleModel: vi.fn(),
  claudeModel: 'claude-3-5-sonnet-latest',
  setClaudeModel: vi.fn(),
  githubRepo: 'owner/repo',
  setGithubRepo: vi.fn(),
  appendAttribution: true,
  setAppendAttribution: vi.fn(),
  pushHistory: vi.fn(),
  getCurrentConfig: vi.fn(() => ({})),
  triggerAiHealthCheck: vi.fn(),
  openaiModelsList: [{ value: 'gpt-4o-mini', label: 'GPT-4o Mini' }],
  googleModelsList: [{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }],
  claudeModelsList: [{ value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' }],
};

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AiIntegrationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock snapFrameAPI on window
    (window as any).snapFrameAPI = {
      getGitHubToken: vi.fn().mockResolvedValue('initial-token'),
      getSecureKey: vi.fn((provider) => {
        if (provider === 'openai') return Promise.resolve('initial-openai-key');
        if (provider === 'google') return Promise.resolve('initial-google-key');
        if (provider === 'claude') return Promise.resolve('initial-claude-key');
        return Promise.resolve('');
      }),
      setGitHubToken: vi.fn(),
      setSecureKey: vi.fn(),
      checkAIHealth: vi.fn().mockResolvedValue(true),
    };
  });

  it('loads API keys and token on mount', async () => {
    render(<AiIntegrationsSection />);
    
    await waitFor(() => {
      expect(window.snapFrameAPI.getGitHubToken).toHaveBeenCalled();
      expect(window.snapFrameAPI.getSecureKey).toHaveBeenCalledWith('openai');
      expect(window.snapFrameAPI.getSecureKey).toHaveBeenCalledWith('google');
      expect(window.snapFrameAPI.getSecureKey).toHaveBeenCalledWith('claude');
    });

    const openaiInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    await waitFor(() => {
      expect(openaiInput.value).toBe('initial-openai-key');
    });
  });

  it('updates local state on change but does NOT save key to disk or trigger health check on keystroke', async () => {
    render(<AiIntegrationsSection />);
    
    const openaiInput = await screen.findByPlaceholderText('sk-...') as HTMLInputElement;
    fireEvent.change(openaiInput, { target: { value: 'new-key-typing' } });
    
    // Local state should update visual value
    expect(openaiInput.value).toBe('new-key-typing');
    
    // BUT snapFrameAPI.setSecureKey and triggerAiHealthCheck should NOT have been called yet
    expect(window.snapFrameAPI.setSecureKey).not.toHaveBeenCalled();
    expect(mockContext.triggerAiHealthCheck).not.toHaveBeenCalled();
  });

  it('saves key to disk and triggers health check on blur', async () => {
    render(<AiIntegrationsSection />);
    
    const openaiInput = await screen.findByPlaceholderText('sk-...') as HTMLInputElement;
    fireEvent.change(openaiInput, { target: { value: 'new-key-on-blur' } });
    fireEvent.blur(openaiInput);
    
    await waitFor(() => {
      expect(window.snapFrameAPI.setSecureKey).toHaveBeenCalledWith('openai', 'new-key-on-blur');
      expect(mockContext.triggerAiHealthCheck).toHaveBeenCalled();
    });
  });

  it('saves key to disk and triggers health check when Enter is pressed', async () => {
    render(<AiIntegrationsSection />);
    
    const openaiInput = await screen.findByPlaceholderText('sk-...') as HTMLInputElement;
    fireEvent.change(openaiInput, { target: { value: 'new-key-on-enter' } });
    fireEvent.keyDown(openaiInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(window.snapFrameAPI.setSecureKey).toHaveBeenCalledWith('openai', 'new-key-on-enter');
      expect(mockContext.triggerAiHealthCheck).toHaveBeenCalled();
    });
  });

  it('does not save key on non-Enter keypresses', async () => {
    render(<AiIntegrationsSection />);
    
    const openaiInput = await screen.findByPlaceholderText('sk-...') as HTMLInputElement;
    fireEvent.change(openaiInput, { target: { value: 'new-key-typing' } });
    fireEvent.keyDown(openaiInput, { key: 'a', code: 'KeyA' });
    
    expect(window.snapFrameAPI.setSecureKey).not.toHaveBeenCalled();
    expect(mockContext.triggerAiHealthCheck).not.toHaveBeenCalled();
  });

  it('updates local state on change but does NOT save GitHub Token to disk on keystroke', async () => {
    render(<AiIntegrationsSection />);
    
    const githubInput = await screen.findByPlaceholderText('ghp_...') as HTMLInputElement;
    fireEvent.change(githubInput, { target: { value: 'new-token-typing' } });
    
    expect(githubInput.value).toBe('new-token-typing');
    expect(window.snapFrameAPI.setGitHubToken).not.toHaveBeenCalled();
  });

  it('saves GitHub Token to disk on blur', async () => {
    render(<AiIntegrationsSection />);
    
    const githubInput = await screen.findByPlaceholderText('ghp_...') as HTMLInputElement;
    fireEvent.change(githubInput, { target: { value: 'new-token-on-blur' } });
    fireEvent.blur(githubInput);
    
    expect(window.snapFrameAPI.setGitHubToken).toHaveBeenCalledWith('new-token-on-blur');
  });

  it('saves GitHub Token to disk when Enter is pressed', async () => {
    render(<AiIntegrationsSection />);
    
    const githubInput = await screen.findByPlaceholderText('ghp_...') as HTMLInputElement;
    fireEvent.change(githubInput, { target: { value: 'new-token-on-enter' } });
    fireEvent.keyDown(githubInput, { key: 'Enter', code: 'Enter' });
    
    expect(window.snapFrameAPI.setGitHubToken).toHaveBeenCalledWith('new-token-on-enter');
  });
});
