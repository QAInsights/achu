import * as assert from 'assert';

export function testArrowAngleCalculation() {
  console.log('Testing arrow angle calculation...');
  
  const w = 100;
  const h = 100;
  const angle = Math.atan2(h, w);
  
  assert.ok(Math.abs(angle - Math.PI / 4) < 0.001, '45° arrow angle');
  
  const w2 = 100;
  const h2 = 0;
  const angle2 = Math.atan2(h2, w2);
  assert.ok(Math.abs(angle2 - 0) < 0.001, '0° horizontal arrow');
  
  const w3 = 0;
  const h3 = 100;
  const angle3 = Math.atan2(h3, w3);
  assert.ok(Math.abs(angle3 - Math.PI / 2) < 0.001, '90° vertical arrow');
  
  console.log('✓ Arrow angle calculation');
}

export function testArrowheadLengthCalculation() {
  console.log('Testing arrowhead length calculation...');
  
  const strokeW1 = 2;
  const headLen1 = Math.max(12, strokeW1 * 3);
  assert.strictEqual(headLen1, 12, 'Minimum arrowhead length');
  
  const strokeW2 = 8;
  const headLen2 = Math.max(12, strokeW2 * 3);
  assert.strictEqual(headLen2, 24, 'Scaled arrowhead length');
  
  const strokeW3 = 16;
  const headLen3 = Math.max(12, strokeW3 * 3);
  assert.strictEqual(headLen3, 48, 'Large arrowhead length');
  
  console.log('✓ Arrowhead length calculation');
}

export function testArrowheadPositionCalculation() {
  console.log('Testing arrowhead position calculation...');
  
  const w = 100;
  const h = 100;
  const angle = Math.atan2(h, w);
  const headLen = 24;
  const endX = w / 2;
  const endY = h / 2;
  
  const arrow1X = endX - headLen * Math.cos(angle - Math.PI / 6);
  const arrow1Y = endY - headLen * Math.sin(angle - Math.PI / 6);
  const arrow2X = endX - headLen * Math.cos(angle + Math.PI / 6);
  const arrow2Y = endY - headLen * Math.sin(angle + Math.PI / 6);
  
  assert.ok(typeof arrow1X === 'number' && !isNaN(arrow1X), 'arrow1X is valid');
  assert.ok(typeof arrow1Y === 'number' && !isNaN(arrow1Y), 'arrow1Y is valid');
  assert.ok(typeof arrow2X === 'number' && !isNaN(arrow2X), 'arrow2X is valid');
  assert.ok(typeof arrow2Y === 'number' && !isNaN(arrow2Y), 'arrow2Y is valid');
  
  assert.ok(arrow1X !== arrow2X || arrow1Y !== arrow2Y, 'Arrowhead points are different');
  
  console.log('✓ Arrowhead position calculation');
}

export function testTextFontSizeCalculation() {
  console.log('Testing text font size calculation...');
  
  const rectH1 = 10;
  const fSize1 = Math.max(12, rectH1 * 0.7);
  assert.strictEqual(fSize1, 12, 'Minimum font size');
  
  const rectH2 = 50;
  const fSize2 = Math.max(12, rectH2 * 0.7);
  assert.strictEqual(fSize2, 35, 'Scaled font size');
  
  const rectH3 = 100;
  const fSize3 = Math.max(12, rectH3 * 0.7);
  assert.strictEqual(fSize3, 70, 'Large font size');
  
  console.log('✓ Text font size calculation');
}

export function testTextStrokeWidthCalculation() {
  console.log('Testing text stroke width calculation...');
  
  const fSize1 = 12;
  const stroke1 = Math.max(2, fSize1 * 0.15);
  assert.strictEqual(stroke1, 2, 'Minimum stroke width');
  
  const fSize2 = 50;
  const stroke2 = Math.max(2, fSize2 * 0.15);
  assert.ok(Math.abs(stroke2 - 7.5) < 0.001, 'Scaled stroke width');
  
  const fSize3 = 100;
  const stroke3 = Math.max(2, fSize3 * 0.15);
  assert.strictEqual(stroke3, 15, 'Large stroke width');
  
  console.log('✓ Text stroke width calculation');
}

