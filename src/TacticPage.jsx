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
export function usePoints(tournamentId, matchId) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId || !matchId) { setPoints([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribePoints(tournamentId, matchId, d => { setPoints(d); setLoading(false); });
    return unsub;
  }, [tournamentId, matchId]);
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
