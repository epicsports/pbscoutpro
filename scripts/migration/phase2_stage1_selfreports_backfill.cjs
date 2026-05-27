// § 90 Phase 2 Stage 1.B.2 — selfReports backfill (collectionGroup-optimized).
//
// Copies pre-1.B.1 legacy-only selfReports from
//   /workspaces/{ws}/players/{pid}/selfReports/{sid}                  (6-segment path)
// to the new flat path
//   /workspaces/{ws}/selfReports/{sid}                                (4-segment path)
// with explicit `playerId: pid` field. Same doc id on both paths (by
// construction). After this script's clean live run, Stage 1.B.3 cutover can
// drop the legacy fallback because every legacy doc has a flat-path twin.
//
// Predicate: Stage 1.B.1 (commit 8a548f35) shipped — dual-write is live.
// New writes since 1.B.1 already land on both paths under the same id; this
// script reconciles older one-sided docs.
//
// SAFETY:
//   - --dry is the default. Logs intended writes; performs none.
//   - --live performs writes.
//   - NEVER overwrites a flat-path doc whose contents differ from legacy —
//     surfaced as CONFLICT and counted; no write.
//   - NO deletes. Legacy docs remain as cushion until Phase 2.7 cleanup.
//   - Idempotent: equal-content target → SKIP-EXISTING; rerun safely.
//
// ENUMERATION STRATEGY (2026-05-28 optimization, deviates from § 90.7 brief):
//   The brief suggested an explicit `workspaces → players → selfReports`
//   walk to keep the source set unambiguous. That hit Spark daily read
//   quota: ~976 player-subcollection getDocs calls per run on ranger1996
//   (most empty) × 2 runs (dry+live) ≈ 4k reads, on top of Stage 1.B.1
//   dual-read traffic already hammering production.
//
//   We now use a single collectionGroup('selfReports').get() and FILTER BY
//   PATH SEGMENT COUNT:
//     - 6 segments = legacy /workspaces/{ws}/players/{pid}/selfReports/{sid}
//       → backfill source
//     - 4 segments = flat   /workspaces/{ws}/selfReports/{sid}
//       → already-migrated (or 1.B.1-era dual-write); not a source
//   This preserves the source-set unambiguity (different segment counts =
//   different paths; collection name "selfReports" is unique in the
//   workspace tree) while cutting reads ~40× (~52 vs ~2000+).
//
// RUN:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_stage1_selfreports_backfill.cjs --dry
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
//     node scripts/migration/phase2_stage1_selfreports_backfill.cjs --live
//
// Windows wrapper auto-detects sibling pbscoutpro-firebase-adminsdk-fbsvc-*.json:
//   scripts\migration\phase2_stage1_selfreports_backfill.cmd --dry
//   scripts\migration\phase2_stage1_selfreports_backfill.cmd --live

const admin = require('firebase-admin');

// ─── Args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isLive = args.includes('--live');
const isDry = args.includes('--dry') || !isLive;
if (args.includes('--live') && args.includes('--dry')) {
  console.error('ERROR: --dry and --live are mutually exclusive.');
  process.exit(2);
}
const MODE = isLive ? 'LIVE' : 'DRY';

admin.initializeApp();
const db = admin.firestore();

// ─── Equality ──────────────────────────────────────────────────────
// Compare a legacy doc to a flat-path doc. The flat-side MUST carry
// `playerId === pid`; the legacy side has no playerId field. Other fields
// compared via JSON-stable deep equality on the union of keys present in
// either doc (excluding playerId on each side).
function fieldsDifference(legacyData, flatData, pid) {
  if (flatData.playerId !== pid) {
    return [`playerId(flat=${JSON.stringify(flatData.playerId)} ≠ pid=${JSON.stringify(pid)})`];
  }
  const keys = new Set([
    ...Object.keys(legacyData || {}),
    ...Object.keys(flatData || {}),
  ]);
  keys.delete('playerId');
  const diffs = [];
  for (const k of keys) {
    const a = legacyData?.[k];
    const b = flatData?.[k];
    if (!deepEqualish(a, b)) {
      diffs.push(k);
    }
  }
  return diffs;
}

