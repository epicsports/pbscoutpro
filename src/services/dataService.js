import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs, where,
  arrayUnion, arrayRemove, increment, collectionGroup, limit, runTransaction,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { normalizePbliId } from '../utils/roleUtils';
import { DEFAULT_WORKSPACE_SLUG, DEFAULT_USER_ROLES } from '../utils/constants';
import { buildDefaultSquadNames, squadDefaultName } from '../utils/squads';
import { makeMeta } from '../utils/observationMeta';
import { bunkerToPosition } from '../utils/bunkerToPosition';
import { locatePlayerInPoint, alignSequence, positionConfidence } from '../utils/selfReportMatcher';
import { playerOnTeam } from '../utils/playerTeams';

// ─── USERS (global, not workspace-scoped) ───
// /users/{uid} — one profile per Firebase Auth user, created on first login.
//
// Canonical schema (§ 49 unified auth, 2026-04-23; § 63.3 Option α, 2026-05-19):
//   {
//     email, displayName,
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
//
// `workspaces: string[]` field was dropped Phase 1.2 (2026-05-19, § 63.3
// Option α). Source of truth for user-workspace membership is now
// `workspace.userRoles[uid]` — query via useUserWorkspaces hook. Field
// remains in legacy user docs until Phase 1.3 migration script deletes it.
export async function getOrCreateUserProfile(uid, email, displayName) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  const profile = {
    email: email || '',
    displayName: displayName || (email ? email.split('@')[0] : 'Scout'),
    roles: [...DEFAULT_USER_ROLES],
    defaultWorkspace: DEFAULT_WORKSPACE_SLUG,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}


// ─── LEAGUES (global, super admin CRUD) ─────────────────────────────
// Per DESIGN_DECISIONS § 63.15.1 + Phase 2.1c. CRUD on /leagues/{leagueId}.
// Firestore rules gate writes to ADMIN_EMAILS (jacek@epicsports.pl).
// Phase 2.1b useLeagues hook picks up changes on next page load.
// Soft delete only — toggle `active: false` rather than hard delete to
// preserve backward compat with stored tournament.division name strings
// and historical data.

