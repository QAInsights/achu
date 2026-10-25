import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackFeature } from '../src/renderer/utils/telemetry';

describe('trackFeature', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the preload bridge with the fixed feature key', () => {
    const recordFeature = vi.fn();
    vi.stubGlobal('snapFrameAPI', { recordFeature });

    trackFeature('export_png');

    expect(recordFeature).toHaveBeenCalledWith('export_png');
  });

  it('does nothing when the preload bridge is unavailable', () => {
    vi.stubGlobal('snapFrameAPI', undefined);

    expect(() => trackFeature('export_png')).not.toThrow();
  });

  it('swallows errors thrown by the preload bridge', () => {
    vi.stubGlobal('snapFrameAPI', {
      recordFeature: () => {
        throw new Error('bridge unavailable');
      },
    });

    expect(() => trackFeature('export_png')).not.toThrow();
  });
});
