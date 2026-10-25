import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const { mockTrackFeature, mockCreateWorker, mockDownsampleImageForOcr, mockProcessOcrResults } = vi.hoisted(() => ({
  mockTrackFeature: vi.fn(),
  mockCreateWorker: vi.fn(),
  mockDownsampleImageForOcr: vi.fn(),
  mockProcessOcrResults: vi.fn(),
}));

vi.mock('../src/renderer/utils/telemetry', () => ({
  trackFeature: mockTrackFeature,
}));

vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
}));

vi.mock('../src/renderer/utils/privacyGuardUtils', () => ({
  downsampleImageForOcr: mockDownsampleImageForOcr,
  processOcrResults: mockProcessOcrResults,
}));

import { useRedaction } from '../src/renderer/hooks/useRedaction';

describe('useRedaction telemetry', () => {
  beforeEach(() => {
    mockTrackFeature.mockClear();
    mockDownsampleImageForOcr.mockResolvedValue({
      dataUrl: 'data:image/png;base64,encoded',
      width: 100,
      height: 100,
    });
    mockProcessOcrResults.mockReturnValue([
      { id: 'redaction-1', text: 'private', status: 'visible' },
    ]);
    mockCreateWorker.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'private', blocks: [] },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('records successful scans and redact-all actions', async () => {
    const { result } = renderHook(() => useRedaction(
      'data:image/png;base64,encoded',
      () => ({} as any),
      vi.fn(),
      vi.fn(),
    ));

    await act(async () => {
      await result.current.scanForSecrets();
    });
    expect(mockTrackFeature).toHaveBeenCalledWith('privacy_scan');

    act(() => result.current.redactAll());
    expect(mockTrackFeature).toHaveBeenCalledWith('redact_all');
  });

  it('records scan errors', async () => {
    mockCreateWorker.mockRejectedValueOnce(new Error('OCR unavailable'));
    vi.stubGlobal('alert', vi.fn());
    const { result } = renderHook(() => useRedaction(
      'data:image/png;base64,encoded',
      () => ({} as any),
      vi.fn(),
      vi.fn(),
    ));

    await act(async () => {
      await result.current.scanForSecrets();
    });

    expect(mockTrackFeature).toHaveBeenCalledWith('err_privacy_scan');
  });
});
