import {
  solidPresets,
  curatedMeshPalettes,
  disneyHollywoodGradients,
  disneyHollywoodMeshPalettes,
  defaultGradients,
} from '../src/renderer/presetsData';
import * as assert from 'assert';

export function testSolidPresets() {
  console.log('Testing solidPresets shape...');
  assert.ok(solidPresets.length > 0, 'Has entries');
  for (const p of solidPresets) {
    assert.ok(p.id, `id defined: ${p.id}`);
    assert.ok(p.name, `name defined: ${p.name}`);
    assert.ok(p.color.startsWith('#'), `color is hex: ${p.color}`);
    assert.strictEqual(p.type, 'color');
  }
  console.log('✓ solidPresets');
}

export function testCuratedMeshPalettes() {
  console.log('Testing curatedMeshPalettes shape...');
  assert.ok(curatedMeshPalettes.length > 0);
  for (const p of curatedMeshPalettes) {
    assert.ok(p.name);
    assert.ok(Array.isArray(p.colors), 'colors is array');
    assert.ok(p.colors.length === 4, 'Each palette has 4 colors');
    for (const c of p.colors) {
      assert.ok(c.startsWith('#'), `color is hex: ${c}`);
    }
  }
  console.log('✓ curatedMeshPalettes');
}

export function testDisneyGradients() {
  console.log('Testing disneyHollywoodGradients shape...');
  assert.ok(disneyHollywoodGradients.length > 0);
  const ids = new Set<string>();
  for (const g of disneyHollywoodGradients) {
    assert.ok(g.id, `id defined: ${g.id}`);
    assert.ok(!ids.has(g.id), `id unique: ${g.id}`);
    ids.add(g.id);
    assert.ok(g.name, 'name defined');
    assert.ok(
      g.gradient.startsWith('linear-gradient') || g.gradient.startsWith('radial-gradient'),
      `gradient is valid CSS: ${g.gradient}`
    );
    assert.ok(['disney', 'marvel', 'hollywood'].includes(g.category!), `valid category: ${g.category}`);
  }
  console.log('✓ disneyHollywoodGradients');
}

export function testDisneyMeshPalettes() {
  console.log('Testing disneyHollywoodMeshPalettes shape...');
  assert.ok(disneyHollywoodMeshPalettes.length > 0);
  for (const p of disneyHollywoodMeshPalettes) {
    assert.ok(p.name);
    assert.ok(p.colors.length === 4, `${p.name} has 4 colors`);
    assert.ok(['disney', 'marvel', 'hollywood'].includes(p.category));
  }
  console.log('✓ disneyHollywoodMeshPalettes');
}

export function testDefaultGradients() {
  console.log('Testing defaultGradients shape...');
  assert.ok(defaultGradients.length > 0, 'Has entries');
  const ids = new Set<string>();
  for (const g of defaultGradients) {
    assert.ok(g.id, `id defined: ${g.id}`);
    assert.ok(!ids.has(g.id), `id unique: ${g.id}`);
    ids.add(g.id);
    assert.ok(g.name, 'name defined');
    assert.ok(
      g.gradient.startsWith('linear-gradient') || g.gradient.startsWith('radial-gradient'),
      `gradient is valid CSS: ${g.gradient}`
    );
    assert.strictEqual(g.type, 'gradient', `type is gradient: ${g.name}`);
  }
  console.log('✓ defaultGradients');
}

export function runPresetsDataTests() {
  testSolidPresets();
  testCuratedMeshPalettes();
  testDisneyGradients();
  testDisneyMeshPalettes();
  testDefaultGradients();
}
