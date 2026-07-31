import { describe, it, expect, beforeEach } from 'vitest';
import {
  GROWTH_KEYS,
  SHARE_ACHU_EXPORT_THRESHOLD,
  dismissShareAchuPrompt,
  getExportSuccessCount,
  isOnboardingTourCompleted,
  isShareAchuPromptDismissed,
  markOnboardingTourCompleted,
  recordExportSuccess,
} from '../src/renderer/utils/growthUtils';

describe('growthUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('onboarding tour starts incomplete and can be marked done', () => {
    expect(isOnboardingTourCompleted()).toBe(false);
    markOnboardingTourCompleted();
    expect(isOnboardingTourCompleted()).toBe(true);
  });

  it('increments export success count', () => {
    expect(getExportSuccessCount()).toBe(0);
    expect(recordExportSuccess().count).toBe(1);
    expect(recordExportSuccess().count).toBe(2);
    expect(getExportSuccessCount()).toBe(2);
  });

  it('signals share prompt only on the threshold export', () => {
    for (let i = 1; i < SHARE_ACHU_EXPORT_THRESHOLD; i++) {
      const r = recordExportSuccess();
      expect(r.shouldShowSharePrompt).toBe(false);
    }
    const hit = recordExportSuccess();
    expect(hit.count).toBe(SHARE_ACHU_EXPORT_THRESHOLD);
    expect(hit.shouldShowSharePrompt).toBe(true);

    // Further exports do not re-trigger (only exact threshold)
    expect(recordExportSuccess().shouldShowSharePrompt).toBe(false);
  });

  it('does not show share prompt when already dismissed', () => {
    dismissShareAchuPrompt();
    expect(isShareAchuPromptDismissed()).toBe(true);
    for (let i = 0; i < SHARE_ACHU_EXPORT_THRESHOLD; i++) {
      expect(recordExportSuccess().shouldShowSharePrompt).toBe(false);
    }
  });

  it('persists flags under snapframe-user-defaults', () => {
    markOnboardingTourCompleted();
    recordExportSuccess();
    dismissShareAchuPrompt();
    const raw = localStorage.getItem('snapframe-user-defaults');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed[GROWTH_KEYS.onboardingTourCompleted]).toBe(true);
    expect(parsed[GROWTH_KEYS.exportSuccessCount]).toBe(1);
    expect(parsed[GROWTH_KEYS.shareAchuPromptDismissed]).toBe(true);
  });
});
