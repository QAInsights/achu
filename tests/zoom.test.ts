import * as assert from 'assert';

function zoomIn(zoomLevel: string): string {
  if (zoomLevel === 'Zoom to fit') return '110%';
  const currentVal = parseInt(zoomLevel, 10);
  if (isNaN(currentVal)) return '100%';
  const nextVal = Math.min(500, Math.floor(currentVal / 10) * 10 + 10);
  return `${nextVal}%`;
}

function zoomOut(zoomLevel: string): string {
  if (zoomLevel === 'Zoom to fit') return '90%';
  const currentVal = parseInt(zoomLevel, 10);
  if (isNaN(currentVal)) return '100%';
  const nextVal = Math.max(10, Math.ceil(currentVal / 10) * 10 - 10);
  return `${nextVal}%`;
}

export function testZoomIn() {
  console.log('Testing zoom-in logic...');
  assert.strictEqual(zoomIn('100%'), '110%', '100 → 110');
  assert.strictEqual(zoomIn('200%'), '210%', '200 → 210');
  assert.strictEqual(zoomIn('500%'), '500%', '500 is max (clamped)');
  assert.strictEqual(zoomIn('490%'), '500%', '490 → 500');
  assert.strictEqual(zoomIn('Zoom to fit'), '110%', 'Fit → 110');
  assert.strictEqual(zoomIn('invalid'), '100%', 'NaN → 100');
  console.log('✓ Zoom in');
}

export function testZoomOut() {
  console.log('Testing zoom-out logic...');
  assert.strictEqual(zoomOut('100%'), '90%', '100 → 90');
  assert.strictEqual(zoomOut('200%'), '190%', '200 → 190');
  assert.strictEqual(zoomOut('10%'), '10%', '10 is min (clamped)');
  assert.strictEqual(zoomOut('20%'), '10%', '20 → 10');
  assert.strictEqual(zoomOut('Zoom to fit'), '90%', 'Fit → 90');
  assert.strictEqual(zoomOut('invalid'), '100%', 'NaN → 100');
  console.log('✓ Zoom out');
}

export function testZoomBoundary() {
  console.log('Testing zoom boundary conditions...');
  assert.strictEqual(zoomIn('105%'), '110%', '105 floors to 100 then +10 = 110');
  assert.strictEqual(zoomOut('105%'), '100%', '105 ceils to 110 then -10 = 100');
  let z = 'Zoom to fit';
  z = zoomIn(z);
  assert.strictEqual(z, '110%');
  z = zoomOut(z);
  assert.strictEqual(z, '100%');
  console.log('✓ Zoom boundary conditions');
}

export function runZoomTests() {
  testZoomIn();
  testZoomOut();
  testZoomBoundary();
}
