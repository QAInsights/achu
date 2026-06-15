import * as fs from 'fs';
import * as path from 'path';
import { ACHU_PROJECT_EXT, ACHU_SOURCE_SUFFIX } from '../../shared/galleryNaming';
import { BURST_MANIFEST_FILE } from '../../shared/burstTypes';
import type { GalleryProjectFile } from '../gallery/galleryProject';

export interface BurstPackProjectMeta {
  manifestFile: string;
  variants: Array<{
    presetKey: string;
    filename: string;
    width: number;
    height: number;
    fileSizeKb: number;
  }>;
}

export function buildBurstProjectFile(
  stem: string,
  primaryExportFile: string,
  sourceFile: string | undefined,
  masterConfig: Record<string, unknown>,
  burstPack: BurstPackProjectMeta
): GalleryProjectFile {
  const { imageSrc: _omit, forceCanvasSize: _force, ...configWithoutBurstFields } = masterConfig;
  return {
    version: 1,
    documentName: stem,
    exportFile: primaryExportFile,
    ...(sourceFile ? { sourceFile } : {}),
    config: configWithoutBurstFields,
    burstPack,
  } as GalleryProjectFile & { burstPack: BurstPackProjectMeta };
}

export function writeBurstSidecar(
  bundleDir: string,
  stem: string,
  project: GalleryProjectFile & { burstPack?: BurstPackProjectMeta }
): void {
  fs.writeFileSync(
    path.join(bundleDir, `${stem}${ACHU_PROJECT_EXT}`),
    JSON.stringify(project, null, 2),
    'utf-8'
  );
}

export function writeBurstSource(bundleDir: string, stem: string, sourceBuffer: Buffer): string {
  const sourceFile = `${stem}${ACHU_SOURCE_SUFFIX}.png`;
  fs.writeFileSync(path.join(bundleDir, sourceFile), sourceBuffer);
  return sourceFile;
}

export function isBurstBundleDir(dirPath: string): boolean {
  return fs.existsSync(path.join(dirPath, BURST_MANIFEST_FILE));
}