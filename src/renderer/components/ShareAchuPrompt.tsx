import { useCallback, useEffect } from 'react';
import { ExternalLink, Link2, X } from 'lucide-react';
import { ACHU_SITE_URL } from '../../shared/branding';
import { useAppContext } from '../AppContext';
import { dismissShareAchuPrompt } from '../utils/growthUtils';
import { buildShareIntentUrl, getShareCaption } from '../utils/shareCaptions';
import './ShareAchuPrompt.css';

function openUrl(url: string) {
  if (window.snapFrameAPI?.openURL) {
    window.snapFrameAPI.openURL(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * Soft growth prompt after the 3rd successful export.
 * Local-only dismiss flag; opens browser only on explicit user action.
 */
export default function ShareAchuPrompt({ open, onClose }: Props) {
  const { showToast } = useAppContext();

  const dismiss = useCallback(() => {
    // Permanent dismiss so we stay non-nagging (local-only flag).
    dismissShareAchuPrompt();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open) return null;

  const handleShareX = () => {
    const caption = getShareCaption('x');
    openUrl(buildShareIntentUrl('x', caption));
    dismissShareAchuPrompt();
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      if (window.snapFrameAPI?.copyTextToClipboard) {
        await window.snapFrameAPI.copyTextToClipboard(ACHU_SITE_URL);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ACHU_SITE_URL);
      }
      showToast?.('achu.app link copied', 2500);
    } catch {
      showToast?.('Could not copy link', 4000);
    }
    dismissShareAchuPrompt();
    onClose();
  };

  return (
    <div className="modal-overlay share-achu-overlay" data-testid="share-achu-prompt">
      <div
        className="modal-card share-achu-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-achu-title"
      >
        <h2 className="share-achu-title" id="share-achu-title">
          Share achu?
        </h2>
        <p className="share-achu-body">
          You&apos;ve polished a few shots. If achu helped, a quick share helps others find a free,
          local alternative.
        </p>
        <div className="share-achu-actions">
          <button
            type="button"
            className="btn btn-ghost share-achu-actions-left"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" /> Not now
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleCopyLink}>
            <Link2 className="w-4 h-4" /> Copy link
          </button>
          <button type="button" className="btn btn-primary" onClick={handleShareX} data-testid="share-achu-x">
            <ExternalLink className="w-4 h-4" /> Share on X
          </button>
        </div>
      </div>
    </div>
  );
}
