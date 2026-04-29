import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs, where,
  arrayUnion, arrayRemove, increment, collectionGroup, limit, runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizePbliId } from '../utils/roleUtils';
import { DEFAULT_WORKSPACE_SLUG, DEFAULT_USER_ROLES } from '../utils/constants';
import { buildDefaultSquadNames, squadDefaultName } from '../utils/squads';

// ─── USERS (global, not workspace-scoped) ───
// /users/{uid} — one profile per Firebase Auth user, created on first login.
//
// Canonical schema (§ 49 unified auth, 2026-04-23):
//   {
//     email, displayName,
//     workspaces: string[],         // slugs user has joined
//     roles: string[],              // GLOBAL role default — bootstrap for
//                                    // new users; authoritative role is
//                                    // workspace.userRoles[uid] once admin
//                                    // has assigned. Reader logic in
//                                    // useWorkspace prefers workspace-scoped
//                                    // roles when non-empty.
//     defaultWorkspace: string,     // auto-join pointer; user still enters
//                                    // workspace code at first login
//     createdAt
//   }
//
// The legacy singular `role: 'scout,coach,admin'` field was dropped in
// Brief G Option B (2026-04-22, § 33.1). `roles` (plural array) added
// fresh in § 49 — no overlap with the deprecated singular field.
export async function getOrCreateUserProfile(uid, email, displayName) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  const profile = {
    email: email || '',
    displayName: displayName || (email ? email.split('@')[0] : 'Scout'),
    workspaces: [],
    roles: [...DEFAULT_USER_ROLES],
    defaultWorkspace: DEFAULT_WORKSPACE_SLUG,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}




// ─── Workspace base path ───
let _bp = null;
export function setBasePath(p) { _bp = p; }
export function bp() { if (!_bp) throw new Error('Workspace not set'); return _bp; }

// ─── Shot serialization helpers (Firestore rejects nested arrays) ───
// Convert shots array-of-arrays to object { "0": [...], "1": [...], ... } for storage.
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

