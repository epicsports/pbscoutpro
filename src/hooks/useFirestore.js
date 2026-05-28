import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { captureException } from '../services/sentry';
import * as ds from '../services/dataService';
import { useWorkspace } from './useWorkspace';

// § 90 Phase 2.2.d Stage 1 — merge the global catalog with the active
// workspace's local subcollection, deduped by doc id. Class-correct preference
// on collision: a pbliId entity (catalog) prefers its GLOBAL copy; a no-pbliId
// entity (workspace-local) prefers its WORKSPACE copy. Today every doc is
// twinned in both, so the merged result equals the global view; this becomes
// load-bearing once Stage 2 writers route by pbliId and Stage 3 splits the homes.
function mergeByClass(globalDocs, wsDocs) {
  const byId = new Map();
  for (const d of wsDocs) byId.set(d.id, { ws: d });
  for (const d of globalDocs) {
    const e = byId.get(d.id) || {};
    e.global = d;
    byId.set(d.id, e);
  }
  const out = [];
  for (const e of byId.values()) {
    if (e.global && e.ws) {
      const isPbli = !!(e.global.pbliId || e.ws.pbliId);
      out.push(isPbli ? e.global : e.ws);
    } else {
      out.push(e.global || e.ws);
    }
  }
  out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return out;
}

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
  const { workspace } = useWorkspace();
  const activeSlug = workspace?.slug || null;

  const [globalDocs, setGlobalDocs] = useState([]);
  const [wsDocs, setWsDocs] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingWs, setLoadingWs] = useState(!!activeSlug);
  const [error, setError] = useState(null);

  // Global catalog listener (always on).
  useEffect(() => {
    setLoadingGlobal(true);
    const q = query(collection(db, 'players'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setGlobalDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingGlobal(false);
    }, err => {
      console.error('usePlayers global fetch failed:', err);
      captureException(err, { tags: { hook: 'usePlayers', half: 'global' } });
      setError(err);
      setLoadingGlobal(false);
    });
    return unsub;
  }, []);

  // Workspace-local listener (gated on the active workspace; re-subscribes and
  // cleans up the prior listener when the active slug changes — no leaks).
  // A failure here degrades gracefully to the global catalog (no `error` set).
  useEffect(() => {
    if (!activeSlug) { setWsDocs([]); setLoadingWs(false); return undefined; }
    setLoadingWs(true);
    const q = query(collection(db, 'workspaces', activeSlug, 'players'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setWsDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingWs(false);
    }, err => {
      console.error('usePlayers workspace fetch failed:', err);
      captureException(err, { tags: { hook: 'usePlayers', half: 'workspace' } });
      setLoadingWs(false);
    });
    return unsub;
  }, [activeSlug]);

  const players = useMemo(() => mergeByClass(globalDocs, wsDocs), [globalDocs, wsDocs]);

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

  return { players, playersById, loading: loadingGlobal || loadingWs, error };
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
  const { workspace } = useWorkspace();
  const activeSlug = workspace?.slug || null;

  const [globalDocs, setGlobalDocs] = useState([]);
  const [wsDocs, setWsDocs] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingWs, setLoadingWs] = useState(!!activeSlug);
  const [error, setError] = useState(null);

  // Global catalog listener (always on).
  useEffect(() => {
    setLoadingGlobal(true);
    const q = query(collection(db, 'teams'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setGlobalDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingGlobal(false);
    }, err => {
      console.error('useTeams global fetch failed:', err);
      captureException(err, { tags: { hook: 'useTeams', half: 'global' } });
      setError(err);
      setLoadingGlobal(false);
    });
    return unsub;
  }, []);

  // Workspace-local listener (gated on the active workspace; cleans up on slug
  // change). Failure degrades gracefully to the global catalog (no `error` set).
  useEffect(() => {
    if (!activeSlug) { setWsDocs([]); setLoadingWs(false); return undefined; }
    setLoadingWs(true);
    const q = query(collection(db, 'workspaces', activeSlug, 'teams'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setWsDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingWs(false);
    }, err => {
      console.error('useTeams workspace fetch failed:', err);
      captureException(err, { tags: { hook: 'useTeams', half: 'workspace' } });
      setLoadingWs(false);
    });
    return unsub;
  }, [activeSlug]);

  const teams = useMemo(() => mergeByClass(globalDocs, wsDocs), [globalDocs, wsDocs]);

  const teamsById = useMemo(() => {
    const map = {};
    for (const t of teams) map[t.id] = t;
    return map;
  }, [teams]);

  return { teams, teamsById, loading: loadingGlobal || loadingWs, error };
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

// Cross-type event list (Model C — § 69). Reads /events_index/ via
// subscribeEventsIndex — every tournament, sparing, practice and training in
// one list, sorted by event date desc (nulls last). Optional eventType
// filter. The existing useTournaments / useTrainings hooks are untouched —
// this is a purely additive read surface (no consumer yet; PPT-picker
// rewiring is a separate follow-up).
export function useEvents({ eventType = null } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribeEventsIndex(all => {
      const sorted = [...all].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      });
      setEvents(sorted);
      setLoading(false);
    });
    return unsub;
  }, []);
  const filtered = useMemo(
    () => (eventType ? events.filter(e => e.eventType === eventType) : events),
    [events, eventType],
  );
  return { events: filtered, loading };
}
