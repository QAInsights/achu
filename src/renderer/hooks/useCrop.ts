import { useLayoutEffect, useRef, useState } from 'react';
import type { RenderConfig } from '../canvasRenderer';
import { cropSnapshot, renderCrop, type CropRect } from '../utils/cropUtils';
import { trackFeature } from '../utils/telemetry';

export function isolateCropEvents(apply: () => void, cancel: () => void) {
  const keyboard = (event: KeyboardEvent) => {
    event.stopImmediatePropagation();
    if (event.type !== 'keydown') return;
    const cropButton = event.target instanceof HTMLButtonElement && event.target.closest('[data-crop-ui]')
      ? event.target
      : null;
    if (cropButton && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      if (!event.repeat) cropButton.click();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    } else if (event.key === 'Enter' && !cropButton) {
      event.preventDefault();
      apply();
    } else if (event.key !== 'Tab' && event.key !== 'Shift') {
      event.preventDefault();
    }
  };
  const block = (event: Event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const pointer = (event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-crop-ui]')) block(event);
  };
  window.addEventListener('keydown', keyboard, true);
  window.addEventListener('keyup', keyboard, true);
  const blocked = ['paste', 'drop', 'dragover', 'contextmenu'];
  blocked.forEach(type => window.addEventListener(type, block, true));
  window.addEventListener('pointerdown', pointer, true);
  window.addEventListener('click', pointer, true);
  return () => {
    window.removeEventListener('keydown', keyboard, true);
    window.removeEventListener('keyup', keyboard, true);
    blocked.forEach(type => window.removeEventListener(type, block, true));
    window.removeEventListener('pointerdown', pointer, true);
    window.removeEventListener('click', pointer, true);
  };
}

export function useCrop(
  imageSrc: string | null,
  disabled: boolean,
  getConfig: () => RenderConfig,
  applyConfig: (config: RenderConfig) => void,
  pushHistory: (config: RenderConfig) => void,
  invalidateOcr: () => void,
) {
  const [cropActive, setCropActive] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropAspect, setCropAspect] = useState('Free');
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const applying = useRef(false);
  const startCrop = () => {
    if (!imageSrc || disabled) return;
    setCropRect(null);
    setCropAspect('Free');
    setCropError(null);
    setCropActive(true);
  };
  const cancelCrop = () => {
    if (!applying.current) setCropActive(false);
  };
  const applyCrop = async () => {
    if (!imageSrc || !cropRect || applying.current) return;
    applying.current = true;
    setCropBusy(true);
    setCropError(null);
    const config = getConfig();
    try {
      const result = await renderCrop(imageSrc, cropRect);
      const snapshot = cropSnapshot(config, result.size, result.crop, result.imageSrc);
      applyConfig(snapshot);
      invalidateOcr();
      pushHistory(snapshot);
      trackFeature('crop_apply');
      setCropActive(false);
    } catch (error) {
      setCropError(`Could not crop image: ${(error as Error).message}`);
    } finally {
      applying.current = false;
      setCropBusy(false);
    }
  };
  const callbacks = useRef({ applyCrop, cancelCrop });
  useLayoutEffect(() => {
    callbacks.current = { applyCrop, cancelCrop };
  }, [applyCrop, cancelCrop]);

  useLayoutEffect(() => {
    if (cropActive) {
      return isolateCropEvents(() => {
        void callbacks.current.applyCrop();
      }, () => callbacks.current.cancelCrop());
    }
    return undefined;
  }, [cropActive]);
  return {
    cropActive,
    cropRect,
    setCropRect,
    cropAspect,
    setCropAspect,
    cropBusy,
    cropError,
    startCrop,
    cancelCrop,
    applyCrop,
  };
}
