import { useState, useCallback, useRef } from 'react';

/**
 * useUndo — tracks state changes and allows reverting.
 * Keeps last `maxHistory` snapshots.
 *
 * Usage:
 *   const { push, undo, canUndo } = useUndo();
 *   // Before mutating state:
 *   push({ players: [...players], shots: [...shots] });
 *   // To undo:
 *   const prev = undo(); // returns last snapshot or null
 */
export function useUndo(maxHistory = 10) {
  const stackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  const push = useCallback((snapshot) => {
    stackRef.current = [...stackRef.current.slice(-(maxHistory - 1)), JSON.parse(JSON.stringify(snapshot))];
    setCanUndo(true);
  }, [maxHistory]);

  const undo = useCallback(() => {
    if (!stackRef.current.length) return null;
    const prev = stackRef.current.pop();
    setCanUndo(stackRef.current.length > 0);
    return prev;
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    setCanUndo(false);
  }, []);

  return { push, undo, canUndo, clear };
}
