/**
 * Pure undo/redo history stack. The editor store keeps snapshots of
 * `{ nodes, edges }` here; this module has no React or React Flow dependency
 * so it is unit-testable in isolation.
 */
export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_CAP = 100;

export function createHistory<T>(initial: T): HistoryState<T> {
  return { past: [], present: initial, future: [] };
}

/** Push a new present; the old present moves to past, future is cleared. */
export function pushHistory<T>(
  state: HistoryState<T>,
  next: T,
  cap = HISTORY_CAP,
): HistoryState<T> {
  const past = [...state.past, state.present];
  const trimmed = past.length > cap ? past.slice(past.length - cap) : past;
  return { past: trimmed, present: next, future: [] };
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const previous = state.past[state.past.length - 1];
  if (previous === undefined) return state;
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  const next = state.future[0];
  if (next === undefined) return state;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}

export function canUndo<T>(state: HistoryState<T>): boolean {
  return state.past.length > 0;
}

export function canRedo<T>(state: HistoryState<T>): boolean {
  return state.future.length > 0;
}
