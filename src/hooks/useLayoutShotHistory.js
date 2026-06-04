import { useState, useEffect } from 'react';
import { getLayoutAggregate } from '../services/dataService';

/**
 * Layout+breakout shot history — crowdsourced weighted frequency per target.
 *
 * § read-volume C 1.2 — reads the precomputed /layoutAggregates/{layoutId} doc
 * (ONE read) instead of a cross-tenant collectionGroup('shots') sweep. Weighted
 * frequency (hit=2, miss=1, unknown=0.5) computed at read-time from the stored
 * per-target {h,m,u} counts. Parity-identical to the prior CG aggregation.
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
    getLayoutAggregate(layoutId).then(agg => {
      if (cancelled) return;
      const s = agg?.shots?.[breakout];
      const t = s?.t || {};
      const sorted = Object.entries(t)
        .map(([name, c]) => ({ name, freq: (c.h || 0) * 2 + (c.m || 0) * 1 + (c.u || 0) * 0.5 }))
        .sort((a, b) => b.freq - a.freq);
      setTopShots(sorted);
      setTotalShots(s?.total || 0);
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
