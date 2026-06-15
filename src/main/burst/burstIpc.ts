import { ipcMain } from 'electron';
import { getGalleryFolder } from '../gallery/galleryFs';
import { BurstPackSavePayload } from '../../shared/burstTypes';
import { saveBurstPackBundle } from './burstBundle';

const MAX_BURST_PAYLOAD = 200 * 1024 * 1024;

export function registerBurstIpcHandlers(): void {
  ipcMain.handle('burst:save', async (_event, payload: BurstPackSavePayload) => {
    if (!payload?.variants?.length) {
      return { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Missing burst variants' } };
    }

    const totalSize = payload.variants.reduce((sum, v) => sum + (v.base64Data?.length || 0), 0);
    if (totalSize > MAX_BURST_PAYLOAD) {
      return {
        success: false,
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Burst pack payload is too large' },
      };
    }

    const galleryDir = getGalleryFolder();
    return saveBurstPackBundle(galleryDir, payload);
  });
}