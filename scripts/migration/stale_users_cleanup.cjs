/**
 * STALE USER-ACCOUNT CLEANUP — STEP 1b GUARDED DELETE.
 *
 * Brief: "Stale user cleanup STEP 1 (guarded delete) — FINAL".
 * Hard-deletes the 3 ghost /users docs of SET (a) and strips their workspace
 * references (members[] + userRoles{}). SET (b) test accounts and the ~565
 * B15 userRoles stragglers are OUT OF SCOPE and untouched.
 *
 * The 3 set-(a) ghost uids (no email, no Auth account, no authored data, no
 * linkedUid — per STEP 0 audit). The script RE-VERIFIES that invariant on
 * every run and ABORTS (deletes nothing) if any candidate now shows: a backing
 * Auth account, an email, authored contributed data, or a linkedUid reference.
 *
 * Per uid the --live path does exactly:
 *   - workspace ref-strip: members: arrayRemove(uid), userRoles.{uid}: delete()
 *   - hard-delete /users/{uid}
 * Batched, idempotent (arrayRemove / FieldValue.delete / doc-delete on an
 * already-clean state are no-ops).
 *
 * RUN:
 *   set GOOGLE_APPLICATION_CREDENTIALS=...adminsdk....json
 *   node scripts/migration/stale_users_cleanup.cjs --dry    # default; report only
 *   node scripts/migration/stale_users_cleanup.cjs --live   # Jacek GO required
 *
 * Parity after --live: /users 21 -> 18; the 3 uids gone from members/userRoles;
 * set (b) untouched; the ~565 B15 stragglers untouched.
 */

const admin = require('firebase-admin');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the admin-SDK service-account JSON path.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });

const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

// SET (a) — the only uids this script may touch. Hard-coded allow-list.
const TARGET_UIDS = [
  '3phU9z8EwHV4yqQCXs773kZm0iA3',
  'RjY7ipbcziWPrWziU97ZgBPEEPb2',
  'WYLNY50RyHatmRug9kVb0ke5wM02',
];

// Authorship checks. CANONICAL = the indexed fields production `hasEverWritten`
// uses; a hit on any is contributed DATA and aborts the delete. EXTRA =
// coachUid / points.createdBy: these are only ever set alongside scoutedBy when
// a point has real side-data (on their own they'd flag an empty shell = no
// data), AND they lack a collection-group index. Treated best-effort: a hit
// aborts; a missing-index error is reported as UNVERIFIED (the canonical
// scoutedBy checks already cover real contributed data).
const AUTHORSHIP_CHECKS = [
  { cg: 'points', field: 'homeData.scoutedBy', canonical: true },
  { cg: 'points', field: 'awayData.scoutedBy', canonical: true },
  { cg: 'tactics', field: 'createdBy', canonical: true },
  { cg: 'notes', field: 'createdBy', canonical: true },
  { cg: 'points', field: 'coachUid', canonical: false },
  { cg: 'points', field: 'createdBy', canonical: false },
];

async function hasAuthAccount(uid) {
  try { await auth.getUser(uid); return true; }
  catch (e) { if (e.code === 'auth/user-not-found') return false; throw e; }
}

// Returns { authored: 'cg.field'|null, unverified: ['cg.field', …] }.
// authored != null => contributed data found => ABORT. unverified lists
// best-effort checks skipped due to a missing index (reported, not fatal).
async function authoredAnything(uid) {
  const unverified = [];
  for (const { cg, field, canonical } of AUTHORSHIP_CHECKS) {
    try {
      const snap = await db.collectionGroup(cg).where(field, '==', uid).limit(1).get();
      if (!snap.empty) return { authored: `${cg}.${field}`, unverified };
    } catch (e) {
      if (e.code === 5 || e.code === 9 || /index/i.test(e.message || '')) {
        unverified.push(`${cg}.${field}`);          // missing index
        if (canonical) throw e;                       // canonical MUST be verifiable
      } else {
        throw e;
      }
    }
  }
  return { authored: null, unverified };
}

// Build linkedUid -> [paths] once via a full player scan (global + legacy
// workspace). Index-free (no where()), matching the STEP 0 audit method —
// linkedUid is a HARD invariant so it must be verified reliably, not skipped.
async function buildLinkedMap() {
  const map = new Map();
  const add = (lu, path) => { if (!lu) return; if (!map.has(lu)) map.set(lu, []); map.get(lu).push(path); };
  const g = await db.collection('players').get();
  g.forEach(d => add(d.data().linkedUid, `global:${d.id}`));
  const w = await db.collectionGroup('players').get();
  w.forEach(d => { if (d.ref.path.startsWith('workspaces/')) add(d.data().linkedUid, d.ref.path); });
  return map;
}

