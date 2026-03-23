import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, writeBatch, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Workspace base path ───
let _bp = null;
export function setBasePath(p) { _bp = p; }
function bp() { if (!_bp) throw new Error('Workspace not set'); return _bp; }

// ─── PLAYERS (global, workspace-scoped) ───
export function subscribePlayers(cb) {
  return onSnapshot(query(collection(db, bp(), 'players'), orderBy('name', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addPlayer(data) {
  const now = new Date().toISOString();
  const teamHistory = [];
  if (data.teamId) {
    teamHistory.push({ teamId: data.teamId, from: now, to: null });
  }
  return addDoc(collection(db, bp(), 'players'), {
    name: data.name || '',
    nickname: data.nickname || '',
    number: data.number || '',
    teamId: data.teamId || null,
    teamHistory, // [{teamId, from, to}] — tracks all team memberships
    age: data.age || null,
    favoriteBunker: data.favoriteBunker || null,
    pbliId: data.pbliId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updatePlayer(id, data) {
  return updateDoc(doc(db, bp(), 'players', id), { ...data, updatedAt: serverTimestamp() });
}

/** Change player's team with history tracking */
export async function changePlayerTeam(id, newTeamId, currentHistory = []) {
  const now = new Date().toISOString();
  const history = [...currentHistory];
  // Close current team membership
  const openEntry = history.find(h => h.to === null);
  if (openEntry) openEntry.to = now;
  // Open new membership (if newTeamId is not null)
  if (newTeamId) {
    history.push({ teamId: newTeamId, from: now, to: null });
  }
  return updateDoc(doc(db, bp(), 'players', id), {
    teamId: newTeamId,
    teamHistory: history,
    updatedAt: serverTimestamp(),
  });
}
export async function deletePlayer(id) {
  return deleteDoc(doc(db, bp(), 'players', id));
}

// ─── TEAMS ───
export function subscribeTeams(cb) {
  return onSnapshot(query(collection(db, bp(), 'teams'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTeam(data) {
  return addDoc(collection(db, bp(), 'teams'), {
    name: data.name,
    leagues: data.leagues || ['NXL'],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateTeam(id, data) {
  return updateDoc(doc(db, bp(), 'teams', id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTeam(id) {
  return deleteDoc(doc(db, bp(), 'teams', id));
}

// ─── TOURNAMENTS ───
export function subscribeTournaments(cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTournament(data) {
  return addDoc(collection(db, bp(), 'tournaments'), {
    name: data.name,
    league: data.league,
    year: data.year || new Date().getFullYear(),
    fieldImage: data.fieldImage || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateTournament(id, data) {
  return updateDoc(doc(db, bp(), 'tournaments', id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTournament(id) {
  const b = bp();
  const scSnap = await getDocs(collection(db, b, 'tournaments', id, 'scouted'));
  const batch = writeBatch(db);
  for (const sc of scSnap.docs) {
    const mSnap = await getDocs(collection(db, b, 'tournaments', id, 'scouted', sc.id, 'matches'));
    for (const m of mSnap.docs) {
      const pSnap = await getDocs(collection(db, b, 'tournaments', id, 'scouted', sc.id, 'matches', m.id, 'points'));
      pSnap.docs.forEach(p => batch.delete(p.ref));
      batch.delete(m.ref);
    }
    batch.delete(sc.ref);
  }
  batch.delete(doc(db, b, 'tournaments', id));
  return batch.commit();
}

// ─── SCOUTED TEAMS (within tournament) ───
export function subscribeScoutedTeams(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addScoutedTeam(tid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted'), {
    teamId: data.teamId,
    roster: data.roster || [], // player IDs for this tournament
    createdAt: serverTimestamp(),
  });
}
export async function updateScoutedTeam(tid, sid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid), { ...data, updatedAt: serverTimestamp() });
}
export async function removeScoutedTeam(tid, sid) {
  const b = bp();
  const mSnap = await getDocs(collection(db, b, 'tournaments', tid, 'scouted', sid, 'matches'));
  const batch = writeBatch(db);
  for (const m of mSnap.docs) {
    const pSnap = await getDocs(collection(db, b, 'tournaments', tid, 'scouted', sid, 'matches', m.id, 'points'));
    pSnap.docs.forEach(p => batch.delete(p.ref));
    batch.delete(m.ref);
  }
  batch.delete(doc(db, b, 'tournaments', tid, 'scouted', sid));
  return batch.commit();
}

// ─── MATCHES ───
export function subscribeMatches(tid, sid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addMatch(tid, sid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches'), {
    name: data.name,
    date: data.date || new Date().toISOString().slice(0, 10),
    opponentScoutedId: data.opponentScoutedId || null,
    linkedMatchId: data.linkedMatchId || null,
    createdAt: serverTimestamp(),
  });
}
export async function updateMatch(tid, sid, mid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteMatch(tid, sid, mid) {
  const b = bp();
  const pSnap = await getDocs(collection(db, b, 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points'));
  const batch = writeBatch(db);
  pSnap.docs.forEach(p => batch.delete(p.ref));
  batch.delete(doc(db, b, 'tournaments', tid, 'scouted', sid, 'matches', mid));
  return batch.commit();
}

// ─── POINTS ───
// Point data model:
// {
//   players: [{x,y}|null, ...] (5 slots),
//   shots: [[{x,y,isKill},...], ...] (5 slots),
//   assignments: [playerId|null, ...] (5 slots),
//   bumpStops: [{x,y,duration}|null, ...] (5 slots - snap/bump stop position),
//   eliminations: [boolean, ...] (5 slots - was player eliminated),
//   eliminationPositions: [{x,y}|null, ...] (5 slots - where eliminated on breakout),
//   outcome: 'win'|'loss'|'timeout'|null,
//   opponentData: { same structure for opponent team } | null,
//   order: timestamp,
// }
export function subscribePoints(tid, sid, mid, cb) {
  return onSnapshot(
    query(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points'), orderBy('order', 'asc')),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
export async function addPoint(tid, sid, mid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points'), {
    ...data,
    order: data.order || Date.now(),
    createdAt: serverTimestamp(),
  });
}
export async function updatePoint(tid, sid, mid, pid, data) {
  return updateDoc(
    doc(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points', pid),
    { ...data, updatedAt: serverTimestamp() }
  );
}
export async function deletePoint(tid, sid, mid, pid) {
  return deleteDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points', pid));
}
