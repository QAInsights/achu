import { useEffect } from 'react';
import { detectLanguage } from '../utils/codeTokenizer';

export function useClipboardPaste(
  codeStudioActive: boolean,
  setCodeStudioActive: (val: boolean) => void,
  setNoImageMode: (val: boolean) => void,
  setBackgroundType: (val: 'gradient' | 'color' | 'blur' | 'mesh') => void,
  setCodeStudioCode: (val: string) => void,
  setCodeStudioLanguage: (val: string) => void,
  getCurrentConfig: () => any,
  pushHistory: (cfg: any) => void,
  handlePasteImage: (dataUrl: string) => void,
  showToast: (message: string, duration?: number) => void
) {
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      let pastedImage = false;

      // 1. Check if there's an image in the clipboard first
      if (window.snapFrameAPI) {
        const dataUrl = await window.snapFrameAPI.readImageFromClipboard();
        if (dataUrl) {
          handlePasteImage(dataUrl);
          pastedImage = true;
        }
      }

      if (!pastedImage) {
        const items = e.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const blob = items[i].getAsFile();
              if (blob) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    handlePasteImage(event.target.result as string);
                  }
                };
                reader.readAsDataURL(blob);
                pastedImage = true;
                break;
              }
            }
          }
        }
      }

      // 2. If no image was found, check if plain text is Java/Python code
      if (!pastedImage) {
        const text = e.clipboardData?.getData('text/plain');
        if (text) {
          const detectedLang = detectLanguage(text);
          if (detectedLang === 'java' || detectedLang === 'python') {
            setCodeStudioActive(true);
            setNoImageMode(true);
            setBackgroundType('gradient');
            setCodeStudioCode(text);
            setCodeStudioLanguage(detectedLang);
            showToast(`Switched to Code Studio (${detectedLang}).`);
            pushHistory({
              ...getCurrentConfig(),
              codeStudioActive: true,
              noImage: true,
              backgroundType: 'gradient',
              codeStudioCode: text,
              codeStudioLanguage: detectedLang,
            });
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [
    codeStudioActive,
    setCodeStudioActive,
    setNoImageMode,
    setBackgroundType,
    setCodeStudioCode,
    setCodeStudioLanguage,
    getCurrentConfig,
    pushHistory,
    handlePasteImage,
    showToast,
  ]);
}
