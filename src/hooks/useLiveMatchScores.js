import { useState, useMemo, useEffect } from 'react';
import * as ds from '../services/dataService';
import { matchScore } from '../utils/helpers';

/**
 * useLiveMatchScores — subscribes to the points subcollection of each
 * non-closed match/matchup in the parent view and reduces them to {a, b}
 * via the canonical matchScore helper. Closed matches use match.scoreA/B
 * directly (mergeMatchPoints already wrote them) so they're skipped here
 * to keep listener count low.
 *
 * Shared between ScoutTabContent + CoachTabContent (tournament path) +
 * TrainingScoutTab (training path, added Hotfix #6 2026-04-29 to fix
 * matchup card score regression — Brief 9 Bug 2 Option A also defers
 * matchup.scoreA/B writes for trainings, same race avoidance, same
 * 0:0 symptom).
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
 * @param {string} parentId — tournamentId (default subscribeFn) or trainingId
 * @param {string[]} matchIds — non-closed match/matchup ids to subscribe
 * @param {Function} [subscribeFn=ds.subscribePoints] — subscription factory
 *        signature `(parentId, matchId, callback) => unsub`. Pass
 *        `ds.subscribeTrainingPoints` for training matchups; default is the
 *        tournament path for backward compat with existing callers.
 * @returns {Object<string, {score: {a:number,b:number}, count:number}>}
 */
export function useLiveMatchScores(parentId, matchIds, subscribeFn = ds.subscribePoints) {
  const [scores, setScores] = useState({});
  const key = useMemo(() => [...matchIds].sort().join('|'), [matchIds]);

  useEffect(() => {
    if (!parentId || matchIds.length === 0) {
      setScores({});
      return;
    }
    const unsubs = matchIds.map(mid =>
      subscribeFn(parentId, mid, (points) => {
        const score = matchScore(points);
        setScores(prev => ({
          ...prev,
          [mid]: { score, count: points.length },
        }));
      })
    );
    return () => unsubs.forEach(u => { try { u && u(); } catch {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, key, subscribeFn]);

  return scores;
}
