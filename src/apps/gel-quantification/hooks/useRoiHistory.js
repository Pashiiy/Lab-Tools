import { useCallback, useState } from 'react';

/**
 * Undo/redo for ROI document state only — never touches pixel data.
 *
 * @template T
 * @param {() => T} createInitial
 */
export function useRoiHistory(createInitial) {
  const [state, setState] = useState(() => ({
    past: [],
    present: createInitial(),
    future: [],
  }));

  const commit = useCallback((nextOrUpdater) => {
    setState((s) => {
      const next =
        typeof nextOrUpdater === 'function' ? nextOrUpdater(s.present) : nextOrUpdater;
      if (next === s.present) return s;
      return {
        past: [...s.past, s.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const replace = useCallback((next) => {
    setState((s) => ({ ...s, present: next, future: [] }));
  }, []);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: previous,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((next) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  return {
    present: state.present,
    commit,
    replace,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