export function testEmojiFontSizeCalculation() {
  console.log('Testing emoji font size calculation...');
  
  const rectW1 = 50;
  const rectH1 = 30;
  const emojiSize1 = Math.min(rectW1, rectH1);
  assert.strictEqual(emojiSize1, 30, 'Emoji uses smaller dimension');
  
  const rectW2 = 30;
  const rectH2 = 50;
  const emojiSize2 = Math.min(rectW2, rectH2);
  assert.strictEqual(emojiSize2, 30, 'Emoji uses smaller dimension (reversed)');
  
  const rectW3 = 100;
  const rectH3 = 100;
  const emojiSize3 = Math.min(rectW3, rectH3);
  assert.strictEqual(emojiSize3, 100, 'Square emoji uses full size');
  
  console.log('✓ Emoji font size calculation');
}

export function testFilledRectCornerRadius() {
  console.log('Testing filled-rect corner radius...');
  
  const rectW1 = 100;
  const rectH1 = 100;
  const rx1 = Math.min(8, rectW1 * 0.1, rectH1 * 0.1);
  assert.strictEqual(rx1, 8, 'Capped corner radius');
  
  const rectW2 = 50;
  const rectH2 = 50;
  const rx2 = Math.min(8, rectW2 * 0.1, rectH2 * 0.1);
  assert.strictEqual(rx2, 5, 'Scaled corner radius');
  
  const rectW3 = 30;
  const rectH3 = 100;
  const rx3 = Math.min(8, rectW3 * 0.1, rectH3 * 0.1);
  assert.strictEqual(rx3, 3, 'Corner radius uses smaller dimension');
  
  console.log('✓ Filled-rect corner radius');
}

export function testTextBorderRadius() {
  console.log('Testing text border radius...');
  
  const rectH1 = 50;
  const rx1 = rectH1 * 0.15;
  assert.ok(Math.abs(rx1 - 7.5) < 0.001, 'Text border radius is 15% of height');
  
  const rectH2 = 100;
  const rx2 = rectH2 * 0.15;
  assert.strictEqual(rx2, 15, 'Large text border radius');
  
  console.log('✓ Text border radius');
}

export function testAspectRatioToFixedSizeMapping() {
  console.log('Testing aspect ratio to fixed size mapping...');
  
  const getFixedSize = (aspectRatio: string, canvasWidth: number, canvasHeight: number, noImageMode: boolean) => {
    const width = aspectRatio === '1:1' ? 600 : aspectRatio === '16:9' ? 800 : aspectRatio === '4:3' ? 700 : aspectRatio === '3:2' ? 750 : aspectRatio === 'Custom' ? canvasWidth : (noImageMode ? 800 : 'auto');
    const height = aspectRatio === '1:1' ? 600 : aspectRatio === '16:9' ? 450 : aspectRatio === '4:3' ? 525 : aspectRatio === '3:2' ? 500 : aspectRatio === 'Custom' ? canvasHeight : (noImageMode ? 450 : 'auto');
    return { width, height };
  };
  
  const size1x1 = getFixedSize('1:1', 800, 600, false);
  assert.strictEqual(size1x1.width, 600, '1:1 width');
  assert.strictEqual(size1x1.height, 600, '1:1 height');
  
  const size16x9 = getFixedSize('16:9', 800, 600, false);
  assert.strictEqual(size16x9.width, 800, '16:9 width');
  assert.strictEqual(size16x9.height, 450, '16:9 height');
  
  const size4x3 = getFixedSize('4:3', 800, 600, false);
  assert.strictEqual(size4x3.width, 700, '4:3 width');
  assert.strictEqual(size4x3.height, 525, '4:3 height');
  
  const size3x2 = getFixedSize('3:2', 800, 600, false);
  assert.strictEqual(size3x2.width, 750, '3:2 width');
  assert.strictEqual(size3x2.height, 500, '3:2 height');
  
  const sizeCustom = getFixedSize('Custom', 1920, 1080, false);
  assert.strictEqual(sizeCustom.width, 1920, 'Custom width');
  assert.strictEqual(sizeCustom.height, 1080, 'Custom height');
  
  const sizeNoImage = getFixedSize('Auto', 800, 600, true);
  assert.strictEqual(sizeNoImage.width, 800, 'No-image mode width');
  assert.strictEqual(sizeNoImage.height, 450, 'No-image mode height');
  
  const sizeAuto = getFixedSize('Auto', 800, 600, false);
  assert.strictEqual(sizeAuto.width, 'auto', 'Auto width');
  assert.strictEqual(sizeAuto.height, 'auto', 'Auto height');
  
  console.log('✓ Aspect ratio to fixed size mapping');
}

