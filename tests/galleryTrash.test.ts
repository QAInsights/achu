import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { moveToTrash, purgeTrash, getTrashDir } from '../src/main/gallery/galleryTrash';

describe('getTrashDir', () => {
  it('returns .achu-trash subfolder path', () => {
    const result = getTrashDir('/home/user/gallery');
    expect(result).toBe(path.join('/home/user/gallery', '.achu-trash'));
  });
});

describe('moveToTrash', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-trash-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('moves a file to .achu-trash with timestamp prefix', () => {
    const filePath = path.join(tmpDir, 'image.png');
    fs.writeFileSync(filePath, 'test content');

    moveToTrash(tmpDir, filePath);

    expect(fs.existsSync(filePath)).toBe(false);
    const trashDir = getTrashDir(tmpDir);
    expect(fs.existsSync(trashDir)).toBe(true);
    const trashFiles = fs.readdirSync(trashDir);
    expect(trashFiles.length).toBe(1);
    expect(trashFiles[0]).toMatch(/^\d+-image\.png$/);
  });

  it('preserves file content in trash', () => {
    const filePath = path.join(tmpDir, 'photo.jpg');
    fs.writeFileSync(filePath, 'photo data');

    moveToTrash(tmpDir, filePath);

    const trashDir = getTrashDir(tmpDir);
    const trashFiles = fs.readdirSync(trashDir);
    const trashContent = fs.readFileSync(path.join(trashDir, trashFiles[0]), 'utf-8');
    expect(trashContent).toBe('photo data');
  });

  it('throws on non-existent file', () => {
    expect(() => moveToTrash(tmpDir, path.join(tmpDir, 'missing.png'))).toThrow();
  });
});

describe('purgeTrash', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-purge-test-'));
    fs.mkdirSync(getTrashDir(tmpDir), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('deletes files older than maxAgeDays', () => {
    const trashDir = getTrashDir(tmpDir);
    const oldFile = path.join(trashDir, '1000-old.png');
    const newFile = path.join(trashDir, `${Date.now()}-new.png`);
    fs.writeFileSync(oldFile, 'old');
    fs.writeFileSync(newFile, 'new');

    // Set old file mtime to 60 days ago
    const oldTime = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, oldTime, oldTime);

    const purged = purgeTrash(tmpDir, 30);

    expect(purged).toBe(1);
    expect(fs.existsSync(oldFile)).toBe(false);
    expect(fs.existsSync(newFile)).toBe(true);
  });

  it('returns 0 when trash directory does not exist', () => {
    const noTrashDir = path.join(os.tmpdir(), 'nonexistent-gallery');
    const result = purgeTrash(noTrashDir);
    expect(result).toBe(0);
  });

  it('skips directories in trash', () => {
    const trashDir = getTrashDir(tmpDir);
    fs.mkdirSync(path.join(trashDir, 'subfolder'));
    const purged = purgeTrash(tmpDir, 0);
    expect(purged).toBe(0);
  });

  it('purges all files when maxAgeDays is 0', () => {
    const trashDir = getTrashDir(tmpDir);
    const f1 = path.join(trashDir, '1.png');
    const f2 = path.join(trashDir, '2.png');
    fs.writeFileSync(f1, 'a');
    fs.writeFileSync(f2, 'b');

    // Set mtimes to 1 second ago so they're older than the cutoff
    const pastTime = new Date(Date.now() - 1000);
    fs.utimesSync(f1, pastTime, pastTime);
    fs.utimesSync(f2, pastTime, pastTime);

    const purged = purgeTrash(tmpDir, 0);
    expect(purged).toBe(2);
  });
});
