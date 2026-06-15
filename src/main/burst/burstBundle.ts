import * as fs from 'fs';
import * as path from 'path';
import { getAchuProjectStem } from '../../shared/galleryNaming';
import {
  BurstPackSavePayload,
  BurstPackSaveResult,
  BurstResult,
  BurstManifestVariant,
} from '../../shared/burstTypes';
import { compressImageBuffer, decodeImageDataUrl, CompressionMode } from '../imageCompression';
import { classifyFsError, GalleryError, checkDiskSpace, estimateOutputSize } from '../gallery/galleryValidation';
import { writeBurstManifest } from './burstManifest';
import {
  buildBurstProjectFile,
  writeBurstSidecar,
  writeBurstSource,
} from './burstGalleryExt';

export async function saveBurstPackBundle(
  galleryDir: string,
  payload: BurstPackSavePayload
): Promise<BurstResult<BurstPackSaveResult>> {
  try {
    if (!payload.variants?.length) {
      return { success: false, error: { code: 'NO_VARIANTS', message: 'No variants to save' } };
    }

    const stem = getAchuProjectStem(payload.documentName);
    const bundleDir = path.join(galleryDir, stem);
    fs.mkdirSync(bundleDir, { recursive: true });

    const estimatedSize = payload.variants.reduce(
      (sum, variant) => sum + estimateOutputSize(variant.base64Data),
      0
    );
    checkDiskSpace(galleryDir, estimatedSize);

    const manifestVariants: BurstManifestVariant[] = [];

    for (const variant of payload.variants) {
      const outputPath = path.join(bundleDir, variant.filename);
      const buffer = decodeImageDataUrl(variant.base64Data);
      const outputBuffer = await compressImageBuffer(buffer, {
        type: payload.exportFormat,
        quality: payload.jpegQuality,
        compressionMode: payload.compressionMode as CompressionMode,
      });
      fs.writeFileSync(outputPath, outputBuffer);

      manifestVariants.push({
        presetKey: variant.presetKey,
        filename: variant.filename,
        width: variant.width,
        height: variant.height,
        fileSizeKb: variant.fileSizeKb,
        warnings: variant.warnings,
      });
    }

    writeBurstManifest(bundleDir, stem, manifestVariants);

    let sourceFile: string | undefined;
    if (payload.sourceImageSrc) {
      const sourceBuffer = decodeImageDataUrl(payload.sourceImageSrc);
      sourceFile = writeBurstSource(bundleDir, stem, sourceBuffer);
    }

    const primaryExportFile = payload.variants[0].filename;
    const burstPack = {
      manifestFile: 'burst-manifest.json',
      variants: manifestVariants.map(({ presetKey, filename, width, height, fileSizeKb }) => ({
        presetKey,
        filename,
        width,
        height,
        fileSizeKb,
      })),
    };

    const project = buildBurstProjectFile(
      stem,
      primaryExportFile,
      sourceFile,
      payload.masterConfig,
      burstPack
    );
    writeBurstSidecar(bundleDir, stem, project);

    return {
      success: true,
      data: {
        bundlePath: bundleDir,
        documentName: stem,
        variantCount: manifestVariants.length,
        primaryExportPath: path.join(bundleDir, primaryExportFile),
      },
    };
  } catch (err) {
    if (err instanceof GalleryError) {
      return { success: false, error: err.toJSON() };
    }
    return { success: false, error: classifyFsError(err).toJSON() };
  }
}