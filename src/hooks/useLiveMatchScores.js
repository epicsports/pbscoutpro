import { useState, useMemo, useEffect } from 'react';
import * as ds from '../services/dataService';
import { matchScore } from '../utils/helpers';

/**
 * useLiveMatchScores — subscribes to the points subcollection of each
 * non-closed match in the tournament view and reduces them to {a, b}
 * via the canonical matchScore helper. Closed matches use match.scoreA/B
 * directly (mergeMatchPoints already wrote them) so they're skipped here
 * to keep listener count low.
 *
 * Shared between ScoutTabContent + CoachTabContent — the original P0 Fix 1
 * (2026-04-24) landed it in ScoutTabContent, and CoachTabContent was left
 * behind as a known symmetry gap. This extraction closes the gap with one
 * source of truth.
 *
 * Why: Brief 9 Bug 2 (Option A, commit da36f49) deliberately stops
 * `savePoint` from writing match.scoreA/B during LIVE play to avoid the
 * coachUid-filtered subset race. Result: cards reading m.scoreA/B see 0
 * until end-of-match merge fires. This hook mirrors what MatchPage detail
 * does (matchScore from points) so cards agree with detail in real time.
 *
 * Listener lifecycle: unsubscribe on unmount AND when matchIds change
 * (tournament switch, division filter swap). Sorted-join key prevents
 * spurious re-subscribes on re-render order shuffles.
 *
 * @param {string} tournamentId
 * @param {string[]} matchIds — non-closed match ids to subscribe
 * @returns {Object<string, {score: {a:number,b:number}, count:number}>}
 */
export function useLiveMatchScores(tournamentId, matchIds) {
  const [scores, setScores] = useState({});
  const key = useMemo(() => [...matchIds].sort().join('|'), [matchIds]);

  useEffect(() => {
    if (!tournamentId || matchIds.length === 0) {
      setScores({});
      return;
    }
    const unsubs = matchIds.map(mid =>
      ds.subscribePoints(tournamentId, mid, (points) => {
        const score = matchScore(points);
        setScores(prev => ({
          ...prev,
          [mid]: { score, count: points.length },
        }));
      })
    );
    return () => unsubs.forEach(u => { try { u && u(); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, key]);

  return scores;
}
