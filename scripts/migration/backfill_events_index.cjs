/**
 * Backfill /workspaces/{slug}/events_index/ — Model C (DESIGN_DECISIONS § 69).
 *
 * Writes one index entry per existing /tournaments/ + /trainings/ doc, across
 * every workspace. Mirrors dataService.eventIndexCreateEntry. Uses set()
 * (overwrite) — idempotent, and self-heals any partial entries left by an
 * event update during the pre-backfill window. Run AFTER the client deploy
 * that ships the writer (§ 69 staged sequence).
 *
 * Service account via GOOGLE_APPLICATION_CREDENTIALS (repo migration pattern).
 * Dry-run by default; --commit to write.
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
  for (const coll of ['tournaments', 'trainings']) {
    const snap = await db.collection(`workspaces/${wsId}/${coll}`).get();
    for (const d of snap.docs) {
      if (!COMMIT) { written++; continue; }
      try {
        await db.doc(`workspaces/${wsId}/events_index/${d.id}`).set(indexEntry(coll, d.data()));
        written++;
      } catch (e) {
        errors++;
        errorDocs.push({ ws: wsId, coll, id: d.id, error: e.message });
      }
    }
  }
  return { wsId, written, errors, errorDocs };
}

(async () => {
  console.log(`Backfill events_index (§ 69) — ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);
  const wsSnap = await db.collection('workspaces').get();
  console.log(`Workspaces: ${wsSnap.size}`);
  let totalWritten = 0, totalErrors = 0;
  const allErrors = [];
  for (const ws of wsSnap.docs) {
    const r = await backfillWorkspace(ws.id);
    console.log(`  ${r.wsId}: ${COMMIT ? 'wrote' : 'would write'} ${r.written} index entries, ${r.errors} errors`);
    totalWritten += r.written;
    totalErrors += r.errors;
    allErrors.push(...r.errorDocs);
  }
  console.log(`\n=== Summary: ${COMMIT ? 'wrote' : 'would write'} ${totalWritten} entries, ${totalErrors} errors ===`);
  if (allErrors.length > 0) {
    console.error('Errored docs:');
    allErrors.forEach(e => console.error(`  - ${e.ws}/${e.coll}/${e.id}: ${e.error}`));
    process.exit(1);
  }
  console.log(COMMIT ? 'Backfill complete.' : 'Dry run — no writes. Re-run with --commit to apply.');
  process.exit(0);
})();
