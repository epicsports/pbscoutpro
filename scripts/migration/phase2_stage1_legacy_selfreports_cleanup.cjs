// § 90 Phase 2 Stage 1 TAIL — legacy selfReports cleanup (DELETE nested docs).
//
// Deletes the WRITE-DEAD legacy nested selfReports
//   /workspaces/{ws}/players/{pid}/selfReports/{sid}                  (6-segment path)
// now that the flat path
//   /workspaces/{ws}/selfReports/{sid}                                (4-segment path)
// is canonical (Stage 1.B.3 cutover, commit 01b1280b). Removing the legacy
// docs means Phase 2.2.d (player-doc cushion drop) won't orphan them.
//
// Predicate: 1.B.1 dual-write + 1.B.2 backfill (parity Legacy 52 == Flat 52) +
// 1.B.3 cutover (writers flat-only) all shipped. Every legacy doc should have a
// flat twin (same doc id). This script PROVES that per-doc before deleting.
//
// SAFETY:
//   - --dry is the default. Logs intended deletes; performs none.
//   - --live performs deletes.
//   - ORPHAN HARD-STOP: a legacy doc with NO flat twin (by doc id, within its
//     workspace) is an ORPHAN. If orphans > 0 the script ABORTS and deletes
//     NOTHING (in both dry and live), reports the orphan paths, exits non-zero.
//     Backfill those first (never lose a report) — do NOT delete past an orphan.
//   - Deletes ONLY legacy docs with a confirmed flat twin.
//   - Idempotent: re-enumerates each run; after a clean live run the legacy
//     bucket is empty → 0 to delete. batch.delete on an absent doc is a no-op.
//
// ENUMERATION STRATEGY (reuses the 1.B.2 Path B — quota-safe):
//   ONE collectionGroup('selfReports').get() and FILTER BY PATH SEGMENT COUNT
//   (6 = legacy source, 4 = flat twin). Do NOT walk player subcollections —
//   that was the 2026-05-27 Spark-quota incident (~976 mostly-empty walks).
//
// RUN:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_stage1_legacy_selfreports_cleanup.cjs --dry
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_stage1_legacy_selfreports_cleanup.cjs --live
//
// Windows wrapper auto-detects sibling pbscoutpro-firebase-adminsdk-fbsvc-*.json:
//   scripts\migration\phase2_stage1_legacy_selfreports_cleanup.cmd --dry
//   scripts\migration\phase2_stage1_legacy_selfreports_cleanup.cmd --live

const admin = require('firebase-admin');

// ─── Args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isLive = args.includes('--live');
if (args.includes('--live') && args.includes('--dry')) {
  console.error('ERROR: --dry and --live are mutually exclusive.');
  process.exit(2);
}
const MODE = isLive ? 'LIVE' : 'DRY';

admin.initializeApp();
const db = admin.firestore();

// ─── Counters ──────────────────────────────────────────────────────
const c = {
  legacy: 0,
  flat: 0,
  deletable: 0,
  wouldDelete: 0,
  deleted: 0,
  orphan: 0,
  unknown: 0,
  error: 0,
};

