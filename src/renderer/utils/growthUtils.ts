import { getUserDefault, updateUserDefault } from './storageUtils';

/** localStorage keys (via snapframe-user-defaults) for privacy-first growth surfaces. */
export const GROWTH_KEYS = {
  onboardingTourCompleted: 'onboardingTourCompleted',
  exportSuccessCount: 'exportSuccessCount',
  shareAchuPromptDismissed: 'shareAchuPromptDismissed',
} as const;

/** Soft prompt appears exactly after this many successful exports. */
export const SHARE_ACHU_EXPORT_THRESHOLD = 3;

export function isOnboardingTourCompleted(): boolean {
  return getUserDefault(GROWTH_KEYS.onboardingTourCompleted, false) === true;
}

export function markOnboardingTourCompleted(): void {
  updateUserDefault(GROWTH_KEYS.onboardingTourCompleted, true);
}

export function getExportSuccessCount(): number {
  const n = getUserDefault<number>(GROWTH_KEYS.exportSuccessCount, 0);
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function isShareAchuPromptDismissed(): boolean {
  return getUserDefault(GROWTH_KEYS.shareAchuPromptDismissed, false) === true;
}

export function dismissShareAchuPrompt(): void {
  updateUserDefault(GROWTH_KEYS.shareAchuPromptDismissed, true);
}

export type RecordExportSuccessResult = {
  count: number;
  /** True only on the threshold crossing, and only if not already dismissed. */
  shouldShowSharePrompt: boolean;
};

/**
 * Increment successful export counter (copy / file export / gallery save).
 * Pure localStorage; no network. Returns whether the soft Share achu prompt should open.
 */
export function recordExportSuccess(): RecordExportSuccessResult {
  const prev = getExportSuccessCount();
  const count = prev + 1;
  updateUserDefault(GROWTH_KEYS.exportSuccessCount, count);

  const shouldShowSharePrompt =
    count === SHARE_ACHU_EXPORT_THRESHOLD && !isShareAchuPromptDismissed();

  return { count, shouldShowSharePrompt };
}
