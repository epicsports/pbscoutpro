import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { captureException } from '../services/sentry';
import * as ds from '../services/dataService';

// Phase 2.2.b — usePlayers now reads from global /players/ (Option A,
// no workspace fallback per Jacek 2026-05-19). Aliases from Phase 2.2.a
// dedup (42 mappings) folded into playersById so legacy ID lookups
// resolve transparently to canonical doc.
//
// Returned shape:
//   players      — canonical array (934 docs, no doubles). Use for
//                  filter/map/length operations.
//   playersById  — map with BOTH canonical AND alias keys pointing to
//                  canonical doc. Use for ID lookups (e.g.
//                  point.assignments[i] may be canonical OR alias ID).
//   loading      — true while initial Firestore fetch in-flight
//   error        — Error|null from fetch (Sentry-captured)
//
// onSnapshot listener (not getDocs) so admin edits via Phase 2.2.c
// admin UI propagate to all consumers live without page reload.
export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'players'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('usePlayers fetch failed:', err);
      captureException(err, { tags: { hook: 'usePlayers' } });
      setError(err);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Alias-aware lookup map. Stored player IDs (in point.assignments[],
  // point.selfLogs[playerId], URL route params, etc.) may reference
  // legacy doc IDs that were collapsed into aliasIds[] of a canonical
  // doc during Phase 2.2.a. This map makes both forms resolve to the
  // canonical player.
  const playersById = useMemo(() => {
    const map = {};
    for (const p of players) {
      map[p.id] = p;
      if (Array.isArray(p.aliasIds)) {
        for (const alias of p.aliasIds) {
          if (alias) map[alias] = p;
        }
      }
    }
    return map;
  }, [players]);

  return { players, playersById, loading, error };
}

// Phase 2.3.b — useTeams now reads from global /teams/ (Option A,
// no workspace fallback per Jacek 2026-05-19, pattern proven by
// Phase 2.2.b). Phase 2.3.a bootstrap populated 132 docs; no alias
// resolution layer (Phase 2.3.a did NOT auto-dedup per § 63.15.2.X
// locked policy — externalId duplicates are admin-curation TODO via
// Phase 2.3.c).
//
// Returned shape (additive — existing { teams, loading } consumers
// keep working):
//   teams        — all global team docs sorted by name asc
//   teamsById    — O(1) lookup map; consumers replacing
//                  `teams.find(t => t.id === id)` with `teamsById[id]`.
//                  Specifically useful for parentTeamId resolution.
//   loading      — true while initial Firestore fetch in-flight
//   error        — Error|null from fetch (Sentry-captured)
//
// onSnapshot listener (not getDocs) so admin edits via Phase 2.3.c
// admin UI propagate to all consumers live without page reload.
export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => {
      console.error('useTeams fetch failed:', err);
      captureException(err, { tags: { hook: 'useTeams' } });
      setError(err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const teamsById = useMemo(() => {
    const map = {};
    for (const t of teams) map[t.id] = t;
    return map;
  }, [teams]);

  return { teams, teamsById, loading, error };
}

// Phase 2.3.c — useActiveTeams returns teams filtered by retiredAt == null
// for list/picker UI. teamsById preserves ALL teams (incl. retired) so
// spot lookups (MatchPage opponent display, PlayerStatsPage player.teamId
// resolution, etc.) still resolve correctly even if a team was retired
// after the data was written. AdminTeamsPage opts back into raw useTeams
// to see retired in admin context. Per § 63.15.2.X.1 default UI policy.
export function useActiveTeams() {
  const { teams, teamsById, loading, error } = useTeams();
  const activeTeams = useMemo(() => teams.filter(t => !t.retiredAt), [teams]);
  return { teams: activeTeams, teamsById, loading, error };
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribeTournaments(d => { setTournaments(d); setLoading(false); });
    return unsub;
  }, []);
  return { tournaments, loading };
}

