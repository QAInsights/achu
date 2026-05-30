import * as assert from 'assert';

function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number) {
  const rad = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export function testRotatePoint() {
  console.log('Testing rotatePoint...');
  
  // 0° rotation: no change
  const p0 = rotatePoint(100, 0, 0, 0, 0);
  assert.ok(Math.abs(p0.x - 100) < 0.001, '0° rotation: x unchanged');
  assert.ok(Math.abs(p0.y - 0) < 0.001, '0° rotation: y unchanged');
  
  // 90° rotation around origin
  const p90 = rotatePoint(100, 0, 0, 0, 90);
  assert.ok(Math.abs(p90.x - 0) < 0.001, '90° rotation: x becomes 0');
  assert.ok(Math.abs(p90.y - (-100)) < 0.001, '90° rotation: y becomes -100');
  
  // 180° rotation around origin
  const p180 = rotatePoint(100, 0, 0, 0, 180);
  assert.ok(Math.abs(p180.x - (-100)) < 0.001, '180° rotation: x becomes -100');
  assert.ok(Math.abs(p180.y - 0) < 0.001, '180° rotation: y becomes 0');
  
  // 270° rotation around origin
  const p270 = rotatePoint(100, 0, 0, 0, 270);
  assert.ok(Math.abs(p270.x - 0) < 0.001, '270° rotation: x becomes 0');
  assert.ok(Math.abs(p270.y - 100) < 0.001, '270° rotation: y becomes 100');
  
  // Rotation around non-origin center
  const pCenter = rotatePoint(150, 100, 100, 100, 90);
  assert.ok(Math.abs(pCenter.x - 100) < 0.001, '90° around (100,100): x becomes 100');
  assert.ok(Math.abs(pCenter.y - 50) < 0.001, '90° around (100,100): y becomes 50');
  
  console.log('✓ rotatePoint');
}

export function testPenPointNormalization() {
  console.log('Testing pen point normalization...');
  
  const penPoints = [
    { x: 10, y: 20 },
    { x: 30, y: 40 },
    { x: 50, y: 10 },
    { x: 20, y: 60 },
  ];
  
  const xs = penPoints.map(p => p.x);
  const ys = penPoints.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(0.001, maxX - minX);
  const h = Math.max(0.001, maxY - minY);
  const finalPoints = penPoints.map(p => ({
    x: (p.x - minX) / w,
    y: (p.y - minY) / h,
  }));
  
  // Bounds should be normalized to 0-1
  assert.strictEqual(minX, 10, 'minX is 10');
  assert.strictEqual(maxX, 50, 'maxX is 50');
  assert.strictEqual(minY, 10, 'minY is 10');
  assert.strictEqual(maxY, 60, 'maxY is 60');
  assert.strictEqual(w, 40, 'width is 40');
  assert.strictEqual(h, 50, 'height is 50');
  
  // Check normalized points
  assert.ok(finalPoints[0].x >= 0 && finalPoints[0].x <= 1, 'Point 0 x normalized');
  assert.ok(finalPoints[0].y >= 0 && finalPoints[0].y <= 1, 'Point 0 y normalized');
  
  // Min point should be at origin
  const minPoint = finalPoints.find(p => p.x === 0);
  assert.ok(minPoint, 'Min X point exists at x=0');
  
  const minYPoint = finalPoints.find(p => p.y === 0);
  assert.ok(minYPoint, 'Min Y point exists at y=0');
  
  console.log('✓ Pen point normalization');
}

export function testPenPointSinglePoint() {
  console.log('Testing pen point normalization with single point...');
  
  const penPoints = [{ x: 100, y: 200 }];
  
  const xs = penPoints.map(p => p.x);
  const ys = penPoints.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(0.001, maxX - minX);
  const h = Math.max(0.001, maxY - minY);
  
  assert.strictEqual(w, 0.001, 'Width clamped to 0.001');
  assert.strictEqual(h, 0.001, 'Height clamped to 0.001');
  
  console.log('✓ Pen point normalization single point');
}

export function testTextDrawingDefaultSizing() {
  console.log('Testing text drawing default sizing...');
  
  // Small drag should get default size
  let w = Math.abs(0.01);
  let h = Math.abs(0.01);
  if (w < 0.02) w = 0.16;
  if (h < 0.02) h = 0.04;
  
  assert.strictEqual(w, 0.16, 'Small width gets default 0.16');
  assert.strictEqual(h, 0.04, 'Small height gets default 0.04');
  
  // Large drag should keep size
  w = Math.abs(0.5);
  h = Math.abs(0.3);
  if (w < 0.02) w = 0.16;
  if (h < 0.02) h = 0.04;
  
  assert.strictEqual(w, 0.5, 'Large width kept');
  assert.strictEqual(h, 0.3, 'Large height kept');
  
  console.log('✓ Text drawing default sizing');
}

export function testShapeDrawingNormalization() {
  console.log('Testing shape drawing normalization...');
  
  // Negative width/height should be normalized
  const drawingAnn = { x: 0.5, y: 0.5, w: -0.2, h: -0.1 };
  
  const width = Math.abs(drawingAnn.w);
  const height = Math.abs(drawingAnn.h);
  
  let finalAnn = { ...drawingAnn };
  if (!false && !false) { // Simulating !activeTool.includes('line') && !activeTool.includes('arrow')
    finalAnn = {
      ...drawingAnn,
      x: drawingAnn.w < 0 ? drawingAnn.x + drawingAnn.w : drawingAnn.x,
      y: drawingAnn.h < 0 ? drawingAnn.y + drawingAnn.h : drawingAnn.y,
      w: Math.abs(drawingAnn.w),
      h: Math.abs(drawingAnn.h),
    };
  }
  
  assert.strictEqual(finalAnn.x, 0.3, 'X adjusted for negative width');
  assert.strictEqual(finalAnn.y, 0.4, 'Y adjusted for negative height');
  assert.strictEqual(finalAnn.w, 0.2, 'Width made positive');
  assert.strictEqual(finalAnn.h, 0.1, 'Height made positive');
  
  console.log('✓ Shape drawing normalization');
}

export function testShapeDrawingMinimumSize() {
  console.log('Testing shape drawing minimum size threshold...');
  
  const width1 = Math.abs(0.003);
  const height1 = Math.abs(0.003);
  const shouldSave1 = width1 > 0.005 || height1 > 0.005;
  assert.strictEqual(shouldSave1, false, 'Tiny shape not saved');
  
  const width2 = Math.abs(0.01);
  const height2 = Math.abs(0.01);
  const shouldSave2 = width2 > 0.005 || height2 > 0.005;
  assert.strictEqual(shouldSave2, true, 'Large enough shape saved');
  
  console.log('✓ Shape drawing minimum size threshold');
}

export function testDragThresholdLogic() {
  console.log('Testing drag threshold logic...');
  
  const startX = 100;
  const startY = 100;
  
  // Small movement: no drag
  const dist1 = Math.hypot(102 - startX, 102 - startY);
  const shouldDrag1 = dist1 >= 5;
  assert.strictEqual(shouldDrag1, false, 'Small movement (< 5px) no drag');
  
  // Large movement: drag
  const dist2 = Math.hypot(110 - startX, 110 - startY);
  const shouldDrag2 = dist2 >= 5;
  assert.strictEqual(shouldDrag2, true, 'Large movement (>= 5px) drag');
  
  // Exactly 5px
  const dist3 = Math.hypot(105 - startX, 100 - startY);
  const shouldDrag3 = dist3 >= 5;
  assert.strictEqual(shouldDrag3, true, 'Exactly 5px triggers drag');
  
  console.log('✓ Drag threshold logic');
}

export function testDoubleClickTimingLogic() {
  console.log('Testing double-click timing logic...');
  
  let lastClickTime = 0;
  const now = Date.now();
  
  // First click
  const isFirstClick = lastClickTime === 0;
  assert.strictEqual(isFirstClick, true, 'First click detected');
  lastClickTime = now;
  
  // Quick second click (< 300ms)
  const quickSecond = now + 200;
  const isDoubleClick = lastClickTime > 0 && quickSecond - lastClickTime < 300;
  assert.strictEqual(isDoubleClick, true, 'Quick click (< 300ms) is double-click');
  
  // Slow second click (> 300ms)
  const slowSecond = now + 400;
  const isSlowDouble = lastClickTime > 0 && slowSecond - lastClickTime < 300;
  assert.strictEqual(isSlowDouble, false, 'Slow click (> 300ms) not double-click');
  
  console.log('✓ Double-click timing logic');
}

export function testRotationAngleCalculation() {
  console.log('Testing rotation angle calculation...');
  
  // Mouse above center: 0°
  const rad1 = Math.atan2(0 - 50, 50 - 50); // mouseY=0, mouseX=50, cy=50, cx=50
  let deg1 = rad1 * (180 / Math.PI) + 90;
  if (deg1 < 0) deg1 += 360;
  assert.ok(Math.abs(deg1 - 0) < 0.1 || Math.abs(deg1 - 360) < 0.1, 'Mouse above: ~0°');
  
  // Mouse to right: 90°
  const rad2 = Math.atan2(50 - 50, 100 - 50); // mouseY=50, mouseX=100
  let deg2 = rad2 * (180 / Math.PI) + 90;
  if (deg2 < 0) deg2 += 360;
  assert.ok(Math.abs(deg2 - 90) < 0.1, 'Mouse right: ~90°');
  
  // Mouse below: 180°
  const rad3 = Math.atan2(100 - 50, 50 - 50); // mouseY=100, mouseX=50
  let deg3 = rad3 * (180 / Math.PI) + 90;
  if (deg3 < 0) deg3 += 360;
  assert.ok(Math.abs(deg3 - 180) < 0.1, 'Mouse below: ~180°');
  
  // Mouse to left: 270°
  const rad4 = Math.atan2(50 - 50, 0 - 50); // mouseY=50, mouseX=0
  let deg4 = rad4 * (180 / Math.PI) + 90;
  if (deg4 < 0) deg4 += 360;
  assert.ok(Math.abs(deg4 - 270) < 0.1, 'Mouse left: ~270°');
  
  console.log('✓ Rotation angle calculation');
}

export function testResizeHandleLogic() {
  console.log('Testing resize handle logic...');
  
  const handles = ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r', 'rot'];
  
  // Test handle detection
  assert.ok(handles.includes('r'), 'Right handle exists');
  assert.ok(handles.includes('l'), 'Left handle exists');
  assert.ok(handles.includes('b'), 'Bottom handle exists');
  assert.ok(handles.includes('t'), 'Top handle exists');
  assert.ok(handles.includes('rot'), 'Rotation handle exists');
  
  // Test resize logic for right handle
  const resizeHandle = 'r';
  const unrotated = { x: 0.8, y: 0.5 };
  const resizeStart = { x: 0.2, y: 0.2, w: 0.3, h: 0.4 };
  
  let { x, y, w, h } = resizeStart;
  if (resizeHandle.includes('r')) w = unrotated.x - x;
  
  assert.ok(Math.abs(w - 0.6) < 0.001, 'Right handle updates width');
  assert.ok(Math.abs(x - 0.2) < 0.001, 'X unchanged for right handle');
  
  // Test resize logic for left handle
  const resizeHandleL = 'l';
  let x2 = 0.2, y2 = 0.2, w2 = 0.3, h2 = 0.4;
  if (resizeHandleL.includes('l')) {
    const right = x2 + w2;
    x2 = unrotated.x;
    w2 = right - x2;
  }
  
  assert.ok(Math.abs(x2 - 0.8) < 0.001, 'Left handle moves X');
  assert.ok(Math.abs(w2 - (-0.3)) < 0.001, 'Left handle adjusts width');
  
  console.log('✓ Resize handle logic');
}

export function testAnnotationIdGeneration() {
  console.log('Testing annotation ID generation...');
  
  const id1 = `ann-${Date.now()}`;
  const id2 = `ann-${Date.now() + 1}`;
  
  assert.ok(id1.startsWith('ann-'), 'ID starts with ann-');
  assert.ok(id1.length > 4, 'ID has timestamp');
  assert.notStrictEqual(id1, id2, 'Different timestamps create different IDs');
  
  console.log('✓ Annotation ID generation');
}

export function testEmojiValidation() {
  console.log('Testing emoji validation...');
  
  const emoji1 = '😊';
  const emoji2 = '  ';
  const emoji3 = '🔥';
  
  assert.ok(emoji1 && emoji1.trim(), 'Valid emoji passes');
  assert.ok(!(emoji2 && emoji2.trim()), 'Empty string fails');
  assert.ok(emoji3 && emoji3.trim(), 'Fire emoji passes');
  
  const trimmed = emoji1.trim();
  assert.strictEqual(trimmed, '😊', 'Emoji trimmed correctly');
  
  console.log('✓ Emoji validation');
}

export function runAnnotationEventsTests() {
  testRotatePoint();
  testPenPointNormalization();
  testPenPointSinglePoint();
  testTextDrawingDefaultSizing();
  testShapeDrawingNormalization();
  testShapeDrawingMinimumSize();
  testDragThresholdLogic();
  testDoubleClickTimingLogic();
  testRotationAngleCalculation();
  testResizeHandleLogic();
  testAnnotationIdGeneration();
  testEmojiValidation();
}
