import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const { mockTrackFeature, mockDownsampleImageForOcr } = vi.hoisted(() => ({
  mockTrackFeature: vi.fn(),
  mockDownsampleImageForOcr: vi.fn(),
}));

vi.mock('../src/renderer/utils/telemetry', () => ({
  trackFeature: mockTrackFeature,
}));

vi.mock('../src/renderer/hooks/useConnectionPoll', () => ({
  useConnectionPoll: () => [false, vi.fn()],
}));

vi.mock('../src/renderer/utils/modelsDevUtils', () => ({
  fetchAndParseModels: vi.fn().mockResolvedValue({ openai: [], google: [], claude: [] }),
  DEFAULT_OPENAI_MODELS: [],
  DEFAULT_GEMINI_MODELS: [],
  DEFAULT_CLAUDE_MODELS: [],
}));

vi.mock('../src/renderer/utils/privacyGuardUtils', () => ({
  downsampleImageForOcr: mockDownsampleImageForOcr,
}));

vi.mock('../src/renderer/canvasRenderer', () => ({
  renderCanvas: vi.fn(),
  preloadBgImage: vi.fn(),
}));

import { useIssueAgent } from '../src/renderer/hooks/useIssueAgent';

describe('useIssueAgent telemetry', () => {
  beforeEach(() => {
    mockTrackFeature.mockClear();
    mockDownsampleImageForOcr.mockResolvedValue({
      dataUrl: 'data:image/png;base64,encoded',
      width: 1,
      height: 1,
    });
    window.snapFrameAPI = {
      generateAIResponse: vi.fn().mockResolvedValue(JSON.stringify({ title: 'Bug', severity: 'low' })),
    };
  });

  it('records a fixed provider key after successful generation', async () => {
    const { result } = renderHook(() => useIssueAgent(
      'data:image/png;base64,encoded',
      false,
      () => ({} as any),
      vi.fn(),
    ));

    await act(async () => {
      await result.current.generateIssue();
    });

    expect(mockTrackFeature).toHaveBeenCalledWith('ai_issue_ollama');
  });

  it('does not record a provider key for an unknown provider', async () => {
    const { result } = renderHook(() => useIssueAgent(
      'data:image/png;base64,encoded',
      false,
      () => ({} as any),
      vi.fn(),
    ));
    act(() => result.current.setAiProvider('unknown' as any));

    await act(async () => {
      await result.current.generateIssue();
    });

    expect(mockTrackFeature).not.toHaveBeenCalled();
  });
});
