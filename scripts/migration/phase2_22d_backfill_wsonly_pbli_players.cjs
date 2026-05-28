// § 90 Phase 2.2.d Stage-1 precursor — backfill workspace-only pbliId players
// into the GLOBAL catalog (`/players`). ADDITIVE, create-only.
//
// Context: Brief 1 STEP 0 parity found 42 docs in /workspaces/ranger1996/players
// that have a real pbliId but no global twin (a dual-write gap). Their § 90 home
// is the global catalog. Backfilling makes the global catalog complete for all
// tenants and turns the Brief 1 merged-reader flip into a zero-behavior-change ship.
//
// SAFETY:
//   - --dry is the default (logs the plan, writes nothing).
//   - --live performs create-only writes (docRef.create() — throws ALREADY_EXISTS
//     if a global doc with that id exists, so an existing doc is NEVER overwritten).
//   - INVARIANT HARD-STOP (both modes): aborts and writes nothing unless
//       (count of ws-only == 42) AND (every ws-only has a non-empty pbliId)
//       AND (no ws-only id already exists in global).
//   - Copies the workspace doc VERBATIM — no field transform, no data cleaning.
//   - Never touches the workspace copy. Never deletes anything.
//   - Idempotent: a re-run after a clean --live sees 0 ws-only (or all already
//     present) and creates nothing.
//
// RUN:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_22d_backfill_wsonly_pbli_players.cjs --dry
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_22d_backfill_wsonly_pbli_players.cjs --live
//
// Windows wrapper auto-detects the sibling pbscoutpro-firebase-adminsdk-fbsvc-*.json:
//   scripts\migration\phase2_22d_backfill_wsonly_pbli_players.cmd --dry|--live

const admin = require('firebase-admin');

const EXPECTED = 42;
const WS = 'ranger1996';
const isLive = process.argv.includes('--live');
if (process.argv.includes('--live') && process.argv.includes('--dry')) {
  console.error('ERROR: --dry and --live are mutually exclusive.');
  process.exit(2);
}
const MODE = isLive ? 'LIVE' : 'DRY';

admin.initializeApp();
const db = admin.firestore();

const ALREADY_EXISTS = 6; // gRPC status code

(async () => {
  console.log('');
  console.log('=== Phase 2.2.d precursor — backfill ws-only pbliId players → global ===');
  console.log(`mode: ${MODE}   workspace: ${WS}`);

  const [gSnap, wSnap] = await Promise.all([
    db.collection('players').get(),
    db.collection('workspaces').doc(WS).collection('players').get(),
  ]);
  const gIds = new Set(gSnap.docs.map(d => d.id));
  const wsOnly = wSnap.docs.filter(d => !gIds.has(d.id));

  const missingPbli = [];
  const collisions = [];
  let withOwner = 0;
  for (const d of wsOnly) {
    const data = d.data();
    if (!data.pbliId) missingPbli.push(d.id);
    if (gIds.has(d.id)) collisions.push(d.id); // defensive; can't happen by filter
    if (data.ownerWorkspaceId) withOwner++;
  }

  console.log(`\nglobal players:      ${gIds.size}`);
  console.log(`workspace players:   ${wSnap.size}`);
  console.log(`workspace-only:      ${wsOnly.length}`);
  console.log(`  with pbliId:       ${wsOnly.length - missingPbli.length}`);
  console.log(`  missing pbliId:    ${missingPbli.length}`);
  console.log(`  with ownerWorkspaceId (informational, copied verbatim): ${withOwner}`);
  console.log(`  id-collisions w/ global: ${collisions.length}`);

  console.log(`\nws-only docs:`);
  for (const d of wsOnly) {
    const x = d.data();
    console.log(`  ${d.id}  name="${x.name || ''}" pbliId=${x.pbliId || '—'} ownerWorkspaceId=${x.ownerWorkspaceId || '—'}`);
  }

  // ── Invariant hard-stop ──
  const violations = [];
  if (wsOnly.length !== EXPECTED) violations.push(`expected ${EXPECTED} ws-only, found ${wsOnly.length}`);
  if (missingPbli.length) violations.push(`${missingPbli.length} ws-only without pbliId: ${missingPbli.join(', ')}`);
  if (collisions.length) violations.push(`${collisions.length} id-collisions: ${collisions.join(', ')}`);
  if (violations.length) {
    console.error(`\nABORT — invariant violated (writing nothing):`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(2);
  }
  console.log(`\ninvariant OK: ${EXPECTED} ws-only, all with pbliId, none already in global.`);

  if (!isLive) {
    console.log(`\nDRY-RUN complete. Re-run with --live to create the ${wsOnly.length} global docs.`);
    process.exit(0);
  }

  // ── LIVE: create-only copy ws → global, verbatim ──
  let created = 0, skippedExisting = 0;
  const errors = [];
  for (const d of wsOnly) {
    const ref = db.collection('players').doc(d.id);
    try {
      await ref.create(d.data()); // create-only — never overwrites
      created++;
    } catch (e) {
      if (e.code === ALREADY_EXISTS) skippedExisting++;
      else errors.push({ id: d.id, message: e.message });
    }
  }
  console.log(`\n=== LIVE result ===`);
  console.log(`created:          ${created}`);
  console.log(`skipped-existing: ${skippedExisting}`);
  console.log(`errors:           ${errors.length}`);
  for (const e of errors) console.error(`  ${e.id}: ${e.message}`);
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('BACKFILL ERROR:', e); process.exit(1); });
