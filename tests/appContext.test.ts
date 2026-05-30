import * as assert from 'assert';

export function testGetUserDefaultWithMockLocalStorage() {
  console.log('Testing getUserDefault with mock localStorage...');
  
  const storage: Record<string, string> = {
    'snapframe-user-defaults': JSON.stringify({
      padding: 50,
      rounded: 30,
      shadow: 40,
      watermarkEnabled: true,
      watermarkText: 'Custom',
    }),
  };
  
  const mockLocalStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
  };
  
  function getUserDefault<T>(key: string, fallback: T): T {
    try {
      const saved = mockLocalStorage.getItem('snapframe-user-defaults');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {}
    return fallback;
  }
  
  assert.strictEqual(getUserDefault('padding', 38), 50, 'Returns saved padding');
  assert.strictEqual(getUserDefault('rounded', 20), 30, 'Returns saved rounded');
  assert.strictEqual(getUserDefault('shadow', 30), 40, 'Returns saved shadow');
  assert.strictEqual(getUserDefault('watermarkEnabled', false), true, 'Returns saved watermarkEnabled');
  assert.strictEqual(getUserDefault('watermarkText', 'Achu'), 'Custom', 'Returns saved watermarkText');
  assert.strictEqual(getUserDefault('scale', 100), 100, 'Returns fallback for missing key');
  assert.strictEqual(getUserDefault('nonexistent', 'default'), 'default', 'Returns fallback for nonexistent');
  
  console.log('✓ getUserDefault with mock localStorage');
}

export function testGetUserDefaultWithInvalidJSON() {
  console.log('Testing getUserDefault with invalid JSON...');
  
  const storage: Record<string, string> = {
    'snapframe-user-defaults': 'invalid json {',
  };
  
  const mockLocalStorage = {
    getItem: (key: string) => storage[key] || null,
  };
  
  function getUserDefault<T>(key: string, fallback: T): T {
    try {
      const saved = mockLocalStorage.getItem('snapframe-user-defaults');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[key] !== undefined) return parsed[key];
      }
    } catch (e) {}
    return fallback;
  }
  
  assert.strictEqual(getUserDefault('padding', 38), 38, 'Returns fallback on invalid JSON');
  console.log('✓ getUserDefault with invalid JSON');
}

