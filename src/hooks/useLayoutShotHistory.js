import { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Layout+breakout shot history — crowdsourced weighted frequency per target.
 *
 * One-shot collection group query on `shots` filtered by layoutId+breakout.
 * Aggregates target bunkers with weighted frequency (hit=2, miss=1, unknown=0.5).
 *
 * Bootstrap threshold: < 20 total shots → picker shows all opponent bunkers.
 * After 20+ → top 6 by weighted freq, rest available via "+ Inne cele".
 *
 * @param {string} layoutId
 * @param {string|null} breakout - bunker name player broke to (required to query)
 * @returns {{ topShots: Array<{name,freq}>, totalShots: number, loading: boolean }}
 */
export function useLayoutShotHistory(layoutId, breakout) {
  const [topShots, setTopShots] = useState([]);
  const [totalShots, setTotalShots] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!layoutId || !breakout) {
      setTopShots([]);
      setTotalShots(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query(
      collectionGroup(db, 'shots'),
      where('layoutId', '==', layoutId),
      where('breakout', '==', breakout),
    );
    getDocs(q).then(snap => {
      if (cancelled) return;
      const WEIGHT = { hit: 2, miss: 1, unknown: 0.5 };
      const counts = {};
      snap.docs.forEach(d => {
        const s = d.data();
        if (!s.targetBunker) return;
        counts[s.targetBunker] = (counts[s.targetBunker] || 0) + (WEIGHT[s.result] || 0);
      });
      const sorted = Object.entries(counts)
        .map(([name, freq]) => ({ name, freq }))
        .sort((a, b) => b.freq - a.freq);
      setTopShots(sorted);
      setTotalShots(snap.size);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setTopShots([]);
      setTotalShots(0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [layoutId, breakout]);

  return { topShots, totalShots, loading };
}
