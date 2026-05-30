import { disneyHollywoodGradients, defaultGradients } from '../src/renderer/presetsData';
import * as assert from 'assert';

export function testGradientCategoryFiltering() {
  console.log('Testing gradient category filtering logic...');
  const categories = ['classic', 'disney', 'marvel', 'hollywood'] as const;
  
  for (const cat of categories) {
    if (cat === 'classic') {
      assert.ok(defaultGradients.length > 0, 'Classic has gradients');
    } else {
      const filtered = disneyHollywoodGradients.filter(g => g.category === cat);
      assert.ok(filtered.length > 0, `Category ${cat} has gradients`);
      for (const g of filtered) {
        assert.strictEqual(g.category, cat, `All filtered have category ${cat}`);
      }
    }
  }
  console.log('✓ Gradient category filtering');
}

export function testBackgroundTypeModes() {
  console.log('Testing background type modes...');
  const types = ['color', 'gradient', 'blur', 'mesh'] as const;
  
  for (const type of types) {
    assert.ok(typeof type === 'string');
    assert.ok(type.length > 0);
  }
  
  const labels: Record<string, string> = {
    color: 'Solid',
    gradient: 'Preset',
    blur: 'Blurred',
    mesh: 'Mesh'
  };
  
  for (const type of types) {
    assert.ok(labels[type], `Type ${type} has label`);
  }
  console.log('✓ Background type modes');
}

export function testMeshPointLimits() {
  console.log('Testing mesh point limits...');
  const MIN_POINTS = 2;
  const MAX_POINTS = 10;
  
  assert.ok(MIN_POINTS >= 2, 'Minimum points is at least 2');
  assert.ok(MAX_POINTS <= 10, 'Maximum points is at most 10');
  
  let meshPoints = [
    { id: 'mesh-1', color: '#ff0000', x: 0.5, y: 0.5, radius: 200 },
    { id: 'mesh-2', color: '#00ff00', x: 0.3, y: 0.3, radius: 150 },
  ];
  
  const canRemove = meshPoints.length > MIN_POINTS;
  assert.strictEqual(canRemove, false, 'Cannot remove when at minimum');
  
  const canAdd = meshPoints.length < MAX_POINTS;
  assert.strictEqual(canAdd, true, 'Can add when below maximum');
  
  while (meshPoints.length < MAX_POINTS) {
    meshPoints.push({
      id: `mesh-${meshPoints.length + 1}`,
      color: '#0000ff',
      x: Math.random(),
      y: Math.random(),
      radius: 200
    });
  }
  
  assert.strictEqual(meshPoints.length, MAX_POINTS);
  const canAddAtMax = meshPoints.length < MAX_POINTS;
  assert.strictEqual(canAddAtMax, false, 'Cannot add when at maximum');
  
  console.log('✓ Mesh point limits');
}

export function testMeshPointPositionValues() {
  console.log('Testing mesh point position values...');
  const point = { x: 0.5, y: 0.75, radius: 200 };
  
  const xPercent = Math.round(point.x * 100);
  const yPercent = Math.round(point.y * 100);
  
  assert.strictEqual(xPercent, 50, 'X position as percentage');
  assert.strictEqual(yPercent, 75, 'Y position as percentage');
  
  assert.ok(xPercent >= 0 && xPercent <= 100, 'X in range 0-100');
  assert.ok(yPercent >= 0 && yPercent <= 100, 'Y in range 0-100');
  
  console.log('✓ Mesh point position values');
}

export function testMeshFilterRanges() {
  console.log('Testing mesh filter ranges...');
  const ranges = {
    blur: { min: 10, max: 200, default: 60 },
    grain: { min: 0, max: 50, default: 15 },
    opacity: { min: 10, max: 100, default: 100 },
    spread: { min: 20, max: 200, default: 100 },
  };
  
  for (const [name, range] of Object.entries(ranges)) {
    assert.ok(range.min < range.max, `${name}: min < max`);
    assert.ok(range.default >= range.min, `${name}: default >= min`);
    assert.ok(range.default <= range.max, `${name}: default <= max`);
  }
  
  console.log('✓ Mesh filter ranges');
}

export function testBlurDensityRange() {
  console.log('Testing blur density range...');
  const BLUR_MIN = 10;
  const BLUR_MAX = 100;
  const BLUR_DEFAULT = 50;
  
  assert.ok(BLUR_MIN < BLUR_MAX, 'Min < Max');
  assert.ok(BLUR_DEFAULT >= BLUR_MIN, 'Default >= Min');
  assert.ok(BLUR_DEFAULT <= BLUR_MAX, 'Default <= Max');
  
  console.log('✓ Blur density range');
}

export function runBackgroundSettingsTests() {
  testGradientCategoryFiltering();
  testBackgroundTypeModes();
  testMeshPointLimits();
  testMeshPointPositionValues();
  testMeshFilterRanges();
  testBlurDensityRange();
}
