/**
 * Phase 2.1a bootstrap — populate /leagues/ collection from LEAGUES + DIVISIONS constants
 *
 * Per DESIGN_DECISIONS § 63.15.1 — Leagues configurable global resource.
 * Per MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 1.
 *
 * Creates 3 league docs (l_nxl, l_pxl, l_dpl) with divisions populated from
 * current theme.js constants (snapshot 2026-05-19). Idempotent — skip if doc
 * exists, no overwrite. Safe to re-run.
 *
 * Workspace UI continues to read from theme.js constants for now (Phase 2.1b
 * will refactor to read from Firestore). Super admin UI for league management
 * is Phase 2.1c.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_2_1a_bootstrap_leagues.cjs --dry-run
 *   node scripts/migration/phase_2_1a_bootstrap_leagues.cjs --write
 */

const admin = require('firebase-admin');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SA_PATH)),
});

const db = admin.firestore();

// Source-of-truth snapshot from src/utils/theme.js as of 2026-05-19:
//   LEAGUES = ['NXL', 'DPL', 'PXL']
//   DIVISIONS = {
//     NXL: ['PRO', 'SEMI-PRO', 'D2', 'D3', 'D4', 'PRO3v3', 'WNXL'],
//     PXL: ['Div.1', 'Div.2', 'Div.3'],
//     DPL: ['Div.1', 'Div.2', 'Div.3'],
//   }
//
// ID convention: lowercase, hyphenated (dots → hyphens). `name` preserves
// original display casing because workspace UI today renders these strings
// as-is — Phase 2.1b refactor must read the same display values.
const LEAGUES_DATA = [
  {
    id: 'l_nxl',
    name: 'NXL',
    shortName: 'NXL',
    region: null,
    parentLeagueFamily: null,
    divisions: [
      { id: 'pro',      name: 'PRO',      order: 1 },
      { id: 'semi-pro', name: 'SEMI-PRO', order: 2 },
      { id: 'd2',       name: 'D2',       order: 3 },
      { id: 'd3',       name: 'D3',       order: 4 },
      { id: 'd4',       name: 'D4',       order: 5 },
      { id: 'pro3v3',   name: 'PRO3v3',   order: 6 },
      { id: 'wnxl',     name: 'WNXL',     order: 7 },
    ],
    active: true,
    createdBy: 'bootstrap',
  },
  {
    id: 'l_pxl',
    name: 'PXL',
    shortName: 'PXL',
    region: null,
    parentLeagueFamily: null,
    divisions: [
      { id: 'div-1', name: 'Div.1', order: 1 },
      { id: 'div-2', name: 'Div.2', order: 2 },
      { id: 'div-3', name: 'Div.3', order: 3 },
    ],
    active: true,
    createdBy: 'bootstrap',
  },
  {
    id: 'l_dpl',
    name: 'DPL',
    shortName: 'DPL',
    region: null,
    parentLeagueFamily: null,
    divisions: [
      { id: 'div-1', name: 'Div.1', order: 1 },
      { id: 'div-2', name: 'Div.2', order: 2 },
      { id: 'div-3', name: 'Div.3', order: 3 },
    ],
    active: true,
    createdBy: 'bootstrap',
  },
];

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isWrite = args.includes('--write');

  if (!isDryRun && !isWrite) {
    console.error('Usage: node scripts/migration/phase_2_1a_bootstrap_leagues.cjs [--dry-run | --write]');
    process.exit(1);
  }

  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}`);
  console.log('Bootstrapping /leagues/ collection...\n');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const league of LEAGUES_DATA) {
    const { id, ...data } = league;
    const docRef = db.collection('leagues').doc(id);

    try {
      const existing = await docRef.get();

      if (existing.exists) {
        console.log(`[SKIP] /leagues/${id} already exists`);
        skipped++;
        continue;
      }

      if (isDryRun) {
        console.log(`[DRY-RUN] Would create /leagues/${id} with:`);
        console.log(JSON.stringify({ ...data, createdAt: '<serverTimestamp>', updatedAt: '<serverTimestamp>' }, null, 2));
        continue;
      }

      // WRITE mode
      await docRef.set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[CREATED] /leagues/${id} (${data.divisions.length} divisions)`);
      created++;
    } catch (err) {
      errors++;
      console.error(`Error processing /leagues/${id}: ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total leagues defined: ${LEAGUES_DATA.length}`);
  console.log(`Skipped (already exist): ${skipped}`);

  if (isWrite) {
    console.log(`Created: ${created}`);
    console.log(`Errors: ${errors}`);
    if (errors > 0) {
      console.log('\n⚠️  ERRORS occurred. Review log above. Re-run --write to retry (idempotent).');
      process.exit(1);
    } else {
      console.log('\n✅ Phase 2.1a bootstrap complete. /leagues/ collection populated.');
    }
  } else {
    console.log(`\n[DRY-RUN] Would create ${LEAGUES_DATA.length - skipped} new docs. Re-run with --write to execute.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
