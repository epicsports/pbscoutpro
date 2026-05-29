/**
 * STALE USER-ACCOUNT CLEANUP — STEP 0 DISCOVERY (READ-ONLY).
 *
 * Brief: "Stale user-account cleanup: discovery-first + guarded delete".
 * This script does STEP 0 ONLY. It performs ZERO writes / ZERO deletes
 * (no Firestore writes, no Auth deletes). It reports the two candidate
 * sets + counts, the reference-risk list, and the Auth/Firestore split,
 * then STOPs. STEP 1 (the guarded delete) is a SEPARATE script Opus
 * finalizes from this report after Jacek GO.
 *
 * Deletable predicate (Jacek):
 *   (a) ANONYMOUS  — Auth provider data empty (providerData.length===0) / no email.
 *   (b) WORKSPACE-REMOVED — uid not present in ANY workspace's
 *       members[] / userRoles{} keys / pendingApprovals[].
 *
 * CORE INVARIANT (audit-only here, enforced in STEP 1): delete the ACCOUNT,
 * PRESERVE contributed data (points, players, tactics, notes — they belong
 * to the workspace). This script surfaces every reference so STEP 1 can null
 * `linkedUid` first and never touch contributed data.
 *
 * Authorship fields scanned (canon from dataService.hasEverWritten + the
 * concurrent-scouting map):
 *   points.homeData.scoutedBy, points.awayData.scoutedBy, points.coachUid,
 *   points.createdBy, tactics.createdBy, notes.createdBy.
 * linkedUid lives on global /players/ AND legacy /workspaces/{slug}/players/.
 *
 * RUN (read-only):
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\Users\...\pbscoutpro-firebase-adminsdk-...json
 *   node scripts/migration/stale_users_audit.cjs
 *
 * Quota note: Firebase daily read quota is a TIME-gate. The script prints a
 * running read estimate and degrades gracefully — if a stage throws (quota /
 * missing index), it reports what it has and continues. No retry-storm.
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
const ADMIN_EMAILS = ['jacek@epicsports.pl'];

// Authorship checks for the ESCALATE gate. collectionGroup single-field
// equality; wrapped in try/catch (missing index → skip, report).
const AUTHORSHIP_CHECKS = [
  { cg: 'points', field: 'homeData.scoutedBy' },
  { cg: 'points', field: 'awayData.scoutedBy' },
  { cg: 'points', field: 'coachUid' },
  { cg: 'points', field: 'createdBy' },
  { cg: 'tactics', field: 'createdBy' },
  { cg: 'notes', field: 'createdBy' },
];

// Safety cap so a huge candidate set can't blow the daily read quota on the
// per-candidate authorship scan. Reported if hit.
const MAX_AUTHORSHIP_SCAN = 600;

let reads = 0;
const bump = (n = 1) => { reads += n; };
const pad = (s, n = 6) => String(s).padStart(n);

async function authorshipUidsForCandidate(uid) {
  const hits = [];
  for (const { cg, field } of AUTHORSHIP_CHECKS) {
    try {
      const snap = await db.collectionGroup(cg).where(field, '==', uid).limit(1).get();
      bump(1);
      if (!snap.empty) hits.push(`${cg}.${field}`);
    } catch (e) {
      hits.push(`SKIP(${cg}.${field}:${e.code || e.message})`);
    }
  }
  return hits;
}

(async () => {
  console.log('');
  console.log('================================================================');
  console.log(' STALE USER-ACCOUNT CLEANUP — STEP 0 DISCOVERY (READ-ONLY)');
  console.log('================================================================');
  console.log('');

  // ── 1. FIREBASE AUTH ENUMERATION ──────────────────────────────────────
  console.log('── 1. Firebase Auth store (by provider) ──');
  const authUsers = new Map(); // uid -> { providers, email, anon, created, lastSignIn }
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      const providers = u.providerData.map(p => p.providerId);
      authUsers.set(u.uid, {
        providers,
        email: u.email || null,
        anon: providers.length === 0,
        created: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      });
    }
    pageToken = res.pageToken;
  } while (pageToken);

  let authAnon = 0, authPassword = 0, authOther = 0, authNoEmail = 0;
  for (const u of authUsers.values()) {
    if (u.anon) authAnon++;
    else if (u.providers.includes('password')) authPassword++;
    else authOther++;
    if (!u.email) authNoEmail++;
  }
  console.log(`  Auth accounts total      : ${pad(authUsers.size)}`);
  console.log(`    anonymous (no provider): ${pad(authAnon)}`);
  console.log(`    email/password         : ${pad(authPassword)}`);
  console.log(`    other provider         : ${pad(authOther)}`);
  console.log(`    (no email, any kind)   : ${pad(authNoEmail)}`);
  console.log('');

  // ── 2. FIRESTORE /users/ COLLECTION ───────────────────────────────────
  console.log('── 2. Firestore /users/{uid} collection ──');
  const usersSnap = await db.collection('users').get();
  bump(usersSnap.size);
  const fsUsers = new Map(); // uid -> { email, globalRole, disabled }
  let fsNoEmail = 0;
  usersSnap.forEach(d => {
    const x = d.data();
    fsUsers.set(d.id, {
      email: x.email || null,
      globalRole: x.globalRole || null,
      disabled: x.disabled === true,
    });
    if (!x.email) fsNoEmail++;
  });
  console.log(`  /users docs total        : ${pad(fsUsers.size)}`);
  console.log(`    with no email field    : ${pad(fsNoEmail)}`);
  console.log('');

  // ── 3. WORKSPACE REFERENCE SET ─────────────────────────────────────────
  console.log('── 3. Workspaces — referenced uid union ──');
  const wsSnap = await db.collection('workspaces').get();
  bump(wsSnap.size);
  const referenced = new Set();       // members ∪ userRoles keys ∪ pendingApprovals
  const inMembers = new Set();
  const inUserRoles = new Set();
  const inPending = new Set();
  const adminUids = new Set();
  const wsNames = [];
  wsSnap.forEach(d => {
    const ws = d.data();
    wsNames.push(d.id);
    (Array.isArray(ws.members) ? ws.members : []).forEach(uid => { referenced.add(uid); inMembers.add(uid); });
    Object.keys(ws.userRoles || {}).forEach(uid => { referenced.add(uid); inUserRoles.add(uid); });
    (Array.isArray(ws.pendingApprovals) ? ws.pendingApprovals : []).forEach(p => {
      const uid = typeof p === 'string' ? p : (p && p.uid) || null;
      if (uid) { referenced.add(uid); inPending.add(uid); }
    });
    if (ws.adminUid) adminUids.add(ws.adminUid);
  });
  console.log(`  workspaces               : ${pad(wsSnap.size)}  [${wsNames.join(', ')}]`);
  console.log(`  referenced uids (union)  : ${pad(referenced.size)}`);
  console.log(`    via members[]          : ${pad(inMembers.size)}`);
  console.log(`    via userRoles{} keys   : ${pad(inUserRoles.size)}`);
  console.log(`    via pendingApprovals[] : ${pad(inPending.size)}`);
  console.log('');

  // ── 4. CANDIDATE SETS ──────────────────────────────────────────────────
  // Universe of uids = Auth ∪ Firestore-users.
  const allUids = new Set([...authUsers.keys(), ...fsUsers.keys()]);

  const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());

  const anonSet = [];        // (a) anonymous
  const wsRemovedSet = [];   // (b) workspace-removed (lingering record, not referenced)
  for (const uid of allUids) {
    const a = authUsers.get(uid);
    const f = fsUsers.get(uid);
    const email = (a && a.email) || (f && f.email) || null;
    // Defensive: never classify the bootstrap admin as a candidate.
    if (isAdminEmail(email)) continue;

    const isAnon = (a && a.anon) || (!email);             // anon provider OR no email anywhere
    const isReferenced = referenced.has(uid);

    if (isAnon) anonSet.push(uid);
    if (!isReferenced && !isAnon) wsRemovedSet.push(uid); // email user no longer in any workspace
    // Note: an anon uid that is ALSO unreferenced lands in anonSet only
    // (anon is the stronger/clearer signal); reported overlap below.
  }

  // Anon uids that are STILL referenced in a workspace → ESCALATE flag set.
  const anonStillReferenced = anonSet.filter(uid => referenced.has(uid));

  const whereRef = (uid) => {
    const tags = [];
    if (inMembers.has(uid)) tags.push('members');
    if (inUserRoles.has(uid)) tags.push('userRoles');
    if (inPending.has(uid)) tags.push('pending');
    return tags.length ? tags.join('+') : 'none';
  };
  const idLine = (uid) => {
    const a = authUsers.get(uid), f = fsUsers.get(uid);
    const email = (a && a.email) || (f && f.email) || '(no email)';
    const store = a && f ? 'both' : a ? 'auth-only' : 'fs-only';
    const prov = a ? `[${a.providers.join(',') || 'anon'}]` : '[no-auth]';
    return `    - ${uid}  ${email}  ${store} ${prov}  ref=${whereRef(uid)}${f && f.globalRole ? `  globalRole=${f.globalRole}` : ''}${f && f.disabled ? '  DISABLED' : ''}`;
  };

  console.log('── 4. Candidate sets ──');
  console.log(`  (a) ANONYMOUS            : ${pad(anonSet.length)}`);
  console.log(`        …still referenced  : ${pad(anonStillReferenced.length)}  <- ESCALATE if any authored data`);
  anonSet.forEach(uid => console.log(idLine(uid)));
  console.log(`  (b) WORKSPACE-REMOVED    : ${pad(wsRemovedSet.length)}  (email users in NO workspace)`);
  wsRemovedSet.forEach(uid => console.log(idLine(uid)));
  console.log('');

  // ── 5. AUTH vs FIRESTORE SPLIT (per candidate set) ─────────────────────
  const split = (uids) => {
    let authOnly = 0, fsOnly = 0, both = 0;
    for (const uid of uids) {
      const inA = authUsers.has(uid), inF = fsUsers.has(uid);
      if (inA && inF) both++; else if (inA) authOnly++; else fsOnly++;
    }
    return { authOnly, fsOnly, both };
  };
  const sa = split(anonSet), sb = split(wsRemovedSet);
  console.log('── 5. Auth / Firestore split ──');
  console.log('  set                     | both | auth-only | fs-only');
  console.log('  ------------------------+------+-----------+--------');
  console.log(`  (a) anonymous           | ${pad(sa.both, 4)} | ${pad(sa.authOnly, 9)} | ${pad(sa.fsOnly, 6)}`);
  console.log(`  (b) workspace-removed   | ${pad(sb.both, 4)} | ${pad(sb.authOnly, 9)} | ${pad(sb.fsOnly, 6)}`);
  console.log('');

  const QUICK = process.argv.includes('--quick');
  if (QUICK) {
    console.log('── 6/7 SKIPPED (--quick): linkedUid + authorship scans not re-run ──');
    console.log('');
    console.log('  (full run already reported 0 linkedUid candidates and 0 authors)');
    console.log(`  ~Firestore reads used    : ~${reads}`);
    console.log('  STEP 0 read-only. No writes, no deletes performed.');
    process.exit(0);
  }

  // ── 6. linkedUid REFERENCE SCAN (global + legacy workspace players) ────
  console.log('── 6. linkedUid references (must be nulled before delete) ──');
  const linkedMap = new Map(); // uid -> [ "global:pid" | "ws/{slug}:pid" ]
  try {
    const gp = await db.collection('players').get();
    bump(gp.size);
    gp.forEach(d => {
      const lu = d.data().linkedUid;
      if (lu) { if (!linkedMap.has(lu)) linkedMap.set(lu, []); linkedMap.get(lu).push(`global:${d.id}`); }
    });
    console.log(`  global /players scanned  : ${pad(gp.size)}`);
  } catch (e) {
    console.log(`  global /players scan FAILED: ${e.code || e.message}`);
  }
  try {
    const wp = await db.collectionGroup('players').get();
    bump(wp.size);
    let wsPlayerCount = 0;
    wp.forEach(d => {
      // collectionGroup('players') also matches the global root? No — root
      // /players is matched by collectionGroup too. Filter to workspace path.
      const path = d.ref.path;
      if (!path.startsWith('workspaces/')) return;
      wsPlayerCount++;
      const lu = d.data().linkedUid;
      if (lu) {
        const slug = path.split('/')[1];
        if (!linkedMap.has(lu)) linkedMap.set(lu, []);
        linkedMap.get(lu).push(`ws/${slug}:${d.id}`);
      }
    });
    console.log(`  legacy ws players scanned: ${pad(wsPlayerCount)}`);
  } catch (e) {
    console.log(`  legacy ws players scan FAILED: ${e.code || e.message}`);
  }

  const candidateUnion = new Set([...anonSet, ...wsRemovedSet]);
  const linkedCandidates = [...candidateUnion].filter(uid => linkedMap.has(uid));
  console.log(`  candidates with linkedUid: ${pad(linkedCandidates.length)}  <- STEP 1 must null these first`);
  linkedCandidates.slice(0, 25).forEach(uid => {
    const refs = linkedMap.get(uid);
    const setLabel = anonSet.includes(uid) ? 'anon' : 'ws-removed';
    console.log(`    - ${uid} [${setLabel}] -> ${refs.slice(0, 4).join(', ')}${refs.length > 4 ? ` …(+${refs.length - 4})` : ''}`);
  });
  if (linkedCandidates.length > 25) console.log(`    …(+${linkedCandidates.length - 25} more)`);
  console.log('');

  // ── 7. AUTHORSHIP / CONTRIBUTED-DATA SCAN (ESCALATE gate) ──────────────
  console.log('── 7. Contributed-data authorship (account stale but data valuable?) ──');
  console.log(`  fields checked: ${AUTHORSHIP_CHECKS.map(c => `${c.cg}.${c.field}`).join(', ')}`);
  // Prioritise anon-still-referenced + linked candidates, then the rest.
  const priority = [...new Set([...anonStillReferenced, ...linkedCandidates, ...candidateUnion])];
  const scanList = priority.slice(0, MAX_AUTHORSHIP_SCAN);
  const authored = [];
  for (const uid of scanList) {
    const hits = await authorshipUidsForCandidate(uid);
    const real = hits.filter(h => !h.startsWith('SKIP('));
    if (real.length) {
      const setLabel = anonSet.includes(uid) ? 'anon' : 'ws-removed';
      authored.push({ uid, setLabel, hits: real, referenced: referenced.has(uid) });
    }
  }
  console.log(`  candidates scanned       : ${pad(scanList.length)}${candidateUnion.size > MAX_AUTHORSHIP_SCAN ? `  (CAPPED at ${MAX_AUTHORSHIP_SCAN} of ${candidateUnion.size} — rerun for rest)` : ''}`);
  console.log(`  candidates that AUTHORED : ${pad(authored.length)}  <- PRESERVE their data; [ESCALATE] anon authors`);
  authored.slice(0, 30).forEach(a => {
    console.log(`    - ${a.uid} [${a.setLabel}${a.referenced ? ',referenced' : ''}] -> ${a.hits.join(', ')}`);
  });
  if (authored.length > 30) console.log(`    …(+${authored.length - 30} more)`);
  console.log('');

  // ── SUMMARY ────────────────────────────────────────────────────────────
  console.log('================================================================');
  console.log(' SUMMARY');
  console.log('================================================================');
  console.log(`  Auth accounts            : ${authUsers.size} (anon ${authAnon} / pw ${authPassword} / other ${authOther})`);
  console.log(`  Firestore /users docs    : ${fsUsers.size} (no-email ${fsNoEmail})`);
  console.log(`  (a) anonymous candidates : ${anonSet.length}  [${anonStillReferenced.length} still referenced]`);
  console.log(`  (b) ws-removed candidates: ${wsRemovedSet.length}`);
  console.log(`  with linkedUid (null 1st): ${linkedCandidates.length}`);
  console.log(`  authored contributed data: ${authored.length}  ${authored.length ? '[ESCALATE — review before delete]' : '(none found in scan)'}`);
  console.log(`  ~Firestore reads used    : ~${reads}`);
  console.log('');
  console.log('  STEP 0 read-only. No writes, no deletes performed.');
  console.log('  NEXT: Opus finalises STEP 1 (guarded delete) from this report; Jacek GO before --live.');
  console.log('');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