// Firestore Timestamp / Date / arrays / objects — JSON-stable compare with
// Timestamp normalization. Avoids false-conflicts on Timestamp objects that
// serialize differently across reads.
function normalize(v) {
  if (v == null) return v;
  if (v instanceof admin.firestore.Timestamp) {
    return { __ts: v.toMillis() };
  }
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = normalize(v[k]);
    return out;
  }
  return v;
}
function deepEqualish(a, b) {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

// ─── Counters ──────────────────────────────────────────────────────
const c = {
  scanned: 0,
  wouldCopy: 0,
  copied: 0,
  skipExisting: 0,
  conflict: 0,
  error: 0,
};

// ─── Main ──────────────────────────────────────────────────────────
(async () => {
  console.log('');
  console.log('=== Stage 1.B.2 — selfReports backfill (CG-optimized) ===');
  console.log(`mode: ${MODE}`);
  console.log('');

  // Single read pass — collectionGroup returns BOTH paths' docs. We bucket
  // by segment count so the source set is unambiguous (the brief's concern
  // about double-processing is addressed by the segment filter below).
  const cgSnap = await db.collectionGroup('selfReports').get();
  console.log(`collectionGroup selfReports docs returned: ${cgSnap.size}`);

  /** legacy docs awaiting backfill */
  const legacy = []; // { ref, ws, pid, sid, data }
  /** flat-path docs already present, keyed by sid (within workspace scope — single workspace today) */
  const flatBySidByWs = new Map(); // ws -> Map<sid, { ws, data }>
  /** workspace set */
  const wsSet = new Set();

  for (const d of cgSnap.docs) {
    const parts = d.ref.path.split('/');
    if (parts.length === 4 && parts[0] === 'workspaces' && parts[2] === 'selfReports') {
      // Flat path: workspaces/{ws}/selfReports/{sid}
      const ws = parts[1];
      const sid = parts[3];
      wsSet.add(ws);
      if (!flatBySidByWs.has(ws)) flatBySidByWs.set(ws, new Map());
      flatBySidByWs.get(ws).set(sid, { ws, data: d.data() });
    } else if (parts.length === 6 && parts[0] === 'workspaces' && parts[2] === 'players' && parts[4] === 'selfReports') {
      // Legacy path: workspaces/{ws}/players/{pid}/selfReports/{sid}
      const ws = parts[1];
      const pid = parts[3];
      const sid = parts[5];
      wsSet.add(ws);
      legacy.push({ ref: d.ref, ws, pid, sid, data: d.data() });
    } else {
      // Unexpected path — log and skip. Belt-and-braces against future
      // schema drift.
      console.warn(`UNKNOWN PATH (skipped): ${d.ref.path}`);
    }
  }

  console.log(`legacy docs (sources): ${legacy.length}`);
  let preExistingFlatCount = 0;
  for (const m of flatBySidByWs.values()) preExistingFlatCount += m.size;
  console.log(`flat docs (pre-existing): ${preExistingFlatCount}`);
  console.log('');

  // Batched writes capped at 500 ops (Firestore limit).
  const BATCH_MAX = 500;
  let batch = isLive ? db.batch() : null;
  let batchOps = 0;
  async function flushBatchIfFull() {
    if (!isLive) return;
    if (batchOps >= BATCH_MAX) {
      await batch.commit();
      batch = db.batch();
      batchOps = 0;
    }
  }

  for (const { ws, pid, sid, data: legacyData } of legacy) {
    c.scanned += 1;
    try {
      const flatMap = flatBySidByWs.get(ws);
      const flat = flatMap ? flatMap.get(sid) : null;
      if (!flat) {
        // Branch A — target missing → copy.
        if (isLive) {
          const targetRef = db.doc(`workspaces/${ws}/selfReports/${sid}`);
          batch.set(targetRef, { ...legacyData, playerId: pid });
          batchOps += 1;
          c.copied += 1;
          await flushBatchIfFull();
        } else {
          c.wouldCopy += 1;
          console.log(`WOULD COPY: ws=${ws} pid=${pid} sid=${sid}`);
        }
      } else {
        // Branch B/C — equal contents or conflict.
        const diffs = fieldsDifference(legacyData, flat.data, pid);
        if (diffs.length === 0) {
          c.skipExisting += 1;
          console.log(`SKIP-EXISTING: ws=${ws} sid=${sid}`);
        } else {
          c.conflict += 1;
          console.log(`CONFLICT: ws=${ws} pid=${pid} sid=${sid}, differing: [${diffs.join(', ')}]`);
        }
      }
    } catch (err) {
      c.error += 1;
      console.error(`ERROR: ws=${ws} pid=${pid} sid=${sid} — ${err?.message || err}`);
    }
  }

  // Final commit if anything is left in the batch.
  if (isLive && batchOps > 0) {
    await batch.commit();
  }

  // ─── Parity (derived from same in-memory bucket; no extra reads) ─
  const legacyTotal = legacy.length;
  const flatTotal = preExistingFlatCount + (isLive ? c.copied : 0);

  // ─── Summary ─────────────────────────────────────────────────────
  console.log('');
  console.log('=== Backfill summary ===');
  console.log(`Mode:           ${MODE}`);
  console.log(`Scanned:        ${c.scanned} docs (legacy path, across ${wsSet.size} workspace(s))`);
  if (isLive) {
    console.log(`Copied:         ${c.copied}`);
  } else {
    console.log(`Would copy:     ${c.wouldCopy}       (dry-run mode only)`);
  }
  console.log(`Skip-existing:  ${c.skipExisting}`);
  console.log(`Conflicts:      ${c.conflict}       ${c.conflict === 0 ? '' : '← MUST be 0 for clean run'}`);
  console.log(`Errors:         ${c.error}       ${c.error === 0 ? '' : '← MUST be 0 for clean run'}`);
  console.log('');
  console.log('Parity check:');
  console.log(`  Legacy path total: ${legacyTotal}`);
  console.log(`  Flat path total:   ${flatTotal}   ${
    isLive
      ? `(expect >= ${legacyTotal}; flat may exceed by pre-existing 1.B.1 dual-writes)`
      : '(dry-run — unchanged from start)'
  }`);
  console.log('');

  if (!isLive) {
    console.log('DRY-RUN complete. Re-run with --live to commit.');
  } else {
    console.log('LIVE run complete.');
  }

  const clean = c.conflict === 0 && c.error === 0;
  process.exit(clean ? 0 : 1);
})().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