// ─── Main ──────────────────────────────────────────────────────────
(async () => {
  console.log('');
  console.log('=== Stage 1 tail — legacy selfReports cleanup (CG-optimized) ===');
  console.log(`mode: ${MODE}`);
  console.log('');

  // STEP 1 — single read pass; bucket by segment count.
  const cgSnap = await db.collectionGroup('selfReports').get();
  console.log(`collectionGroup selfReports docs returned: ${cgSnap.size}`);

  /** legacy docs (delete candidates) */
  const legacy = []; // { ref, ws, pid, sid }
  /** flat twins, by workspace → Set<sid> */
  const flatBySidByWs = new Map(); // ws -> Set<sid>
  const wsSet = new Set();

  for (const d of cgSnap.docs) {
    const parts = d.ref.path.split('/');
    if (parts.length === 4 && parts[0] === 'workspaces' && parts[2] === 'selfReports') {
      // Flat: workspaces/{ws}/selfReports/{sid}
      const ws = parts[1];
      const sid = parts[3];
      wsSet.add(ws);
      if (!flatBySidByWs.has(ws)) flatBySidByWs.set(ws, new Set());
      flatBySidByWs.get(ws).add(sid);
    } else if (parts.length === 6 && parts[0] === 'workspaces' && parts[2] === 'players' && parts[4] === 'selfReports') {
      // Legacy: workspaces/{ws}/players/{pid}/selfReports/{sid}
      const ws = parts[1];
      const pid = parts[3];
      const sid = parts[5];
      wsSet.add(ws);
      legacy.push({ ref: d.ref, ws, pid, sid });
    } else {
      c.unknown += 1;
      console.warn(`UNKNOWN PATH (skipped): ${d.ref.path}`);
    }
  }

  c.legacy = legacy.length;
  for (const s of flatBySidByWs.values()) c.flat += s.size;
  console.log(`legacy docs (delete candidates): ${c.legacy}`);
  console.log(`flat docs (twin pool):           ${c.flat}`);
  console.log('');

  // STEP 2 — per-doc twin safety (by doc id, within the same workspace).
  const deletable = [];
  const orphans = [];
  for (const item of legacy) {
    const flatSet = flatBySidByWs.get(item.ws);
    if (flatSet && flatSet.has(item.sid)) deletable.push(item);
    else orphans.push(item);
  }
  c.deletable = deletable.length;
  c.orphan = orphans.length;

  // ORPHAN HARD-STOP — abort before any delete.
  if (orphans.length > 0) {
    console.error('');
    console.error(`!!! ORPHANS DETECTED: ${orphans.length} legacy doc(s) have NO flat twin.`);
    console.error('!!! ABORTING — deleting NOTHING. Backfill these first, then re-run.');
    for (const o of orphans) console.error(`ORPHAN: ${o.ref.path}`);
    console.error('');
    process.exit(1);
  }

  // STEP 3 — delete (orphans == 0).
  const BATCH_MAX = 500;
  if (!isLive) {
    c.wouldDelete = deletable.length;
    for (const item of deletable) console.log(`WOULD DELETE: ${item.ref.path}`);
  } else {
    let batch = db.batch();
    let ops = 0;
    for (const item of deletable) {
      batch.delete(item.ref);
      ops += 1;
      c.deleted += 1;
      if (ops >= BATCH_MAX) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }

  // ─── Summary ─────────────────────────────────────────────────────
  const remaining = c.legacy - (isLive ? c.deleted : 0);
  console.log('');
  console.log('=== Cleanup summary ===');
  console.log(`Mode:             ${MODE}`);
  console.log(`Workspaces:       ${wsSet.size}`);
  console.log(`Legacy scanned:   ${c.legacy}`);
  console.log(`Flat twins:       ${c.flat}`);
  console.log(`With twin (safe): ${c.deletable}`);
  console.log(`Orphans:          ${c.orphan}       ${c.orphan === 0 ? '' : '← ABORTED'}`);
  if (isLive) {
    console.log(`Deleted:          ${c.deleted}`);
  } else {
    console.log(`Would delete:     ${c.wouldDelete}       (dry-run mode only)`);
  }
  console.log(`Unknown paths:    ${c.unknown}`);
  console.log(`Legacy remaining: ${remaining}   ${
    isLive ? '(expect 0; re-run --dry to verify)' : '(dry-run — unchanged)'
  }`);
  console.log('');

  if (!isLive) {
    console.log('DRY-RUN complete. Re-run with --live to delete.');
  } else {
    console.log('LIVE run complete.');
  }

  const clean = c.orphan === 0 && c.error === 0;
  process.exit(clean ? 0 : 1);
})().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
