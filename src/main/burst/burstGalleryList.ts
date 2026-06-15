import * as fs from 'fs';
import * as path from 'path';
import { readBurstManifest } from './burstManifest';
import { isBurstBundleDir } from './burstGalleryExt';
import type { GalleryItem } from '../gallery/galleryFs';

export interface BurstGalleryItem extends GalleryItem {
  isBurstBundle: true;
  burstVariantCount: number;
  bundlePath: string;
}

export function listBurstBundleItems(galleryDir: string): BurstGalleryItem[] {
  if (!fs.existsSync(galleryDir)) return [];

  const items: BurstGalleryItem[] = [];
  const entries = fs.readdirSync(galleryDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const bundlePath = path.join(galleryDir, entry.name);
    if (!isBurstBundleDir(bundlePath)) continue;

    const manifest = readBurstManifest(bundlePath);
    if (!manifest || manifest.variants.length === 0) continue;

    const primary = manifest.variants[0];
    const primaryPath = path.join(bundlePath, primary.filename);
    if (!fs.existsSync(primaryPath)) continue;

    try {
      const stat = fs.statSync(primaryPath);
      items.push({
        name: `${entry.name}/`,
        path: primaryPath,
        size: stat.size,
        modified: stat.mtimeMs,
        ext: path.extname(primary.filename).replace('.', ''),
        isBurstBundle: true,
        burstVariantCount: manifest.variants.length,
        bundlePath,
      });
    } catch {
      // skip unreadable bundle
    }
  }

  return items;
}