// Generate Firestore-safe division ID from display name.
// Matches Phase 2.1a bootstrap script + Phase 2.1b adapter exactly so
// IDs stay stable across data sources.
export function generateDivisionId(name) {
  return String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Auto-order divisions: assigns order = i + 1 based on array index.
// Regenerates id from name so admin renames produce fresh ids.
function normalizeDivisions(divisions = []) {
  return divisions
    .filter(d => d && String(d.name || '').trim())
    .map((d, i) => ({
      id: generateDivisionId(d.name),
      name: String(d.name).trim(),
      order: i + 1,
    }));
}

export async function createLeague({
  shortName, name, region = null, parentLeagueFamily = null,
  divisions = [], active = true, createdBy,
}) {
  const sn = String(shortName || '').trim();
  if (!sn) throw new Error('shortName required');
  if (!String(name || '').trim()) throw new Error('name required');
  const id = `l_${sn.toLowerCase()}`;
  const ref = doc(db, 'leagues', id);
  const existing = await getDoc(ref);
  if (existing.exists()) throw new Error(`League ${id} already exists`);
  const data = {
    name: String(name).trim(),
    shortName: sn,
    region: region || null,
    parentLeagueFamily: parentLeagueFamily || null,
    divisions: normalizeDivisions(divisions),
    active: Boolean(active),
    createdBy: createdBy || 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { id, ...data };
}

export async function updateLeague(id, patch) {
  if (!id) throw new Error('league id required');
  const updates = { ...patch, updatedAt: serverTimestamp() };
  if (Array.isArray(patch.divisions)) {
    updates.divisions = normalizeDivisions(patch.divisions);
  }
  await updateDoc(doc(db, 'leagues', id), updates);
}

export async function deactivateLeague(id) {
  return updateLeague(id, { active: false });
}

export async function reactivateLeague(id) {
  return updateLeague(id, { active: true });
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
// Phase 2.2.b dual-write design: writes go to BOTH /players/{id} (global,
// canonical post Phase 2.2.a) AND /workspaces/{slug}/players/{id} (legacy,
// retained for utility/non-React consumers + backward compat with stored
// references). Phase 2.2.d will remove legacy write after consumption is
// fully migrated.
//
// READ path: subscribePlayers DEPRECATED for React consumers (use
// usePlayers from useFirestore.js → global /players/). Utility consumers
// in src/utils/ + src/services/ continue using workspace path until later
// phase.
export function subscribePlayers(cb) {
  return onSnapshot(query(collection(db, bp(), 'players'), orderBy('name', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addPlayer(data) {
  const now = new Date().toISOString();
  const teamHistory = [];
  if (data.teamId) teamHistory.push({ teamId: data.teamId, from: now, to: null });
  const payload = {
    name: data.name || '', nickname: data.nickname || '', number: data.number || '',
    teamId: data.teamId || null, teamHistory,
    // § 72 — multi-team membership. teams[] = all teams the player is rostered
    // on; teamId = primary. Fallback to [teamId] when caller passes only teamId.
    teams: Array.isArray(data.teams) && data.teams.length
      ? data.teams
      : (data.teamId ? [data.teamId] : []),
    age: data.age || null, favoriteBunker: data.favoriteBunker || null, pbliId: data.pbliId || null,
    playerClass: data.playerClass || null,
    role: data.role || 'player',
    nationality: data.nationality || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  // Workspace path first (gets the auto-generated doc ID)
  const ref = await addDoc(collection(db, bp(), 'players'), payload);
  // Mirror to global with same ID (Phase 2.2.b dual-write).
  // originWorkspace tags this workspace-originated for audit; ownerWorkspaceId
  // is the § 65.2 single-owner signal the Phase 3.c.2 ownership rules gate on.
  const wsSlug = (bp() || '').split('/')[1] || null;
  await setDoc(doc(db, 'players', ref.id), {
    ...payload, originWorkspace: wsSlug, aliasIds: null, ownerWorkspaceId: wsSlug,
  });
  return ref;
}
export async function updatePlayer(id, data) {
  // ownerWorkspaceId is set once at create + changed only by super_admin
  // (Phase 3.f). Strip it from generic updates (Phase 3.c.2 — defence in
  // depth alongside the firestore.rules ownership gate).
  const { ownerWorkspaceId: _ignoredOwner, ...rest } = data;
  const patch = { ...rest, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, bp(), 'players', id), patch);
  // Phase 2.2.b dual-write — merge into global; safe even if global doc
  // doesn't yet exist (setDoc merge:true creates if absent, but for new
  // canonical-but-not-aliased players this writes a partial doc. Trade-off
  // accepted: writes converge with Phase 2.2.a baseline; full create flow
  // is via addPlayer above.)
  await setDoc(doc(db, 'players', id), patch, { merge: true });
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
  const patch = { teamId: newTeamId, teamHistory: history, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, bp(), 'players', id), patch);
  await setDoc(doc(db, 'players', id), patch, { merge: true });
}
// Workspace-only delete (Phase 2.2.b). Global /players/ delete deferred —
// admin can hard-delete via Phase 2.2.c UI. Soft delete preferable globally
// because aliasIds[] references would otherwise become dangling.
export async function deletePlayer(id) { return deleteDoc(doc(db, bp(), 'players', id)); }

// Phase 2.2.c — hard delete from global /players/ only. Used by the super
// admin UI at /admin/players. Workspace doc intentionally left in place
// (Phase 2.2.d cleanup will handle workspace player removal). aliasIds[]
// safety check + informed-consent warning live in the admin UI layer; this
// function unconditionally deletes whatever id it's given. Firestore rule
// at /players/{playerId} gates this to admin email.
export async function deletePlayerGlobal(id) { return deleteDoc(doc(db, 'players', id)); }

// ─── TEAMS ───
export function subscribeTeams(cb) {
  return onSnapshot(query(collection(db, bp(), 'teams'), orderBy('createdAt', 'asc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTeam(data) {
  const payload = {
    name: data.name, leagues: data.leagues || ['NXL'],
    parentTeamId: data.parentTeamId || null,
    externalId: data.externalId || null,
    // divisions: { [league]: divisionString | null }. Set by CSV import
    // (Brief 2026-05-12 — PBLeagues NXL Dywizja column). Manual team
    // creation still defaults to empty; UI sets divisions via updateTeam
    // toggle on TeamDetailPage. Always include the field on creation so
    // reads don't trip over `undefined`.
    divisions: data.divisions || {},
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  // Workspace path first (gets the auto-generated doc ID)
  const ref = await addDoc(collection(db, bp(), 'teams'), payload);
  // Mirror to global with same ID (Phase 2.3.b dual-write).
  // originWorkspace tags this workspace-originated for audit; ownerWorkspaceId
  // is the § 65.2 single-owner signal the Phase 3.c.2 ownership rules gate on.
  const wsSlug = (bp() || '').split('/')[1] || null;
  await setDoc(doc(db, 'teams', ref.id), {
    ...payload, originWorkspace: wsSlug, ownerWorkspaceId: wsSlug,
  });
  return ref;
}
export async function updateTeam(id, data) {
  // ownerWorkspaceId is set once at create + changed only by super_admin
  // (Phase 3.f). Strip it from generic updates (Phase 3.c.2 — defence in
  // depth alongside the firestore.rules ownership gate).
  const { ownerWorkspaceId: _ignoredOwner, ...rest } = data;
  const patch = { ...rest, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, bp(), 'teams', id), patch);
  // Phase 2.3.b dual-write — merge into global; safe even if global doc
  // doesn't yet exist (rare — Phase 2.3.a bootstrap populated all 132
  // legacy docs; new docs via addTeam dual-write above).
  await setDoc(doc(db, 'teams', id), patch, { merge: true });
}
// Workspace-only delete (Phase 2.3.b). Global /teams/ delete deferred —
// admin uses retireTeam (soft delete via retiredAt) in Phase 2.3.c
// instead of hard-delete (preserves audit trail + safe rollback). Hard
// delete may be added in Phase 2.3.d cleanup once references are
// re-pointed; for now retireTeam is the canonical path.
export async function deleteTeam(id) { return deleteDoc(doc(db, bp(), 'teams', id)); }

// ─── Phase 2.3.c — Soft delete (retire) + sister team curation ───
// Per DESIGN_DECISIONS § 63.15.2.X.1 (locked 2026-05-20 mockup review).
// All writes dual-target /teams/ (global) + /workspaces/{slug}/teams/
// (legacy) per Phase 2.3.b pattern.

export async function retireTeam(id, options = {}) {
  const wsSlug = (bp() || '').split('/')[1] || null;
  const updates = {
    retiredAt: serverTimestamp(),
    retiredBy: auth.currentUser?.uid || null,
    retirementReason: options.reason || 'Manual retire',
    canonicalReplacementId: options.canonicalReplacementId || null,
    updatedAt: serverTimestamp(),
  };
  // Global first (canonical source of truth)
  await setDoc(doc(db, 'teams', id), updates, { merge: true });
  // Legacy mirror (preserves workspace path for breakoutVariants parent + non-refactored utilities)
  if (wsSlug) {
    await setDoc(doc(db, 'workspaces', wsSlug, 'teams', id), updates, { merge: true });
  }

  // Handle children action — caller chooses behavior in retire ConfirmModal
  if (options.childAction === 'rePoint' && options.newParentForChildren) {
    const children = await getChildrenOf(id);
    for (const c of children) {
      await setParentTeam(c.id, options.newParentForChildren);
    }
  } else if (options.childAction === 'cascade') {
    const children = await getChildrenOf(id);
    for (const c of children) {
      await retireTeam(c.id, { reason: `Cascade retire (parent: ${id})` });
    }
  }
  // 'orphan' (or undefined) = no-op; children's parentTeamId stays pointing to retired
  //   team. Acceptable per § 63.15.2.X.1 — retired team docs still resolve in lookups.
}

export async function unretireTeam(id) {
  const wsSlug = (bp() || '').split('/')[1] || null;
  const updates = {
    retiredAt: null,
    retiredBy: null,
    retirementReason: null,
    canonicalReplacementId: null,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'teams', id), updates, { merge: true });
  if (wsSlug) {
    await setDoc(doc(db, 'workspaces', wsSlug, 'teams', id), updates, { merge: true });
  }
}

export async function setParentTeam(id, parentTeamId) {
  if (parentTeamId === id) throw new Error('Cannot set team as parent of itself');
  if (parentTeamId) {
    // Cycle prevention — walk proposed parent chain; reject if id appears
    await validateNoCycle(id, parentTeamId);
  }
  const wsSlug = (bp() || '').split('/')[1] || null;
  const updates = { parentTeamId: parentTeamId || null, updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'teams', id), updates, { merge: true });
  if (wsSlug) {
    await setDoc(doc(db, 'workspaces', wsSlug, 'teams', id), updates, { merge: true });
  }
}

async function validateNoCycle(teamId, proposedParentId, depth = 0) {
  if (depth > 10) throw new Error('Cycle detection depth exceeded — data may be corrupt');
  if (teamId === proposedParentId) throw new Error('Cycle detected — proposed parent is descendant of this team');
  const parentSnap = await getDoc(doc(db, 'teams', proposedParentId));
  if (!parentSnap.exists()) return; // dangling pointer, allow (will surface as orphan in audit)
  const grandparent = parentSnap.data().parentTeamId;
  if (!grandparent) return;
  if (grandparent === teamId) throw new Error('Cycle detected — proposed parent is descendant of this team');
  await validateNoCycle(teamId, grandparent, depth + 1);
}

async function getChildrenOf(parentTeamId) {
  const snap = await getDocs(query(collection(db, 'teams'), where('parentTeamId', '==', parentTeamId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── EVENTS INDEX (Model C — § 69) ─────────────────────────────────────
// Thin cross-type index of every event (tournament | sparing | practice |
// training) at /workspaces/{slug}/events_index/{eventId} — 1:1 with the
// source doc id. Written atomically with the source doc inside the same
// writeBatch; the backfill script is the recovery path. Lets cross-type
// readers (useEvents) list all events without resolving to /tournaments/ +
// /trainings/ or migrating nested data. See DESIGN_DECISIONS § 69.

function deriveEventType(sourceCollection, data) {
  if (sourceCollection === 'trainings') return 'training';
  if (data?.eventType === 'sparing') return 'sparing';
  if (data?.type === 'practice') return 'practice';
  return 'tournament';
}

// Full index entry for a newly created event.
function eventIndexCreateEntry(sourceCollection, data) {
  const training = sourceCollection === 'trainings';
  return {
    eventType: deriveEventType(sourceCollection, data),
    sourceCollection,
    name: data.name ?? null,
    date: data.date ?? null,
    layoutId: data.layoutId ?? null,
    status: data.status ?? null,
    isTest: !!data.isTest,
    teamId: training ? (data.teamId ?? null) : null,
    league: training ? null : (data.league ?? null),
    year: training ? null : (data.year ?? null),
    divisions: training ? null : (data.divisions ?? null),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastIndexedAt: serverTimestamp(),
  };
}

// Partial index patch for an event update — mirrors only the index-relevant
// fields present in `data`. Applied with setDoc(merge:true) so it self-heals
// if the index entry does not exist yet (pre-backfill window).
function eventIndexUpdatePatch(sourceCollection, data) {
  const keys = sourceCollection === 'trainings'
    ? ['name', 'date', 'layoutId', 'status', 'teamId', 'isTest']
    : ['name', 'date', 'layoutId', 'status', 'league', 'year', 'divisions', 'isTest'];
  const patch = {};
  for (const k of keys) {
    if (k in data) patch[k] = data[k] ?? null;
  }
  if ('eventType' in data || 'type' in data) {
    patch.eventType = deriveEventType(sourceCollection, data);
  }
  patch.updatedAt = serverTimestamp();
  patch.lastIndexedAt = serverTimestamp();
  return patch;
}

// Cross-type event list (Model C). onSnapshot on events_index; useEvents
// consumes this. orderBy createdAt for a stable index-free query — the hook
// re-sorts by event date.
export function subscribeEventsIndex(cb) {
  return onSnapshot(query(collection(db, bp(), 'events_index'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// ─── TOURNAMENTS ───
export function subscribeTournaments(cb) {
  return onSnapshot(query(collection(db, bp(), 'tournaments'), orderBy('createdAt', 'desc')), s =>
    cb(s.docs.map(d => ({ id: d.id, ...d.data() }))));
}
export async function addTournament(data) {
  const payload = {
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
  };
  // § 69 — event doc + events_index mirror written atomically. `type` is
  // carried only into the index derivation (practice flag), not the doc.
  const ref = doc(collection(db, bp(), 'tournaments'));
  const batch = writeBatch(db);
  batch.set(ref, payload);
  batch.set(doc(db, bp(), 'events_index', ref.id),
    eventIndexCreateEntry('tournaments', { ...payload, type: data.type }));
  await batch.commit();
  return ref;
}
export async function updateTournament(id, data) {
  // § 69 — mirror the index alongside the event update. setDoc(merge:true)
  // self-heals if the index entry is missing (pre-backfill window).
  const batch = writeBatch(db);
  batch.update(doc(db, bp(), 'tournaments', id), { ...data, updatedAt: serverTimestamp() });
  batch.set(doc(db, bp(), 'events_index', id), eventIndexUpdatePatch('tournaments', data), { merge: true });
  return batch.commit();
}
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
  batch.delete(doc(db, b, 'events_index', id)); // § 69 — drop index mirror
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

// One-shot repair for the 2026-05-15 import-shape bug — ScheduleCSVImport
// (and OCR ScheduleImport) historically omitted `division` when creating
// scouted entries, leaving them with division=null. Coach tab's division
// filter then excludes them, making the Teams list appear empty under any
// non-'all' division setting. This helper UPDATES existing entries only
// (no creates, no duplicates) — for each scouted entry where division is
// null/missing, derives the value from the linked team's divisions[league]
// and writes it. Idempotent: rows where division is already set are
// skipped. Rows where the team can't be resolved, or the team has no
// divisions[league] entry, are skipped with a reason captured in the
// returned report so the caller can surface them.
export async function repairScoutedDivisionsForTournament(tid, league) {
  const tournamentRef = doc(db, bp(), 'tournaments', tid);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) {
    return { scanned: 0, updated: 0, skipped: 0, reason: 'tournament not found' };
  }
  const effectiveLeague = league || tournamentSnap.data()?.league || null;
  if (!effectiveLeague) {
    return { scanned: 0, updated: 0, skipped: 0, reason: 'tournament has no league' };
  }

  const scoutedSnap = await getDocs(collection(db, bp(), 'tournaments', tid, 'scouted'));
  const teamsSnap = await getDocs(collection(db, bp(), 'teams'));
  const teamById = new Map(teamsSnap.docs.map(d => [d.id, d.data()]));

  let updated = 0;
  let alreadySet = 0;
  let skippedNoTeam = 0;
  let skippedNoDivision = 0;
  const failures = [];

  for (const d of scoutedSnap.docs) {
    const data = d.data();
    if (data.division) { alreadySet++; continue; }
    const team = teamById.get(data.teamId);
    if (!team) { skippedNoTeam++; continue; }
    const division = (team.divisions || {})[effectiveLeague] || null;
    if (!division) { skippedNoDivision++; continue; }
    try {
      await updateDoc(d.ref, { division, updatedAt: serverTimestamp() });
      updated++;
    } catch (e) {
      failures.push({ id: d.id, error: e.message });
    }
  }

  return {
    scanned: scoutedSnap.size,
    updated,
    alreadySet,
    skippedNoTeam,
    skippedNoDivision,
    failures,
  };
}

/**
 * § 83 B3 repair — narrow over-broad scouted rosters to the team's
 * division-correct players, **preserving every playerId already referenced
 * in this tournament's points** (`homeData.assignments` / `awayData.assignments`)
 * so existing scouted points don't lose their picker entries. Mirror of
 * the write-time fix in `ScoutTabContent.buildScoutedPayload` plus the
 * "already-assigned" union step. Idempotent — re-running on already-
 * narrowed rosters yields the same union, no write.
 *
 * Reads from GLOBAL `/teams/` and `/players/` (Phase 2.x consumption); writes
 * to workspace-scoped `/workspaces/{slug}/tournaments/{tid}/scouted/{sid}`.
 *
 * Returns `{ scanned, updated, unchanged, skippedNoTeam, failures[] }`.
 */
export async function repairScoutedRostersForTournament(tid, league) {
  const tournamentRef = doc(db, bp(), 'tournaments', tid);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) {
    return { scanned: 0, updated: 0, unchanged: 0, skippedNoTeam: 0, failures: [], reason: 'tournament not found' };
  }
  const effectiveLeague = league || tournamentSnap.data()?.league || null;

  const [scoutedSnap, teamsSnap, playersSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, bp(), 'tournaments', tid, 'scouted')),
    getDocs(collection(db, 'teams')),
    getDocs(collection(db, 'players')),
    getDocs(collection(db, bp(), 'tournaments', tid, 'matches')),
  ]);
  const teamById = new Map(teamsSnap.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
  const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Per scouted: collect all playerIds already assigned in points where
  // this scouted is home or away. Walks each match's points subcollection.
  const collectAssignedPids = async (scoutedId) => {
    const pids = new Set();
    const myMatches = matches.filter(m => m.teamA === scoutedId || m.teamB === scoutedId);
    for (const m of myMatches) {
      const side = m.teamA === scoutedId ? 'homeData' : 'awayData';
      const pointsSnap = await getDocs(collection(db, bp(), 'tournaments', tid, 'matches', m.id, 'points'));
      for (const pt of pointsSnap.docs) {
        const data = pt.data();
        const assignments = data[side]?.assignments || [];
        assignments.forEach(pid => { if (pid) pids.add(pid); });
      }
    }
    return pids;
  };

  let updated = 0;
  let unchanged = 0;
  let skippedNoTeam = 0;
  const failures = [];

  for (const d of scoutedSnap.docs) {
    const data = d.data();
    const team = teamById.get(data.teamId);
    if (!team) { skippedNoTeam++; continue; }

    const childIds = [...teamById.values()].filter(t => t.parentTeamId === team.id).map(t => t.id);
    const allIds = [team.id, ...childIds];
    const teamDivision = team.divisions?.[effectiveLeague] || null;
    const finalDivision = teamDivision || data.division || null;

    const matchingIds = finalDivision
      ? allIds.filter(id => {
          const tm = teamById.get(id);
          return tm?.divisions?.[effectiveLeague] === finalDivision;
        })
      : allIds;
    const finalIds = matchingIds.length > 0 ? matchingIds : allIds;
    const narrowedRoster = players
      .filter(p => finalIds.some(id => playerOnTeam(p, id)))
      .map(p => p.id);

    // Orphan-prevention union: keep every pid already assigned in existing
    // points so the picker can still resolve names. Without this, narrowing
    // could drop a player who's mid-scouted and silently hide their name.
    const alreadyAssigned = await collectAssignedPids(d.id);
    const merged = new Set(narrowedRoster);
    alreadyAssigned.forEach(pid => merged.add(pid));
    const newRoster = [...merged];

    const currentRoster = data.roster || [];
    const currentSet = new Set(currentRoster);
    const sameSize = currentSet.size === merged.size;
    const sameMembers = sameSize && [...currentSet].every(p => merged.has(p));

    if (sameMembers) { unchanged++; continue; }
    try {
      await updateDoc(d.ref, { roster: newRoster, updatedAt: serverTimestamp() });
      updated++;
    } catch (e) {
      failures.push({ id: d.id, error: e.message });
    }
  }

  return {
    scanned: scoutedSnap.size,
    updated,
    unchanged,
    skippedNoTeam,
    failures,
  };
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
    // ── Schedule CSV import (2026-05-13). Additive — pre-import matches +
    // OCR ScheduleImport-created matches simply lack these fields. Readers
    // (MatchCard pill, sort helpers, ScoutedTeamPage match list) fall back
    // to the existing string `date` / `time` when scheduledAt is absent.
    scheduledAt: data.scheduledAt || null, // Firestore Timestamp or null
    field: data.field || null,
    round: data.round || null,
    group: data.group || null,
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

// ─── POST-CLOSE EDIT (Bug 7, 2026-05-12) ───
// Closed matches stay 'closed' for the whole flow. `editLockReleased` is the
// opt-in flag that lets a user (typically Jacek post-stream) add/edit points
// after the match was marked FINAL without spinning up the live-tracking /
// claim machinery. When the user flips back to closed via `Zamknij ponownie`,
// we recompute scoreA/scoreB from canonical points so aggregates reflect any
// new outcomes recorded during the unlocked window.
export async function setMatchEditLockReleased(tid, mid, released) {
  return updateDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid), {
    editLockReleased: !!released,
    updatedAt: serverTimestamp(),
  });
}

export async function recomputeMatchAggregates(tid, mid) {
  const pointsCol = collection(db, bp(), 'tournaments', tid, 'matches', mid, 'points');
  // Only canonical points contribute to score. endMatchAndMerge marks one
  // canonical doc per logical point (legacy + solo + merged paths all set
  // canonical=true). Pre-merge per-coach drafts excluded.
  const snap = await getDocs(query(pointsCol, where('canonical', '==', true)));
  let scoreA = 0, scoreB = 0;
  snap.docs.forEach(d => {
    const outcome = d.data().outcome;
    if (outcome === 'win_a') scoreA++;
    else if (outcome === 'win_b') scoreB++;
  });
  await updateDoc(doc(db, bp(), 'tournaments', tid, 'matches', mid), {
    scoreA, scoreB, updatedAt: serverTimestamp(),
  });
  return { scoreA, scoreB };
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
  const payload = {
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
  };
  // § 69 — event doc + events_index mirror written atomically.
  const ref = doc(collection(db, bp(), 'trainings'));
  const batch = writeBatch(db);
  batch.set(ref, payload);
  batch.set(doc(db, bp(), 'events_index', ref.id), eventIndexCreateEntry('trainings', payload));
  await batch.commit();
  return ref;
}
export async function updateTraining(tid, data) {
  // § 69 — mirror the index alongside the event update (setDoc merge — see
  // updateTournament). updateTrainingSquadName needs no index write (squad
  // names are not a mirrored field).
  const batch = writeBatch(db);
  batch.update(doc(db, bp(), 'trainings', tid), { ...data, updatedAt: serverTimestamp() });
  batch.set(doc(db, bp(), 'events_index', tid), eventIndexUpdatePatch('trainings', data), { merge: true });
  await batch.commit();
  // § 70 Stage 1b — closing a training propagates orphan selfReports across
  // ALL its matchups (catches matchups never explicitly merged). Best-effort:
  // a propagation failure must not fail the training-close write.
  if (data.status === 'closed') {
    try {
      await propagateTraining(tid);
    } catch (e) {
      if (import.meta.env.DEV) console.warn(`updateTraining: propagateTraining failed for ${tid}`, e);
    }
  }
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
  batch.delete(doc(db, b, 'events_index', tid)); // § 69 — drop index mirror
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

/**
 * § 70 (Klocek 2) — get or create a training's single "Free play" matchup:
 * an orphan container (no squad-vs-squad) for coach quick-logs that aren't a
 * structured scrimmage. Idempotent — returns the existing isFreePlay matchup
 * or creates one.
 *
 * DORMANT in Stage 1 — no consumer yet (like useEvents / slotIds when first
 * shipped). The "Log free play" entry point + the squad-less QuickLogView
 * mode that will call this arrive in Stage 1b. Training-only — sparing keeps
 * its natural us-vs-opponent match, no free-play container needed.
 * isFreePlay matchups may later be hidden from the matchup-list UI.
 *
 * @param {string} trainingId
 * @returns {Promise<DocumentReference>}
 */
export async function getOrCreateFreePlayMatchup(trainingId) {
  const col = collection(db, bp(), 'trainings', trainingId, 'matchups');
  const existing = await getDocs(query(col, where('isFreePlay', '==', true), limit(1)));
  if (!existing.empty) return existing.docs[0].ref;
  return addDoc(col, {
    isFreePlay: true,
    homeSquad: null,
    awaySquad: null,
    homeRoster: [],
    awayRoster: [],
    name: 'Free play',
    scoreA: 0,
    scoreB: 0,
    status: 'playing',
    createdAt: serverTimestamp(),
  });
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
  // § 70 Stage 2 — propagate orphan selfReports into this matchup's points.
  // Best-effort: a propagation failure must not fail the merge.
  try {
    await propagateMatchup(trid, mid);
  } catch (e) {
    if (import.meta.env.DEV) console.warn(`endMatchupAndMerge: propagation failed for ${mid}`, e);
  }
  return { merged: 0, unmerged: unmergedCount };
}

// ─── OBSERVATION PROPAGATOR (§ 70 / Klocek 2 Stage 2) ───────────────────
// Matches orphan training selfReports → point slots and writes the
// observation back into homeData/awayData with _meta source:'self'. Identity
// (assignments.indexOf) is the primary locator; temporal sequence + position
// are confidence. Idempotent — propagatedAt gates re-writes; the FULL report
// set is sequence-aligned each run so re-runs + late additions stay stable.
// See docs/architecture/MULTISOURCE_RECONCILIATION.md §§ 4-5.

/**
 * Normalise a per-slot field (playersMeta / shotsMeta / eliminationsMeta /
 * players / slotIds) to a 5-element array. Accepts an array, a map (repairs
 * past dotted-path corruption — see PROJECT_GUIDELINES § 9), or undefined.
 */
function normaliseSlots(v) {
  const out = [null, null, null, null, null];
  if (Array.isArray(v)) {
    for (let i = 0; i < 5; i += 1) out[i] = v[i] ?? null;
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < 5) out[i] = val ?? null;
    }
  }
  return out;
}

/**
 * Shared write-back — used post-hoc by the propagator (source:'self') AND
 * live by the KIOSK lobby (source:'kiosk'). Marks the slot's _meta provenance,
 * fills players[slot] ONLY when empty (never overwrites a scout/coach
 * position), mirrors shots to the point's shots subcollection.
 *
 * Reads the point FRESH and writes WHOLE per-slot arrays — a dotted-path
 * `field.slot` updateDoc converts the array to a map and destroys the other
 * indices (PROJECT_GUIDELINES § 9). The fresh read also lets sequential calls
 * on the same point (different slots) each see the prior write.
 *
 * @returns {Promise<string|null>} the bound slotId (slotIds[slot]).
 */
export async function propagateSelfReportToPoint({
  trainingId, matchupId, pointId, sideKey, slot,
  observation, playerId, writerUid, source, layoutBunkers,
}) {
  const pointRef = doc(db, bp(), 'trainings', trainingId, 'matchups', matchupId, 'points', pointId);
  const pSnap = await getDoc(pointRef);
  if (!pSnap.exists()) return null;
  const sideData = pSnap.data()[sideKey] || {};
  const slotIds = normaliseSlots(sideData.slotIds);
  const meta = makeMeta(source, writerUid);
  const update = {};

  // WHOLE-array writes (never dotted `field.slot` — § 9). normaliseSlots also
  // repairs any past map-corruption on the field it touches.
  const playersMeta = normaliseSlots(sideData.playersMeta);
  playersMeta[slot] = meta;
  update[`${sideKey}.playersMeta`] = playersMeta;

  // Position — fill players[slot] only when empty. Synthetic coord from the
  // self-reported breakout bunker (bunkerToPosition, fieldSide from the side).
  if (!sideData.players?.[slot] && observation?.breakout?.bunker) {
    const bunker = (layoutBunkers || []).find(
      b => (b.positionName || b.name) === observation.breakout.bunker,
    );
    const synth = bunker ? bunkerToPosition(bunker, sideData.fieldSide || null) : null;
    if (synth) {
      const players = normaliseSlots(sideData.players);
      players[slot] = synth;
      update[`${sideKey}.players`] = players;
    }
  }

  const shots = Array.isArray(observation?.shots) ? observation.shots : [];
  if (shots.length > 0) {
    const shotsMeta = normaliseSlots(sideData.shotsMeta);
    shotsMeta[slot] = meta;
    update[`${sideKey}.shotsMeta`] = shotsMeta;
  }
  if (typeof observation?.outcome === 'string' && observation.outcome.startsWith('elim_')) {
    const eliminationsMeta = normaliseSlots(sideData.eliminationsMeta);
    eliminationsMeta[slot] = meta;
    update[`${sideKey}.eliminationsMeta`] = eliminationsMeta;
  }

  await updateTrainingPoint(trainingId, matchupId, pointId, update);

  // Shots → the point's shots subcollection (synthetic xy from bunker centre).
  for (const s of shots) {
    if (!s?.bunker) continue;
    const b = (layoutBunkers || []).find(
      bb => (bb.positionName || bb.name) === s.bunker,
    );
    await addSelfLogShotTraining(trainingId, matchupId, pointId, {
      playerId: playerId || writerUid,
      scoutedBy: writerUid,
      breakout: observation?.breakout?.bunker || null,
      breakoutVariant: observation?.breakout?.variant || observation?.variant || null,
      targetBunker: s.bunker,
      result: s.result || 'unknown',
      x: b?.x ?? 0.5,
      y: b?.y ?? 0.5,
      layoutId: observation?.layoutId || null,
      tournamentId: trainingId,
    });
  }

  return slotIds[slot] ?? null;
}

/**
 * Match + write-back every training selfReport that resolves into a point of
 * this matchup. Idempotent — propagatedAt-stamped reports are skip-written.
 *
 * @returns {Promise<{matched: number, flagged: number, orphan: number}>}
 */
export async function propagateMatchup(trainingId, matchupId) {
  const b = bp();
  let layoutBunkers = [];
  const trSnap = await getDoc(doc(db, b, 'trainings', trainingId));
  const layoutId = trSnap.exists() ? trSnap.data().layoutId : null;
  if (layoutId) {
    const lSnap = await getDoc(doc(db, b, 'layouts', layoutId));
    if (lSnap.exists()) layoutBunkers = lSnap.data().bunkers || [];
  }

  const ptSnap = await getDocs(
    collection(db, b, 'trainings', trainingId, 'matchups', matchupId, 'points'),
  );
  const points = ptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (points.length === 0) return { matched: 0, flagged: 0, orphan: 0 };

  // Candidate players — every assigned playerId across the matchup's points.
  const playerIds = new Set();
  for (const pt of points) {
    for (const sk of ['homeData', 'awayData']) {
      for (const pid of (pt[sk]?.assignments || [])) {
        if (pid) playerIds.add(pid);
      }
    }
  }

  let matched = 0, flagged = 0, orphan = 0;
  for (const playerId of playerIds) {
    // This player's selfReports for the training. Single where on trainingId
    // uses the auto single-field index — no composite index needed; the
    // propagatedAt gate is applied in JS so the sequence aligns on the FULL
    // set (stable across re-runs + late additions).
    const srSnap = await getDocs(query(
      collection(db, b, 'players', playerId, 'selfReports'),
      where('trainingId', '==', trainingId),
    ));
    const reports = srSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }));
    if (reports.length === 0) continue;

    const locatedPoints = points.filter(pt => locatePlayerInPoint(pt, playerId));
    if (locatedPoints.length === 0) {
      orphan += reports.filter(r => !r.propagatedAt && !r.needsReview && !r.reviewDismissedAt).length;
      continue;
    }

    const pairs = alignSequence(reports, locatedPoints);
    const pairedIds = new Set(pairs.map(p => p.selfReport.id));
    orphan += reports.filter(
      r => !pairedIds.has(r.id) && !r.propagatedAt && !r.needsReview && !r.reviewDismissedAt,
    ).length;

    const pSnap = await getDoc(doc(db, b, 'players', playerId));
    const writerUid = (pSnap.exists() && pSnap.data().linkedUid) || playerId;

    for (const { selfReport, point } of pairs) {
      // § 70.11 — skip propagated (already written) AND review-dismissed
      // (coach decided "not a match") reports. Both stay in the alignSequence
      // input so pairing is stable across re-runs; the skip is per-pair.
      if (selfReport.propagatedAt || selfReport.reviewDismissedAt) continue;
      const loc = locatePlayerInPoint(point, playerId);
      const sideData = point[loc.sideKey] || {};
      const conf = positionConfidence(selfReport, point, loc.sideKey, loc.slot, layoutBunkers);
      if (conf === 'low') {
        // Position contradicts identity — flag for Stage 4 review, no write-back.
        await updateDoc(selfReport.ref, {
          needsReview: true,
          candidateSlotRef: sideData.slotIds?.[loc.slot] ?? null,
        });
        flagged += 1;
        continue;
      }
      // 'high' | 'unknown' → write-back. Identity is the primary locator;
      // 'unknown' = position simply unverifiable (no slot coord), not a
      // contradiction — most QuickLog slots carry no coord.
      const slotId = await propagateSelfReportToPoint({
        trainingId, matchupId, pointId: point.id,
        sideKey: loc.sideKey, slot: loc.slot,
        observation: selfReport, playerId, writerUid,
        source: 'self', layoutBunkers,
      });
      await updateDoc(selfReport.ref, {
        slotRef: slotId,
        propagatedAt: serverTimestamp(),
      });
      matched += 1;
    }
  }
  return { matched, flagged, orphan };
}

/**
 * § 70 Stage 1b trigger — run propagateMatchup across every matchup of a
 * training. Hooked into updateTraining(status:'closed'). Idempotent;
 * per-matchup failures don't abort the loop.
 *
 * @returns {Promise<{matched: number, flagged: number}>}
 */
export async function propagateTraining(trainingId) {
  const muSnap = await getDocs(collection(db, bp(), 'trainings', trainingId, 'matchups'));
  let matched = 0, flagged = 0;
  for (const mu of muSnap.docs) {
    try {
      const r = await propagateMatchup(trainingId, mu.id);
      matched += r.matched;
      flagged += r.flagged;
    } catch (e) {
      if (import.meta.env.DEV) console.warn(`propagateTraining: matchup ${mu.id} failed`, e);
    }
  }
  return { matched, flagged };
}

/**
 * § 70.11 Stage 4 — manual override. Accept a flagged (low-confidence)
 * selfReport into a point slot, or reassign it to a different located point.
 * Reuses the propagator write primitive; stamps the report propagated and
 * clears needsReview. The selfReport OBSERVATION is never rewritten.
 */
export async function applySelfReportOverride({
  trainingId, matchupId, pointId, sideKey, slot, playerId, selfReportId,
}) {
  const b = bp();
  const srRef = doc(db, b, 'players', playerId, 'selfReports', selfReportId);
  const srSnap = await getDoc(srRef);
  if (!srSnap.exists()) return null;
  const observation = { id: srSnap.id, ...srSnap.data() };

  let layoutBunkers = [];
  const trSnap = await getDoc(doc(db, b, 'trainings', trainingId));
  const layoutId = trSnap.exists() ? trSnap.data().layoutId : null;
  if (layoutId) {
    const lSnap = await getDoc(doc(db, b, 'layouts', layoutId));
    if (lSnap.exists()) layoutBunkers = lSnap.data().bunkers || [];
  }
  const pSnap = await getDoc(doc(db, b, 'players', playerId));
  const writerUid = (pSnap.exists() && pSnap.data().linkedUid) || playerId;

  const slotId = await propagateSelfReportToPoint({
    trainingId, matchupId, pointId, sideKey, slot,
    observation, playerId, writerUid, source: 'self', layoutBunkers,
  });
  await updateDoc(srRef, {
    slotRef: slotId,
    propagatedAt: serverTimestamp(),
    needsReview: false,
  });
  return slotId;
}

/**
 * § 70.11 Stage 4 — dismiss a flagged selfReport ("not a match"). Sticky:
 * reviewDismissedAt makes propagateMatchup skip it on every future re-run, so
 * a training re-close never re-flags it. Observation untouched.
 */
export async function dismissSelfReportFlag({ playerId, selfReportId }) {
  await updateDoc(
    doc(db, bp(), 'players', playerId, 'selfReports', selfReportId),
    { needsReview: false, reviewDismissedAt: serverTimestamp() },
  );
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
        // _ctx carries display names (tournament/match) + 1-indexed point
        // number + raw IDs. IDs added in Brief B § 61 (additive — existing
        // consumers use only the name fields). Stage 2+ scope filter pickers
        // use the ID fields; Stage 3 filters by them.
        _ctx: {
          tournament: tName, match: mName, pointIdx: pi + 1,
          tournamentId: tid, matchId: mid, pointId: pDoc.id,
        },
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

// Set the cross-workspace global role on /users/{uid} (§ 66.2, Phase 3.b).
// role ∈ {'super_admin', null}. null = standard user — workspace-scoped roles
// per § 38 apply. UI gating is super_admin-only (useIsSuperAdmin); server-side
// Firestore-rules enforcement lands in Phase 3.c.
export async function setUserGlobalRole(uid, role) {
  if (role !== 'super_admin' && role !== null) {
    throw new Error(`Invalid globalRole: ${role}. Must be 'super_admin' or null.`);
  }
  return updateDoc(doc(db, 'users', uid), { globalRole: role });
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
  // Defense in depth (the UI also disables the Wyjdź button) — a workspace
  // adminUid holder or platform super_admin must not self-leave: the former
  // orphans the adminUid pointer, the latter is a silent no-op (auto-re-
  // enters the default workspace). UX bug bundle 2026-05-20 Bug 1.
  const wsSnap = await getDoc(doc(db, bp()));
  if (wsSnap.exists() && wsSnap.data().adminUid === uid) {
    throw new Error('WORKSPACE_ADMIN_CANNOT_LEAVE');
  }
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists() && userSnap.data().globalRole === 'super_admin') {
    throw new Error('SUPER_ADMIN_CANNOT_LEAVE');
  }
  return removeMember(null, uid);
}

// § 85 B2 (c) — link ops MIGRATED from workspace `/workspaces/{slug}/players/`
// to global `/players/` (canonical post Phase 2.2.b). Rules-side workspace-
// scoping via `isMember(resource.data.ownerWorkspaceId)` ensures a user can
// only self-link to a player IN THEIR OWN WORKSPACE — wider read of global
// `/players/` collection does NOT grant cross-workspace claim ability.
//
// Workspace `linkedUid` values stay as backstop per the § 85 / Jacek decision
// (cleanup deferred to Phase 2.2.d alongside the rest of the workspace
// players cleanup). Writes here are GLOBAL-ONLY — workspace mirror would
// re-invoke the workspace self-link rule which gates on `isPlayer(slug)`
// (workspace role), failing for the very users this fix targets.
//
// **PRE-FLIGHT gotcha:** Firestore rules `affectedKeys().hasOnly([...])`
// requires `updateDoc({field: value})` — NOT `setDoc({merge: true})` with
// dot-notation keys, which Firestore would parse as nested-map sets.

// Admin link override (§ 50.4) — admin assigns a player profile to a user,
// possibly overriding an existing link on either side. Atomic transaction:
// (a) clears any other player currently linked to this uid, (b) clears
// targetPlayer's existing linkedUid if it points to a different user,
// (c) sets targetPlayer.linkedUid = uid + linkedAt.
// pbliIdFull is preserved as-is (we don't fabricate one — admin can ask the
// user to complete PBLI onboarding later if missing).
// § 85 — Rules: admin satisfies `isSuperAdmin() || isWorkspaceAdminOf(...)`
// on the global block (mirror of workspace `isCoach(slug)`); structural-write
// path already covers admin.
export async function adminLinkPlayer(targetPlayerId, uid) {
  if (!targetPlayerId || !uid) throw new Error('targetPlayerId + uid required');
  const targetRef = doc(db, 'players', targetPlayerId);
  return runTransaction(db, async (tx) => {
    // READS first per Firestore transaction rules.
    const existingLinks = await getDocs(query(
      collection(db, 'players'),
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

// Self-link (§ 33.3 / § 49.8 Path A / § 85 global migration) — authenticated
// user claims an unlinked global player doc. Firestore rule (§ 85 carve-out
// on global `/players/{pid}` block) allows this when:
//   - `resource.data.get('linkedUid', null) == null`
//   - `request.resource.data.linkedUid == request.auth.uid`
//   - `affectedKeys().hasOnly(['linkedUid','pbliIdFull','linkedAt'])`
//   - `isMember(resource.data.ownerWorkspaceId)` — workspace-scoping
// Throws 'ALREADY_LINKED' if another user beat us to it between fetch + write.
export async function selfLinkPlayer(playerId, uid) {
  if (!playerId || !uid) throw new Error('playerId + uid required');
  const ref = doc(db, 'players', playerId);
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

// Self-unlink (§ 33.3 / § 49.8 Path A / § 85 global migration) — currently-
// linked user clears their own link. Rule carve-out on global `/players/{pid}`:
// `resource.data.linkedUid == auth.uid` + `request.resource.data.linkedUid == null`,
// diff restricted to ['linkedUid','pbliIdFull','unlinkedAt']. User keeps
// workspace membership + roles; can re-link later.
export async function selfUnlinkPlayer(playerId) {
  if (!playerId) throw new Error('playerId required');
  return updateDoc(doc(db, 'players', playerId), {
    linkedUid: null,
    unlinkedAt: serverTimestamp(),
  });
}

// Admin unlink (§ 50.4 / § 85 global migration) — clears linkedUid on the
// global player doc; user keeps workspace membership + roles. Rules: admin
// path on the global block (`isSuperAdmin() || isWorkspaceAdminOf(...)`).
export async function adminUnlinkPlayer(playerId) {
  if (!playerId) throw new Error('playerId required');
  return updateDoc(doc(db, 'players', playerId), {
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
// § 85 B2 (c) — listens on GLOBAL `/players/` now (was workspace). Pairs with
// the migrated link/unlink write paths so subscribeLinkedPlayer reflects new
// global writes immediately. Read rule on global `/players/` allows any auth
// user (rules `:416 allow read: if request.auth != null`), so cross-workspace
// listening is OK; the write-side workspace-scoping carve-out is what gates
// who can become linkedUid.
export function subscribeLinkedPlayer(uid, cb) {
  if (!uid) { cb(null); return () => {}; }
  const q = query(
    collection(db, 'players'),
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
