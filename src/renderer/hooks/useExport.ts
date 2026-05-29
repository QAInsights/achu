import { useState } from 'react';
import { renderCanvas, RenderConfig } from '../canvasRenderer';

export function useExport(
  imageSrc: string | null,
  noImageMode: boolean,
  getCurrentConfig: () => RenderConfig
) {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [jpegQuality, setJpegQuality] = useState<number>(90);

  const copyBeautifiedImage = async () => {
    if (!noImageMode && !imageSrc) return;
    const runCopy = (img: HTMLImageElement | null) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      const base64Data = canvas.toDataURL('image/png');
      if (window.snapFrameAPI) {
        window.snapFrameAPI.copyImageToClipboard(base64Data).then((success: boolean) => {
          if (success) alert('Beautified image copied to clipboard!');
          else alert('Failed to copy to clipboard.');
        });
      } else {
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
              .then(() => alert('Copied to clipboard (Browser)!'));
          }
        }, 'image/png');
      }
    };
    if (noImageMode || !imageSrc) runCopy(null);
    else {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => runCopy(img);
    }
  };

  const triggerExport = () => {
    if (!noImageMode && !imageSrc) return;
    const runExport = (img: HTMLImageElement | null) => {
      const canvas = document.createElement('canvas');
      renderCanvas(canvas, img, getCurrentConfig());
      const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const base64Data = canvas.toDataURL(mime, jpegQuality / 100);
      if (window.snapFrameAPI) {
        window.snapFrameAPI.saveFile(base64Data, exportFormat, jpegQuality);
      } else {
        const link = document.createElement('a');
        link.download = `snapframe-export.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`;
        link.href = base64Data;
        link.click();
      }
    };
    if (noImageMode || !imageSrc) runExport(null);
    else {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => runExport(img);
    }
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
