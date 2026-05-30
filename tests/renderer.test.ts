import { getCanvasDimensions, drawRoundedRectPath, RenderConfig } from '../src/renderer/canvasRenderer';
import {
  getCurvedArrowPoints,
  getTaperedCurvedArrowPoints,
  drawArrowOnCanvas,
} from '../src/renderer/arrowUtils';
import {
  solidPresets,
  curatedMeshPalettes,
  disneyHollywoodGradients,
  disneyHollywoodMeshPalettes,
  GradientPreset,
  MeshPalette,
} from '../src/renderer/presetsData';
import * as assert from 'assert';

console.log('--- Running Achu Unit Tests ---');

// ---------------------------------------------------------------------------
// Shared base config
// ---------------------------------------------------------------------------
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
  watermarkText: 'Achu',
  position: 'Middle center',
};

// ---------------------------------------------------------------------------
// Canvas mock helpers
// ---------------------------------------------------------------------------
function makeMockCtx(): CanvasRenderingContext2D {
  const calls: string[] = [];
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      if (prop === 'calls') return calls;
      return (..._args: unknown[]) => {
        calls.push(String(prop));
      };
    },
    set() { return true; },
  };
  return new Proxy({} as CanvasRenderingContext2D, handler);
}

// Minimal Annotation factory
function makeArrowAnnotation(
  arrowStyle: 'classic' | 'dashed' | 'tapered' | 'curved' = 'classic'
) {
  return {
    id: 'test',
    type: 'arrow' as const,
    x: 0.1, y: 0.1, w: 0.4, h: 0.3,
    color: '#ff0000',
    strokeWidth: 4,
    arrowStyle,
  };
}

// ---------------------------------------------------------------------------
// 1. getCanvasDimensions — existing cases
// ---------------------------------------------------------------------------
function testAutoRatio() {
  console.log('Testing Auto aspect ratio...');
  const dims = getCanvasDimensions(800, 600, baseConfig);
  assert.strictEqual(dims.width, 876, 'Width: imgWidth + padding*2');
  assert.strictEqual(dims.height, 708, 'Height: (imgH + chromeOffset) + padding*2');
  console.log('✓ Auto ratio');
}

function testAutoRatioScale() {
  console.log('Testing Auto ratio with 50% scale...');
  const dims = getCanvasDimensions(800, 600, { ...baseConfig, scale: 50 });
  assert.strictEqual(dims.width, 476);
  assert.strictEqual(dims.height, 392);
  console.log('✓ Auto ratio scale');
}

