import type { TelemetryFeature } from '../../shared/telemetryFeatures';

export function trackFeature(name: TelemetryFeature): void {
  try {
    window.snapFrameAPI?.recordFeature?.(name);
  } catch {
    /* telemetry must never break the app */
  }
}
