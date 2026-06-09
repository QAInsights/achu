import sharp from 'sharp';

export type ExportImageType = 'png' | 'jpeg';
export type CompressionMode = 'original' | 'balanced' | 'small';

export interface ImageCompressionOptions {
  type: ExportImageType;
  quality?: number;
  compressionMode?: CompressionMode;
}

const JPEG_QUALITY_BY_MODE: Record<CompressionMode, number | null> = {
  original: null,
  balanced: 85,
  small: 72,
};

const PNG_COMPRESSION_BY_MODE: Record<CompressionMode, number> = {
  original: 6,
  balanced: 9,
  small: 9,
};

export async function compressImageBuffer(
  buffer: Buffer,
  options: ImageCompressionOptions
): Promise<Buffer> {
  const mode = options.compressionMode || 'balanced';
  const pipeline = sharp(buffer).rotate();

  if (options.type === 'jpeg') {
    const quality = JPEG_QUALITY_BY_MODE[mode] ?? options.quality ?? 90;
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  return pipeline.png({
    compressionLevel: PNG_COMPRESSION_BY_MODE[mode],
    adaptiveFiltering: mode !== 'original',
    palette: mode === 'small',
  }).toBuffer();
}

export function decodeImageDataUrl(base64Data: string): Buffer {
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Content, 'base64');
}
