import { useState, useEffect } from 'react';
import * as ds from '../services/dataService';

export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = ds.subscribePlayers(d => { setPlayers(d); setLoading(false); });
    return unsub;
  }, []);
  return { players, loading };
}

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = ds.subscribeTeams(d => { setTeams(d); setLoading(false); });
    return unsub;
  }, []);
  return { teams, loading };
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
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

export function useMatches(tournamentId, scoutedId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId || !scoutedId) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeMatches(tournamentId, scoutedId, d => { setMatches(d); setLoading(false); });
    return unsub;
  }, [tournamentId, scoutedId]);
  return { matches, loading };
}

export function usePoints(tournamentId, scoutedId, matchId) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!tournamentId || !scoutedId || !matchId) { setPoints([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribePoints(tournamentId, scoutedId, matchId, d => { setPoints(d); setLoading(false); });
    return unsub;
  }, [tournamentId, scoutedId, matchId]);
  return { points, loading };
}