export function useScoutedTeams(tournamentId) {
  const [scouted, setScouted] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId) { setScouted([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeScoutedTeams(tournamentId, d => { setScouted(d); setLoading(false); });
    return unsub;
  }, [tournamentId]);
  return { scouted, loading };
}

// v2: matches at tournament level (not under scouted team)
export function useMatches(tournamentId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeMatches(tournamentId, d => { setMatches(d); setLoading(false); });
    return unsub;
  }, [tournamentId]);
  return { matches, loading };
}

// v2: points under match (not under scouted/match)
// Brief 8 Problem B — opt-in per-coach filter via `currentUid` and post-merge
// canonical filter via `merged`. Default (no options) = all points, backward-compat.
// During match: docs with coachUid==currentUid OR missing coachUid (legacy grandfathered).
// Post-merge (match.merged=true): docs with canonical===true only.
// Filter is client-side to cover legacy docs missing coachUid (Firestore `in [uid,null]`
// does not match field-missing docs). Indexes deferred — point count per match is small.
export function usePoints(tournamentId, matchId, { currentUid = null, merged = false } = {}) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId || !matchId) { setPoints([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribePoints(tournamentId, matchId, all => {
      let filtered = all;
      if (merged) {
        filtered = all.filter(p => p.canonical === true);
      } else if (currentUid) {
        filtered = all.filter(p => !p.coachUid || p.coachUid === currentUid);
      }
      setPoints(filtered);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId, matchId, currentUid, merged]);
  return { points, loading };
}

export function useLayouts() {
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribeLayouts(d => { setLayouts(d); setLoading(false); });
    return unsub;
  }, []);
  return { layouts, loading };
}

export function useTactics(tournamentId) {
  const [tactics, setTactics] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId) { setTactics([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeTactics(tournamentId, d => { setTactics(d); setLoading(false); });
    return unsub;
  }, [tournamentId]);
  return { tactics, loading };
}

export function useTrainings() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribeTrainings(d => { setTrainings(d); setLoading(false); });
    return unsub;
  }, []);
  return { trainings, loading };
}

export function useMatchups(trainingId) {
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!trainingId) { setMatchups([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeMatchups(trainingId, d => { setMatchups(d); setLoading(false); });
    return unsub;
  }, [trainingId]);
  return { matchups, loading };
}

// Brief 8 Problem B — same opt-in filter semantics as usePoints. Training is
// solo-per-matchup (Blocker 3: opcja c) — schema consistent with tournament
// streams, but no merge step required; endMatchAndMerge single-coach branch
// marks canonical directly. Filter still applies for schema symmetry.
export function useTrainingPoints(trainingId, matchupId, { currentUid = null, merged = false } = {}) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!trainingId || !matchupId) { setPoints([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeTrainingPoints(trainingId, matchupId, all => {
      let filtered = all;
      if (merged) {
        filtered = all.filter(p => p.canonical === true);
      } else if (currentUid) {
        filtered = all.filter(p => !p.coachUid || p.coachUid === currentUid);
      }
      setPoints(filtered);
      setLoading(false);
    });
    return unsub;
  }, [trainingId, matchupId, currentUid, merged]);
  return { points, loading };
}

export function useLayoutTactics(layoutId) {
  const [tactics, setTactics] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!layoutId) { setTactics([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeLayoutTactics(layoutId, d => { setTactics(d); setLoading(false); });
    return unsub;
  }, [layoutId]);
  return { tactics, loading };
}

export function useNotes(tournamentId, scoutedId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId || !scoutedId) { setNotes([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeNotes(tournamentId, scoutedId, d => { setNotes(d); setLoading(false); });
    return unsub;
  }, [tournamentId, scoutedId]);
  return { notes, loading };
}

export function useLayoutInsights(layoutId) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!layoutId) { setInsights([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeLayoutInsights(layoutId, d => { setInsights(d); setLoading(false); });
    return unsub;
  }, [layoutId]);
  return { insights, loading };
}
