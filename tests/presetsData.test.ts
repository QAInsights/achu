import { describe, it, expect } from 'vitest';
import {
  solidPresets,
  curatedMeshPalettes,
  disneyHollywoodGradients,
  disneyHollywoodMeshPalettes,
  defaultGradients,
} from '../src/renderer/presetsData';

describe('Presets Data', () => {
  describe('solidPresets', () => {
    it('has valid entries', () => {
      expect(solidPresets.length).toBeGreaterThan(0);
      for (const p of solidPresets) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.color.startsWith('#')).toBe(true);
        expect(p.type).toBe('color');
      }
    });
  });

  describe('curatedMeshPalettes', () => {
    it('has valid entries', () => {
      expect(curatedMeshPalettes.length).toBeGreaterThan(0);
      for (const p of curatedMeshPalettes) {
        expect(p.name).toBeTruthy();
        expect(Array.isArray(p.colors)).toBe(true);
        expect(p.colors.length).toBe(4);
        for (const c of p.colors) {
          expect(c.startsWith('#')).toBe(true);
        }
      }
    });
  });

  describe('disneyHollywoodGradients', () => {
    it('has valid entries with unique IDs', () => {
      expect(disneyHollywoodGradients.length).toBeGreaterThan(0);
      const ids = new Set<string>();
      for (const g of disneyHollywoodGradients) {
        expect(g.id).toBeTruthy();
        expect(ids.has(g.id)).toBe(false);
        ids.add(g.id);
        expect(g.name).toBeTruthy();
        expect(
          g.gradient.startsWith('linear-gradient') || g.gradient.startsWith('radial-gradient')
        ).toBe(true);
        expect(['disney', 'marvel', 'hollywood'].includes(g.category!)).toBe(true);
      }
    });
  });

  describe('disneyHollywoodMeshPalettes', () => {
    it('has valid entries', () => {
      expect(disneyHollywoodMeshPalettes.length).toBeGreaterThan(0);
      for (const p of disneyHollywoodMeshPalettes) {
        expect(p.name).toBeTruthy();
        expect(p.colors.length).toBe(4);
        expect(['disney', 'marvel', 'hollywood'].includes(p.category)).toBe(true);
      }
    });
  });

  describe('defaultGradients', () => {
    it('has valid entries with unique IDs', () => {
      expect(defaultGradients.length).toBeGreaterThan(0);
      const ids = new Set<string>();
      for (const g of defaultGradients) {
        expect(g.id).toBeTruthy();
        expect(ids.has(g.id)).toBe(false);
        ids.add(g.id);
        expect(g.name).toBeTruthy();
        expect(
          g.gradient.startsWith('linear-gradient') || g.gradient.startsWith('radial-gradient')
        ).toBe(true);
        expect(g.type).toBe('gradient');
      }
    });
  });
});
