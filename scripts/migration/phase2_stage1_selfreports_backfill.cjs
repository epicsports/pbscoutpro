// § 90 Phase 2 Stage 1.B.2 — selfReports backfill.
//
// Copies pre-1.B.1 legacy-only selfReports from
//   /workspaces/{ws}/players/{pid}/selfReports/{sid}
// to the new flat path
//   /workspaces/{ws}/selfReports/{sid}
// with explicit `playerId: pid` field. Same doc id on both paths (by
// construction). After this script's clean run, Stage 1.B.3 cutover can
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
  console.log('=== Stage 1.B.2 — selfReports backfill ===');
  console.log(`mode: ${MODE}`);
  console.log('');

  const wsSnap = await db.collection('workspaces').get();
  console.log(`workspaces found: ${wsSnap.size}`);
  console.log('');

  // Batched writes capped at 500 ops (Firestore limit). One op = one set per
  // doc. We only set the flat-path target; no deletes here.
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

  for (const wsDoc of wsSnap.docs) {
    const ws = wsDoc.id;

    const playersSnap = await db.collection(`workspaces/${ws}/players`).get();
    if (playersSnap.empty) continue;

    for (const playerDoc of playersSnap.docs) {
      const pid = playerDoc.id;
      const legacyCol = db.collection(`workspaces/${ws}/players/${pid}/selfReports`);
      const legacySnap = await legacyCol.get();
      if (legacySnap.empty) continue;

      for (const legacyDoc of legacySnap.docs) {
        c.scanned += 1;
        const sid = legacyDoc.id;
        const targetRef = db.doc(`workspaces/${ws}/selfReports/${sid}`);

        try {
          const targetSnap = await targetRef.get();
          if (!targetSnap.exists) {
            // Branch A — target missing → copy.
            const legacyData = legacyDoc.data();
            if (isLive) {
              batch.set(targetRef, { ...legacyData, playerId: pid });
              batchOps += 1;
              c.copied += 1;
              await flushBatchIfFull();
            } else {
              c.wouldCopy += 1;
              console.log(`WOULD COPY: ws=${ws} pid=${pid} sid=${sid}`);
            }
          } else {
            const flatData = targetSnap.data();
            const legacyData = legacyDoc.data();
            const diffs = fieldsDifference(legacyData, flatData, pid);
            if (diffs.length === 0) {
              // Branch B — equal contents → skip.
              c.skipExisting += 1;
              console.log(`SKIP-EXISTING: ws=${ws} sid=${sid}`);
            } else {
              // Branch C — differing contents → conflict; do NOT overwrite.
              c.conflict += 1;
              console.log(`CONFLICT: ws=${ws} pid=${pid} sid=${sid}, differing: [${diffs.join(', ')}]`);
            }
          }
        } catch (err) {
          c.error += 1;
          console.error(`ERROR: ws=${ws} pid=${pid} sid=${sid} — ${err?.message || err}`);
        }
      }
    }
  }

  // Final commit if anything is left in the batch.
  if (isLive && batchOps > 0) {
    await batch.commit();
  }

  // ─── Parity check (separate explicit walk) ───────────────────────
  let legacyTotal = 0;
  let flatTotal = 0;
  for (const wsDoc of wsSnap.docs) {
    const ws = wsDoc.id;

    const playersSnap = await db.collection(`workspaces/${ws}/players`).get();
    for (const playerDoc of playersSnap.docs) {
      const sub = await db.collection(`workspaces/${ws}/players/${playerDoc.id}/selfReports`).get();
      legacyTotal += sub.size;
    }

    const flat = await db.collection(`workspaces/${ws}/selfReports`).get();
    flatTotal += flat.size;
  }

  // ─── Summary ─────────────────────────────────────────────────────
  console.log('');
  console.log('=== Backfill summary ===');
  console.log(`Mode:           ${MODE}`);
  console.log(`Scanned:        ${c.scanned} docs (legacy path, across ${wsSnap.size} workspace(s))`);
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
