import { describe, it, expect } from 'vitest';
import { getCanvasPreviewScale, zoomIn, zoomOut } from '../src/renderer/utils/layoutUtils';

describe('Zoom', () => {
  describe('zoomIn', () => {
    it('increments zoom level', () => {
      expect(zoomIn('100%')).toBe('110%');
      expect(zoomIn('200%')).toBe('210%');
    });

    it('clamps at max 500%', () => {
      expect(zoomIn('500%')).toBe('500%');
      expect(zoomIn('490%')).toBe('500%');
    });

    it('handles special values', () => {
      expect(zoomIn('Zoom to fit')).toBe('110%');
      expect(zoomIn('invalid')).toBe('100%');
    });
  });

  describe('zoomOut', () => {
    it('decrements zoom level', () => {
      expect(zoomOut('100%')).toBe('90%');
      expect(zoomOut('200%')).toBe('190%');
    });

    it('clamps at min 10%', () => {
      expect(zoomOut('10%')).toBe('10%');
      expect(zoomOut('20%')).toBe('10%');
    });

    it('handles special values', () => {
      expect(zoomOut('Zoom to fit')).toBe('90%');
      expect(zoomOut('invalid')).toBe('100%');
    });
  });

  describe('boundary conditions', () => {
    it('steps from the actual fitted scale instead of assuming 100%', () => {
      expect(zoomIn('Zoom to fit', 0.43)).toBe('50%');
      expect(zoomOut('Zoom to fit', 0.43)).toBe('40%');
      expect(zoomIn('Zoom to fit', 0.05)).toBe('10%');
      expect(zoomIn('Zoom to fit', 1)).toBe('110%');
    });
    it('handles non-round values', () => {
      expect(zoomIn('105%')).toBe('110%');
      expect(zoomOut('105%')).toBe('100%');
    });

    it('chains zoom operations', () => {
      let z = 'Zoom to fit';
      z = zoomIn(z);
      expect(z).toBe('110%');
      z = zoomOut(z);
      expect(z).toBe('100%');
    });
  });

  describe('preview scale', () => {
    const canvas = { width: 1200, height: 800 };

    it('fits both dimensions while reserving space for canvas controls', () => {
      const viewport = { width: 664, height: 504 };
      expect(getCanvasPreviewScale('Zoom to fit', canvas, viewport, false)).toBe(0.5);
      expect(getCanvasPreviewScale('Zoom to fit', canvas, viewport, true)).toBe(376 / 800);
    });

    it('does not upscale a small canvas in fit mode', () => {
      expect(getCanvasPreviewScale('Zoom to fit', { width: 200, height: 100 }, { width: 1024, height: 768 }, false)).toBe(1);
    });

    it('uses bounded numeric zoom and falls back to fit for invalid input', () => {
      const viewport = { width: 664, height: 504 };
      expect(getCanvasPreviewScale('150%', canvas, viewport, false)).toBe(1.5);
      expect(getCanvasPreviewScale('900%', canvas, viewport, false)).toBe(5);
      expect(getCanvasPreviewScale('0%', canvas, viewport, false)).toBe(0.1);
      expect(getCanvasPreviewScale('invalid', canvas, viewport, false)).toBe(0.5);
    });
  });
});