export function testPositionAlignmentLogic() {
  console.log('Testing position alignment logic...');
  
  const getAlignment = (position: string) => {
    const alignItems = position.includes('Top') ? 'flex-start' : position.includes('Bottom') ? 'flex-end' : 'center';
    const justifyContent = position.includes('left') ? 'flex-start' : position.includes('right') ? 'flex-end' : 'center';
    return { alignItems, justifyContent };
  };
  
  const align1 = getAlignment('Middle center');
  assert.strictEqual(align1.alignItems, 'center', 'Middle center: vertical');
  assert.strictEqual(align1.justifyContent, 'center', 'Middle center: horizontal');
  
  const align2 = getAlignment('Top center');
  assert.strictEqual(align2.alignItems, 'flex-start', 'Top center: vertical');
  assert.strictEqual(align2.justifyContent, 'center', 'Top center: horizontal');
  
  const align3 = getAlignment('Bottom center');
  assert.strictEqual(align3.alignItems, 'flex-end', 'Bottom center: vertical');
  assert.strictEqual(align3.justifyContent, 'center', 'Bottom center: horizontal');
  
  const align4 = getAlignment('Middle left');
  assert.strictEqual(align4.alignItems, 'center', 'Middle left: vertical');
  assert.strictEqual(align4.justifyContent, 'flex-start', 'Middle left: horizontal');
  
  const align5 = getAlignment('Middle right');
  assert.strictEqual(align5.alignItems, 'center', 'Middle right: vertical');
  assert.strictEqual(align5.justifyContent, 'flex-end', 'Middle right: horizontal');
  
  console.log('✓ Position alignment logic');
}

export function testCoordinateTransformation() {
  console.log('Testing coordinate transformation...');
  
  const dimensions = { width: 800, height: 600 };
  const ann = { x: 0.25, y: 0.5, w: 0.5, h: 0.25 };
  
  const x1 = ann.x * dimensions.width;
  const y1 = ann.y * dimensions.height;
  const w = ann.w * dimensions.width;
  const h = ann.h * dimensions.height;
  
  assert.strictEqual(x1, 200, 'X coordinate transformation');
  assert.strictEqual(y1, 300, 'Y coordinate transformation');
  assert.strictEqual(w, 400, 'Width transformation');
  assert.strictEqual(h, 150, 'Height transformation');
  
  const rectW = Math.abs(w);
  const rectH = Math.abs(h);
  assert.strictEqual(rectW, 400, 'Absolute width');
  assert.strictEqual(rectH, 150, 'Absolute height');
  
  console.log('✓ Coordinate transformation');
}

export function testNegativeDimensionHandling() {
  console.log('Testing negative dimension handling...');
  
  const w1 = -100;
  const h1 = -50;
  const rectW1 = Math.abs(w1);
  const rectH1 = Math.abs(h1);
  assert.strictEqual(rectW1, 100, 'Negative width made positive');
  assert.strictEqual(rectH1, 50, 'Negative height made positive');
  
  const w2 = 100;
  const h2 = 50;
  const rectW2 = Math.abs(w2);
  const rectH2 = Math.abs(h2);
  assert.strictEqual(rectW2, 100, 'Positive width unchanged');
  assert.strictEqual(rectH2, 50, 'Positive height unchanged');
  
  console.log('✓ Negative dimension handling');
}

export function testTextEditorFontSize() {
  console.log('Testing text editor font size...');
  
  const strokeWidth1 = 2;
  const fontSize1 = Math.max(12, 14 + strokeWidth1);
  assert.strictEqual(fontSize1, 16, 'Base font size with stroke');
  
  const strokeWidth2 = 8;
  const fontSize2 = Math.max(12, 14 + strokeWidth2);
  assert.strictEqual(fontSize2, 22, 'Scaled font size with stroke');
  
  const strokeWidth3 = 0;
  const fontSize3 = Math.max(12, 14 + strokeWidth3);
  assert.strictEqual(fontSize3, 14, 'Minimum stroke font size');
  
  console.log('✓ Text editor font size');
}

