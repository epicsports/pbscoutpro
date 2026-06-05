import { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

/**
 * Player's personal breakout history — aggregated from self-log shot docs.
 *
 * One-shot query (not real-time) against `shots` collection group filtered by
 * `playerLinkedUid == auth.currentUser.uid` — the caller's OWN self-log shots.
 *
 * § read-volume C 2.1 — keyed on playerLinkedUid (not playerId) so the
 * shots-CG player carve-out rule (`resource.data.playerLinkedUid == auth.uid`)
 * is query-provable without workspace membership. This is a self-only view
 * (HotSheet renders the signed-in player's history), so own-uid is the correct
 * and tightest scope; the `playerId` arg now only gates whether a player
 * context exists to render.
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
    const uid = auth.currentUser?.uid;
    if (!playerId || !uid) {
      setHistory([]);
      setTotalLogs(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query(
      collectionGroup(db, 'shots'),
      where('playerLinkedUid', '==', uid),
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
