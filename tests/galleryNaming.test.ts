import { describe, it, expect } from 'vitest';
import {
  buildAchuDocumentName,
  buildAchuGalleryFilename,
  formatAchuTimestamp,
  getAchuProjectStem,
  isGalleryProjectFile,
  isGallerySourceFile,
} from '../src/shared/galleryNaming';

describe('galleryNaming', () => {
  const fixedDate = new Date('2026-06-14T22:39:00.123Z');

  it('formats achu timestamp', () => {
    expect(formatAchuTimestamp(fixedDate)).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}-\d{3}$/);
  });

  it('builds document name without extension', () => {
    expect(buildAchuDocumentName(fixedDate)).toMatch(/^achu-\d{4}-\d{2}-\d{2}-\d{6}-\d{3}$/);
  });

  it('builds gallery filename with extension', () => {
    expect(buildAchuGalleryFilename('png', fixedDate)).toMatch(/^achu-.*\.png$/);
    expect(buildAchuGalleryFilename('jpeg', fixedDate)).toMatch(/\.jpg$/);
  });

  it('extracts stem from export, project, and source filenames', () => {
    expect(getAchuProjectStem('achu-2026-06-14-223900-123.png')).toBe('achu-2026-06-14-223900-123');
    expect(getAchuProjectStem('achu-2026-06-14-223900-123.achu.json')).toBe('achu-2026-06-14-223900-123');
    expect(getAchuProjectStem('achu-2026-06-14-223900-123-source.png')).toBe('achu-2026-06-14-223900-123');
    expect(getAchuProjectStem('/home/user/gallery/achu-2026-06-14-223900-123.jpg')).toBe('achu-2026-06-14-223900-123');
  });

  it('detects source and project files', () => {
    expect(isGallerySourceFile('achu-2026-06-14-223900-123-source.png')).toBe(true);
    expect(isGallerySourceFile('achu-2026-06-14-223900-123.png')).toBe(false);
    expect(isGalleryProjectFile('achu-2026-06-14-223900-123.achu.json')).toBe(true);
  });
});