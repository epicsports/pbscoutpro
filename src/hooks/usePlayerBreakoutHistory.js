import { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Player's personal breakout history — aggregated from self-log shot docs.
 *
 * One-shot query (not real-time) against `shots` collection group filtered
 * by playerId. Aggregates distinct breakout bunkers with counts.
 *
 * Bootstrap threshold: < 5 distinct self-log shots → picker shows all
 * layout bunkers. After 5+ → top 5 from history.
 *
 * @param {string} playerId
 * @returns {{ playerBreakoutHistory: Array<{name,count}>, totalLogs: number, loading: boolean }}
 */
export function usePlayerBreakoutHistory(playerId) {
  const [history, setHistory] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setHistory([]);
      setTotalLogs(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query(
      collectionGroup(db, 'shots'),
      where('playerId', '==', playerId),
    );
    getDocs(q).then(snap => {
      if (cancelled) return;
      const counts = {};
      snap.docs.forEach(d => {
        const b = d.data().breakout;
        if (b) counts[b] = (counts[b] || 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setHistory(sorted);
      setTotalLogs(snap.size);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setHistory([]);
      setTotalLogs(0);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [playerId]);

  return { playerBreakoutHistory: history, totalLogs, loading };
}
