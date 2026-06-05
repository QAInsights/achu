import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUserRepos, pushToGitHub } from '../src/renderer/utils/githubApiUtils';

describe('githubApiUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // fetchUserRepos
  // -----------------------------------------------------------------------
  describe('fetchUserRepos', () => {
    it('returns repo full names on success', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { full_name: 'user/repo1' },
          { full_name: 'user/repo2' },
        ]),
      }));

      const repos = await fetchUserRepos('fake-token');
      expect(repos).toEqual(['user/repo1', 'user/repo2']);
    });

    it('throws on non-ok response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }));

      await expect(fetchUserRepos('bad-token')).rejects.toThrow(
        'Failed to fetch user repositories: 401 Unauthorized'
      );
    });

    it('returns empty array when response is not an array', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'not an array' }),
      }));

      const repos = await fetchUserRepos('token');
      expect(repos).toEqual([]);
    });

    it('passes correct Authorization header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      vi.stubGlobal('fetch', fetchMock);

      await fetchUserRepos('my-token');

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('api.github.com/user/repos');
      expect(options.headers.Authorization).toBe('Bearer my-token');
    });
  });

  // -----------------------------------------------------------------------
  // pushToGitHub — successful path
  // -----------------------------------------------------------------------
  describe('pushToGitHub', () => {
    const basePayload = {
      title: 'Test Bug',
      severity: 'high' as const,
      reproSteps: ['Step 1'],
      expected: 'Should work',
      actual: 'Crashed',
      components: ['Button'],
      labels: ['bug'],
      severityReason: '',
      markdownBody: '# Bug',
    };

    it('creates an issue and returns the URL', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 42, html_url: 'https://github.com/u/r/issues/42' }),
        })
        // screenshot upload call (called inside try/catch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ content: { download_url: 'https://cdn.com/x.png' } }),
        })
        // comment post call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      vi.stubGlobal('fetch', fetchMock);

      const url = await pushToGitHub('token', 'owner', 'repo', basePayload, 'data:image/png;base64,ABC123');
      expect(url).toBe('https://github.com/u/r/issues/42');
    });

    it('creates issue with correct body including title and labels', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        });

      vi.stubGlobal('fetch', fetchMock);

      await pushToGitHub('t', 'o', 'r', basePayload, 'data:img,xxx');

      const [, callOpts] = fetchMock.mock.calls[0];
      const body = JSON.parse(callOpts.body);
      expect(body.title).toBe('Test Bug');
      expect(body.labels).toEqual(['bug']);
    });

    it('throws on issue creation failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve('Validation Failed'),
      }));

      await expect(
        pushToGitHub('t', 'o', 'r', basePayload, 'base64')
      ).rejects.toThrow('GitHub issue creation failed: 422');
    });

    // -------------------------------------------------------------------
    // Screenshot upload + comment (try/catch paths)
    // -------------------------------------------------------------------
    it('uploads screenshot and posts comment on success', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ content: { download_url: 'https://cdn.com/img.png' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      vi.stubGlobal('fetch', fetchMock);

      await pushToGitHub('t', 'o', 'r', basePayload, 'data:image/png;base64,ABC123');

      // 3 calls: issue create, upload, comment
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('does not throw when screenshot upload fails (console.warn)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Not Found'),
        });

      vi.stubGlobal('fetch', fetchMock);

      const url = await pushToGitHub('t', 'o', 'r', basePayload, 'data:image/png;base64,ABC123');
      expect(url).toBe('https://x.com/1');
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('does not throw when comment post fails (console.warn)', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ content: { download_url: 'https://cdn.com/x.png' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Forbidden'),
        });

      vi.stubGlobal('fetch', fetchMock);

      const url = await pushToGitHub('t', 'o', 'r', basePayload, 'data:image/png;base64,ABC123');
      expect(url).toBe('https://x.com/1');
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('strips data URL prefix from base64 before upload', async () => {
      const uploadBodies: any[] = [];

      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockImplementationOnce(async (_url: string, opts: any) => {
          uploadBodies.push(JSON.parse(opts?.body || '{}'));
          return { ok: true, json: () => Promise.resolve({ content: { download_url: 'https://cdn.com/x.png' } }) };
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      await pushToGitHub('t', 'o', 'r', basePayload, 'data:image/png;base64,RAW_BASE64_DATA');

      expect(uploadBodies[0].content).not.toContain('data:image');
      expect(uploadBodies[0].content).not.toContain(',');
      expect(uploadBodies[0].content).toBe('RAW_BASE64_DATA');
    });

    it('handles base64 without comma prefix', async () => {
      const uploadBodies: any[] = [];

      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockImplementationOnce(async (_url: string, opts: any) => {
          uploadBodies.push(JSON.parse(opts?.body || '{}'));
          return { ok: true, json: () => Promise.resolve({ content: { download_url: 'https://cdn.com/x.png' } }) };
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      await pushToGitHub('t', 'o', 'r', basePayload, 'NO_COMMA_PREFIX');

      expect(uploadBodies[0].content).toBe('NO_COMMA_PREFIX');
    });

    it('catches thrown errors during upload and returns issue URL anyway', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1, html_url: 'https://x.com/1' }),
        })
        .mockRejectedValueOnce(new Error('Network failure'));

      vi.stubGlobal('fetch', fetchMock);

      const url = await pushToGitHub('t', 'o', 'r', basePayload, 'data:img,xxx');
      expect(url).toBe('https://x.com/1');
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
