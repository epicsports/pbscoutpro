import { useCallback, useState } from 'react';

// Per-coach point index counter for deterministic point doc IDs
// (Brief 8 Problem B). Persisted to localStorage keyed by (matchKey, uid) so
// a browser refresh mid-match preserves the counter — zero Firestore round-trips
// and no shared-counter race by construction.
//
// matchKey = tournament match id OR training matchup id (caller decides).
// Counter starts at 0; reserveNext() returns the next integer (1-based).
export function useCoachPointCounter(matchKey, uid) {
  const storageKey = matchKey && uid ? `pbscoutpro_counter_${matchKey}_${uid}` : null;
  const [counter, setCounter] = useState(() => {
    if (!storageKey || typeof window === 'undefined') return 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch { return 0; }
  });

  const reserveNext = useCallback(() => {
    const next = counter + 1;
    setCounter(next);
    if (storageKey && typeof window !== 'undefined') {
      try { window.localStorage.setItem(storageKey, String(next)); } catch { /* quota / privacy mode */ }
    }
    return next;
  }, [counter, storageKey]);

  return { counter, reserveNext };
}
