import { getCanvasDimensions, RenderConfig } from '../src/renderer/canvasRenderer';
import * as assert from 'assert';

console.log('--- Running SnapFrame Unit Tests ---');

// Mock RenderConfig
const baseConfig: RenderConfig = {
  padding: 38,
  rounded: 20,
  shadow: 30,
  shadowColor: 'rgba(0, 0, 0, 0.4)',
  shadowEnabled: true,
  inset: 0,
  insetColor: 'rgba(255, 255, 255, 0.2)',
  border: 0,
  borderColor: '#ffffff',
  scale: 100,
  backgroundType: 'gradient',
  backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  aspectRatio: 'Auto',
  canvasWidth: 800,
  canvasHeight: 600,
  paddingMode: 'fit',
  chromeStyle: 'mac',
  watermarkEnabled: false,
  watermarkText: 'SnapFrame.app',
  position: 'Middle center',
};

function testAutoRatio() {
  console.log('Testing Auto aspect ratio...');
  const imgW = 800;
  const imgH = 600;
  
  // Padding = 38, scale = 100, chromeStyle = 'mac' (height + 32)
  // Expected width: 800 * 1.0 + 38 * 2 = 876
  // Expected height: (600 + 32) * 1.0 + 38 * 2 = 708
  const dims = getCanvasDimensions(imgW, imgH, baseConfig);
  
  assert.strictEqual(dims.width, 876, 'Width in Auto mode should be imgWidth + padding * 2');
  assert.strictEqual(dims.height, 708, 'Height in Auto mode should be (imgHeight + chromeOffset) + padding * 2');
  console.log('✓ Auto ratio passed!');
}

function testAutoRatioScale() {
  console.log('Testing Auto aspect ratio with scale...');
  const imgW = 800;
  const imgH = 600;
  
  const config = { ...baseConfig, scale: 50 }; // 50% scale
  
  // Padding = 38, scale = 0.5, chromeStyle = 'mac' (height + 32)
  // Expected width: 800 * 0.5 + 38 * 2 = 476
  // Expected height: (600 + 32) * 0.5 + 38 * 2 = 392
  const dims = getCanvasDimensions(imgW, imgH, config);
  
  assert.strictEqual(dims.width, 476, 'Width should scale content down');
  assert.strictEqual(dims.height, 392, 'Height should scale content down');
  console.log('✓ Auto ratio scale passed!');
}

function testFixedRatio16_9() {
  console.log('Testing 16:9 fixed aspect ratio (fit mode)...');
  const imgW = 1920;
  const imgH = 1080;
  
  const config = { ...baseConfig, aspectRatio: '16:9', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(imgW, imgH, config);
  
  // Content size: width = 1920, height = 1080 + 32 = 1112
  // Total content width with padding = 1920 + 76 = 1996
  // Total content height with padding = 1112 + 76 = 1188
  // Current ratio = 1996 / 1188 = 1.68
  // Target ratio = 16 / 9 = 1.777...
  // Since currentRatio (1.68) < targetRatio (1.77), the height determines canvas height = 1188.
  // Canvas width = height * targetRatio = 1188 * 1.77778 = 2112.
  assert.strictEqual(dims.height, 1188, 'Height should match content height + padding');
  assert.strictEqual(dims.width, 2112, 'Width should be expanded to match 16:9 ratio');
  console.log('✓ Fixed ratio 16:9 passed!');
}

function testFixedRatio1_1() {
  console.log('Testing 1:1 fixed aspect ratio (fit mode)...');
  const imgW = 800;
  const imgH = 600;
  
  const config = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(imgW, imgH, config);
  
  // Content size: width = 800, height = 632
  // Width with padding = 876. Height with padding = 708.
  // Current ratio = 876 / 708 = 1.23
  // Target ratio = 1.0
  // Since currentRatio (1.23) > targetRatio (1.0), the width determines canvas width = 876.
  // Canvas height = width / targetRatio = 876 / 1.0 = 876.
  assert.strictEqual(dims.width, 876, 'Width should match content width + padding');
  assert.strictEqual(dims.height, 876, 'Height should be expanded to match 1:1 ratio');
  console.log('✓ Fixed ratio 1:1 passed!');
}

function testNoImageDimensions() {
  console.log('Testing No Image mode dimensions...');
  
  // If noImage is true and aspectRatio is Auto, it defaults to 1200x675 (16:9)
  const configAuto: RenderConfig = { ...baseConfig, noImage: true, aspectRatio: 'Auto' };
  const dimsAuto = getCanvasDimensions(0, 0, configAuto);
  assert.strictEqual(dimsAuto.width, 1200, 'Width in Auto mode without image should default to 1200');
  assert.strictEqual(dimsAuto.height, 675, 'Height in Auto mode without image should default to 675');

  // If noImage is true and aspectRatio is 1:1, it defaults to 1200x1200
  const configSquare: RenderConfig = { ...baseConfig, noImage: true, aspectRatio: '1:1' };
  const dimsSquare = getCanvasDimensions(0, 0, configSquare);
  assert.strictEqual(dimsSquare.width, 1200, 'Width in 1:1 mode without image should default to 1200');
  assert.strictEqual(dimsSquare.height, 1200, 'Height in 1:1 mode without image should default to 1200');

  // If noImage is true and aspectRatio is Custom (800x600 -> 4:3), it defaults to 1200x900
  const configCustom: RenderConfig = { ...baseConfig, noImage: true, aspectRatio: 'Custom', canvasWidth: 800, canvasHeight: 600 };
  const dimsCustom = getCanvasDimensions(0, 0, configCustom);
  assert.strictEqual(dimsCustom.width, 1200, 'Width in Custom 4:3 mode without image should default to 1200');
  assert.strictEqual(dimsCustom.height, 900, 'Height in Custom 4:3 mode without image should default to 900');

  console.log('✓ No Image mode dimensions passed!');
}

try {
  testAutoRatio();
  testAutoRatioScale();
  testFixedRatio16_9();
  testFixedRatio1_1();
  testNoImageDimensions();
  console.log('--- All Tests Passed Successfully! ---');
  process.exit(0);
} catch (e) {
  console.error('Test verification failed:', e);
  process.exit(1);
}
