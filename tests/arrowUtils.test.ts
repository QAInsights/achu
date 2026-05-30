import {
  getCurvedArrowPoints,
  getTaperedCurvedArrowPoints,
  drawArrowOnCanvas,
} from '../src/renderer/arrowUtils';
import { makeMockCtx, makeArrowAnnotation } from './shared';
import * as assert from 'assert';

export function testCurvedArrowPoints() {
  console.log('Testing getCurvedArrowPoints...');
  const res = getCurvedArrowPoints(0, 0, 100, 100, 4);
  assert.ok(res !== null);
  assert.strictEqual(res!.x0, 0);
  assert.strictEqual(res!.y0, 0);
  assert.strictEqual(res!.x1, 100);
  assert.strictEqual(res!.y1, 100);
  assert.ok(res!.cx !== 50 || res!.cy !== 50, 'Control point should be offset');
  assert.ok(typeof res!.arrow1X === 'number');
  assert.ok(typeof res!.arrow2X === 'number');
  assert.strictEqual(getCurvedArrowPoints(0, 0, 0.5, 0.5, 4), null);
  console.log('✓ getCurvedArrowPoints');
}

export function testCurvedArrowLargeStroke() {
  console.log('Testing getCurvedArrowPoints with large stroke width...');
  const res = getCurvedArrowPoints(0, 0, 200, 0, 20);
  assert.ok(res !== null);
  assert.ok(typeof res!.cx === 'number');
  console.log('✓ getCurvedArrowPoints large stroke');
}

export function testTaperedArrowPoints() {
  console.log('Testing getTaperedCurvedArrowPoints...');
  const res = getTaperedCurvedArrowPoints(0, 0, 100, 100, 4);
  assert.ok(res !== null);
  assert.ok(res!.leftPoints.length > 0);
  assert.ok(res!.rightPoints.length > 0);
  assert.strictEqual(res!.tip.x, 100);
  assert.strictEqual(res!.tip.y, 100);
  assert.ok(typeof res!.H_left.x === 'number');
  assert.ok(typeof res!.H_right.x === 'number');
  assert.strictEqual(getTaperedCurvedArrowPoints(0, 0, 0.5, 0.5, 4), null);
  console.log('✓ getTaperedCurvedArrowPoints');
}

export function testTaperedArrowMinimalStroke() {
  console.log('Testing getTaperedCurvedArrowPoints minimal stroke...');
  const res = getTaperedCurvedArrowPoints(0, 0, 50, 50, 1);
  assert.ok(res !== null);
  assert.ok(res!.leftPoints.length === 16, 'Should have steps+1 = 16 points');
  assert.ok(res!.rightPoints.length === 16);
  console.log('✓ getTaperedCurvedArrowPoints minimal stroke');
}

export function testDrawArrowClassic() {
  console.log('Testing drawArrowOnCanvas: classic...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('classic'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas classic (no throw)');
}

export function testDrawArrowDashed() {
  console.log('Testing drawArrowOnCanvas: dashed...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('dashed'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas dashed (no throw)');
}

export function testDrawArrowTapered() {
  console.log('Testing drawArrowOnCanvas: tapered...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('tapered'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas tapered (no throw)');
}

export function testDrawArrowCurved() {
  console.log('Testing drawArrowOnCanvas: curved...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('curved'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas curved (no throw)');
}

export function testDrawArrowTaperedShortDistance() {
  console.log('Testing drawArrowOnCanvas: tapered short distance (early return)...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('tapered'), 0.3, 0.2, 4);
  console.log('✓ drawArrowOnCanvas tapered short distance (early return)');
}

export function testDrawArrowCurvedShortDistance() {
  console.log('Testing drawArrowOnCanvas: curved short distance (early return)...');
  drawArrowOnCanvas(makeMockCtx(), makeArrowAnnotation('curved'), 0.3, 0.2, 4);
  console.log('✓ drawArrowOnCanvas curved short distance (early return)');
}

export function runArrowUtilsTests() {
  testCurvedArrowPoints();
  testCurvedArrowLargeStroke();
  testTaperedArrowPoints();
  testTaperedArrowMinimalStroke();
  testDrawArrowClassic();
  testDrawArrowDashed();
  testDrawArrowTapered();
  testDrawArrowCurved();
  testDrawArrowTaperedShortDistance();
  testDrawArrowCurvedShortDistance();
}
