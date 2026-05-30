import * as assert from 'assert';

export function testSaveCustomPresetLogic() {
  console.log('Testing saveCustomPreset logic...');
  const presets: any[] = [];
  const newPresetName = '  ';
  if (newPresetName.trim()) {
    presets.push({ id: 'x', name: newPresetName });
  }
  assert.strictEqual(presets.length, 0, 'Blank name should not save preset');

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

export function testDeleteCustomPresetLogic() {
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

export function testSelectBackgroundPresetLogic() {
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

export function runPresetLogicTests() {
  testSaveCustomPresetLogic();
  testDeleteCustomPresetLogic();
  testSelectBackgroundPresetLogic();
}
