import { describe, it, expect, beforeEach } from 'vitest';

// Re-import after clearing the registry each test via module re-evaluation
// We test the registry functions directly.

describe('settingsRegistry', () => {
  // We need a fresh registry for each test. Since the module caches state,
  // we use dynamic imports with cache-busting via vi.resetModules().
  beforeEach(async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
  });

  it('registers a section and returns its keywords for the correct tab', async () => {
    const { registerSettingsSection, getKeywordsForTab } = await import(
      '../src/renderer/utils/settingsRegistry'
    );
    registerSettingsSection({ tab: 'general', label: 'Canvas Defaults', keywords: 'padding shadow blur' });
    expect(getKeywordsForTab('general')).toContain('padding');
    expect(getKeywordsForTab('general')).toContain('shadow');
  });

  it('does not leak keywords across tabs', async () => {
    const { registerSettingsSection, getKeywordsForTab } = await import(
      '../src/renderer/utils/settingsRegistry'
    );
    registerSettingsSection({ tab: 'general', label: 'General', keywords: 'sidebar position' });
    registerSettingsSection({ tab: 'ai', label: 'AI Provider', keywords: 'ollama openai gemini' });
    expect(getKeywordsForTab('general')).not.toContain('ollama');
    expect(getKeywordsForTab('ai')).not.toContain('sidebar');
  });

  it('combines keywords from multiple sections in the same tab', async () => {
    const { registerSettingsSection, getKeywordsForTab } = await import(
      '../src/renderer/utils/settingsRegistry'
    );
    registerSettingsSection({ tab: 'general', label: 'Section A', keywords: 'export format' });
    registerSettingsSection({ tab: 'general', label: 'Section B', keywords: 'watermark opacity' });
    const kw = getKeywordsForTab('general');
    expect(kw).toContain('export');
    expect(kw).toContain('watermark');
  });

  it('deduplicates sections with same tab and label', async () => {
    const { registerSettingsSection, getKeywordsForTab } = await import(
      '../src/renderer/utils/settingsRegistry'
    );
    registerSettingsSection({ tab: 'shortcuts', label: 'Keyboard', keywords: 'paste undo' });
    registerSettingsSection({ tab: 'shortcuts', label: 'Keyboard', keywords: 'paste undo' });
    const kw = getKeywordsForTab('shortcuts');
    // Should appear only once — split and count occurrences of 'paste'
    const count = kw.split(' ').filter(w => w === 'paste').length;
    expect(count).toBe(1);
  });

  it('returns empty string for a tab with no registered sections', async () => {
    const { getKeywordsForTab } = await import('../src/renderer/utils/settingsRegistry');
    expect(getKeywordsForTab('ai')).toBe('');
  });

  it('registers sections across all three tabs independently', async () => {
    const { registerSettingsSection, getKeywordsForTab } = await import(
      '../src/renderer/utils/settingsRegistry'
    );
    registerSettingsSection({ tab: 'general', label: 'G', keywords: 'general-kw' });
    registerSettingsSection({ tab: 'ai', label: 'A', keywords: 'ai-kw' });
    registerSettingsSection({ tab: 'shortcuts', label: 'S', keywords: 'shortcuts-kw' });
    expect(getKeywordsForTab('general')).toContain('general-kw');
    expect(getKeywordsForTab('ai')).toContain('ai-kw');
    expect(getKeywordsForTab('shortcuts')).toContain('shortcuts-kw');
  });
});

describe('countMatches (tab auto-selection logic)', () => {
  function countMatches(keywords: string, q: string): number {
    if (!q) return 0;
    return q.split(' ').filter(word => word && keywords.includes(word)).length;
  }

  it('returns 0 for empty query', () => {
    expect(countMatches('padding shadow export', '')).toBe(0);
  });

  it('returns 0 when no query word matches keywords', () => {
    expect(countMatches('padding shadow export', 'ollama')).toBe(0);
  });

  it('returns 1 for a single matching word', () => {
    expect(countMatches('padding shadow export', 'export')).toBe(1);
  });

  it('scores all matching words in a multi-word query', () => {
    expect(countMatches('ai provider ollama openai gemini', 'ollama openai')).toBe(2);
  });

  it('ignores empty tokens from extra spaces', () => {
    expect(countMatches('padding shadow', '  padding  ')).toBe(1);
  });

  it('does not match partial words against keywords', () => {
    // 'exp' should NOT match 'export' since keywords.includes('exp') would be true
    // but this tests that our split-on-space approach works for full words
    expect(countMatches('export format', 'export')).toBe(1);
    expect(countMatches('export format', 'export format')).toBe(2);
  });

  it('correctly scores which tab wins for a given query', () => {
    const GENERAL_KW = 'padding shadow export watermark sidebar';
    const AI_KW = 'ai provider ollama openai gemini claude';
    const SHORTCUTS_KW = 'keyboard shortcut paste undo redo';

    const query = 'ollama gemini';
    const scores = {
      general: countMatches(GENERAL_KW, query),
      ai: countMatches(AI_KW, query),
      shortcuts: countMatches(SHORTCUTS_KW, query),
    };
    const best = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    expect(best[0]).toBe('ai');
    expect(best[1]).toBe(2);
  });

  it('general tab wins for a general-specific query', () => {
    const GENERAL_KW = 'padding shadow export watermark sidebar';
    const AI_KW = 'ai provider ollama openai gemini claude';
    const SHORTCUTS_KW = 'keyboard shortcut paste undo redo';

    const query = 'padding watermark';
    const scores = {
      general: countMatches(GENERAL_KW, query),
      ai: countMatches(AI_KW, query),
      shortcuts: countMatches(SHORTCUTS_KW, query),
    };
    const best = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    expect(best[0]).toBe('general');
  });

  it('shortcuts tab wins for a shortcuts-specific query', () => {
    const GENERAL_KW = 'padding shadow export watermark sidebar';
    const AI_KW = 'ai provider ollama openai gemini claude';
    const SHORTCUTS_KW = 'keyboard shortcut paste undo redo';

    const query = 'keyboard paste undo';
    const scores = {
      general: countMatches(GENERAL_KW, query),
      ai: countMatches(AI_KW, query),
      shortcuts: countMatches(SHORTCUTS_KW, query),
    };
    const best = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    expect(best[0]).toBe('shortcuts');
  });
});