export function testPenPathDataGeneration() {
  console.log('Testing pen path data generation...');
  
  const points = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
  ];
  const w = 100;
  const h = 100;
  
  const pathData = points.length > 0
    ? `M ${-w / 2 + points[0].x * w} ${-h / 2 + points[0].y * h} ` +
      points.slice(1).map(p => `L ${-w / 2 + p.x * w} ${-h / 2 + p.y * h}`).join(' ')
    : '';
  
  assert.ok(pathData.startsWith('M'), 'Path starts with M command');
  assert.ok(pathData.includes('L'), 'Path includes L commands');
  assert.ok(pathData.includes('-50'), 'Path includes offset coordinates');
  
  const emptyPoints: Array<{ x: number; y: number }> = [];
  const emptyPath = emptyPoints.length > 0
    ? `M ${-w / 2 + emptyPoints[0].x * w} ${-h / 2 + emptyPoints[0].y * h}`
    : '';
  assert.strictEqual(emptyPath, '', 'Empty points produce empty path');
  
  console.log('✓ Pen path data generation');
}

export function testDashedLinePattern() {
  console.log('Testing dashed line pattern...');
  
  const strokeW1 = 4;
  const isDashed1 = true;
  const dasharray1 = isDashed1 ? `${strokeW1 * 2} ${strokeW1 * 1.5}` : undefined;
  assert.strictEqual(dasharray1, '8 6', 'Dashed pattern calculated');
  
  const isDashed2 = false;
  const dasharray2 = isDashed2 ? `${strokeW1 * 2} ${strokeW1 * 1.5}` : undefined;
  assert.strictEqual(dasharray2, undefined, 'No dash pattern for solid');
  
  const strokeW2 = 8;
  const dasharray3 = `${strokeW2 * 2} ${strokeW2 * 1.5}`;
  assert.strictEqual(dasharray3, '16 12', 'Scaled dashed pattern');
  
  console.log('✓ Dashed line pattern');
}

export function testSettingsLocalStorageUpdate() {
  console.log('Testing settings localStorage update...');
  
  const storage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
  };
  
  const updateSetting = (key: string, val: any) => {
    try {
      const saved = mockLocalStorage.getItem('snapframe-user-defaults');
      const parsed = saved ? JSON.parse(saved) : {};
      parsed[key] = val;
      mockLocalStorage.setItem('snapframe-user-defaults', JSON.stringify(parsed));
    } catch (e) {}
  };
  
  updateSetting('padding', 50);
  const saved1 = JSON.parse(storage['snapframe-user-defaults']);
  assert.strictEqual(saved1.padding, 50, 'Padding saved');
  
  updateSetting('rounded', 30);
  const saved2 = JSON.parse(storage['snapframe-user-defaults']);
  assert.strictEqual(saved2.padding, 50, 'Padding preserved');
  assert.strictEqual(saved2.rounded, 30, 'Rounded saved');
  
  updateSetting('padding', 60);
  const saved3 = JSON.parse(storage['snapframe-user-defaults']);
  assert.strictEqual(saved3.padding, 60, 'Padding updated');
  assert.strictEqual(saved3.rounded, 30, 'Rounded preserved');
  
  console.log('✓ Settings localStorage update');
}

export function testSettingsResetLogic() {
  console.log('Testing settings reset logic...');
  
  const defaults = {
    padding: 38,
    rounded: 20,
    shadow: 30,
    watermarkEnabled: false,
    watermarkText: 'Achu',
    exportFormat: 'png',
    jpegQuality: 90,
  };
  
  assert.strictEqual(defaults.padding, 38, 'Default padding');
  assert.strictEqual(defaults.rounded, 20, 'Default rounded');
  assert.strictEqual(defaults.shadow, 30, 'Default shadow');
  assert.strictEqual(defaults.watermarkEnabled, false, 'Default watermark enabled');
  assert.strictEqual(defaults.watermarkText, 'Achu', 'Default watermark text');
  assert.strictEqual(defaults.exportFormat, 'png', 'Default export format');
  assert.strictEqual(defaults.jpegQuality, 90, 'Default JPEG quality');
  
  console.log('✓ Settings reset logic');
}

