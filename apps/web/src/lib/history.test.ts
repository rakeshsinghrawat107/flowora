import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, createHistory, pushHistory, redoHistory, undoHistory } from './history';

describe('history stack', () => {
  it('undo/redo walk snapshots in order', () => {
    let h = createHistory('a');
    h = pushHistory(h, 'b');
    h = pushHistory(h, 'c');
    expect(h.present).toBe('c');
    expect(canUndo(h)).toBe(true);
    h = undoHistory(h);
    expect(h.present).toBe('b');
    h = undoHistory(h);
    expect(h.present).toBe('a');
    expect(canUndo(h)).toBe(false);
    h = redoHistory(h);
    expect(h.present).toBe('b');
    expect(canRedo(h)).toBe(true);
  });

  it('pushing after undo clears the future', () => {
    let h = createHistory(1);
    h = pushHistory(h, 2);
    h = undoHistory(h);
    h = pushHistory(h, 3);
    expect(h.present).toBe(3);
    expect(canRedo(h)).toBe(false);
  });

  it('caps the past at the given limit', () => {
    let h = createHistory(0);
    for (let i = 1; i <= 105; i++) h = pushHistory(h, i, 100);
    expect(h.past.length).toBe(100);
    expect(h.present).toBe(105);
  });

  it('undo/redo on an empty stack are no-ops', () => {
    const h = createHistory('x');
    expect(undoHistory(h)).toBe(h);
    expect(redoHistory(h)).toBe(h);
  });
});
