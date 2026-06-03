import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { captureException } from '../services/sentry';
import * as ds from '../services/dataService';
import { loadCatalogCache, saveCatalogCache } from '../services/catalogCache';

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
// Safety-net backstop only: the cache is primarily VERSION-gated — every
// catalog write bumps /meta/catalogVersion and that marker is read on every
// load (line 72), so any edit invalidates all caches instantly. The TTL only
// catches a write that somehow failed to bump the marker. The old 24h forced a
// ~3,541-read cold refetch (3,242 players + 298 teams) on every daily-active
// device EVERY day — ~90% of a user's daily reads and the Spark-cap breach
// driver (§ Cost projection 2026-05-31: read breach ~N=5 peak / ~N=10 typical).
// 30d makes cold-loads track actual catalog-edit cadence, not the clock →
// steady-state reads drop ~90%, pushing the breach to ~N=40-50+ teams.
// See docs/architecture/COST_PROJECTION_SPARK.md.
const CATALOG_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Version-gated, IndexedDB-cached load of a near-static GLOBAL catalog
// (players / teams). Reads ONLY the /meta/catalogVersion marker (1 read); on a
// version match within TTL, serves the cached docs → 0 catalog reads. On
// change / cache-miss / TTL-expiry, fetches the full global collection ONCE,
// refreshes the cache, and serves. Replaces the old dual full-collection
// onSnapshot (global + ws twin, ~6,484 reads/cold-load). `fetchDocs` is a
// stable module function. Global is complete (ws-only = 0) so global-only is
// loss-free; a full re-fetch on version change covers deletes (no tombstones).
function useGatedCatalog(kind, fetchDocs) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [version, cached] = await Promise.all([ds.getCatalogVersion(), loadCatalogCache(kind)]);
        // `cached.docs?.length` guards against serving a POISONED empty cache as
        // fresh: the catalog (players/teams) is never legitimately empty in prod,
        // so an empty cached set means a prior write stored a bad fetch — never
        // honor it for the 30d TTL; fall through to a re-fetch. P1 triage 2026-06-02.
        const fresh = cached && cached.docs?.length && version != null && cached.version === version
          && (Date.now() - (cached.ts || 0)) < CATALOG_TTL_MS;
        if (fresh) {
          if (!cancelled) { setDocs(cached.docs); setLoading(false); }
          return;
        }
        const fetched = await fetchDocs();
        if (!cancelled) { setDocs(fetched); setLoading(false); }
        // Only cache a non-empty fetch — a transient empty result must not
        // poison the version-gated cache (would strand teams/players empty).
        if (fetched.length) saveCatalogCache(kind, version, fetched); // fire-and-forget
      } catch (e) {
        // Serve stale cache on fetch error if we have one; else surface error.
        const cached = await loadCatalogCache(kind).catch(() => null);
        if (cancelled) return;
        if (cached?.docs) { setDocs(cached.docs); setLoading(false); }
        else { setError(e); setLoading(false); captureException(e, { tags: { hook: 'catalog', kind } }); }
      }
    })();
    return () => { cancelled = true; };
  }, [kind, fetchDocs]);
  return { docs, loading, error };
}

