export const ACHU_PROJECT_EXT = '.achu.json';
export const ACHU_SOURCE_SUFFIX = '-source';

export function formatAchuTimestamp(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}-${String(date.getMilliseconds()).padStart(3, '0')}`;
}

export function buildAchuDocumentName(date: Date = new Date()): string {
  return `achu-${formatAchuTimestamp(date)}`;
}

export function exportTypeToExt(type: 'png' | 'jpeg' | 'webp'): string {
  if (type === 'jpeg') return 'jpg';
  if (type === 'webp') return 'webp';
  return 'png';
}

export function buildAchuGalleryFilename(ext: string, date: Date = new Date()): string {
  const normalized = ext === 'jpeg' ? 'jpg' : ext.replace(/^\./, '');
  return `${buildAchuDocumentName(date)}.${normalized}`;
}

export function getAchuProjectStem(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  if (base.endsWith(ACHU_PROJECT_EXT)) {
    return base.slice(0, -ACHU_PROJECT_EXT.length);
  }
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return stem.endsWith(ACHU_SOURCE_SUFFIX) ? stem.slice(0, -ACHU_SOURCE_SUFFIX.length) : stem;
}

export function isGallerySourceFile(filename: string): boolean {
  return /-source\.(png|jpe?g|webp)$/i.test(filename);
}

export function isGalleryProjectFile(filename: string): boolean {
  return filename.endsWith(ACHU_PROJECT_EXT);
}