function testFixedRatio16_9() {
  console.log('Testing 16:9 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '16:9', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(1920, 1080, cfg);
  assert.strictEqual(dims.height, 1188);
  assert.strictEqual(dims.width, 2112);
  console.log('✓ 16:9 fixed ratio');
}

function testFixedRatio1_1() {
  console.log('Testing 1:1 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '1:1', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  assert.strictEqual(dims.width, 876);
  assert.strictEqual(dims.height, 876);
  console.log('✓ 1:1 fixed ratio');
}

function testNoImageDimensions() {
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

// ---------------------------------------------------------------------------
// 2. getCanvasDimensions — NEW cases
// ---------------------------------------------------------------------------
function testChromeNoneDimensions() {
  console.log('Testing chromeStyle=none (no chrome offset)...');
  const cfg = { ...baseConfig, chromeStyle: 'none' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  // No chrome: height = 600 + padding*2 = 676
  assert.strictEqual(dims.width, 876);
  assert.strictEqual(dims.height, 676);
  console.log('✓ chromeStyle=none');
}

function testFixedRatio4_3() {
  console.log('Testing 4:3 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '4:3', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(800, 600, cfg);
  // contentW = 800, contentH = 632, padded W = 876, padded H = 708
  // ratio = 876/708 = 1.237, target = 1.333 → height drives
  assert.strictEqual(dims.height, 708);
  assert.strictEqual(dims.width, Math.round(708 * (4 / 3))); // 944
  console.log('✓ 4:3 fixed ratio');
}

function testFixedRatio3_2() {
  console.log('Testing 3:2 fixed ratio...');
  const cfg = { ...baseConfig, aspectRatio: '3:2', paddingMode: 'fit' as const };
  const dims = getCanvasDimensions(1200, 800, cfg);
  // contentH = (800 + 32) = 832, paddedH = 832 + 76 = 908
  // paddedW = 1200 + 76 = 1276
  // currentRatio = 1276/908 ≈ 1.405, target 3/2 = 1.5 → height drives
  const expectedH = 908;
  const expectedW = Math.round(908 * (3 / 2)); // 1362
  assert.strictEqual(dims.height, expectedH);
  assert.strictEqual(dims.width, expectedW);
  console.log('✓ 3:2 fixed ratio');
}

function testCustomAspectRatio() {
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

function testFillPaddingMode() {
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

function testNoImageRatios() {
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

// ---------------------------------------------------------------------------
// 3. drawRoundedRectPath
// ---------------------------------------------------------------------------
function testDrawRoundedRectPath() {
  console.log('Testing drawRoundedRectPath...');
  const ctx = makeMockCtx();
  // Should not throw with roundRect available (proxy swallows call)
  drawRoundedRectPath(ctx, 0, 0, 100, 100, 10);

  // With roundRect = undefined, should fall back to manual path
  const ctxNoRoundRect = makeMockCtx();
  (ctxNoRoundRect as any).roundRect = undefined;
  drawRoundedRectPath(ctxNoRoundRect, 0, 0, 100, 100, 10);
  console.log('✓ drawRoundedRectPath (both code paths)');
}

// ---------------------------------------------------------------------------
// 4. Arrow utility: getCurvedArrowPoints
// ---------------------------------------------------------------------------
function testCurvedArrowPoints() {
  console.log('Testing getCurvedArrowPoints...');
  const res = getCurvedArrowPoints(0, 0, 100, 100, 4);
  assert.ok(res !== null);
  assert.strictEqual(res!.x0, 0);
  assert.strictEqual(res!.y0, 0);
  assert.strictEqual(res!.x1, 100);
  assert.strictEqual(res!.y1, 100);

  // Control point must be offset from midpoint
  assert.ok(res!.cx !== 50 || res!.cy !== 50, 'Control point should be offset');

  // Arrowhead points must exist
  assert.ok(typeof res!.arrow1X === 'number');
  assert.ok(typeof res!.arrow2X === 'number');

  // Short distance: null
  assert.strictEqual(getCurvedArrowPoints(0, 0, 0.5, 0.5, 4), null);
  console.log('✓ getCurvedArrowPoints');
}

function testCurvedArrowLargeStroke() {
  console.log('Testing getCurvedArrowPoints with large stroke width...');
  const res = getCurvedArrowPoints(0, 0, 200, 0, 20);
  assert.ok(res !== null);
  // Horizontal arrow: ny should be non-zero offset
  assert.ok(typeof res!.cx === 'number');
  console.log('✓ getCurvedArrowPoints large stroke');
}

// ---------------------------------------------------------------------------
// 5. Arrow utility: getTaperedCurvedArrowPoints
// ---------------------------------------------------------------------------
function testTaperedArrowPoints() {
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

function testTaperedArrowMinimalStroke() {
  console.log('Testing getTaperedCurvedArrowPoints minimal stroke...');
  const res = getTaperedCurvedArrowPoints(0, 0, 50, 50, 1);
  assert.ok(res !== null);
  assert.ok(res!.leftPoints.length === 16, 'Should have steps+1 = 16 points');
  assert.ok(res!.rightPoints.length === 16);
  console.log('✓ getTaperedCurvedArrowPoints minimal stroke');
}

// ---------------------------------------------------------------------------
// 6. drawArrowOnCanvas — all 4 styles
// ---------------------------------------------------------------------------
function testDrawArrowClassic() {
  console.log('Testing drawArrowOnCanvas: classic...');
  const ctx = makeMockCtx();
  drawArrowOnCanvas(ctx, makeArrowAnnotation('classic'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas classic (no throw)');
}

function testDrawArrowDashed() {
  console.log('Testing drawArrowOnCanvas: dashed...');
  const ctx = makeMockCtx();
  drawArrowOnCanvas(ctx, makeArrowAnnotation('dashed'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas dashed (no throw)');
}

function testDrawArrowTapered() {
  console.log('Testing drawArrowOnCanvas: tapered...');
  const ctx = makeMockCtx();
  drawArrowOnCanvas(ctx, makeArrowAnnotation('tapered'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas tapered (no throw)');
}

function testDrawArrowCurved() {
  console.log('Testing drawArrowOnCanvas: curved...');
  const ctx = makeMockCtx();
  drawArrowOnCanvas(ctx, makeArrowAnnotation('curved'), 50, 30, 4);
  console.log('✓ drawArrowOnCanvas curved (no throw)');
}

function testDrawArrowTaperedShortDistance() {
  console.log('Testing drawArrowOnCanvas: tapered short distance (early return)...');
  const ctx = makeMockCtx();
  // halfW = 0.4, halfH = 0.3 → distance < 1, should return early
  drawArrowOnCanvas(ctx, makeArrowAnnotation('tapered'), 0.3, 0.2, 4);
  console.log('✓ drawArrowOnCanvas tapered short distance (early return)');
}

function testDrawArrowCurvedShortDistance() {
  console.log('Testing drawArrowOnCanvas: curved short distance (early return)...');
  const ctx = makeMockCtx();
  drawArrowOnCanvas(ctx, makeArrowAnnotation('curved'), 0.3, 0.2, 4);
  console.log('✓ drawArrowOnCanvas curved short distance (early return)');
}

// ---------------------------------------------------------------------------
// 7. Zoom logic (pure math extracted from CanvasPreview.tsx)
// ---------------------------------------------------------------------------
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

function testZoomIn() {
  console.log('Testing zoom-in logic...');
  assert.strictEqual(zoomIn('100%'), '110%', '100 → 110');
  assert.strictEqual(zoomIn('200%'), '210%', '200 → 210');
  assert.strictEqual(zoomIn('500%'), '500%', '500 is max (clamped)');
  assert.strictEqual(zoomIn('490%'), '500%', '490 → 500');
  assert.strictEqual(zoomIn('Zoom to fit'), '110%', 'Fit → 110');
  assert.strictEqual(zoomIn('invalid'), '100%', 'NaN → 100');
  console.log('✓ Zoom in');
}

function testZoomOut() {
  console.log('Testing zoom-out logic...');
  assert.strictEqual(zoomOut('100%'), '90%', '100 → 90');
  assert.strictEqual(zoomOut('200%'), '190%', '200 → 190');
  assert.strictEqual(zoomOut('10%'), '10%', '10 is min (clamped)');
  assert.strictEqual(zoomOut('20%'), '10%', '20 → 10');
  assert.strictEqual(zoomOut('Zoom to fit'), '90%', 'Fit → 90');
  assert.strictEqual(zoomOut('invalid'), '100%', 'NaN → 100');
  console.log('✓ Zoom out');
}

function testZoomBoundary() {
  console.log('Testing zoom boundary conditions...');
  // Zoom in from non-round value
  assert.strictEqual(zoomIn('105%'), '110%', '105 floors to 100 then +10 = 110');
  // Zoom out from non-round value
  assert.strictEqual(zoomOut('105%'), '100%', '105 ceils to 110 then -10 = 100');
  // Chain: from fit, in, out
  let z = 'Zoom to fit';
  z = zoomIn(z);
  assert.strictEqual(z, '110%');
  z = zoomOut(z);
  assert.strictEqual(z, '100%');
  console.log('✓ Zoom boundary conditions');
}

// ---------------------------------------------------------------------------
// 8. presetsData — shape & integrity
// ---------------------------------------------------------------------------
function testSolidPresets() {
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

function testCuratedMeshPalettes() {
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

function testDisneyGradients() {
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

function testDisneyMeshPalettes() {
  console.log('Testing disneyHollywoodMeshPalettes shape...');
  assert.ok(disneyHollywoodMeshPalettes.length > 0);
  for (const p of disneyHollywoodMeshPalettes) {
    assert.ok(p.name);
    assert.ok(p.colors.length === 4, `${p.name} has 4 colors`);
    assert.ok(['disney', 'marvel', 'hollywood'].includes(p.category));
  }
  console.log('✓ disneyHollywoodMeshPalettes');
}

// ---------------------------------------------------------------------------
// 9. Inline preset logic (saveCustomPreset / deleteCustomPreset / selectBackgroundPreset)
// ---------------------------------------------------------------------------
function testSaveCustomPresetLogic() {
  console.log('Testing saveCustomPreset logic...');
  // Simulate: blank name → no-op
  const presets: any[] = [];
  const newPresetName = '  ';
  if (newPresetName.trim()) {
    presets.push({ id: 'x', name: newPresetName });
  }
  assert.strictEqual(presets.length, 0, 'Blank name should not save preset');

  // Valid name, gradient background
  const name = 'My Preset';
  const bg = 'linear-gradient(135deg, #f00, #00f)';
  const newPreset = {
    id: `custom-${Date.now()}`,
    name,
    gradient: bg,
    color: undefined,
    type: 'gradient',
  };
  presets.push(newPreset);
  assert.strictEqual(presets.length, 1);
  assert.strictEqual(presets[0].name, name);
  assert.strictEqual(presets[0].gradient, bg);
  console.log('✓ saveCustomPreset logic');
}

function testDeleteCustomPresetLogic() {
  console.log('Testing deleteCustomPreset logic...');
  const presets = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ];
  const filtered = presets.filter((p) => p.id !== 'b');
  assert.strictEqual(filtered.length, 2);
  assert.ok(filtered.every((p) => p.id !== 'b'), 'Deleted id is gone');
  console.log('✓ deleteCustomPreset logic');
}

function testSelectBackgroundPresetLogic() {
  console.log('Testing selectBackgroundPreset logic...');
  let bgType = 'color';
  let bgValue = '#fff';
  const pushHistoryCalls: any[] = [];

  const selectBackgroundPreset = (preset: any) => {
    bgType = preset.type;
    bgValue = preset.gradient || preset.color;
    pushHistoryCalls.push({ backgroundType: preset.type, backgroundValue: bgValue });
  };

  selectBackgroundPreset({ type: 'gradient', gradient: 'linear-gradient(#aaa, #bbb)', color: undefined });
  assert.strictEqual(bgType, 'gradient');
  assert.strictEqual(bgValue, 'linear-gradient(#aaa, #bbb)');
  assert.strictEqual(pushHistoryCalls.length, 1);

  selectBackgroundPreset({ type: 'color', gradient: undefined, color: '#ff0000' });
  assert.strictEqual(bgType, 'color');
  assert.strictEqual(bgValue, '#ff0000');
  console.log('✓ selectBackgroundPreset logic');
}

// ---------------------------------------------------------------------------
// 10. useHistory-style logic (without React hooks)
// ---------------------------------------------------------------------------
function testHistoryPushAndUndo() {
  console.log('Testing history push/undo/redo logic...');
  // Simulate the pure logic from useHistory without React state
  let history: any[] = [];
  let historyIndex = -1;
  let applied: any = null;

  const applyConfig = (cfg: any) => { applied = cfg; };

  const pushHistory = (config: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(config)));
    if (newHistory.length > 50) newHistory.shift();
    history = newHistory;
    historyIndex = newHistory.length - 1;
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      historyIndex--;
      applyConfig(history[historyIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      applyConfig(history[historyIndex]);
    }
  };

  // Push some configs
  pushHistory({ scale: 100 });
  pushHistory({ scale: 80 });
  pushHistory({ scale: 60 });
  assert.strictEqual(historyIndex, 2);

  handleUndo();
  assert.strictEqual(applied.scale, 80);
  assert.strictEqual(historyIndex, 1);

  handleUndo();
  assert.strictEqual(applied.scale, 100);
  assert.strictEqual(historyIndex, 0);

  // Cannot undo past 0
  handleUndo();
  assert.strictEqual(historyIndex, 0);

  handleRedo();
  assert.strictEqual(applied.scale, 80);

  // Push from mid-history: should discard future
  pushHistory({ scale: 50 });
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[2].scale, 50);

  // Cannot redo past end
  handleRedo();
  assert.strictEqual(historyIndex, 2);
  console.log('✓ History push/undo/redo logic');
}

function testHistoryMaxSize() {
  console.log('Testing history max size (50 entries)...');
  let history: any[] = [];
  let historyIndex = -1;

  const pushHistory = (config: any) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(config)));
    if (newHistory.length > 50) newHistory.shift();
    history = newHistory;
    historyIndex = newHistory.length - 1;
  };

  for (let i = 0; i < 55; i++) pushHistory({ scale: i });
  assert.ok(history.length <= 50, 'History capped at 50');
  assert.strictEqual(history[history.length - 1].scale, 54);
  console.log('✓ History max size');
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
try {
  // canvasRenderer — existing
  testAutoRatio();
  testAutoRatioScale();
  testFixedRatio16_9();
  testFixedRatio1_1();
  testNoImageDimensions();

  // canvasRenderer — new
  testChromeNoneDimensions();
  testFixedRatio4_3();
  testFixedRatio3_2();
  testCustomAspectRatio();
  testFillPaddingMode();
  testNoImageRatios();
  testDrawRoundedRectPath();

  // arrowUtils
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

  // zoom logic
  testZoomIn();
  testZoomOut();
  testZoomBoundary();

  // presetsData
  testSolidPresets();
  testCuratedMeshPalettes();
  testDisneyGradients();
  testDisneyMeshPalettes();

  // preset logic
  testSaveCustomPresetLogic();
  testDeleteCustomPresetLogic();
  testSelectBackgroundPresetLogic();

  // history logic
  testHistoryPushAndUndo();
  testHistoryMaxSize();

  console.log('\n--- All Tests Passed Successfully! ---');
  process.exit(0);
} catch (e) {
  console.error('\nTest verification failed:', e);
  process.exit(1);
}
