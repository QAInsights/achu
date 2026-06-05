import { useState } from 'react';
import { renderCanvas, RenderConfig } from '../canvasRenderer';

export function useExport(
  imageSrc: string | null,
  noImageMode: boolean,
  getCurrentConfig: () => RenderConfig
) {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>(() => {
    try {
      const saved = localStorage.getItem('snapframe-user-defaults');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.exportFormat) return parsed.exportFormat;
      }
    } catch (e) {}
    return 'png';
  });
  const [jpegQuality, setJpegQuality] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('snapframe-user-defaults');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.jpegQuality !== undefined) return parsed.jpegQuality;
      }
    } catch (e) {}
    return 90;
  });

  const checkOgSizeLimit = (base64Data: string): boolean => {
    const config = getCurrentConfig();
    const selectedPreset = config.selectedPreset || '';
    const isOgPreset = selectedPreset && (
      selectedPreset.includes('OG') || 
      selectedPreset.includes('Link') || 
      selectedPreset.includes('Ad') || 
      selectedPreset.includes('Facebook') || 
      selectedPreset.includes('LinkedIn')
    );
    if (!isOgPreset) return true;

    const sizeInBytes = base64Data.length * 0.75;
    const sizeInMb = sizeInBytes / (1024 * 1024);
    if (sizeInMb > 8) {
      return confirm(
        `Warning: The image is ${sizeInMb.toFixed(2)}MB, which exceeds the 8MB limit for social media/Open Graph previews (iMessage, WhatsApp, Facebook, etc.).\n\nIt is highly recommended to export as JPEG or reduce padding/scale to bring the file size under 300KB.\n\nDo you want to proceed anyway?`
      );
    }
    return true;
  };

  const loadImages = (
    screenshotSrc: string | null,
    backgroundVal: string,
    callback: (screenshotImg: HTMLImageElement | null) => void
  ) => {
    let pending = 0;
    let screenshotImg: HTMLImageElement | null = null;

    const checkDone = () => {
      if (pending === 0) {
        callback(screenshotImg);
      }
    };

    if (!noImageMode && screenshotSrc) {
      pending++;
      screenshotImg = new Image();
      screenshotImg.src = screenshotSrc;
      screenshotImg.onload = () => {
        pending--;
        checkDone();
      };
      screenshotImg.onerror = () => {
        pending--;
        checkDone();
      };
    }

    const config = getCurrentConfig();
    if (config.backgroundType === 'gradient' && backgroundVal.startsWith('url(')) {
      const match = backgroundVal.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match) {
        pending++;
        const bgImg = new Image();
        bgImg.src = match[1];
        bgImg.onload = () => {
          pending--;
          checkDone();
        };
        bgImg.onerror = () => {
          pending--;
          checkDone();
        };
      }
    }

    checkDone();
  };

  const copyBeautifiedImage = async () => {
    if (!noImageMode && !imageSrc) return;
    loadImages(imageSrc, getCurrentConfig().backgroundValue, (img) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      const base64Data = canvas.toDataURL('image/png');
      
      if (!checkOgSizeLimit(base64Data)) return;

      if (window.snapFrameAPI) {
        window.snapFrameAPI.copyImageToClipboard(base64Data);
      } else {
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        }, 'image/png');
      }
    });
  };

  const triggerExport = () => {
    if (!noImageMode && !imageSrc) return;
    loadImages(imageSrc, getCurrentConfig().backgroundValue, (img) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = canvas.toDataURL(mime, jpegQuality / 100);
      
      if (!checkOgSizeLimit(base64Data)) return;

      const sizeInKb = base64Data ? (base64Data.length * 0.75) / 1024 : 0;
      const config = getCurrentConfig();
      const selectedPreset = config.selectedPreset || '';
      const isOgPreset = selectedPreset && (selectedPreset.includes('OG') || selectedPreset.includes('Link'));
      const suffix = (isOgPreset && sizeInKb > 300) ? 'Tip: Keep Open Graph images under 300KB for best link preview performance.' : '';

      if (window.snapFrameAPI) {
        window.snapFrameAPI.saveFile(base64Data, exportFormat, jpegQuality);
        if (suffix) alert(suffix);
      } else {
        const link = document.createElement('a');
        link.download = `snapframe-export.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = base64Data;
        link.click();
        if (suffix) alert(suffix);
      }
    });
  };

  return {
    exportFormat,
    setExportFormat,
    jpegQuality,
    setJpegQuality,
    copyBeautifiedImage,
    triggerExport
  };
}
