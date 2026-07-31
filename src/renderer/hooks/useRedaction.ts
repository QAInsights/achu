import { useState } from 'react';
import type { RedactionItem, RenderConfig } from '../canvasRenderer';
import { createWorker } from 'tesseract.js';
import { processOcrResults, downsampleImageForOcr } from '../utils/privacyGuardUtils';
import { getUserDefault } from '../utils/storageUtils';
import type { WordBoundingBox } from '../utils/githubAgentUtils';

export function useRedaction(
  imageSrc: string | null,
  getCurrentConfig: () => RenderConfig,
  pushHistory: (config: any) => void,
  setCachedOcrResult: (val: { text: string; words: WordBoundingBox[] } | null) => void,
) {
  const [redactions, setRedactions] = useState<RedactionItem[]>([]);
  const [isScanningSecrets, setIsScanningSecrets] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [hoveredRedactionId, setHoveredRedactionId] = useState<string | null>(null);
  const [redactionStyle, setRedactionStyle] = useState<'blur' | 'solid'>(() => getUserDefault('redactionStyle', 'solid'));

  const runOCR = async (src: string, progressCallback?: (progress: number) => void) => {
    const { dataUrl, width, height } = await downsampleImageForOcr(src, 1600);

    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && progressCallback) {
          progressCallback(Math.round(m.progress * 100));
        }
      },
    });

    try {
      const { data } = await worker.recognize(dataUrl, {}, { blocks: true });
      const blocks = data.blocks || [];
      const lines = blocks
        .flatMap((block: any) => block.paragraphs || [])
        .flatMap((para: any) => para.lines || []);

      const ocrWords: WordBoundingBox[] = [];
      lines.forEach((line: any) => {
        const words = line.words || [];
        words.forEach((word: any) => {
          ocrWords.push({
            text: word.text,
            x: Math.max(0, word.bbox.x0 / width),
            y: Math.max(0, word.bbox.y0 / height),
            w: Math.min(1 - Math.max(0, word.bbox.x0 / width), (word.bbox.x1 - word.bbox.x0) / width),
            h: Math.min(1 - Math.max(0, word.bbox.y0 / height), (word.bbox.y1 - word.bbox.y0) / height)
          });
        });
      });

      return {
        text: data.text || '',
        words: ocrWords,
        lines,
        width,
        height
      };
    } finally {
      await worker.terminate();
    }
  };

  const scanForSecrets = async () => {
    if (!imageSrc) return;
    setIsScanningSecrets(true);
    setScanProgress(0);

    try {
      const ocrResult = await runOCR(imageSrc, setScanProgress);
      const detected = processOcrResults(ocrResult.lines as any, ocrResult.width, ocrResult.height);

      setRedactions(detected);
      setCachedOcrResult({ text: ocrResult.text, words: ocrResult.words });
      const newConfig = {
        ...getCurrentConfig(),
        redactions: detected,
      };
      pushHistory(newConfig);
    } catch (e) {
      console.error('OCR Scanning failed:', e);
      alert('Failed to scan screenshot: ' + (e as Error).message);
    } finally {
      setIsScanningSecrets(false);
    }
  };

  const toggleRedaction = (id: string) => {
    const updated: RedactionItem[] = redactions.map((r) =>
      r.id === id ? { ...r, status: r.status === 'redacted' ? 'visible' : 'redacted' } : r
    );
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  const redactAll = () => {
    const updated: RedactionItem[] = redactions.map((r) => ({ ...r, status: 'redacted' }));
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  const revealAll = () => {
    const updated: RedactionItem[] = redactions.map((r) => ({ ...r, status: 'visible' }));
    setRedactions(updated);
    pushHistory({ ...getCurrentConfig(), redactions: updated });
  };

  return {
    redactions, setRedactions,
    isScanningSecrets, setIsScanningSecrets,
    scanProgress, setScanProgress,
    hoveredRedactionId, setHoveredRedactionId,
    redactionStyle, setRedactionStyle,
    scanForSecrets, toggleRedaction, redactAll, revealAll,
  };
}
