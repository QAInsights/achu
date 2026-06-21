import { useState, useEffect } from 'react';
import { useAppContext } from '../AppContext';
import { X, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { downsampleImageForOcr } from '../utils/privacyGuardUtils';
import './GrabTextModal.css';

interface GrabTextModalProps {
  onClose: () => void;
}

export default function GrabTextModal({ onClose }: GrabTextModalProps) {
  const { imageSrc } = useAppContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [text, setText] = useState<string>('');
  const [trimText, setTrimText] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;
    let worker: any = null;

    const performOcr = async () => {
      if (!imageSrc) {
        if (isMounted) {
          setError('No image loaded in the editor.');
          setLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setProgress(0);
          setError(null);
        }

        // Downsample the image for faster OCR processing
        const { dataUrl } = await downsampleImageForOcr(imageSrc, 1600);

        if (!isMounted) return;

        // Initialize local Tesseract worker
        worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (isMounted && m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });

        if (!isMounted) {
          await worker.terminate();
          return;
        }

        // Execute recognition
        const { data } = await worker.recognize(dataUrl);

        if (isMounted) {
          setText(data.text || '');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('OCR processing error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to extract text from the screenshot.');
          setLoading(false);
        }
      } finally {
        if (worker) {
          try {
            await worker.terminate();
          } catch (e) {
            console.error('Failed to terminate worker:', e);
          }
        }
      }
    };

    performOcr();

    return () => {
      isMounted = false;
    };
  }, [imageSrc]);

  const handleCopy = () => {
    let finalPayload = text;

    if (trimText) {
      // Trim whitespace from lines, remove completely empty lines
      finalPayload = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n')
        .trim();
    }

    navigator.clipboard.writeText(finalPayload)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((err) => {
        console.error('Clipboard copy failed:', err);
        alert('Could not copy text to clipboard.');
      });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card grab-text-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        {/* Close Button */}
        <button
          className="preset-delete-btn"
          onClick={onClose}
          title="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Modal Title Header */}
        <div className="grab-text-header">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="modal-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
            Grab Text
          </h2>
        </div>

        {/* Loading State */}
        {loading && !error && (
          <div className="grab-text-loader-container">
            <div className="grab-text-progress-wrapper">
              <div className="grab-text-progress-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  Extracting text from image...
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{progress}%</span>
              </div>
              <div className="grab-text-progress-track">
                <div
                  className="grab-text-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="grab-text-error">
            <span>{error}</span>
          </div>
        )}

        {/* Loaded text area state */}
        {!loading && !error && (
          <>
            <textarea
              className="grab-text-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="No text was detected in the screenshot."
            />

            <label className="grab-text-checkbox-container">
              <input
                type="checkbox"
                className="grab-text-checkbox"
                checked={trimText}
                onChange={(e) => setTrimText(e.target.checked)}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Trim lines and remove empty lines
              </span>
            </label>
          </>
        )}

        {/* Modal Actions */}
        <div className="modal-actions" style={{ marginTop: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {!loading && !error && (
            <button
              className="btn btn-primary"
              onClick={handleCopy}
              style={{ minWidth: '120px' }}
              disabled={!text.trim()}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
