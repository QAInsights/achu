import { describe, it, expect } from 'vitest';

describe('History', () => {
  it('handles push/undo/redo logic', () => {
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
    expect(historyIndex).toBe(2);

    handleUndo();
    expect(applied.scale).toBe(80);
    expect(historyIndex).toBe(1);

    handleUndo();
    expect(applied.scale).toBe(100);
    expect(historyIndex).toBe(0);

    handleUndo();
    expect(historyIndex).toBe(0);

    handleRedo();
    expect(applied.scale).toBe(80);

    pushHistory({ scale: 50 });
    expect(history.length).toBe(3);
    expect(history[2].scale).toBe(50);

    handleRedo();
    expect(historyIndex).toBe(2);
  });

  it('caps history at 50 entries', () => {
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
    expect(history.length).toBeLessThanOrEqual(50);
    expect(history[history.length - 1].scale).toBe(54);
  });
});
