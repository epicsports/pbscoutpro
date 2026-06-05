/**
 * §90 STAGE 2B/3 — DESTRUCTIVE --live DELETE of decommissioned twins + /layouts.
 *
 * Runs ONLY after:
 *   - phase_90_2b3_dry_backup.cjs has written the JSON backups (PASS a backup dir).
 *   - the mirrorTwin-drop app deploy is LIVE (twins no longer regenerate).
 *   - Jacek's in-session CONFIRM.
 *
 * Deletes (irreversible except via the backup dir):
 *   A. /workspaces/{slug}/players/{pid}     (twin)
 *   B. /workspaces/{slug}/teams/{teamId}    (twin)
 *   C. /workspaces/{slug}/layouts/{lid}     (straggler, §96)
 * Does NOT touch global catalog /players /teams /layouts (canonical), the
 * workspace doc itself, ghost accounts (dropped from this window), or §98 fields.
 *
 * Safety:
 *   - Re-enumerates LIVE before deleting. Aborts if any set drifts from the backup
 *     manifest by > DRIFT (guards against a data shift between backup and delete).
 *   - Any live doc whose path is NOT already in the backup is appended to a
 *     supplemental backup file FIRST — nothing is deleted unbacked.
 *   - DRY by default. Set PHASE_90_2B3_CONFIRMED=1 to actually delete.
 *
 * RUN:
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\...\adminsdk.json
 *   node scripts/migration/phase_90_2b3_live_delete.cjs "<backup-dir>"            # dry
 *   set PHASE_90_2B3_CONFIRMED=1 && node ... "<backup-dir>"                        # live
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const BACKUP_DIR = process.argv[2];
const CONFIRMED = process.env.PHASE_90_2B3_CONFIRMED === '1';
const DRIFT = 15;

if (!SA_PATH) { console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS.'); process.exit(1); }
if (!BACKUP_DIR || !fs.existsSync(BACKUP_DIR)) { console.error(`ERROR: pass an existing backup dir as arg 1. Got: ${BACKUP_DIR}`); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, name), 'utf8'));
const pad = (s, n = 6) => String(s).padStart(n);

const SETS = [
  { key: 'players', label: 'A. player twins', backup: 'A_player_twins.json', manifestKey: 'playerTwins' },
  { key: 'teams',   label: 'B. team twins',   backup: 'B_team_twins.json',   manifestKey: 'teamTwins' },
  { key: 'layouts', label: 'C. /layouts',     backup: 'C_layout_stragglers.json', manifestKey: 'layoutStragglers' },
];

(async () => {
  console.log('');
  console.log('================================================================');
  console.log(` §90 2B/3 --live DELETE — ${CONFIRMED ? 'LIVE (will delete)' : 'DRY (no delete)'}`);
  console.log('================================================================');
  const manifest = readJson('00_manifest.json');
  const slugs = manifest.workspaces;
  console.log(`  backup dir : ${BACKUP_DIR}`);
  console.log(`  workspaces : [${slugs.join(', ')}]`);
  console.log('');

  // Re-enumerate live, per set, across all workspaces.
  const supplemental = {};
  let abort = false;
  const plan = [];

  for (const set of SETS) {
    const backedUpPaths = new Set(readJson(set.backup).map(d => d.path));
    let liveDocs = [];
    for (const slug of slugs) {
      const snap = await db.collection(`workspaces/${slug}/${set.key}`).get();
      liveDocs.push(...snap.docs);
    }
    const liveCount = liveDocs.length;
    const backupCount = manifest.counts[set.manifestKey];
    const drift = liveCount - backupCount;

    // Anything live but not in the backup → capture before delete.
    const unbacked = liveDocs
      .filter(d => !backedUpPaths.has(d.ref.path))
      .map(d => ({ path: d.ref.path, id: d.id, data: d.data() }));
    if (unbacked.length) supplemental[set.key] = unbacked;

    console.log(`── ${set.label}`);
    console.log(`     backup ${pad(backupCount)} · live ${pad(liveCount)} · drift ${drift >= 0 ? '+' : ''}${drift} · unbacked-now ${unbacked.length}`);
    if (Math.abs(drift) > DRIFT) {
      console.error(`     SAFETY ABORT: drift ${drift} exceeds ±${DRIFT}. Re-run the backup script and review.`);
      abort = true;
    }
    plan.push({ set, liveDocs, liveCount });
  }
  console.log('');

  if (abort) { console.error('Aborted on drift. No deletes performed.'); process.exit(3); }

  // Persist supplemental backup of any unbacked-now docs.
  if (Object.keys(supplemental).length) {
    const file = path.join(BACKUP_DIR, 'A_supplemental_unbacked.json');
    fs.writeFileSync(file, JSON.stringify(supplemental, null, 2), 'utf8');
    console.log(`  supplemental backup of unbacked-now docs → ${file}`);
    console.log('');
  }

  if (!CONFIRMED) {
    console.log('  DRY — no deletes. Set PHASE_90_2B3_CONFIRMED=1 to delete the above.');
    process.exit(0);
  }

  // Delete in batches of 450 (< Firestore 500 cap).
  let totalDeleted = 0;
  for (const { set, liveDocs } of plan) {
    let deleted = 0;
    for (let i = 0; i < liveDocs.length; i += 450) {
      const chunk = liveDocs.slice(i, i + 450);
      const batch = db.batch();
      chunk.forEach(d => batch.delete(d.ref));
      await batch.commit();
      deleted += chunk.length;
    }
    totalDeleted += deleted;
    console.log(`  deleted ${set.label.padEnd(18)} : ${deleted}`);
  }
  console.log('');

  // Verify zero remain.
  console.log('── post-delete verification (expect 0 each) ──');
  for (const set of SETS) {
    let remain = 0;
    for (const slug of slugs) {
      const snap = await db.collection(`workspaces/${slug}/${set.key}`).get();
      remain += snap.size;
    }
    console.log(`     ${set.label.padEnd(18)} remaining: ${remain}${remain ? '  ⚠ NON-ZERO' : ''}`);
  }
  console.log('');
  console.log(`  TOTAL deleted: ${totalDeleted}. DONE.`);
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