(async () => {
  const isLive = process.argv.includes('--live');
  const mode = isLive ? 'LIVE' : 'DRY';
  console.log('');
  console.log('================================================================');
  console.log(` STALE USER CLEANUP — STEP 1b GUARDED DELETE  [${mode}]`);
  console.log('================================================================');
  console.log('');

  // Discover workspace references for the targets.
  const wsSnap = await db.collection('workspaces').get();
  const targetSet = new Set(TARGET_UIDS);
  const refsByUid = new Map(TARGET_UIDS.map(u => [u, []])); // uid -> [{slug, inMembers, inUserRoles}]
  wsSnap.forEach(d => {
    const ws = d.data();
    const members = new Set(Array.isArray(ws.members) ? ws.members : []);
    const roleKeys = new Set(Object.keys(ws.userRoles || {}));
    for (const uid of targetSet) {
      const inMembers = members.has(uid);
      const inUserRoles = roleKeys.has(uid);
      if (inMembers || inUserRoles) refsByUid.get(uid).push({ slug: d.id, inMembers, inUserRoles });
    }
  });

  // Player scan for the linkedUid invariant (index-free, one pass).
  const linkedMap = await buildLinkedMap();

  // RE-VERIFY INVARIANT per target. Abort on any violation.
  console.log('── Invariant re-check (abort on any violation) ──');
  const violations = [];
  const plan = []; // { uid, refs:[{slug,inMembers,inUserRoles}] }
  for (const uid of TARGET_UIDS) {
    const userSnap = await db.doc(`users/${uid}`).get();
    const email = userSnap.exists ? (userSnap.data().email || null) : null;
    const hasAuth = await hasAuthAccount(uid);
    const { authored, unverified } = await authoredAnything(uid);
    const linked = linkedMap.get(uid) || [];
    const refs = refsByUid.get(uid);

    const v = [];
    if (!userSnap.exists) v.push('NO /users doc (already deleted?)');
    if (email) v.push(`HAS email=${email}`);
    if (hasAuth) v.push('HAS Auth account');
    if (authored) v.push(`AUTHORED ${authored}`);
    if (linked.length) v.push(`linkedUid -> ${linked.join(', ')}`);

    const refLabel = refs.length
      ? refs.map(r => `${r.slug}(${[r.inMembers && 'members', r.inUserRoles && 'userRoles'].filter(Boolean).join('+')})`).join(', ')
      : '(no workspace refs)';
    const unvLabel = unverified.length ? `  [unverified (no index, non-canonical): ${unverified.join(', ')}]` : '';
    if (v.length) {
      violations.push({ uid, v });
      console.log(`  ✗ ${uid}  VIOLATION: ${v.join(' | ')}`);
    } else {
      plan.push({ uid, refs });
      console.log(`  ✓ ${uid}  clean (no email, no Auth, no authored data, no linkedUid)  refs=${refLabel}${unvLabel}`);
    }
  }
  console.log('');

  if (violations.length) {
    console.log('🔴 ABORT — invariant violated for one or more candidates. Nothing deleted.');
    console.log('   Escalate to Jacek; do not improvise.');
    process.exit(1);
  }

  // Build the planned operations.
  console.log('── Planned operations ──');
  let stripOps = 0, deleteOps = 0;
  for (const { uid, refs } of plan) {
    for (const r of refs) {
      const parts = [];
      if (r.inMembers) parts.push('members: arrayRemove');
      if (r.inUserRoles) parts.push(`userRoles.${uid.slice(0, 8)}…: delete`);
      console.log(`  ref-strip  workspaces/${r.slug}  { ${parts.join(', ')} }`);
      stripOps++;
    }
    console.log(`  delete     users/${uid}`);
    deleteOps++;
  }
  console.log('');
  console.log(`  ref-strips: ${stripOps}  |  user-doc deletes: ${deleteOps}`);
  console.log('');

  if (!isLive) {
    console.log('[DRY] No changes made. Re-run with --live (Jacek GO) to execute.');
    process.exit(0);
  }

  // ── LIVE ──
  console.log('── LIVE execution ──');
  const batch = db.batch();
  for (const { uid, refs } of plan) {
    for (const r of refs) {
      const update = {};
      if (r.inMembers) update.members = FieldValue.arrayRemove(uid);
      if (r.inUserRoles) update[`userRoles.${uid}`] = FieldValue.delete();
      batch.update(db.doc(`workspaces/${r.slug}`), update);
    }
    batch.delete(db.doc(`users/${uid}`));
  }
  await batch.commit();
  console.log(`  committed: ${stripOps} ref-strips + ${deleteOps} user-doc deletes.`);
  console.log('');

  // Parity verify.
  console.log('── Parity verify ──');
  const usersAfter = await db.collection('users').get();
  console.log(`  /users docs now: ${usersAfter.size} (expected 18)`);
  const wsAfter = await db.collection('workspaces').get();
  let stragglers = 0;
  wsAfter.forEach(d => {
    const ws = d.data();
    const members = new Set(Array.isArray(ws.members) ? ws.members : []);
    const roleKeys = new Set(Object.keys(ws.userRoles || {}));
    for (const uid of TARGET_UIDS) {
      if (members.has(uid) || roleKeys.has(uid)) {
        stragglers++;
        console.log(`  ✗ ${uid} still referenced in workspaces/${d.id}`);
      }
    }
  });
  let docsLeft = 0;
  for (const uid of TARGET_UIDS) {
    const s = await db.doc(`users/${uid}`).get();
    if (s.exists) { docsLeft++; console.log(`  ✗ users/${uid} still exists`); }
  }
  if (!stragglers && !docsLeft) console.log('  ✓ all 3 targets gone from /users + members/userRoles.');
  console.log('');
  console.log('  DONE. Set (b) test accounts + ~565 B15 stragglers untouched (out of scope).');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