// Quick shots (zone-based: dorito/center/snake) stored sparsely per player slot.
export const quickShotsToFirestore = (arr) => {
  const obj = {};
  (arr || []).forEach((a, i) => {
    if (Array.isArray(a) && a.length) obj[String(i)] = a;
  });
  return obj;
};
export const quickShotsFromFirestore = (obj) => {
  if (Array.isArray(obj)) return obj;
  if (!obj) return [[], [], [], [], []];
  return [0, 1, 2, 3, 4].map(i => obj[String(i)] || []);
};

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
    playerClass: data.playerClass || null,
    role: data.role || 'player',
    nationality: data.nationality || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function updatePlayer(id, data) {
  return updateDoc(doc(db, bp(), 'players', id), { ...data, updatedAt: serverTimestamp() });
}
// HERO rank — global flag per player doc (§ 25).
export async function setPlayerHero(playerId, isHero) {
  return updatePlayer(playerId, { hero: !!isHero });
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
    externalId: data.externalId || null,
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
    eligibleClasses: data.eligibleClasses || null,
    layoutId: data.layoutId || null,
    date: data.date || null, rules: data.rules || null,
    status: data.status || 'open',
    eventType: data.eventType || 'tournament',
    isTest: data.isTest || false,
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
// One-shot fetch for cross-tournament queries (e.g. player stats page)
export async function fetchScoutedTeams(tid) {
  const snap = await getDocs(query(collection(db, bp(), 'tournaments', tid, 'scouted'), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function addScoutedTeam(tid, data) {
  return addDoc(collection(db, bp(), 'tournaments', tid, 'scouted'), {
    teamId: data.teamId, division: data.division || null, roster: data.roster || [], createdAt: serverTimestamp(),
  });
}
export async function updateScoutedTeam(tid, sid, data) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'scouted', sid), { ...data, updatedAt: serverTimestamp() });
}
// Tournament HERO — per-tournament flag on scoutedTeam doc (§ 25).
export async function setTournamentHero(tid, scoutedTeamId, heroPlayers) {
  return updateScoutedTeam(tid, scoutedTeamId, { heroPlayers: heroPlayers || [] });
}

// ─── NOTES (coach notes on scouted teams) ───
// Firestore rules are flat per-workspace; UI filters by author role.
function notesCol(tid, sid) {
  return collection(db, bp(), 'tournaments', tid, 'scouted', sid, 'notes');
}
export function subscribeNotes(tid, sid, cb) {
  return onSnapshot(query(notesCol(tid, sid), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addNote(tid, sid, data) {
  return addDoc(notesCol(tid, sid), {
    content: data.content,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    seenBy: [data.authorId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateNote(tid, sid, noteId, data) {
  return updateDoc(doc(notesCol(tid, sid), noteId), {
    ...data, updatedAt: serverTimestamp(),
  });
}
export async function deleteNote(tid, sid, noteId) {
  return deleteDoc(doc(notesCol(tid, sid), noteId));
}
export async function markNoteSeen(tid, sid, noteId, uid) {
  return updateDoc(doc(notesCol(tid, sid), noteId), {
    seenBy: arrayUnion(uid),
  });
}

// ─── MATCHES (at tournament level) ───
export function subscribeMatches(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments', tid, 'matches'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
// One-shot fetch for cross-tournament queries (e.g. player stats page)
export async function fetchMatches(tid) {
  const snap = await getDocs(query(collection(db, bp(), 'tournaments', tid, 'matches'), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
// Brief 8 Problem B — write a point with a caller-specified doc ID
// (for per-coach deterministic streams: {matchId}_{coachShortId}_{NNN}).
export async function setPointWithId(tid, mid, pid, data) {
  return setDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid, 'points', pid), {
    ...data, order: data.order || Date.now(), createdAt: serverTimestamp(),
  });
}

// Brief 8 Problem B — end-match merge for tournament matches.
// Groups point docs by coachUid, matches per-stream by `index`, writes canonical
// merged docs where both coaches scouted the same index, marks solo/legacy/leftover
// canonical in place. Idempotent (match.merged=true → no-op). Legacy points (no
// coachUid, pre-Brief 8 schema) grouped separately and marked canonical standalone
// per Blocker 2 audit requirement.
export async function endMatchAndMerge(tid, mid) {
  const matchRef = doc(db, bp(), 'tournaments', tid, 'matches', mid);
  const matchSnap = await getDoc(matchRef);
  if (matchSnap.data()?.merged) {
    return { alreadyMerged: true, merged: 0, unmerged: 0 };
  }

  const pointsCol = collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points');
  const pointsSnap = await getDocs(query(pointsCol, orderBy('createdAt', 'asc')));
  const allPoints = pointsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const batch = writeBatch(db);

  if (allPoints.length === 0) {
    batch.update(matchRef, {
      merged: true, mergedAt: serverTimestamp(),
      mergeStats: { merged: 0, unmerged: 0 },
      scoreA: 0, scoreB: 0,
    });
    await batch.commit();
    return { merged: 0, unmerged: 0 };
  }

  // Group streams. Legacy (no coachUid) bucketed separately for audit — marked
  // canonical standalone, never merged into per-coach lockstep.
  const streams = {};
  allPoints.forEach(p => {
    const key = p.coachUid || 'legacy';
    if (!streams[key]) streams[key] = [];
    streams[key].push(p);
  });
  Object.keys(streams).forEach(k => {
    if (k === 'legacy') streams[k].sort((a, b) => (a.order || 0) - (b.order || 0));
    else streams[k].sort((a, b) => (a.index || 0) - (b.index || 0));
  });

  let mergedCount = 0;
  let unmergedCount = 0;
  // Brief 9 Bug 2 (Option A): authoritative score from canonical outcomes,
  // accumulated as the batch is built. Regular savePoint no longer writes
  // match.scoreA/B (coachUid-filtered subset would race). One clean write here.
  let finalScoreA = 0;
  let finalScoreB = 0;
  const countOutcome = (outcome) => {
    if (outcome === 'win_a') finalScoreA++;
    else if (outcome === 'win_b') finalScoreB++;
  };

  // Legacy bucket: mark canonical directly (audit trail; no merge attempt).
  if (streams.legacy) {
    streams.legacy.forEach(p => {
      batch.update(doc(pointsCol, p.id), { canonical: true, mergedAt: serverTimestamp() });
      countOutcome(p.outcome);
      unmergedCount++;
    });
  }

  const coachUids = Object.keys(streams).filter(k => k !== 'legacy');

  if (coachUids.length === 1) {
    // Solo scout: mark canonical in place, no merge logic.
    streams[coachUids[0]].forEach(p => {
      batch.update(doc(pointsCol, p.id), { canonical: true, mergedAt: serverTimestamp() });
      countOutcome(p.outcome);
      unmergedCount++;
    });
  } else if (coachUids.length >= 2) {
    // 2+ coaches: match by local index position. v1 focuses on 2 coaches;
    // 3+ would process first two streams the same way (accept per brief
    // conflict-case rule — "out-of-sync counters = user responsibility").
    const [uidA, uidB] = coachUids;
    const streamA = streams[uidA];
    const streamB = streams[uidB];
    const maxLen = Math.max(streamA.length, streamB.length);

    for (let i = 0; i < maxLen; i++) {
      const pA = streamA[i];
      const pB = streamB[i];

      if (pA && pB) {
        const canonicalId = `${mid}_merged_${String(i + 1).padStart(3, '0')}`;
        const canonicalRef = doc(pointsCol, canonicalId);
        const homeData = pA.homeData || pB.homeData || null;
        const awayData = pA.awayData || pB.awayData || null;
        const teamA_legacy = pA.teamA || pB.teamA || null;
        const teamB_legacy = pA.teamB || pB.teamB || null;
        const homePopulated = homeData?.players?.some(Boolean);
        const awayPopulated = awayData?.players?.some(Boolean);
        const mergedOutcome = pA.outcome || pB.outcome || 'pending';
        batch.set(canonicalRef, {
          index: i + 1,
          canonical: true,
          // Brief 9 Bug 1: `order` required for subscribePoints' orderBy('order',
          // 'asc') — Firestore excludes docs missing the orderBy field, which
          // left canonical docs invisible post-merge. Date.now()+i sorts after
          // all source docs (saved earlier) while preserving canonical index order.
          order: Date.now() + i,
          homeData, awayData,
          teamA: teamA_legacy, teamB: teamB_legacy,
          status: (homePopulated && awayPopulated) ? 'scouted' : 'partial',
          outcome: mergedOutcome,
          createdAt: pA.createdAt || pB.createdAt,
          mergedAt: serverTimestamp(),
          sourceDocIds: [pA.id, pB.id],
        });
        batch.update(doc(pointsCol, pA.id), { mergedInto: canonicalId });
        batch.update(doc(pointsCol, pB.id), { mergedInto: canonicalId });
        countOutcome(mergedOutcome);
        mergedCount++;
      } else {
        const only = pA || pB;
        batch.update(doc(pointsCol, only.id), { canonical: true, mergedAt: serverTimestamp() });
        countOutcome(only.outcome);
        unmergedCount++;
      }
    }
  }

  batch.update(matchRef, {
    merged: true,
    mergedAt: serverTimestamp(),
    mergeStats: { merged: mergedCount, unmerged: unmergedCount },
    scoreA: finalScoreA,
    scoreB: finalScoreB,
  });
  await batch.commit();
  return { merged: mergedCount, unmerged: unmergedCount };
}

/**
 * Migrate old point format (teamA/teamB at top level) to new split format (homeData/awayData).
 * Safe to call on already-migrated points (returns as-is).
 */

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

// ─── TRAINING SESSIONS ───
// Training = practice session for own team. Separate collection from tournaments.
// Structure:
//   /workspaces/{slug}/trainings/{tid}
//   /workspaces/{slug}/trainings/{tid}/matchups/{mid}
//   /workspaces/{slug}/trainings/{tid}/matchups/{mid}/points/{pid}
export function subscribeTrainings(cb) {
  return onSnapshot(query(collection(db, bp(), 'trainings'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTraining(data) {
  return addDoc(collection(db, bp(), 'trainings'), {
    type: 'training',
    date: data.date || new Date().toISOString().slice(0, 10),
    name: data.name || null,
    teamId: data.teamId || null,
    layoutId: data.layoutId || null,
    attendees: data.attendees || [],
    squads: data.squads || {},
    // § 53: pre-populate full default squadNames (Ranger/Ring/Rage/Rush/Rebel)
    // so new trainings always have the complete brand vocabulary regardless
    // of how many squads the coach ends up using. Old trainings (created
    // before this commit) lack the field entirely → resolver falls back to
    // legacy R1-R5 labels (see utils/squads.js getSquadName).
    squadNames: data.squadNames || buildDefaultSquadNames(),
    status: data.status || 'open',
    isTest: data.isTest || false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
export async function updateTraining(tid, data) {
  return updateDoc(doc(db, bp(), 'trainings', tid), { ...data, updatedAt: serverTimestamp() });
}

/**
 * § 53: rename a single squad slot for a given training. Empty/whitespace
 * input reverts that slot to the brand default (Ranger/Ring/...). Trims
 * + caps at 16 chars defensively (UI also enforces).
 *
 * Old trainings without a `squadNames` field receive their first dotted
 * write here; from that moment on, getSquadName(training, key) routes
 * through the new branch and untouched slots resolve to brand defaults
 * (per § 53.6 Option A).
 */
export async function updateTrainingSquadName(tid, squadKey, newName) {
  const trimmed = (newName || '').trim();
  const finalName = trimmed
    ? trimmed.slice(0, 16)
    : (squadDefaultName(squadKey) || squadKey);
  return updateDoc(doc(db, bp(), 'trainings', tid), {
    [`squadNames.${squadKey}`]: finalName,
    updatedAt: serverTimestamp(),
  });
}
export async function deleteTraining(tid) {
  const b = bp();
  const batch = writeBatch(db);
  const mSnap = await getDocs(collection(db, b, 'trainings', tid, 'matchups'));
  for (const m of mSnap.docs) {
    const pSnap = await getDocs(collection(db, b, 'trainings', tid, 'matchups', m.id, 'points'));
    pSnap.docs.forEach(p => batch.delete(p.ref));
    batch.delete(m.ref);
  }
  batch.delete(doc(db, b, 'trainings', tid));
  return batch.commit();
}

// Matchups (training's equivalent of tournament matches)
export function subscribeMatchups(tid, cb) {
  return onSnapshot(query(collection(db, bp(), 'trainings', tid, 'matchups'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addMatchup(tid, data) {
  return addDoc(collection(db, bp(), 'trainings', tid, 'matchups'), {
    homeSquad: data.homeSquad,
    awaySquad: data.awaySquad,
    homeRoster: data.homeRoster || [],
    awayRoster: data.awayRoster || [],
    scoreA: 0,
    scoreB: 0,
    status: 'playing',
    createdAt: serverTimestamp(),
  });
}
export async function updateMatchup(tid, mid, data) {
  return updateDoc(doc(db, bp(), 'trainings', tid, 'matchups', mid), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteMatchup(tid, mid) {
  const b = bp();
  const pSnap = await getDocs(collection(db, b, 'trainings', tid, 'matchups', mid, 'points'));
  const batch = writeBatch(db);
  pSnap.docs.forEach(p => batch.delete(p.ref));
  batch.delete(doc(db, b, 'trainings', tid, 'matchups', mid));
  return batch.commit();
}

// Training points live under the matchup — same data shape as tournament points.
export function subscribeTrainingPoints(tid, mid, cb) {
  return onSnapshot(
    query(collection(db, bp(), 'trainings', tid, 'matchups', mid, 'points'), orderBy('order', 'asc')),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() })))
  );
}
export async function addTrainingPoint(tid, mid, data) {
  return addDoc(collection(db, bp(), 'trainings', tid, 'matchups', mid, 'points'), {
    ...data, order: data.order || Date.now(), createdAt: serverTimestamp(),
  });
}
export async function updateTrainingPoint(tid, mid, pid, data) {
  return updateDoc(doc(db, bp(), 'trainings', tid, 'matchups', mid, 'points', pid), { ...data, updatedAt: serverTimestamp() });
}
export async function deleteTrainingPoint(tid, mid, pid) {
  return deleteDoc(doc(db, bp(), 'trainings', tid, 'matchups', mid, 'points', pid));
}
// Brief 8 Problem B — training analogue of setPointWithId.
export async function setTrainingPointWithId(tid, mid, pid, data) {
  return setDoc(doc(db, bp(), 'trainings', tid, 'matchups', mid, 'points', pid), {
    ...data, order: data.order || Date.now(), createdAt: serverTimestamp(),
  });
}

// Brief 8 Problem B — end-matchup merge for training (Blocker 3: opcja c).
// Training is solo-per-matchup per § 18, so there is never a multi-coach merge.
// Just marks every point canonical and flips matchup.merged=true. Idempotent.
export async function endMatchupAndMerge(trid, mid) {
  const matchupRef = doc(db, bp(), 'trainings', trid, 'matchups', mid);
  const matchupSnap = await getDoc(matchupRef);
  if (matchupSnap.data()?.merged) {
    return { alreadyMerged: true, merged: 0, unmerged: 0 };
  }
  const pointsCol = collection(db, bp(), 'trainings', trid, 'matchups', mid, 'points');
  const pointsSnap = await getDocs(pointsCol);
  const batch = writeBatch(db);
  let unmergedCount = 0;
  // Brief 9 Bug 2 (Option A): authoritative scoreA/B from canonical outcomes
  // at merge time. Training is solo-per-matchup so there's no race to prevent
  // (TrainingScoutTab writer F still skips per-save write for schema symmetry).
  let finalScoreA = 0;
  let finalScoreB = 0;
  pointsSnap.docs.forEach(d => {
    const data = d.data();
    batch.update(d.ref, { canonical: true, mergedAt: serverTimestamp() });
    if (data.outcome === 'win_a') finalScoreA++;
    else if (data.outcome === 'win_b') finalScoreB++;
    unmergedCount++;
  });
  batch.update(matchupRef, {
    merged: true,
    mergedAt: serverTimestamp(),
    mergeStats: { merged: 0, unmerged: unmergedCount },
    scoreA: finalScoreA,
    scoreB: finalScoreB,
  });
  await batch.commit();
  return { merged: 0, unmerged: unmergedCount };
}

// Fetch all training points across all matchups — leaderboard computation.
export async function fetchAllTrainingPoints(tid) {
  const mSnap = await getDocs(collection(db, bp(), 'trainings', tid, 'matchups'));
  const all = [];
  for (const m of mSnap.docs) {
    const pSnap = await getDocs(query(collection(db, bp(), 'trainings', tid, 'matchups', m.id, 'points'), orderBy('order', 'asc')));
    pSnap.docs.forEach(p => all.push({ id: p.id, matchupId: m.id, ...m.data(), ...p.data(), matchupData: m.data() }));
  }
  return all;
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

// ─── LAYOUT INSIGHTS (coach notes per layout) ───
// Path: workspaces/{slug}/layouts/{layoutId}/insights/{insightId}
export function subscribeLayoutInsights(layoutId, cb) {
  if (!layoutId) return () => {};
  return onSnapshot(
    query(collection(db, bp(), 'layouts', layoutId, 'insights'), orderBy('createdAt', 'desc')),
    s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))),
  );
}
export async function addLayoutInsight(layoutId, data) {
  return addDoc(collection(db, bp(), 'layouts', layoutId, 'insights'), {
    text: data.text,
    bunkerRef: data.bunkerRef || null,
    tags: data.tags || [],
    source: data.source || null,
    createdBy: data.createdBy || null,
    createdAt: serverTimestamp(),
  });
}
export async function deleteLayoutInsight(layoutId, insightId) {
  return deleteDoc(doc(db, bp(), 'layouts', layoutId, 'insights', insightId));
}

// ─── PLAYER SELF-LOG — breakout variants (team-level shared pool) ───
// Path: /workspaces/{slug}/teams/{teamId}/breakoutVariants/{variantId}
// Filter by bunkerName optional (pass null to get all team variants).
export function subscribeBreakoutVariants(teamId, bunkerName, cb) {
  if (!teamId) return () => {};
  const ref = collection(db, bp(), 'teams', teamId, 'breakoutVariants');
  const q = bunkerName
    ? query(ref, where('bunkerName', '==', bunkerName), orderBy('usageCount', 'desc'))
    : query(ref, orderBy('usageCount', 'desc'));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addBreakoutVariant(teamId, bunkerName, variantName, userId) {
  return addDoc(collection(db, bp(), 'teams', teamId, 'breakoutVariants'), {
    bunkerName,
    variantName: variantName.trim(),
    usageCount: 0,
    createdBy: userId || null,
    createdAt: serverTimestamp(),
    lastUsed: serverTimestamp(),
  });
}
export async function incrementVariantUsage(teamId, variantId) {
  return updateDoc(doc(db, bp(), 'teams', teamId, 'breakoutVariants', variantId), {
    usageCount: increment(1),
    lastUsed: serverTimestamp(),
  });
}

// ─── PLAYER SELF-LOG — per-point embedded log + shot subcollection ───
// Self-log lives at point.selfLogs[playerId]; shots go to new subcollection
// points/{pid}/shots/{sid} (scout shots stay on point.shots field — lazy
// migration via `source || 'scout'` on read of the shots subcollection).
export async function setPlayerSelfLog(tid, mid, pid, playerId, data) {
  return updateDoc(
    doc(db, bp(), 'tournaments', tid, 'matches', mid, 'points', pid),
    { [`selfLogs.${playerId}`]: { ...data, loggedAt: serverTimestamp() } },
  );
}
export async function addSelfLogShot(tid, mid, pid, shotData) {
  return addDoc(
    collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points', pid, 'shots'),
    { ...shotData, source: 'self', createdAt: serverTimestamp() },
  );
}
// Training-path equivalents (trainings/{trid}/matchups/{mid}/points/{pid})
export async function setPlayerSelfLogTraining(trid, mid, pid, playerId, data) {
  return updateDoc(
    doc(db, bp(), 'trainings', trid, 'matchups', mid, 'points', pid),
    { [`selfLogs.${playerId}`]: { ...data, loggedAt: serverTimestamp() } },
  );
}
export async function addSelfLogShotTraining(trid, mid, pid, shotData) {
  return addDoc(
    collection(db, bp(), 'trainings', trid, 'matchups', mid, 'points', pid, 'shots'),
    { ...shotData, source: 'self', createdAt: serverTimestamp() },
  );
}

/**
 * Brief D Item (b): fetch all self-log shot docs for a single player
 * across an entire training (one collectionGroup query, post-filter
 * by source='self' + tournamentId=trainingId to avoid composite index
 * — single-field playerId index already deployed per
 * PLAYER_SELFLOG.md). Each returned doc carries pointId derived from
 * doc.ref.parent.parent so callers can group by point without extra
 * lookups.
 *
 * @param {string} playerId
 * @param {string} trainingId
 * @returns {Promise<Array<{id, pointId, ...shotData}>>}
 */
export async function fetchSelfLogShotsForPlayer(playerId, trainingId) {
  if (!playerId || !trainingId) return [];
  const q = query(
    collectionGroup(db, 'shots'),
    where('playerId', '==', playerId),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const data = d.data();
      // Derive pointId from doc path (parent of parent collection).
      // Path: workspaces/{slug}/trainings/{tid}/matchups/{mid}/points/{pid}/shots/{sid}
      const pointId = d.ref.parent.parent?.id || null;
      return { id: d.id, pointId, ...data };
    })
    .filter(s => s.source === 'self' && s.tournamentId === trainingId);
}
// ─── SECURITY § 38 — PBLI matching + role management + migration ────────
// Workspace slug is resolved via `bp()` which returns `workspaces/{slug}`.
// `wsSlug` arg below is accepted for readability; we always use `bp()` for
// the actual Firestore path so there is a single source of truth.

function wsPath() {
  // Strip the `workspaces/` prefix that bp() includes; return just the slug
  // portion (or the full path — both usages appear below via helpers).
  return bp();
}

// Look up a player by pbliId (first segment only). Returns array — zero
// matches = user must be added manually by admin; multiple = data bug,
// disambiguation picker upstream.
export async function findPlayerByPbliId(_wsSlug, systemId) {
  const normalized = normalizePbliId(systemId);
  if (!normalized) return [];
  const snap = await getDocs(collection(db, bp(), 'players'));
  const matches = [];
  snap.forEach(d => {
    const dbId = normalizePbliId(d.data().pbliId);
    if (dbId && dbId === normalized) matches.push({ id: d.id, ...d.data() });
  });
  return matches;
}

export async function approveUserRoles(_wsSlug, targetUid, roles) {
  return updateDoc(doc(db, bp()), {
    [`userRoles.${targetUid}`]: roles,
    pendingApprovals: arrayRemove(targetUid),
  });
}

export async function updateUserRoles(_wsSlug, targetUid, roles) {
  return updateDoc(doc(db, bp()), {
    [`userRoles.${targetUid}`]: roles,
  });
}

export async function transferAdmin(_wsSlug, fromUid, toUid) {
  const wsRef = doc(db, bp());
  return runTransaction(db, async (tx) => {
    const wsSnap = await tx.get(wsRef);
    const ws = wsSnap.data();
    const fromRoles = (ws.userRoles?.[fromUid] || []).filter(r => r !== 'admin');
    const finalFromRoles = fromRoles.length > 0 ? fromRoles : ['coach'];
    const toRoles = ws.userRoles?.[toUid] || [];
    const finalToRoles = toRoles.includes('admin') ? toRoles : [...toRoles, 'admin'];
    tx.update(wsRef, {
      adminUid: toUid,
      [`userRoles.${toUid}`]: finalToRoles,
      [`userRoles.${fromUid}`]: finalFromRoles,
      adminTransferredAt: serverTimestamp(),
    });
  });
}

// Safe check for whether a user has ever written scouting/tactics/notes
// data. Used by migration to pre-populate coach role for active members.
// Silently returns false on permission / index errors — safer than blocking
// migration.
async function hasEverWritten(uid) {
  const checks = [
    { cg: 'points', field: 'homeData.scoutedBy' },
    { cg: 'points', field: 'awayData.scoutedBy' },
    { cg: 'tactics', field: 'createdBy' },
    { cg: 'notes', field: 'createdBy' },
  ];
  for (const { cg, field } of checks) {
    try {
      const q = query(collectionGroup(db, cg), where(field, '==', uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return true;
    } catch (e) {
      // Likely missing index — skip this check. Other checks may still succeed.
      if (import.meta.env.DEV) console.warn(`hasEverWritten(${uid}) skipped ${cg}.${field}:`, e.code);
    }
  }
  return false;
}

// Pre-populate workspace.userRoles for existing members. Idempotent via
// rolesVersion flag. Admin-only trigger from useWorkspace.
// Rule set:
//   - adminUid  → 'admin'
//   - hasEverWritten → 'coach'
//   - linkedUid matches a player → 'player'
export async function migrateWorkspaceRoles(_wsSlug) {
  const wsRef = doc(db, bp());
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) throw new Error('Workspace not found');
  const ws = wsSnap.data();
  if (ws.rolesVersion === 2) {
    return { skipped: true, reason: 'already-migrated' };
  }
  const members = Array.isArray(ws.members) ? ws.members : [];
  const userRoles = {};
  for (const uid of members) {
    const roles = [];
    if (uid === ws.adminUid) roles.push('admin');
    if (await hasEverWritten(uid)) {
      if (!roles.includes('coach')) roles.push('coach');
    }
    try {
      const linkedSnap = await getDocs(query(
        collection(db, bp(), 'players'),
        where('linkedUid', '==', uid),
        limit(1),
      ));
      if (!linkedSnap.empty && !roles.includes('player')) roles.push('player');
    } catch (e) {
      if (import.meta.env.DEV) console.warn(`migrate: linkedUid lookup failed for ${uid}:`, e.code);
    }
    userRoles[uid] = roles;
  }
  await updateDoc(wsRef, {
    userRoles,
    rolesVersion: 2,
    migratedAt: serverTimestamp(),
  });
  return { migrated: Object.keys(userRoles).length, userRoles };
}

// Admin acknowledges the post-migration review prompt. Updates
// migrationReviewedAt so ReviewRolesModal stops showing on next login.
export async function dismissMemberReview(_wsSlug) {
  return updateDoc(doc(db, bp()), {
    migrationReviewedAt: serverTimestamp(),
  });
}

// Remove a user from the workspace atomically:
//   - strip all roles (userRoles[uid] = [])
//   - remove from members[] and pendingApprovals[]
//   - unlink their player doc (linkedUid → null) so another user can
//     re-link via PBLI onboarding if needed
// Caller is responsible for admin confirmation + self-protection.
export async function removeMember(_wsSlug, targetUid) {
  const wsRef = doc(db, bp());
  return runTransaction(db, async (tx) => {
    // Find the player doc linked to this uid (if any) — must be read
    // before writes per Firestore transaction rules.
    const linkedSnap = await getDocs(query(
      collection(db, bp(), 'players'),
      where('linkedUid', '==', targetUid),
      limit(1),
    ));
    tx.update(wsRef, {
      [`userRoles.${targetUid}`]: [],
      members: arrayRemove(targetUid),
      pendingApprovals: arrayRemove(targetUid),
    });
    linkedSnap.forEach(d => {
      tx.update(d.ref, {
        linkedUid: null,
        pbliIdFull: null,
        unlinkedAt: serverTimestamp(),
      });
    });
  });
}

// Self-leave workspace (§ 50.3) — performs the same atomic mutation set as
// removeMember but is called by the user on themselves. Firestore rules
// gate this via two carve-outs:
//   - /workspaces/{slug}: was-in-members + now-not-in-members invariant
//   - /players/{pid}: linkedUid was-self + now-null invariant
// UI (Settings → WORKSPACE → Wyjdź) enforces the last-admin guard before
// calling — rules can't iterate userRoles to count admins.
export async function leaveWorkspaceSelf(uid) {
  if (!uid) throw new Error('uid required');
  return removeMember(null, uid);
}

// Admin link override (§ 50.4) — admin assigns a player profile to a user,
// possibly overriding an existing link on either side. Atomic transaction:
// (a) clears any other player currently linked to this uid, (b) clears
// targetPlayer's existing linkedUid if it points to a different user,
// (c) sets targetPlayer.linkedUid = uid + linkedAt.
// pbliIdFull is preserved as-is (we don't fabricate one — admin can ask the
// user to complete PBLI onboarding later if missing).
// Rules: admin satisfies isCoach(slug); no rules change needed.
export async function adminLinkPlayer(targetPlayerId, uid) {
  if (!targetPlayerId || !uid) throw new Error('targetPlayerId + uid required');
  const targetRef = doc(db, bp(), 'players', targetPlayerId);
  return runTransaction(db, async (tx) => {
    // READS first per Firestore transaction rules.
    const existingLinks = await getDocs(query(
      collection(db, bp(), 'players'),
      where('linkedUid', '==', uid),
      limit(5),
    ));
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists()) throw new Error('TARGET_NOT_FOUND');
    // WRITES.
    existingLinks.forEach(d => {
      if (d.id !== targetPlayerId) {
        tx.update(d.ref, {
          linkedUid: null,
          pbliIdFull: null,
          unlinkedAt: serverTimestamp(),
        });
      }
    });
    tx.update(targetRef, {
      linkedUid: uid,
      linkedAt: serverTimestamp(),
    });
  });
}

// Self-link (§ 33.3 / § 49.8 Path A) — authenticated user claims an
// unlinked player doc. Firestore rule allows this when
// `resource.data.linkedUid == null` and the diff is restricted to
// ['linkedUid', 'pbliIdFull', 'linkedAt'], so we write only those fields.
// Throws 'ALREADY_LINKED' if another user beat us to it between list fetch
// and write.
export async function selfLinkPlayer(playerId, uid) {
  if (!playerId || !uid) throw new Error('playerId + uid required');
  const ref = doc(db, bp(), 'players', playerId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('TARGET_NOT_FOUND');
    const existing = snap.data().linkedUid;
    if (existing && existing !== uid) throw new Error('ALREADY_LINKED');
    tx.update(ref, {
      linkedUid: uid,
      linkedAt: serverTimestamp(),
    });
  });
}

// Self-unlink (§ 33.3 / § 49.8 Path A) — currently-linked user clears their
// own link. Firestore rule carve-out: `resource.data.linkedUid == auth.uid`
// + `request.resource.data.linkedUid == null`, diff restricted to
// ['linkedUid', 'pbliIdFull', 'unlinkedAt']. User keeps workspace membership
// + roles; can re-link later.
export async function selfUnlinkPlayer(playerId) {
  if (!playerId) throw new Error('playerId required');
  return updateDoc(doc(db, bp(), 'players', playerId), {
    linkedUid: null,
    unlinkedAt: serverTimestamp(),
  });
}

// Admin unlink (§ 50.4) — clears linkedUid on the player doc; user keeps
// workspace membership + roles. Rules: admin via isCoach(slug).
export async function adminUnlinkPlayer(playerId) {
  if (!playerId) throw new Error('playerId required');
  return updateDoc(doc(db, bp(), 'players', playerId), {
    linkedUid: null,
    pbliIdFull: null,
    unlinkedAt: serverTimestamp(),
  });
}

// Mark the user as having deliberately skipped the PBLI onboarding
// (2026-04-24 relax-pbleagues-onboarding). App bootstrap (AppRoutes)
// reads userProfile.linkSkippedAt and falls through the onboarding gate
// when present — user can still link later via ProfilePage. Rules allow
// any auth-matching write to /users/{uid}, no rules change needed.
//
// Idempotent: overwrites the timestamp on repeat skip. User who later
// links via ProfilePage doesn't need this cleared; the gate also
// short-circuits on linkedPlayer, so the flag is effectively
// redundant once linked (but kept for audit trail).
export async function skipLinkOnboarding(uid) {
  if (!uid) throw new Error('uid required');
  return setDoc(doc(db, 'users', uid), {
    linkSkippedAt: serverTimestamp(),
  }, { merge: true });
}

// Soft-disable user globally (§ 50.5) — writes user.disabled flag. App
// bootstrap (AppRoutes) reads userProfile.disabled and force-signs-out
// when true; user can authenticate but immediately bounces back to login.
// Rules: ADMIN_EMAILS allowlist on /users/{uid} (per § 50.5; per-workspace
// admin check requires custom claims — deferred).
export async function softDisableUser(uid, byEmail) {
  if (!uid) throw new Error('uid required');
  return updateDoc(doc(db, 'users', uid), {
    disabled: true,
    disabledAt: serverTimestamp(),
    disabledBy: byEmail || null,
  });
}

export async function reEnableUser(uid) {
  if (!uid) throw new Error('uid required');
  return updateDoc(doc(db, 'users', uid), {
    disabled: false,
    reEnabledAt: serverTimestamp(),
  });
}

// Live listener for the set of players linked to this uid (typically 0 or 1).
// Empty list → user hasn't completed PBLI onboarding yet.
export function subscribeLinkedPlayer(uid, cb) {
  if (!uid) { cb(null); return () => {}; }
  const q = query(
    collection(db, bp(), 'players'),
    where('linkedUid', '==', uid),
    limit(1),
  );
  return onSnapshot(q, (snap) => {
    if (snap.empty) { cb(null); return; }
    const d = snap.docs[0];
    cb({ id: d.id, ...d.data() });
  }, (err) => {
    if (import.meta.env.DEV) console.warn('subscribeLinkedPlayer error:', err?.code);
    cb(null);
  });
}
