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

  it('should return false for empty API key (non-ollama)', async () => {
    const mockFetch = vi.mocked(fetch);
    const ok = await checkAIHealth('openai', '', '');
    expect(ok).toBe(false);
    // fetch should not be called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return false for unsupported provider', async () => {
    const ok = await checkAIHealth('unknown', '', 'key');
    expect(ok).toBe(false);
  });

  it('should return false when Ollama health check fails', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    const ok = await checkAIHealth('ollama', 'http://localhost:11434', '');
    expect(ok).toBe(false);
  });

  it('should not log an error for ECONNREFUSED (Ollama not running)', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockFetch = vi.mocked(fetch);
    // Node's undici wraps socket errors in err.cause.code
    mockFetch.mockRejectedValueOnce(
      new TypeError('fetch failed', { cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }) })
    );
    const ok = await checkAIHealth('ollama', 'http://localhost:11434', '');
    expect(ok).toBe(false);
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('Ollama not reachable'));
    expect(errorSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should not log an error for AbortError/timeout (service slow to respond)', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockFetch = vi.mocked(fetch);
    const abortErr = new Error('The operation was aborted due to timeout');
    abortErr.name = 'TimeoutError';
    mockFetch.mockRejectedValueOnce(abortErr);
    const ok = await checkAIHealth('ollama', 'http://localhost:11434', '');
    expect(ok).toBe(false);
    expect(debugSpy).toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should still log an error for unexpected Ollama failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new TypeError('invalid URL'));
    const ok = await checkAIHealth('ollama', 'http://localhost:11434', '');
    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('[checkAIHealth] Ollama health check failed with error:', expect.anything());
    errorSpy.mockRestore();
  });

  it('should return false on OpenAI health check exception', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const ok = await checkAIHealth('openai', '', 'test-key');
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

  it('should detect MIME types dynamically based on base64 content', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '{"title": "OpenAI Bug"}' } }],
        candidates: [{ content: { parts: [{ text: '{"title": "Gemini Bug"}' }] } }],
        content: [{ text: '{"title": "Claude Bug"}' }]
      })
    } as Response);

    // JPEG prefix
    await generateAIResponse('openai', 'gpt-4o-mini', 'prompt', '/9j/mockjpegdata', '', 'test-key');
    expect(mockFetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      body: expect.stringContaining('data:image/jpeg;base64,/9j/mockjpegdata')
    }));

    // PNG prefix
    await generateAIResponse('google', 'gemini-2.5-flash', 'prompt', 'iVBORw0KGgomockpngdata', '', 'test-key');
    expect(mockFetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      body: expect.stringContaining('"mimeType":"image/png"')
    }));

    // WebP prefix
    await generateAIResponse('claude', 'claude-3-5-sonnet-latest', 'prompt', 'UklGRmockwebpdata', '', 'test-key');
    expect(mockFetch).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({
      body: expect.stringContaining('"media_type":"image/webp"')
    }));
  });

  it('should throw on unsupported provider', async () => {
    await expect(
      generateAIResponse('unsupported', 'model', 'prompt', 'img', '', 'key')
    ).rejects.toThrow('Unsupported AI provider');
  });

  it('should throw on Ollama non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(
      generateAIResponse('ollama', 'llava', 'prompt', 'img', 'http://localhost:11434', '')
    ).rejects.toThrow('Ollama error: 500');
  });

  it('should throw on OpenAI non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: () => Promise.resolve('Rate limit'),
    } as unknown as Response);

    await expect(
      generateAIResponse('openai', 'gpt-4o', 'prompt', 'img', '', 'key')
    ).rejects.toThrow('OpenAI API error: 429');
  });

  it('should throw on Google non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve('Access denied'),
    } as unknown as Response);

    await expect(
      generateAIResponse('google', 'gemini', 'prompt', 'img', '', 'key')
    ).rejects.toThrow('Google Gemini error: 403');
  });

  it('should throw on Claude non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Invalid'),
    } as unknown as Response);

    await expect(
      generateAIResponse('claude', 'claude-3-5-sonnet-latest', 'prompt', 'img', '', 'key')
    ).rejects.toThrow('Anthropic Claude error: 400');
  });

  it('should handle OpenAI response with empty choices', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    } as Response);

    const res = await generateAIResponse('openai', 'model', 'prompt', 'img', '', 'key');
    expect(res).toBe('');
  });

  it('should handle Google response with empty candidates', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    } as Response);

    const res = await generateAIResponse('google', 'model', 'prompt', 'img', '', 'key');
    expect(res).toBe('');
  });

  it('should handle Claude response with empty content', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ content: [] }),
    } as Response);

    const res = await generateAIResponse('claude', 'claude-3-5-sonnet-latest', 'prompt', 'img', '', 'key');
    expect(res).toBe('');
  });

  it('should remap claude haiku model id', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'x' }] }),
    } as Response);

    await generateAIResponse('claude', 'claude-3-5-haiku-latest', 'prompt', 'img', '', 'key');
    const body = JSON.parse(mockFetch.mock.calls[0][1]!.body as string);
    expect(body.model).toBe('claude-3-5-haiku-20241022');
  });

  it('should handle Ollama response with empty response field', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const res = await generateAIResponse('ollama', 'llava', 'prompt', 'img', 'http://localhost:11434', '');
    expect(res).toBe('');
  });
});

