import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs, where,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Workspace base path ───
let _bp = null;
export function setBasePath(p) { _bp = p; }
function bp() { if (!_bp) throw new Error('Workspace not set'); return _bp; }

/*
 * ═══════════════════════════════════════════
 *  DATA MODEL v2 — Match-centric
 * ═══════════════════════════════════════════
 *
 * /workspaces/{slug}/players/{id}
 * /workspaces/{slug}/teams/{id}
 * /workspaces/{slug}/tournaments/{tid}
 * /workspaces/{slug}/tournaments/{tid}/scouted/{sid}    — team in tournament (roster)
 * /workspaces/{slug}/tournaments/{tid}/matches/{mid}    — match between 2 teams
 * /workspaces/{slug}/tournaments/{tid}/matches/{mid}/points/{pid}  — single point
 *
 * Match: { teamA, teamB, name, date, time, gameNumber }
 *   - teamA/teamB are scoutedIds (refs to /scouted/)
 *
 * Point: {
 *   teamA: { players, shots, assignments, bumps, elim, elimPos, penalty },
 *   teamB: { players, shots, assignments, bumps, elim, elimPos, penalty },
 *   outcome: 'win_a' | 'win_b' | 'timeout' | 'pending',
 *   order: timestamp,
 * }
 */

// Shots are stored as objects (Firestore doesn't allow nested arrays)
export const shotsToFirestore = (shots) => {
  const o = {};
  (shots || []).forEach((a, i) => { o[String(i)] = a || []; });
  return o;
};
export const shotsFromFirestore = (obj) => {
  if (Array.isArray(obj)) return obj;
  if (!obj) return [[], [], [], [], []];
  return [0, 1, 2, 3, 4].map(i => obj[String(i)] || []);
};

