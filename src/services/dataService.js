import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';

/*
 * All paths scoped under /workspaces/{slug}/...
 * setBasePath() must be called before any operation.
 */

let _basePath = null;
export function setBasePath(path) { _basePath = path; }
function bp() {
  if (!_basePath) throw new Error('Workspace not set');
  return _basePath;
}

// ─── TEAMS ───
export function subscribeTeams(cb) {
  return onSnapshot(query(collection(db, bp(), 'teams'), orderBy('createdAt', 'asc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTeam(data) {
  return addDoc(collection(db, bp(), 'teams'), { name: data.name, leagues: data.leagues || ['NXL'], players: data.players || [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function updateTeam(id, data) {
  return updateDoc(doc(db, bp(), 'teams', id), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTeam(id) { return deleteDoc(doc(db, bp(), 'teams', id)); }

// ─── TOURNAMENTS ───
export function subscribeTournaments(cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments'), orderBy('createdAt', 'asc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTournament(data) {
  return addDoc(collection(db, bp(), 'tournaments'), { name: data.name, league: data.league, fieldImage: data.fieldImage || null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
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

// ─── SCOUTED TEAMS ───
export function subscribeScoutedTeams(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted'), orderBy('createdAt', 'asc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addScoutedTeam(tid, globalTeamId) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted'), { globalTeamId, createdAt: serverTimestamp() });
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
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches'), orderBy('createdAt', 'asc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addMatch(tid, sid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches'), { name: data.name, date: data.date || new Date().toISOString().slice(0, 10), createdAt: serverTimestamp() });
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
export function subscribePoints(tid, sid, mid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points'), orderBy('order', 'asc')), (s) => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addPoint(tid, sid, mid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points'), { players: data.players, shots: data.shots, assignments: data.assignments, outcome: data.outcome, order: data.order || Date.now(), createdAt: serverTimestamp() });
}
export async function updatePoint(tid, sid, mid, pid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points', pid), { ...data, updatedAt: serverTimestamp() });
}
export async function deletePoint(tid, sid, mid, pid) {
  return deleteDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid, 'matches', mid, 'points', pid));
}
