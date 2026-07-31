import { useCallback, useEffect, useState } from 'react';
import { X, ClipboardCopy, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { isOnboardingTourCompleted, markOnboardingTourCompleted } from '../utils/growthUtils';
import { getModKeyLabel } from '../utils/shortcutLabels';
import { buildShareIntentUrl, getShareCaption } from '../utils/shareCaptions';
import './OnboardingTour.css';

const TOTAL_STEPS = 3;

function openUrl(url: string) {
  if (window.snapFrameAPI?.openURL) {
    window.snapFrameAPI.openURL(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export default function OnboardingTour() {
  const { imageSrc, noImageMode, copyBeautifiedImage, showToast } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOnboardingTourCompleted()) return;
    const t = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  const complete = useCallback(() => {
    markOnboardingTourCompleted();
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        complete();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, complete]);

  const handleCopyBeautified = async () => {
    // Option A: empty canvas → toast and stay on step 3
    if (!noImageMode && !imageSrc) {
      showToast?.('Paste a screenshot first, then copy.', 3500);
      return;
    }
    setBusy(true);
    try {
      await copyBeautifiedImage();
      showToast?.('Beautified shot copied', 2500);
      complete();
    } catch {
      showToast?.('Could not copy. Try pasting an image first.', 4000);
    } finally {
      setBusy(false);
    }
  };

  const handleShareX = () => {
    const caption = getShareCaption('x');
    openUrl(buildShareIntentUrl('x', caption));
  };

  if (!visible) return null;

  const mod = getModKeyLabel();

  const steps = [
    {
      kicker: 'Step 1 of 3',
      title: 'Paste a screenshot',
      body: (
        <>
          Drop an image here, or press <kbd>{mod}</kbd>+<kbd>V</kbd>. Beautify, Privacy Guard, and OCR
          all run on your machine by default.
        </>
      ),
    },
    {
      kicker: 'Step 2 of 3',
      title: 'Beautify in one click',
      body: (
        <>
          Use presets, mesh backgrounds, browser chrome, annotations, or Code Studio. Your captures
          stay local unless you choose a cloud AI provider.
        </>
      ),
    },
    {
      kicker: 'Step 3 of 3',
      title: 'Share a polished shot',
      body: (
        <>
          Copy a beautified image to your clipboard, or optionally draft a post on X with achu.app.
          You can turn the brand badge off anytime in Settings.
        </>
      ),
    },
  ] as const;

  const current = steps[step];

  return (
    <div className="modal-overlay" data-testid="onboarding-tour">
      <div
        className="modal-card onboarding-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
      >
        <div className="onboarding-tour-header">
          <div>
            <div className="onboarding-tour-kicker">{current.kicker}</div>
            <h2 className="onboarding-tour-title" id="onboarding-tour-title">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            className="onboarding-tour-close"
            onClick={complete}
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="onboarding-tour-body">{current.body}</p>

        <div className="onboarding-tour-dots" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span key={i} className="onboarding-tour-dot" data-active={i === step} />
          ))}
        </div>

        <div className="onboarding-tour-actions">
          {step === 0 ? (
            <button type="button" className="btn btn-ghost onboarding-tour-actions-left" onClick={complete}>
              Skip
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost onboarding-tour-actions-left"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleShareX}>
                <ExternalLink className="w-4 h-4" /> Share on X
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCopyBeautified}
                disabled={busy}
                data-testid="onboarding-copy-shot"
              >
                <ClipboardCopy className="w-4 h-4" /> Copy a beautified shot
              </button>
              <button type="button" className="btn btn-ghost" onClick={complete}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
