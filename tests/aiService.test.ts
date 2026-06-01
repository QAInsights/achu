import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkAIHealth, generateAIResponse } from '../src/main/aiService';

describe('aiService - checkAIHealth', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should verify Ollama health successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const ok = await checkAIHealth('ollama', 'http://localhost:11434', '');
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
  });

  it('should verify OpenAI health successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const ok = await checkAIHealth('openai', '', 'test-key');
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/models', expect.objectContaining({
      headers: { 'Authorization': 'Bearer test-key' }
    }));
  });

  it('should verify Google Gemini health successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    const ok = await checkAIHealth('google', '', 'test-key');
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models?key=test-key', expect.any(Object));
  });

  it('should verify Anthropic Claude health successfully', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    const ok = await checkAIHealth('claude', '', 'test-key');
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01'
      })
    }));
  });

  it('should return false if Claude health check returns 401 status', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({ status: 401 } as Response);

    const ok = await checkAIHealth('claude', '', 'bad-key');
    expect(ok).toBe(false);
  });
});

describe('aiService - generateAIResponse', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should generate Ollama response correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ response: '{"title": "Bug"}' })
    } as Response);

    const res = await generateAIResponse('ollama', 'llava', 'prompt', 'image64', 'http://localhost:11434', '');
    expect(res).toBe('{"title": "Bug"}');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        model: 'llava',
        prompt: 'prompt',
        images: ['image64'],
        stream: false,
        format: 'json'
      })
    }));
  });

  it('should generate OpenAI response correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"title": "OpenAI Bug"}' } }]
      })
    } as Response);

    const res = await generateAIResponse('openai', 'gpt-4o-mini', 'prompt', 'image64', '', 'test-key');
    expect(res).toBe('{"title": "OpenAI Bug"}');
    expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key'
      }
    }));
  });

  it('should generate Google Gemini response correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"title": "Gemini Bug"}' }] } }]
      })
    } as Response);

    const res = await generateAIResponse('google', 'gemini-2.5-flash', 'prompt', 'image64', '', 'test-key');
    expect(res).toBe('{"title": "Gemini Bug"}');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test-key',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should generate Claude response correctly', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '{"title": "Claude Bug"}' }]
      })
    } as Response);

    const res = await generateAIResponse('claude', 'claude-3-5-sonnet-latest', 'prompt', 'image64', '', 'test-key');
    expect(res).toBe('{"title": "Claude Bug"}');
    expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'x-api-key': 'test-key',
        'anthropic-version': '2023-06-01'
      })
    }));
  });

  it('should throw error if apiKey is missing for cloud providers', async () => {
    await expect(
      generateAIResponse('openai', 'gpt-4o-mini', 'prompt', 'image64', '', '')
    ).rejects.toThrow('API key is missing for openai');
  });
});
