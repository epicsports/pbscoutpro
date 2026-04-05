import { useState, useCallback } from 'react';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];

/**
 * usePlayerEditor — reusable player editing state.
 * Used by MatchPage and (future) TacticPage.
 */
export function usePlayerEditor() {
  const [players, setPlayers] = useState(E5());
  const [assign, setAssign] = useState(E5());
  const [elim, setElim] = useState(E5B());
  const [elimPos, setElimPos] = useState(E5());
  const [shots, setShots] = useState(E5A());
  const [bumps, setBumps] = useState(E5());
  const [penalty, setPenalty] = useState('');

  const getDraft = () => ({ players, shots, assign, bumps, elim, elimPos, penalty });

  const setDraft = (updater) => {
    const prev = getDraft();
    const next = typeof updater === 'function' ? updater(prev) : updater;
    setPlayers(next.players);
    setAssign(next.assign);
    setElim(next.elim);
    setElimPos(next.elimPos);
    setShots(next.shots);
    setBumps(next.bumps);
    if (next.penalty !== undefined) setPenalty(next.penalty);
  };

  const placePlayer = useCallback((idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  }, []);

  const movePlayer = useCallback((idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  }, []);

  const removePlayer = useCallback((idx) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = null; return n; });
    setShots(prev => { const n = [...prev]; n[idx] = []; return n; });
    setElim(prev => { const n = [...prev]; n[idx] = false; return n; });
    setAssign(prev => { const n = [...prev]; n[idx] = null; return n; });
    setBumps(prev => { const n = [...prev]; n[idx] = null; return n; });
  }, []);

  const toggleElim = useCallback((idx) => {
    setElim(prev => { const n = [...prev]; n[idx] = !n[idx]; return n; });
  }, []);

  const addShot = useCallback((playerIdx, pos) => {
    setShots(prev => { const n = [...prev]; n[playerIdx] = [...(n[playerIdx] || []), pos]; return n; });
  }, []);

  const removeLastShot = useCallback((playerIdx) => {
    setShots(prev => { const n = [...prev]; n[playerIdx] = (n[playerIdx] || []).slice(0, -1); return n; });
  }, []);

  const setBump = useCallback((idx, fromPos) => {
    setBumps(prev => { const n = [...prev]; n[idx] = fromPos; return n; });
  }, []);

  const assignPlayer = useCallback((slotIdx, rosterId) => {
    setAssign(prev => { const n = [...prev]; n[slotIdx] = rosterId; return n; });
  }, []);

  const swapAssign = useCallback((slotA, slotB) => {
    setAssign(prev => {
      const n = [...prev];
      const tmp = n[slotA]; n[slotA] = n[slotB]; n[slotB] = tmp;
      return n;
    });
  }, []);

  const reset = useCallback(() => {
    setPlayers(E5()); setAssign(E5()); setElim(E5B());
    setElimPos(E5()); setShots(E5A()); setBumps(E5()); setPenalty('');
  }, []);

  const placedCount = players.filter(Boolean).length;
  const nextEmptySlot = players.findIndex(p => p === null);

  return {
    players, assign, elim, elimPos, shots, bumps, penalty,
    getDraft, setDraft,
    placePlayer, movePlayer, removePlayer,
    toggleElim, addShot, removeLastShot, setBump,
    assignPlayer, swapAssign, reset,
    placedCount, nextEmptySlot,
  };
}