// ─── PLAYERS ───
export function subscribePlayers(cb) {
  return onSnapshot(query(collection(db, bp(), 'players'), orderBy('name', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addPlayer(data) {
  const now = new Date().toISOString();
  const teamHistory = [];
  if (data.teamId) teamHistory.push({ teamId: data.teamId, from: now, to: null });
  return addDoc(collection(db, bp(), 'players'), {
    name: data.name || '', nickname: data.nickname || '', number: data.number || '',
    teamId: data.teamId || null, teamHistory,
    age: data.age || null, favoriteBunker: data.favoriteBunker || null, pbliId: data.pbliId || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function updatePlayer(id, data) {
  return updateDoc(doc(db, bp(), 'players', id), { ...data, updatedAt: serverTimestamp() });
}
export async function changePlayerTeam(id, newTeamId, currentHistory = []) {
  const now = new Date().toISOString();
  const history = [...currentHistory];
  const open = history.find(h => h.to === null);
  if (open) open.to = now;
  if (newTeamId) history.push({ teamId: newTeamId, from: now, to: null });
  return updateDoc(doc(db, bp(), 'players', id), { teamId: newTeamId, teamHistory: history, updatedAt: serverTimestamp() });
}
export async function deletePlayer(id) { return deleteDoc(doc(db, bp(), 'players', id)); }

// ─── TEAMS ───
export function subscribeTeams(cb) {
  return onSnapshot(query(collection(db, bp(), 'teams'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTeam(data) {
  return addDoc(collection(db, bp(), 'teams'), {
    name: data.name, leagues: data.leagues || ['NXL'],
    parentTeamId: data.parentTeamId || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function updateTeam(id, data) { return updateDoc(doc(db, bp(), 'teams', id), { ...data, updatedAt: serverTimestamp() }); }
export async function deleteTeam(id) { return deleteDoc(doc(db, bp(), 'teams', id)); }

// ─── TOURNAMENTS ───
export function subscribeTournaments(cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTournament(data) {
  return addDoc(collection(db, bp(), 'tournaments'), {
    name: data.name, league: data.league, year: data.year || new Date().getFullYear(),
    fieldImage: data.fieldImage || null, location: data.location || null,
    division: data.division || null, divisions: data.divisions || [],
    layoutId: data.layoutId || null,
    date: data.date || null, rules: data.rules || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function updateTournament(id, data) { return updateDoc(doc(db, bp(), 'tournaments', id), { ...data, updatedAt: serverTimestamp() }); }
export async function deleteTournament(id) {
  const b = bp();
  const batch = writeBatch(db);
  // Delete scouted
  const scSnap = await getDocs(collection(db, b, 'tournaments', id, 'scouted'));
  scSnap.docs.forEach(d => batch.delete(d.ref));
  // Delete matches + points
  const mSnap = await getDocs(collection(db, b, 'tournaments', id, 'matches'));
  for (const m of mSnap.docs) {
    const pSnap = await getDocs(collection(db, b, 'tournaments', id, 'matches', m.id, 'points'));
    pSnap.docs.forEach(p => batch.delete(p.ref));
    batch.delete(m.ref);
  }
  batch.delete(doc(db, b, 'tournaments', id));
  return batch.commit();
}

// ─── SCOUTED TEAMS (tournament roster) ───
export function subscribeScoutedTeams(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addScoutedTeam(tid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted'), {
    teamId: data.teamId, division: data.division || null, roster: data.roster || [], createdAt: serverTimestamp(),
  });
}
export async function updateScoutedTeam(tid, sid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid), { ...data, updatedAt: serverTimestamp() });
}
export async function removeScoutedTeam(tid, sid) {
  // Note: matches reference scouted IDs but are at tournament level, so we don't delete them here
  return deleteDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid));
}

// ─── MATCHES (at tournament level) ───
export function subscribeMatches(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'matches'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addMatch(tid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'matches'), {
    teamA: data.teamA, // scoutedId
    teamB: data.teamB, // scoutedId
    name: data.name || '',
    division: data.division || null,
    date: data.date || new Date().toISOString().slice(0, 10),
    time: data.time || null,
    gameNumber: data.gameNumber || null,
    createdAt: serverTimestamp(),
  });
}
export async function updateMatch(tid, mid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteMatch(tid, mid) {
  const b = bp();
  const pSnap = await getDocs(collection(db, b, 'tournaments', tid, 'matches', mid, 'points'));
  const batch = writeBatch(db);
  pSnap.docs.forEach(p => batch.delete(p.ref));
  batch.delete(doc(db, b, 'tournaments', tid, 'matches', mid));
  return batch.commit();
}

// Fetch all points from multiple matches (for tournament heatmap)
export async function fetchPointsForMatches(tid, matchIds) {
  const allPoints = [];
  for (const mid of matchIds) {
    const snap = await getDocs(query(collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points'), orderBy('order', 'asc')));
    snap.docs.forEach(d => allPoints.push({ id: d.id, matchId: mid, ...d.data() }));
  }
  return allPoints;
}

/**
 * Fetch point counts for all matches in a tournament, grouped by scouted team.
 * Returns { [scoutedTeamId]: numberOfScoutedPoints }
 * Only matches with at least one score are queried (skips empty/scheduled).
 */
export async function fetchScoutedPointCounts(tid, matches, scouted) {
  const matchIds = matches
    .filter(m => (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0)
    .map(m => m.id);
  if (!matchIds.length) return {};

  const allPoints = await fetchPointsForMatches(tid, matchIds);
  const counts = {};
  scouted.forEach(st => { counts[st.id] = 0; });

  allPoints.forEach(pt => {
    const match = matches.find(m => m.id === pt.matchId);
    if (!match) return;
    const homeData = pt.homeData || pt.teamA || {};
    const awayData = pt.awayData || pt.teamB || {};
    if (homeData.players?.some(Boolean) && counts[match.teamA] !== undefined) counts[match.teamA]++;
    if (awayData.players?.some(Boolean) && counts[match.teamB] !== undefined) counts[match.teamB]++;
  });

  return counts;
}

// ─── POINTS (within match) ───
export function subscribePoints(tid, mid, cb) {
  return onSnapshot(
    query(collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points'), orderBy('order', 'asc')),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
export async function addPoint(tid, mid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points'), {
    ...data, order: data.order || Date.now(), createdAt: serverTimestamp(),
  });
}
export async function updatePoint(tid, mid, pid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid, 'points', pid), { ...data, updatedAt: serverTimestamp() });
}
export async function deletePoint(tid, mid, pid) {
  return deleteDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid, 'points', pid));
}

/**
 * Migrate old point format (teamA/teamB at top level) to new split format (homeData/awayData).
 * Safe to call on already-migrated points (returns as-is).
 */
export function migratePoint(point) {
  if (point.homeData) return point; // already new format
  const E5 = [null, null, null, null, null];
  const E5A = [[], [], [], [], []];
  return {
    ...point,
    homeData: {
      players: point.teamA?.players || E5,
      shots: point.teamA?.shots || E5A,
      assignments: point.teamA?.assignments || E5,
      bumpStops: point.teamA?.bumpStops || E5,
      eliminations: point.teamA?.eliminations || [],
      eliminationPositions: point.teamA?.eliminationPositions || [],
      penalty: point.teamA?.penalty || null,
    },
    awayData: {
      players: point.teamB?.players || E5,
      shots: point.teamB?.shots || E5A,
      assignments: point.teamB?.assignments || E5,
      bumpStops: point.teamB?.bumpStops || E5,
      eliminations: point.teamB?.eliminations || [],
      eliminationPositions: point.teamB?.eliminationPositions || [],
      penalty: point.teamB?.penalty || null,
    },
  };
}

// ─── LAYOUTS (central field layout library) ───
// Layout is the central entity. Tournaments reference layoutId.
// Layout: { name, league, year, fieldImage, discoLine, zeekerLine }
export function subscribeLayouts(cb) {
  return onSnapshot(query(collection(db, bp(), 'layouts'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addLayout(data) {
  return addDoc(collection(db, bp(), 'layouts'), {
    name: data.name, league: data.league || 'NXL', year: data.year || new Date().getFullYear(),
    fieldImage: data.fieldImage || null,
    discoLine: data.discoLine ?? 0.30, zeekerLine: data.zeekerLine ?? 0.80,
    bunkers: data.bunkers || [],
    dangerZone: data.dangerZone || null,
    sajgonZone: data.sajgonZone || null,
    mirrorMode: data.mirrorMode || 'y',
    doritoSide: data.doritoSide || 'top',
    createdAt: serverTimestamp(),
  });
}
export async function updateLayout(id, data) {
  return updateDoc(doc(db, bp(), 'layouts', id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteLayout(id) {
  return deleteDoc(doc(db, bp(), 'layouts', id));
}

/** Migrate old bunker format: copy name → positionName, run guessType → type */
export function migrateBunkers(bunkers, guessTypeFn) {
  if (!bunkers?.length) return [];
  return bunkers.map(b => {
    if (b.positionName !== undefined) return b; // already migrated
    return { ...b, positionName: b.name || '', type: b.type || guessTypeFn(b.name) };
  });
}

// ─── LAYOUT-LEVEL TACTICS (global, shared across tournaments) ───
export function subscribeLayoutTactics(layoutId, cb) {
  return onSnapshot(query(collection(db, bp(), 'layouts', layoutId, 'tactics'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addLayoutTactic(layoutId, data) {
  return addDoc(collection(db, bp(), 'layouts', layoutId, 'tactics'), {
    name: data.name,
    squadCode: data.squadCode || null,
    players: data.players || [null, null, null, null, null],
    shots: shotsToFirestore(data.shots),
    bumps: data.bumps || [null, null, null, null, null],
    myTeamId: data.myTeamId || null,
    createdAt: serverTimestamp(),
  });
}
export async function updateLayoutTactic(layoutId, tacId, data) {
  return updateDoc(doc(db, bp(), 'layouts', layoutId, 'tactics', tacId), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteLayoutTactic(layoutId, tacId) {
  return deleteDoc(doc(db, bp(), 'layouts', layoutId, 'tactics', tacId));
}

// ─── TOURNAMENT-LEVEL TACTICS ───
export function subscribeTactics(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'tactics'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTactic(tid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'tactics'), {
    name: data.name, myTeamScoutedId: data.myTeamScoutedId || null,
    steps: data.steps || [], freehandStrokes: data.freehandStrokes || null,
    createdAt: serverTimestamp(),
  });
}
export async function updateTactic(tid, tacId, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'tactics', tacId), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTactic(tid, tacId) {
  return deleteDoc(doc(db, bp(), 'tournaments', tid, 'tactics', tacId));
}

// ─── LAYOUT DEATHS AGGREGATION ───
export async function fetchLayoutDeaths(layoutId) {
  const tourSnap = await getDocs(query(collection(db, bp(), 'tournaments'), where('layoutId', '==', layoutId)));
  const allPoints = [];
  for (const tDoc of tourSnap.docs) {
    const tid = tDoc.id;
    const tName = tDoc.data().name || tid;
    const matchSnap = await getDocs(collection(db, bp(), 'tournaments', tid, 'matches'));
    for (const mDoc of matchSnap.docs) {
      const mid = mDoc.id;
      const mName = mDoc.data().name || mid;
      const pointSnap = await getDocs(collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points'));
      pointSnap.docs.forEach((pDoc, pi) => allPoints.push({
        ...pDoc.data(),
        _ctx: { tournament: tName, match: mName, pointIdx: pi + 1 },
      }));
    }
  }
  return allPoints;
}
