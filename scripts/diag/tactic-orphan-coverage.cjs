// READ-ONLY prod coverage check (admin-SDK; autonomous). NO WRITES.
// TRACK 2 follow-up — per-doc twin check for the 24 orphaned layouts/{id}/tactics.
//
// For every doc at <bp>/layouts/{lid}/tactics/{tid}, check whether a same-id twin
// exists at <bp>/layoutOverlays/{lid}/tactics/{tid} (same workspace prefix, same
// layout id, same tactic id). §96 STAGE-3 copied by-id, so full coverage is expected.
//   - twin exists  → DELETE-able from the orphan path (content already live).
//   - twin missing → FLIPS-TO-MIGRATE (created on the old path post-STAGE-3,
//                     never copied) — must be copied forward before any delete.
//
// Prefix-agnostic: uses collectionGroup('tactics') and classifies by ref.path,
// so it works regardless of the per-workspace base-path shape. Zero writes.
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();

// Given a tactics-doc path .../<parentCol>/<lid>/tactics/<tid>, return the
// segment array and the index of the parent collection ('layouts' here).
function classify(p) {
  const segs = p.split('/');
  // tactics is the second-to-last collection; its parent doc id is segs[len-3],
  // and the parent collection name is segs[len-4].
  const tid = segs[segs.length - 1];
  const tacticsCol = segs[segs.length - 2];      // 'tactics'
  const lid = segs[segs.length - 3];             // layout/overlay/tournament doc id
  const parentCol = segs[segs.length - 4];       // 'layouts' | 'layoutOverlays' | 'tournaments'
  return { segs, tid, tacticsCol, lid, parentCol };
}

(async () => {
  const snap = await db.collectionGroup('tactics').get();
  const buckets = { layouts: [], layoutOverlays: [], tournaments: [], other: [] };
  snap.forEach((d) => {
    const c = classify(d.ref.path);
    (buckets[c.parentCol] || buckets.other).push({ ref: d.ref, ...c });
  });

  console.log('=== collectionGroup(tactics) census ===');
  console.log(`  layouts/{id}/tactics       : ${buckets.layouts.length}  (orphan candidates)`);
  console.log(`  layoutOverlays/{id}/tactics: ${buckets.layoutOverlays.length}  (live)`);
  console.log(`  tournaments/{id}/tactics   : ${buckets.tournaments.length}  (live)`);
  if (buckets.other.length) console.log(`  other/unclassified         : ${buckets.other.length}`);

  // Per-orphan twin check.
  const deletable = [];
  const flipsToMigrate = [];
  for (const o of buckets.layouts) {
    // Build the twin path: same segments, swap 'layouts' (segs[len-4]) -> 'layoutOverlays'.
    const segs = [...o.segs];
    segs[segs.length - 4] = 'layoutOverlays';
    const twinPath = segs.join('/');
    const twin = await db.doc(twinPath).get();
    if (twin.exists) deletable.push({ orphan: o.ref.path, twin: twinPath });
    else flipsToMigrate.push({ orphan: o.ref.path, expectedTwin: twinPath });
  }

  console.log('\n=== TRACK 2 orphan coverage verdict ===');
  console.log(`  orphans total           : ${buckets.layouts.length}`);
  console.log(`  DELETE-able (twin exists): ${deletable.length}`);
  console.log(`  FLIPS-TO-MIGRATE (no twin): ${flipsToMigrate.length}`);

  if (flipsToMigrate.length) {
    console.log('\n  --- uncovered orphans (must migrate-then-delete) ---');
    flipsToMigrate.forEach((m) => {
      const c = classify(m.orphan);
      console.log(`    ws/layout=${c.lid}  tactic=${c.tid}`);
    });
  }
  // Doc-id list of deletable ones (ids only, no PII content).
  console.log('\n  --- DELETE-able orphan (lid/tid) ---');
  deletable.forEach((d) => {
    const c = classify(d.orphan);
    console.log(`    ${c.lid}/${c.tid}`);
  });

  process.exit(0);
})().catch((e) => { console.error('ERR', e); process.exit(1); });
