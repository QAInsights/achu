import { describe, expect, it, vi } from 'vitest';
import { FEATURE_RE } from '../src/main/telemetry';
import { isTelemetryFeature, TELEMETRY_FEATURES } from '../src/shared/telemetryFeatures';

vi.mock('electron', () => ({
  app: { isPackaged: true },
  net: { fetch: vi.fn() },
}));

vi.mock('../src/main/settings', () => ({
  loadSettings: vi.fn(() => ({})),
  saveSettings: vi.fn(() => true),
}));

describe('telemetry feature catalog', () => {
  it('contains unique catalog keys within the feature limit', () => {
    expect(new Set(TELEMETRY_FEATURES).size).toBe(TELEMETRY_FEATURES.length);
    expect(TELEMETRY_FEATURES.length).toBeLessThanOrEqual(50);
    for (const feature of TELEMETRY_FEATURES) {
      expect(FEATURE_RE.test(feature)).toBe(true);
    }
  });

  it('recognizes only catalog keys', () => {
    expect(isTelemetryFeature('export_png')).toBe(true);
    expect(isTelemetryFeature('foo_bar')).toBe(false);
    expect(isTelemetryFeature(null)).toBe(false);
  });
});
