import { useState, useEffect } from 'react';
import * as ds from '../services/dataService';

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribePlayers(d => { setPlayers(d); setLoading(false); });
    return unsub;
  }, []);
  return { players, loading };
}

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const unsub = ds.subscribeTeams(d => { setTeams(d); setLoading(false); });
    return unsub;
  }, []);
  return { teams, loading };
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
