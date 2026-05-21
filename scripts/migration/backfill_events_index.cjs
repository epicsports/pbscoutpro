/**
 * Backfill /workspaces/{slug}/events_index/ — Model C (DESIGN_DECISIONS § 69).
 *
 * Writes one index entry per existing /tournaments/ + /trainings/ doc, across
 * every workspace. Mirrors dataService.eventIndexCreateEntry. Uses set()
 * (overwrite) — idempotent, and self-heals any partial entries left by an
 * event update during the pre-backfill window. Run AFTER the client deploy
 * that ships the writer (§ 69 staged sequence).
 *
 * Dry-run (default) builds every index entry (exercising eventType derivation
 * on the full dataset) and reports a per-eventType breakdown + a count check +
 * any flagged docs — but writes nothing. --commit writes.
 *
 * Service account via GOOGLE_APPLICATION_CREDENTIALS (repo migration pattern).
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
 *   node scripts/migration/backfill_events_index.cjs            # dry-run
 *   node scripts/migration/backfill_events_index.cjs --commit   # writes
 */

const admin = require('firebase-admin');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path');
  process.exit(1);
}
const COMMIT = process.argv.includes('--commit');

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Mirrors dataService.deriveEventType — keep in sync.
function deriveEventType(sourceCollection, data) {
  if (sourceCollection === 'trainings') return 'training';
  if (data.eventType === 'sparing') return 'sparing';
  if (data.type === 'practice') return 'practice';
  return 'tournament';
}

// Backfill builds from the actual stored doc, so it copies the real
// createdAt/updatedAt (the live writer uses serverTimestamp sentinels).
function indexEntry(sourceCollection, data) {
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
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastIndexedAt: FieldValue.serverTimestamp(),
  };
}

async function backfillWorkspace(wsId) {
  let written = 0, errors = 0;
  const errorDocs = [];
  const typeCounts = { tournament: 0, sparing: 0, training: 0, practice: 0 };
  const flagged = [];
  const srcCounts = { tournaments: 0, trainings: 0 };
  for (const coll of ['tournaments', 'trainings']) {
    const snap = await db.collection(`workspaces/${wsId}/${coll}`).get();
    srcCounts[coll] = snap.size;
    for (const d of snap.docs) {
      const data = d.data();
      // Built always — exercises eventType derivation on the full dataset.
      const entry = indexEntry(coll, data);
      typeCounts[entry.eventType] = (typeCounts[entry.eventType] || 0) + 1;
      // Flag odd docs — reported, never skipped silently.
      const issues = [];
      if (!data.createdAt) issues.push('no createdAt');
      if ((data.name == null || !String(data.name).trim()) && data.date == null) {
        issues.push('no name + no date');
      }
      if (issues.length) flagged.push({ coll, id: d.id, issues });
      if (!COMMIT) { written++; continue; }
      try {
        await db.doc(`workspaces/${wsId}/events_index/${d.id}`).set(entry);
        written++;
      } catch (e) {
        errors++;
        errorDocs.push({ coll, id: d.id, error: e.message });
      }
    }
  }
  return { wsId, written, errors, errorDocs, typeCounts, flagged, srcCounts };
}

(async () => {
  console.log(`Backfill events_index (§ 69) — ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);
  const wsSnap = await db.collection('workspaces').get();
  console.log(`Workspaces: ${wsSnap.size}\n`);
  const totalTypes = { tournament: 0, sparing: 0, training: 0, practice: 0 };
  let totalWritten = 0, totalErrors = 0, totalSrcT = 0, totalSrcTr = 0;
  const allErrors = [], allFlagged = [];
  for (const ws of wsSnap.docs) {
    const r = await backfillWorkspace(ws.id);
    console.log(`  ${r.wsId}: tournaments=${r.srcCounts.tournaments} trainings=${r.srcCounts.trainings} `
      + `-> ${COMMIT ? 'wrote' : 'would write'} ${r.written}, ${r.errors} errors`);
    for (const k of Object.keys(totalTypes)) totalTypes[k] += r.typeCounts[k] || 0;
    totalWritten += r.written;
    totalErrors += r.errors;
    totalSrcT += r.srcCounts.tournaments;
    totalSrcTr += r.srcCounts.trainings;
    allErrors.push(...r.errorDocs.map(e => ({ ws: r.wsId, ...e })));
    allFlagged.push(...r.flagged.map(f => ({ ws: r.wsId, ...f })));
  }
  const totalSrc = totalSrcT + totalSrcTr;
  console.log('\n=== Per-eventType breakdown ===');
  for (const k of ['tournament', 'sparing', 'practice', 'training']) {
    console.log(`  ${k.padEnd(11)}: ${totalTypes[k]}`);
  }
  console.log('\n=== Count check ===');
  console.log(`  source docs:        ${totalSrcT} tournaments + ${totalSrcTr} trainings = ${totalSrc}`);
  console.log(`  ${COMMIT ? 'wrote' : 'would write'}:  ${totalWritten} index entries`);
  console.log(`  match:              ${totalWritten === totalSrc ? 'YES' : 'NO — MISMATCH'}`);
  console.log(`\n=== Flagged for review (still indexed, NOT skipped): ${allFlagged.length} ===`);
  allFlagged.forEach(f => console.log(`  - ${f.ws}/${f.coll}/${f.id}: ${f.issues.join(', ')}`));
  if (COMMIT && totalErrors > 0) {
    console.error(`\n=== ERRORS: ${totalErrors} ===`);
    allErrors.forEach(e => console.error(`  - ${e.ws}/${e.coll}/${e.id}: ${e.error}`));
    process.exit(1);
  }
  console.log(`\n${COMMIT ? 'Backfill complete — 0 errors.' : 'Dry run — no writes. Re-run with --commit to apply.'}`);
  process.exit(0);
})();
