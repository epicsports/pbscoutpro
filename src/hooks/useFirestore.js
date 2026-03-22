import { useState, useEffect } from 'react';
import * as ds from '../services/dataService';

/** Subscribe to global teams collection */
export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = ds.subscribeTeams((data) => {
      setTeams(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { teams, loading };
}

/** Subscribe to tournaments collection */
export function useTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = ds.subscribeTournaments((data) => {
      setTournaments(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tournaments, loading };
}

/** Subscribe to scouted teams within a tournament */
export function useScoutedTeams(tournamentId) {
  const [scouted, setScouted] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) { setScouted([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeScoutedTeams(tournamentId, (data) => {
      setScouted(data);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId]);

  return { scouted, loading };
}

/** Subscribe to matches within a scouted team */
export function useMatches(tournamentId, scoutedId) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !scoutedId) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    const unsub = ds.subscribeMatches(tournamentId, scoutedId, (data) => {
      setMatches(data);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId, scoutedId]);

  return { matches, loading };
}

/** Subscribe to points within a match */
export function usePoints(tournamentId, scoutedId, matchId) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId || !scoutedId || !matchId) {
      setPoints([]); setLoading(false); return;
    }
    setLoading(true);
    const unsub = ds.subscribePoints(tournamentId, scoutedId, matchId, (data) => {
      setPoints(data);
      setLoading(false);
    });
    return unsub;
  }, [tournamentId, scoutedId, matchId]);

  return { points, loading };
}