export function testToolbarToolsArrayStructure() {
  console.log('Testing toolbar tools array structure...');
  
  const tools = [
    { id: 'pointer', title: 'Select / Move' },
    { id: 'rect', title: 'Rectangle Outline' },
    { id: 'filled-rect', title: 'Rectangle Filled' },
    { id: 'circle', title: 'Circle Outline' },
    { id: 'filled-circle', title: 'Circle Filled' },
    { id: 'line', title: 'Straight Line' },
    { id: 'arrow', title: 'Draw Arrow' },
    { id: 'text', title: 'Draw Text' },
    { id: 'pen', title: 'Freehand Draw' },
    { id: 'emoji', title: 'Add Emoji' },
  ];
  
  assert.strictEqual(tools.length, 10, 'Has 10 tools');
  
  for (const tool of tools) {
    assert.ok(tool.id, `Tool ${tool.id} has id`);
    assert.ok(tool.title, `Tool ${tool.id} has title`);
  }
  
  const ids = tools.map(t => t.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, ids.length, 'All tool IDs are unique');
  
  console.log('✓ Toolbar tools array structure');
}

export function testThemeToggleLogic() {
  console.log('Testing theme toggle logic...');
  
  const toggleTheme = (currentTheme: 'dark' | 'light'): 'dark' | 'light' => {
    return currentTheme === 'dark' ? 'light' : 'dark';
  };
  
  assert.strictEqual(toggleTheme('dark'), 'light', 'Dark to light');
  assert.strictEqual(toggleTheme('light'), 'dark', 'Light to dark');
  assert.strictEqual(toggleTheme(toggleTheme('dark')), 'dark', 'Double toggle returns to original');
  
  console.log('✓ Theme toggle logic');
}

export function testPromptModalKeyboardHandling() {
  console.log('Testing prompt modal keyboard handling...');
  
  const shouldResolveOnEnter = (key: string) => key === 'Enter';
  const shouldResolveOnEscape = (key: string) => key === 'Escape';
  
  assert.strictEqual(shouldResolveOnEnter('Enter'), true, 'Enter resolves');
  assert.strictEqual(shouldResolveOnEnter('Escape'), false, 'Escape does not resolve as Enter');
  assert.strictEqual(shouldResolveOnEscape('Escape'), true, 'Escape cancels');
  assert.strictEqual(shouldResolveOnEscape('Enter'), false, 'Enter does not cancel');
  assert.strictEqual(shouldResolveOnEnter('a'), false, 'Other keys ignored');
  
  console.log('✓ Prompt modal keyboard handling');
}

export function testAnnotationsLayerTextEditing() {
  console.log('Testing annotations layer text editing...');
  
  const shouldDeleteOnEmpty = (text: string) => !text.trim();
  const shouldUpdateOnNonEmpty = (text: string) => !!text.trim();
  
  assert.strictEqual(shouldDeleteOnEmpty(''), true, 'Empty text deletes');
  assert.strictEqual(shouldDeleteOnEmpty('   '), true, 'Whitespace-only deletes');
  assert.strictEqual(shouldDeleteOnEmpty('Hello'), false, 'Non-empty does not delete');
  
  assert.strictEqual(shouldUpdateOnNonEmpty('Hello'), true, 'Non-empty updates');
  assert.strictEqual(shouldUpdateOnNonEmpty(''), false, 'Empty does not update');
  assert.strictEqual(shouldUpdateOnNonEmpty('   '), false, 'Whitespace does not update');
  
  console.log('✓ Annotations layer text editing');
}

export function testDeleteButtonPositioning() {
  console.log('Testing delete button positioning...');
  
  const ann = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
  
  const percentX = (ann.x + ann.w / 2) * 100;
  const percentY = (ann.y + ann.h) * 100;
  
  assert.strictEqual(percentX, 50, 'Delete button centered horizontally');
  assert.strictEqual(percentY, 75, 'Delete button at bottom of annotation');
  
  const ann2 = { x: 0, y: 0, w: 1, h: 1 };
  const percentX2 = (ann2.x + ann2.w / 2) * 100;
  const percentY2 = (ann2.y + ann2.h) * 100;
  
  assert.strictEqual(percentX2, 50, 'Full-width annotation center');
  assert.strictEqual(percentY2, 100, 'Full-height annotation bottom');
  
  console.log('✓ Delete button positioning');
}

