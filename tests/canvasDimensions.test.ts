import { getCanvasDimensions } from '../src/renderer/canvasRenderer';
import { baseConfig } from './shared';
import * as assert from 'assert';

export function testAutoRatio() {
  console.log('Testing Auto aspect ratio...');
  const dims = getCanvasDimensions(800, 600, baseConfig);
  assert.strictEqual(dims.width, 876, 'Width: imgWidth + padding*2');
  assert.strictEqual(dims.height, 708, 'Height: (imgH + chromeOffset) + padding*2');
  console.log('✓ Auto ratio');
}

export function testAutoRatioScale() {
  console.log('Testing Auto ratio with 50% scale...');
  const dims = getCanvasDimensions(800, 600, { ...baseConfig, scale: 50 });
  assert.strictEqual(dims.width, 476);
  assert.strictEqual(dims.height, 392);
  console.log('✓ Auto ratio scale');
}

export function testFixedRatio16_9() {
  console.log('Testing 16:9 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '16:9', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(1920, 1080, cfg);
  assert.strictEqual(dims.height, 1188);
  assert.strictEqual(dims.width, 2112);
  console.log('✓ 16:9 fixed ratio');
}

export function testFixedRatio1_1() {
  console.log('Testing 1:1 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  assert.strictEqual(dims.width, 876);
  assert.strictEqual(dims.height, 876);
  console.log('✓ 1:1 fixed ratio');
}

export function testNoImageDimensions() {
  console.log('Testing no-image dimensions...');
  const auto = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: 'Auto' });
  assert.strictEqual(auto.width, 1200);
  assert.strictEqual(auto.height, 675);

  const sq = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '1:1' });
  assert.strictEqual(sq.width, 1200);
  assert.strictEqual(sq.height, 1200);

  const custom = getCanvasDimensions(0, 0, {
    ...baseConfig, noImage: true, aspectRatio: 'Custom', canvasWidth: 800, canvasHeight: 600
  });
  assert.strictEqual(custom.width, 1200);
  assert.strictEqual(custom.height, 900);
  console.log('✓ No-image dimensions');
}

export function testChromeNoneDimensions() {
  console.log('Testing chromeStyle=none (no chrome offset)...');
  const cfg = { ...baseConfig, chromeStyle: 'none' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  assert.strictEqual(dims.width, 876);
  assert.strictEqual(dims.height, 676);
  console.log('✓ chromeStyle=none');
}

export function testFixedRatio4_3() {
  console.log('Testing 4:3 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '4:3', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  assert.strictEqual(dims.height, 708);
  assert.strictEqual(dims.width, Math.round(708 * (4 / 3)));
  console.log('✓ 4:3 fixed ratio');
}

export function testFixedRatio3_2() {
  console.log('Testing 3:2 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '3:2', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(1200, 800, cfg);
  const expectedH = 908;
  const expectedW = Math.round(908 * (3 / 2));
  assert.strictEqual(dims.height, expectedH);
  assert.strictEqual(dims.width, expectedW);
  console.log('✓ 3:2 fixed ratio');
}

export function testCustomAspectRatio() {
  console.log('Testing Custom aspect ratio...');
  const cfg = {
    ...baseConfig,
    aspectRatio: 'Custom',
    canvasWidth: 1920,
    canvasHeight: 1080,
    paddingMode: 'fit' as const
  };
  const dims = getCanvasDimensions(800, 600, cfg);
  const targetRatio = 1920 / 1080;
  assert.ok(Math.abs(dims.width / dims.height - targetRatio) < 0.01, 'Custom ratio preserved');
  console.log('✓ Custom aspect ratio');
}

export function testFillPaddingMode() {
  console.log('Testing paddingMode=fill...');
  const cfg = {
    ...baseConfig,
    aspectRatio: '16:9',
    paddingMode: 'fill' as const
  };
  const dims = getCanvasDimensions(800, 600, cfg);
  assert.ok(dims.width >= 800);
  const ratio = dims.width / dims.height;
  assert.ok(Math.abs(ratio - 16 / 9) < 0.01);
  console.log('✓ paddingMode=fill');
}

export function testNoImageRatios() {
  console.log('Testing no-image 4:3 and 3:2 ratios...');
  const r43 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '4:3' });
  assert.strictEqual(r43.width, 1200);
  assert.strictEqual(r43.height, 900);

  const r32 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '3:2' });
  assert.strictEqual(r32.width, 1200);
  assert.strictEqual(r32.height, 800);

  const r169 = getCanvasDimensions(0, 0, { ...baseConfig, noImage: true, aspectRatio: '16:9' });
  assert.strictEqual(r169.width, 1200);
  assert.strictEqual(r169.height, 675);
  console.log('✓ No-image 4:3, 3:2, 16:9 ratios');
}

export function runCanvasDimensionTests() {
  testAutoRatio();
  testAutoRatioScale();
  testFixedRatio16_9();
  testFixedRatio1_1();
  testNoImageDimensions();
  testChromeNoneDimensions();
  testFixedRatio4_3();
  testFixedRatio3_2();
  testCustomAspectRatio();
  testFillPaddingMode();
  testNoImageRatios();
}
