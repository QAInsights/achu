import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAndParseModels,
  DEFAULT_OPENAI_MODELS,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_CLAUDE_MODELS,
} from '../src/renderer/utils/modelsDevUtils';

describe('modelsDevUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DEFAULT_ constants', () => {
    it('DEFAULT_OPENAI_MODELS has entries', () => {
      expect(DEFAULT_OPENAI_MODELS.length).toBeGreaterThan(0);
      expect(DEFAULT_OPENAI_MODELS[0]).toHaveProperty('value');
      expect(DEFAULT_OPENAI_MODELS[0]).toHaveProperty('label');
    });

    it('DEFAULT_GEMINI_MODELS has entries', () => {
      expect(DEFAULT_GEMINI_MODELS.length).toBeGreaterThan(0);
    });

    it('DEFAULT_CLAUDE_MODELS has entries', () => {
      expect(DEFAULT_CLAUDE_MODELS.length).toBeGreaterThan(0);
    });
  });

  describe('fetchAndParseModels', () => {
    it('returns defaults when fetch fails and no cache exists', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await fetchAndParseModels();
      expect(result.openai).toEqual(DEFAULT_OPENAI_MODELS);
      expect(result.google).toEqual(DEFAULT_GEMINI_MODELS);
      expect(result.claude).toEqual(DEFAULT_CLAUDE_MODELS);
    });

    it('returns defaults when fetch returns non-ok and no cache', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      const result = await fetchAndParseModels();
      expect(result.openai).toEqual(DEFAULT_OPENAI_MODELS);
    });

    it('returns cached data when fetch fails', async () => {
      const cacheData = {
        timestamp: Date.now(),
        data: {
          openai: { models: { 'gpt-5': { name: 'GPT-5', modalities: { input: ['image'] } } } },
          google: { models: {} },
          anthropic: { models: {} },
        },
      };
      localStorage.setItem('snapframe-models-dev-cache', JSON.stringify(cacheData));

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await fetchAndParseModels();
      expect(result.openai[0].value).toBe('gpt-5');
    });

    it('parses fetched models and filters to image-capable only', async () => {
      const apiData = {
        openai: {
          models: {
            'gpt-4o': { name: 'GPT-4o', modalities: { input: ['text', 'image'] } },
            'gpt-4': { name: 'GPT-4', modalities: { input: ['text'] } },
            'dall-e-3': { name: 'DALL-E 3', modalities: { input: ['text'] } },
          },
        },
        google: { models: {} },
        anthropic: { models: {} },
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiData),
      }));

      const result = await fetchAndParseModels();
      expect(result.openai).toHaveLength(1);
      expect(result.openai[0].value).toBe('gpt-4o');
      // gpt-4 and dall-e-3 excluded (no image input modality)
    });

    it('writes fetched data to localStorage cache', async () => {
      const apiData = {
        openai: { models: { 'gpt-4o': { name: 'GPT-4o', modalities: { input: ['image'] } } } },
        google: { models: {} },
        anthropic: { models: {} },
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiData),
      }));

      await fetchAndParseModels();

      const cached = localStorage.getItem('snapframe-models-dev-cache');
      expect(cached).not.toBeNull();
      const parsed = JSON.parse(cached!);
      expect(parsed.data).toEqual(apiData);
    });

    it('uses cache when it is fresh (< 24h)', async () => {
      const apiData = {
        openai: { models: { 'gpt-5': { name: 'GPT-5', modalities: { input: ['image'] } } } },
        google: { models: {} },
        anthropic: { models: {} },
      };
      localStorage.setItem('snapframe-models-dev-cache', JSON.stringify({
        timestamp: Date.now() - 10000,
        data: apiData,
      }));

      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const result = await fetchAndParseModels();
      // Should use cache, no fetch calls
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.openai[0].value).toBe('gpt-5');
    });

    it('ignores expired cache and fetches fresh', async () => {
      const oldData = {
        openai: { models: { 'old-model': { name: 'Old', modalities: { input: ['image'] } } } },
        google: { models: {} },
        anthropic: { models: {} },
      };
      localStorage.setItem('snapframe-models-dev-cache', JSON.stringify({
        timestamp: Date.now() - 90000000, // 25 hours ago
        data: oldData,
      }));

      const newData = {
        openai: { models: { 'new-model': { name: 'New', modalities: { input: ['image'] } } } },
        google: { models: {} },
        anthropic: { models: {} },
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(newData),
      }));

      const result = await fetchAndParseModels();
      expect(result.openai[0].value).toBe('new-model');
    });

    it('handles malformed cache JSON gracefully', async () => {
      localStorage.setItem('snapframe-models-dev-cache', 'not valid json {{{');

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

      const result = await fetchAndParseModels();
      // Returns defaults
      expect(result.openai).toEqual(DEFAULT_OPENAI_MODELS);
    });

    it('handles cache parse failure in fetch error fallback gracefully', async () => {
      // First put valid cache so it succeeds
      const cacheData = {
        timestamp: Date.now() - 90000000,
        data: {
          openai: { models: {} },
          google: { models: {} },
          anthropic: { models: {} },
        },
      };
      localStorage.setItem('snapframe-models-dev-cache', JSON.stringify(cacheData));

      // Fetch fails
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

      const result = await fetchAndParseModels();
      // Returns defaults since cache models are empty
      expect(result.openai).toEqual(DEFAULT_OPENAI_MODELS);
    });

    it('uses a null provider return when models.dev has no models for a provider', async () => {
      const apiData = {
        openai: { models: {} },
        google: null,
        anthropic: { models: {} },
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiData),
      }));

      const result = await fetchAndParseModels();
      // Null google should fall back to defaults, openai/anthropic stay defaults (empty models)
      expect(result.google).toEqual(DEFAULT_GEMINI_MODELS);
    });
  });
});