export function usePlayers() {
  const { docs, loading, error } = useGatedCatalog('players', ds.getCatalogPlayersOnce);
  const players = useMemo(() => mergeByClass(docs, []), [docs]);

  // Alias-aware lookup map. Stored player IDs (in point.assignments[],
  // point.selfLogs[playerId], URL route params, etc.) may reference legacy doc
  // IDs collapsed into aliasIds[] of a canonical doc during Phase 2.2.a. This
  // map makes both forms resolve to the canonical player.
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
  const { docs, loading, error } = useGatedCatalog('teams', ds.getCatalogTeamsOnce);
  const teams = useMemo(() => mergeByClass(docs, []), [docs]);
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

// § 96 — a workspace's effective layouts = its overlays joined to the global
// base library by id (overlay id == base id). BASE contributes geometry
// (bunkers, fieldImage, calibration, field dims, league/year); OVERLAY
// contributes zones, an optional name override, and (via subcollections)
// tactics/insights. The join is explicit (not a blind spread) so base
// ordering/timestamps survive and only overlay-owned keys override. Downstream
// readers (resolveField, resolveZones, BunkerEditor, MatchPage, …) keep getting
// a single merged layout object — unchanged.
export function useLayouts() {
  const [bases, setBases] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [loadingB, setLoadingB] = useState(true);
  const [loadingO, setLoadingO] = useState(true);
  useEffect(() => {
    const u1 = ds.subscribeBaseLayouts(d => { setBases(d); setLoadingB(false); });
    const u2 = ds.subscribeLayoutOverlays(d => { setOverlays(d); setLoadingO(false); });
    return () => { u1(); u2(); };
  }, []);
  const layouts = useMemo(() => {
    const baseById = new Map(bases.map(b => [b.id, b]));
    return overlays
      .map(o => {
        const base = baseById.get(o.baseLayoutId || o.id);
        if (!base) return null;          // orphan overlay (base deleted) — hide
        // § b2 — per-workspace bunker DISPLAY override, name-keyed
        // { [basePositionName]: workspaceName }. Migrate legacy id-keyed
        // `bunkerNames` on read (id→positionName via base bunkers); name-keyed
        // wins. Resolved at display ONLY — base.positionName is NEVER overwritten
        // (canonical identity that all matchers/persisted docs/breakoutVariants
        // keep using). Attached as an additive `displayName` per bunker so every
        // object-consumer (canvas/PPT/self-log) shows the workspace name; writers
        // (LayoutDetailPage geometry-save) MUST strip displayName before writing
        // base, and `positionName` stays raw so identity never leaks.
        const bunkerNameOverrides = (() => {
          const legacy = o.bunkerNames || {};
          const named = o.bunkerNameOverrides || {};
          const out = {};
          (base.bunkers || []).forEach(b => {
            if (b.positionName && legacy[b.id]) out[b.positionName] = legacy[b.id];
          });
          return { ...out, ...named };
        })();
        const resolvedBunkers = (base.bunkers || []).map(b => ({
          ...b,
          displayName: bunkerNameOverrides[b.positionName] || b.positionName || b.name || '',
        }));
        return {
          ...base,
          bunkers: resolvedBunkers,        // § b2 — carry displayName (positionName raw)
          zones: o.zones || [],
          dangerZone: o.dangerZone ?? null,
          sajgonZone: o.sajgonZone ?? null,
          bigMoveZone: o.bigMoveZone ?? null,
          // § 98 — the 2 field-division thresholds relocate from BASE to the
          // per-team OVERLAY (lineDivision). Merged transparently so the whole
          // insights/stats/attribution pipeline keeps reading field.discoLine /
          // field.zeekerLine unchanged (via helpers.resolveField → layout.*).
          // Fallback to the base scalar until an overlay is seeded (§88-style
          // read-time fallback). Internal keys disco/zeeker preserved for stats.
          discoLine: o.lineDivision?.disco?.y ?? base.discoLine,
          zeekerLine: o.lineDivision?.zeeker?.y ?? base.zeekerLine,
          lineDivision: o.lineDivision ?? null,
          lines: o.lines || [],          // § 98 callout lines (0..N, display-only)
          bunkerNames: o.bunkerNames || {}, // § 98 per-team bunker callouts —
          // NOT applied onto base.bunkers here: doing so masked the super_admin
          // base editor (it showed/saved the per-team name → base corruption +
          // "edits don't stick"). The per-team name is applied at the
          // layout-config DISPLAY layer (LayoutDetailPage) instead; base geometry
          // stays raw everywhere it's edited.
          // § b2 — name-keyed override map (computed above); exposed for
          // string-only consumers that hold a stored bunker NAME (not a bunker
          // object): `resolve = layout.bunkerNameOverrides[name] ?? name`.
          bunkerNameOverrides,
          name: o.nameOverride || base.name,
          baseLayoutId: base.id,
          id: base.id,                   // stable: == tournament.layoutId
        };
      })
      .filter(Boolean);
  }, [bases, overlays]);
  return { layouts, loading: loadingB || loadingO };
}

// § 96 — the full global base library (for "browse → add to workspace").
export function useBaseLayouts() {
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = ds.subscribeBaseLayouts(d => { setBases(d); setLoading(false); });
    return unsub;
  }, []);
  return { bases, loading };
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