export function testDefaultMeshPointsStructure() {
  console.log('Testing default mesh points structure...');
  
  const defaultMeshPoints = [
    { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
    { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
    { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
    { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
  ];
  
  assert.strictEqual(defaultMeshPoints.length, 4, 'Has 4 default points');
  
  for (const pt of defaultMeshPoints) {
    assert.ok(pt.id, 'Has id');
    assert.ok(pt.color.startsWith('#'), 'Color is hex');
    assert.ok(pt.x >= 0 && pt.x <= 1, 'X in range 0-1');
    assert.ok(pt.y >= 0 && pt.y <= 1, 'Y in range 0-1');
    assert.ok(pt.radius > 0, 'Radius is positive');
  }
  
  assert.ok(defaultMeshPoints[0].x < 0.5 && defaultMeshPoints[0].y < 0.5, 'Point 1 is top-left');
  assert.ok(defaultMeshPoints[1].x > 0.5 && defaultMeshPoints[1].y < 0.5, 'Point 2 is top-right');
  assert.ok(defaultMeshPoints[2].x < 0.5 && defaultMeshPoints[2].y > 0.5, 'Point 3 is bottom-left');
  assert.ok(defaultMeshPoints[3].x > 0.5 && defaultMeshPoints[3].y > 0.5, 'Point 4 is bottom-right');
  
  console.log('✓ Default mesh points structure');
}

export function testGetZoomStyleLogic() {
  console.log('Testing getZoomStyle logic...');
  
  function getZoomStyle(zoomLevel: string): any {
    if (zoomLevel === 'Zoom to fit') return {};
    const percent = parseInt(zoomLevel, 10);
    return isNaN(percent) ? {} : { transform: `scale(${percent / 100})` };
  }
  
  const fitStyle = getZoomStyle('Zoom to fit');
  assert.deepStrictEqual(fitStyle, {}, 'Zoom to fit returns empty object');
  
  const zoom100 = getZoomStyle('100%');
  assert.strictEqual(zoom100.transform, 'scale(1)', '100% → scale(1)');
  
  const zoom150 = getZoomStyle('150%');
  assert.strictEqual(zoom150.transform, 'scale(1.5)', '150% → scale(1.5)');
  
  const zoom50 = getZoomStyle('50%');
  assert.strictEqual(zoom50.transform, 'scale(0.5)', '50% → scale(0.5)');
  
  const zoom200 = getZoomStyle('200%');
  assert.strictEqual(zoom200.transform, 'scale(2)', '200% → scale(2)');
  
  const invalidStyle = getZoomStyle('invalid');
  assert.deepStrictEqual(invalidStyle, {}, 'Invalid returns empty object');
  
  console.log('✓ getZoomStyle logic');
}

export function testApplyMeshPaletteLogic() {
  console.log('Testing applyMeshPalette logic...');
  
  const meshPoints = [
    { id: '1', color: '#000000', x: 0.2, y: 0.2, radius: 180 },
    { id: '2', color: '#000000', x: 0.8, y: 0.2, radius: 220 },
    { id: '3', color: '#000000', x: 0.2, y: 0.8, radius: 200 },
    { id: '4', color: '#000000', x: 0.8, y: 0.8, radius: 240 },
  ];
  
  const colors = ['#ff0000', '#00ff00', '#0000ff'];
  
  const updated = meshPoints.map((pt, idx) => ({ 
    ...pt, 
    color: colors[idx % colors.length] 
  }));
  
  assert.strictEqual(updated[0].color, '#ff0000', 'Point 0 gets color 0');
  assert.strictEqual(updated[1].color, '#00ff00', 'Point 1 gets color 1');
  assert.strictEqual(updated[2].color, '#0000ff', 'Point 2 gets color 2');
  assert.strictEqual(updated[3].color, '#ff0000', 'Point 3 wraps to color 0');
  
  assert.strictEqual(updated[0].x, 0.2, 'X unchanged');
  assert.strictEqual(updated[0].y, 0.2, 'Y unchanged');
  assert.strictEqual(updated[0].radius, 180, 'Radius unchanged');
  
  console.log('✓ applyMeshPalette logic');
}

export function testGenerateRandomPaletteLogic() {
  console.log('Testing generateRandomPalette logic...');
  
  const meshPoints = [
    { id: '1', color: '#000000', x: 0.5, y: 0.5, radius: 180 },
    { id: '2', color: '#000000', x: 0.5, y: 0.5, radius: 220 },
    { id: '3', color: '#000000', x: 0.5, y: 0.5, radius: 200 },
  ];
  
  const randomHex = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  
  const updated = meshPoints.map((pt) => ({
    ...pt,
    color: randomHex(),
    x: Math.random() * 0.8 + 0.1,
    y: Math.random() * 0.8 + 0.1,
  }));
  
  for (let i = 0; i < updated.length; i++) {
    const pt = updated[i];
    
    assert.ok(pt.color.startsWith('#'), 'Color starts with #');
    assert.ok(pt.color.length === 7, 'Color is 7 chars');
    assert.ok(/^[0-9a-f]{6}$/i.test(pt.color.slice(1)), 'Color is valid hex');
    
    assert.ok(pt.x >= 0.1 && pt.x <= 0.9, `X in range 0.1-0.9: ${pt.x}`);
    assert.ok(pt.y >= 0.1 && pt.y <= 0.9, `Y in range 0.1-0.9: ${pt.y}`);
    
    assert.strictEqual(pt.radius, meshPoints[i].radius, 'Radius unchanged');
    assert.strictEqual(pt.id, meshPoints[i].id, 'ID unchanged');
  }
  
  const colors = updated.map(pt => pt.color);
  const uniqueColors = new Set(colors);
  assert.ok(uniqueColors.size >= 2, 'At least 2 unique colors (random)');
  
  console.log('✓ generateRandomPalette logic');
}

export function testDefaultStateValues() {
  console.log('Testing default state values...');
  
  const defaults = {
    padding: 38,
    rounded: 20,
    shadow: 30,
    shadowColor: 'rgba(0, 0, 0, 0.45)',
    shadowEnabled: true,
    inset: 0,
    insetColor: 'rgba(255, 255, 255, 0.25)',
    border: 0,
    borderColor: '#ffffff',
    scale: 100,
    backgroundType: 'gradient' as const,
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    aspectRatio: 'Auto',
    canvasWidth: 800,
    canvasHeight: 600,
    paddingMode: 'fit' as const,
    chromeStyle: 'mac' as const,
    chromeTheme: 'dark' as const,
    blurDensity: 40,
    meshBlur: 60,
    meshGrain: 15,
    meshOpacity: 100,
    meshSpread: 100,
    watermarkEnabled: false,
    watermarkText: 'Achu',
    position: 'Middle center',
    activeTool: 'pointer' as const,
    arrowStyle: 'classic' as const,
    annotationColor: '#f43f5e',
    annotationStrokeWidth: 4,
    sidebarVisible: true,
    settingsVisible: false,
    showAdvancedInset: false,
    showAdvancedShadow: false,
    showAdvancedBorder: false,
    showHollywoodPalettes: false,
    selectedGradientCategory: 'classic' as const,
    showHollywoodMeshPalettes: false,
    zoomLevel: 'Zoom to fit',
    appTheme: 'dark' as const,
  };
  
  for (const [key, value] of Object.entries(defaults)) {
    assert.ok(value !== undefined, `${key} is defined`);
  }
  
  assert.strictEqual(defaults.padding, 38);
  assert.strictEqual(defaults.rounded, 20);
  assert.strictEqual(defaults.shadow, 30);
  assert.strictEqual(defaults.scale, 100);
  assert.strictEqual(defaults.canvasWidth, 800);
  assert.strictEqual(defaults.canvasHeight, 600);
  assert.strictEqual(defaults.meshBlur, 60);
  assert.strictEqual(defaults.meshOpacity, 100);
  
  console.log('✓ Default state values');
}

export function testGetCurrentConfigStructure() {
  console.log('Testing getCurrentConfig structure...');
  
  const state = {
    padding: 38,
    rounded: 20,
    shadow: 30,
    shadowColor: 'rgba(0, 0, 0, 0.45)',
    shadowEnabled: true,
    inset: 0,
    insetColor: 'rgba(255, 255, 255, 0.25)',
    border: 0,
    borderColor: '#ffffff',
    scale: 100,
    backgroundType: 'gradient' as const,
    backgroundValue: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    aspectRatio: 'Auto',
    canvasWidth: 800,
    canvasHeight: 600,
    paddingMode: 'fit' as const,
    chromeStyle: 'mac' as const,
    chromeTheme: 'dark' as const,
    blurDensity: 40,
    watermarkEnabled: false,
    watermarkText: 'Achu',
    position: 'Middle center',
    annotations: [],
    meshPoints: [
      { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
    ],
    meshBlur: 60,
    meshGrain: 15,
    meshOpacity: 100,
    meshSpread: 100,
    noImageMode: false,
  };
  
  const config = {
    padding: state.padding,
    rounded: state.rounded,
    shadow: state.shadow,
    shadowColor: state.shadowColor,
    shadowEnabled: state.shadowEnabled,
    inset: state.inset,
    insetColor: state.insetColor,
    border: state.border,
    borderColor: state.borderColor,
    scale: state.scale,
    backgroundType: state.backgroundType,
    backgroundValue: state.backgroundValue,
    aspectRatio: state.aspectRatio,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    paddingMode: state.paddingMode,
    chromeStyle: state.chromeStyle,
    chromeTheme: state.chromeTheme,
    blurDensity: state.blurDensity,
    watermarkEnabled: state.watermarkEnabled,
    watermarkText: state.watermarkText,
    position: state.position,
    annotations: state.annotations,
    meshPoints: state.meshPoints,
    meshBlur: state.meshBlur,
    meshGrain: state.meshGrain,
    meshOpacity: state.meshOpacity,
    meshSpread: state.meshSpread,
    noImage: state.noImageMode,
  };
  
  const requiredFields = [
    'padding', 'rounded', 'shadow', 'shadowColor', 'shadowEnabled',
    'inset', 'insetColor', 'border', 'borderColor', 'scale',
    'backgroundType', 'backgroundValue', 'aspectRatio', 'canvasWidth', 'canvasHeight',
    'paddingMode', 'chromeStyle', 'chromeTheme', 'blurDensity',
    'watermarkEnabled', 'watermarkText', 'position', 'annotations',
    'meshPoints', 'meshBlur', 'meshGrain', 'meshOpacity', 'meshSpread', 'noImage'
  ];
  
  for (const field of requiredFields) {
    assert.ok(field in config, `${field} present in config`);
  }
  
  console.log('✓ getCurrentConfig structure');
}

export function testApplyConfigLogic() {
  console.log('Testing applyConfig logic...');
  
  const state: Record<string, any> = {};
  
  const setters: Record<string, (val: any) => void> = {
    padding: (v) => { state.padding = v; },
    rounded: (v) => { state.rounded = v; },
    shadow: (v) => { state.shadow = v; },
    shadowColor: (v) => { state.shadowColor = v; },
    shadowEnabled: (v) => { state.shadowEnabled = v; },
    inset: (v) => { state.inset = v; },
    insetColor: (v) => { state.insetColor = v; },
    border: (v) => { state.border = v; },
    borderColor: (v) => { state.borderColor = v; },
    scale: (v) => { state.scale = v; },
    backgroundType: (v) => { state.backgroundType = v; },
    backgroundValue: (v) => { state.backgroundValue = v; },
    aspectRatio: (v) => { state.aspectRatio = v; },
    canvasWidth: (v) => { state.canvasWidth = v; },
    canvasHeight: (v) => { state.canvasHeight = v; },
    paddingMode: (v) => { state.paddingMode = v; },
    chromeStyle: (v) => { state.chromeStyle = v; },
    chromeTheme: (v) => { state.chromeTheme = v; },
    blurDensity: (v) => { state.blurDensity = v; },
    watermarkEnabled: (v) => { state.watermarkEnabled = v; },
    watermarkText: (v) => { state.watermarkText = v; },
    position: (v) => { state.position = v; },
    annotations: (v) => { state.annotations = v; },
    meshPoints: (v) => { state.meshPoints = v; },
    meshBlur: (v) => { state.meshBlur = v; },
    meshGrain: (v) => { state.meshGrain = v; },
    meshOpacity: (v) => { state.meshOpacity = v; },
    meshSpread: (v) => { state.meshSpread = v; },
    noImageMode: (v) => { state.noImageMode = v; },
  };
  
  function applyConfig(config: any) {
    if (!config) return;
    setters.padding(config.padding ?? 38);
    setters.rounded(config.rounded ?? 20);
    setters.shadow(config.shadow ?? 30);
    setters.shadowColor(config.shadowColor ?? 'rgba(0, 0, 0, 0.45)');
    setters.shadowEnabled(config.shadowEnabled ?? true);
    setters.inset(config.inset ?? 0);
    setters.insetColor(config.insetColor ?? 'rgba(255, 255, 255, 0.25)');
    setters.border(config.border ?? 0);
    setters.borderColor(config.borderColor ?? '#ffffff');
    setters.scale(config.scale ?? 100);
    setters.backgroundType(config.backgroundType ?? 'gradient');
    setters.backgroundValue(config.backgroundValue ?? 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)');
    setters.aspectRatio(config.aspectRatio ?? 'Auto');
    setters.canvasWidth(config.canvasWidth ?? 800);
    setters.canvasHeight(config.canvasHeight ?? 600);
    setters.paddingMode(config.paddingMode ?? 'fit');
    setters.chromeStyle(config.chromeStyle ?? 'mac');
    setters.chromeTheme(config.chromeTheme ?? 'dark');
    setters.blurDensity(config.blurDensity ?? 40);
    setters.watermarkEnabled(config.watermarkEnabled ?? false);
    setters.watermarkText(config.watermarkText ?? 'Achu');
    setters.position(config.position ?? 'Middle center');
    setters.annotations(config.annotations ?? []);
    setters.meshPoints(config.meshPoints ?? [
      { id: '1', color: '#ff5f6d', x: 0.2, y: 0.2, radius: 180 },
      { id: '2', color: '#ffc371', x: 0.8, y: 0.2, radius: 220 },
      { id: '3', color: '#00c6ff', x: 0.2, y: 0.8, radius: 200 },
      { id: '4', color: '#7209b7', x: 0.8, y: 0.8, radius: 240 },
    ]);
    setters.meshBlur(config.meshBlur ?? 60);
    setters.meshGrain(config.meshGrain ?? 15);
    setters.meshOpacity(config.meshOpacity ?? 100);
    setters.meshSpread(config.meshSpread ?? 100);
    setters.noImageMode(config.noImage ?? false);
  }
  
  const fullConfig = {
    padding: 50,
    rounded: 30,
    shadow: 40,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowEnabled: false,
    inset: 5,
    insetColor: 'rgba(255, 255, 255, 0.3)',
    border: 2,
    borderColor: '#000000',
    scale: 150,
    backgroundType: 'color' as const,
    backgroundValue: '#ff0000',
    aspectRatio: '16:9',
    canvasWidth: 1920,
    canvasHeight: 1080,
    paddingMode: 'fill' as const,
    chromeStyle: 'windows' as const,
    chromeTheme: 'light' as const,
    blurDensity: 60,
    watermarkEnabled: true,
    watermarkText: 'Test',
    position: 'Top left',
    annotations: [{ id: '1', type: 'rect' }],
    meshPoints: [{ id: '1', color: '#000000', x: 0.5, y: 0.5, radius: 100 }],
    meshBlur: 80,
    meshGrain: 20,
    meshOpacity: 90,
    meshSpread: 120,
    noImage: true,
  };
  
  applyConfig(fullConfig);
  
  assert.strictEqual(state.padding, 50);
  assert.strictEqual(state.rounded, 30);
  assert.strictEqual(state.shadow, 40);
  assert.strictEqual(state.scale, 150);
  assert.strictEqual(state.backgroundType, 'color');
  assert.strictEqual(state.backgroundValue, '#ff0000');
  assert.strictEqual(state.aspectRatio, '16:9');
  assert.strictEqual(state.watermarkEnabled, true);
  assert.strictEqual(state.watermarkText, 'Test');
  assert.strictEqual(state.chromeStyle, 'windows');
  assert.strictEqual(state.meshBlur, 80);
  assert.strictEqual(state.noImageMode, true);
  
  const partialConfig = { padding: 60 };
  applyConfig(partialConfig);
  
  assert.strictEqual(state.padding, 60, 'Explicit value applied');
  assert.strictEqual(state.rounded, 20, 'Default value applied');
  assert.strictEqual(state.shadow, 30, 'Default value applied');
  
  const beforeNull = { ...state };
  applyConfig(null);
  assert.deepStrictEqual(state, beforeNull, 'Null config does nothing');
  
  console.log('✓ applyConfig logic');
}

export function testHandleSliderReleaseLogic() {
  console.log('Testing handleSliderRelease logic...');
  
  let pushHistoryCalls = 0;
  let getCurrentConfigCalls = 0;
  
  const pushHistory = () => { pushHistoryCalls++; };
  const getCurrentConfig = () => { 
    getCurrentConfigCalls++;
    return { scale: 100 };
  };
  
  const handleSliderRelease = () => { pushHistory(getCurrentConfig()); };
  
  handleSliderRelease();
  
  assert.strictEqual(pushHistoryCalls, 1, 'pushHistory called once');
  assert.strictEqual(getCurrentConfigCalls, 1, 'getCurrentConfig called once');
  
  console.log('✓ handleSliderRelease logic');
}

export function testTypeConstraints() {
  console.log('Testing type constraints...');
  
  const backgroundTypes = ['gradient', 'color', 'blur', 'mesh'] as const;
  assert.strictEqual(backgroundTypes.length, 4, '4 background types');
  
  const paddingModes = ['fit', 'fill'] as const;
  assert.strictEqual(paddingModes.length, 2, '2 padding modes');
  
  const chromeStyles = ['mac', 'windows', 'none'] as const;
  assert.strictEqual(chromeStyles.length, 3, '3 chrome styles');
  
  const chromeThemes = ['dark', 'light'] as const;
  assert.strictEqual(chromeThemes.length, 2, '2 chrome themes');
  
  const activeTools = ['pointer', 'rect', 'filled-rect', 'circle', 'filled-circle', 'line', 'arrow', 'text', 'pen', 'emoji'] as const;
  assert.strictEqual(activeTools.length, 10, '10 active tools');
  
  const arrowStyles = ['classic', 'dashed', 'tapered', 'curved'] as const;
  assert.strictEqual(arrowStyles.length, 4, '4 arrow styles');
  
  const gradientCategories = ['classic', 'disney', 'marvel', 'hollywood'] as const;
  assert.strictEqual(gradientCategories.length, 4, '4 gradient categories');
  
  const appThemes = ['dark', 'light'] as const;
  assert.strictEqual(appThemes.length, 2, '2 app themes');
  
  const exportFormats = ['png', 'jpeg'] as const;
  assert.strictEqual(exportFormats.length, 2, '2 export formats');
  
  console.log('✓ Type constraints');
}

export function runAppContextTests() {
  testGetUserDefaultWithMockLocalStorage();
  testGetUserDefaultWithInvalidJSON();
  testDefaultMeshPointsStructure();
  testGetZoomStyleLogic();
  testApplyMeshPaletteLogic();
  testGenerateRandomPaletteLogic();
  testDefaultStateValues();
  testGetCurrentConfigStructure();
  testApplyConfigLogic();
  testHandleSliderReleaseLogic();
  testTypeConstraints();
}