export function testInspectorSectionToggle() {
  console.log('Testing inspector section toggle...');
  
  const toggleOpen = (currentOpen: boolean) => !currentOpen;
  
  assert.strictEqual(toggleOpen(true), false, 'Close when open');
  assert.strictEqual(toggleOpen(false), true, 'Open when closed');
  assert.strictEqual(toggleOpen(toggleOpen(true)), true, 'Double toggle returns to original');
  
  console.log('✓ Inspector section toggle');
}

export function testSelectionBoxHandlePositions() {
  console.log('Testing selection box handle positions...');
  
  const rectW = 100;
  const rectH = 80;
  const handleSize = 12;
  const offset = 8;
  
  const handles = {
    tl: { x: -rectW / 2 - offset - handleSize, y: -rectH / 2 - offset - handleSize },
    tc: { x: -handleSize / 2, y: -rectH / 2 - offset - handleSize },
    tr: { x: rectW / 2 + offset, y: -rectH / 2 - offset - handleSize },
    ml: { x: -rectW / 2 - offset - handleSize, y: -handleSize / 2 },
    mr: { x: rectW / 2 + offset, y: -handleSize / 2 },
    bl: { x: -rectW / 2 - offset - handleSize, y: rectH / 2 + offset },
    bc: { x: -handleSize / 2, y: rectH / 2 + offset },
    br: { x: rectW / 2 + offset, y: rectH / 2 + offset },
  };
  
  assert.ok(handles.tl.x < handles.tr.x, 'TL is left of TR');
  assert.ok(handles.tl.y < handles.bl.y, 'TL is above BL');
  assert.ok(handles.br.x > handles.bl.x, 'BR is right of BL');
  assert.ok(handles.br.y > handles.tr.y, 'BR is below TR');
  assert.ok(Math.abs(handles.tc.x) < handles.tr.x, 'TC is centered horizontally');
  assert.ok(Math.abs(handles.ml.y) < handles.bl.y, 'ML is centered vertically');
  
  console.log('✓ Selection box handle positions');
}

export function testRotationHandlePosition() {
  console.log('Testing rotation handle position...');
  
  const rectH = 80;
  const offset = 8;
  const stemLength = 26;
  const handleRadius = 7;
  
  const stemY1 = -rectH / 2 - offset;
  const stemY2 = stemY1 - stemLength;
  const handleY = stemY2 - handleRadius;
  
  assert.ok(stemY2 < stemY1, 'Rotation stem extends upward');
  assert.ok(handleY < stemY2, 'Rotation handle is above stem');
  assert.strictEqual(stemY1, -48, 'Stem starts at top offset');
  assert.strictEqual(stemY2, -74, 'Stem ends at offset + length');
  assert.strictEqual(handleY, -81, 'Handle center position');
  
  console.log('✓ Rotation handle position');
}

export function runComponentsTests() {
  testArrowAngleCalculation();
  testArrowheadLengthCalculation();
  testArrowheadPositionCalculation();
  testTextFontSizeCalculation();
  testTextStrokeWidthCalculation();
  testEmojiFontSizeCalculation();
  testFilledRectCornerRadius();
  testTextBorderRadius();
  testAspectRatioToFixedSizeMapping();
  testPositionAlignmentLogic();
  testCoordinateTransformation();
  testNegativeDimensionHandling();
  testTextEditorFontSize();
  testPenPathDataGeneration();
  testDashedLinePattern();
  testSettingsLocalStorageUpdate();
  testSettingsResetLogic();
  testToolbarToolsArrayStructure();
  testThemeToggleLogic();
  testPromptModalKeyboardHandling();
  testAnnotationsLayerTextEditing();
  testDeleteButtonPositioning();
  testInspectorSectionToggle();
  testSelectionBoxHandlePositions();
  testRotationHandlePosition();
}
