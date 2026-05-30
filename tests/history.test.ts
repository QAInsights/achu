import * as assert from 'assert';

export function testHistoryPushAndUndo() {
  console.log('Testing history push/undo/redo logic...');
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

  handleUndo();
  assert.strictEqual(historyIndex, 0);

  handleRedo();
  assert.strictEqual(applied.scale, 80);

  pushHistory({ scale: 50 });
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[2].scale, 50);

  handleRedo();
  assert.strictEqual(historyIndex, 2);
  console.log('✓ History push/undo/redo logic');
}

export function testHistoryMaxSize() {
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

export function runHistoryTests() {
  testHistoryPushAndUndo();
  testHistoryMaxSize();
}
