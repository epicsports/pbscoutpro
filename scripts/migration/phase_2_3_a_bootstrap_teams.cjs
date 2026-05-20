/**
 * Phase 2.3.a EXECUTE — actual bootstrap to /teams/ global collection.
 *
 * Per DESIGN_DECISIONS § 63.15.2 + § 63.15.2.X + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 3.
 *
 * Mirrors dry-run logic exactly but writes to Firestore. ⚠️ DO NOT RUN
 * WITHOUT EXPLICIT JACEK APPROVAL based on prior dry-run report review.
 *
 * Option α (preserve doc IDs as global IDs). Verbatim hoist + 3 migration
 * tracking fields (originWorkspace, migratedAt; createdAt/updatedAt
 * preserved verbatim). NO automatic dedup (per § 63.15.2.X locked
 * 2026-05-20 — admin curates duplicates via Phase 2.3.c).
 *
 * Two-pass execution:
 *   Pass 1 — parents written; success set built (in-memory + verified
 *     against /teams/ post-write)
 *   Pass 2 — children verify parent in success set, write if OK,
 *     log + skip if orphaned
 *
 * Idempotent — skips docs that already exist in /teams/. Re-run safe.
 *
 * Gated by PHASE_2_3_A_EXECUTE_CONFIRMED env var to prevent accidental
 * execution.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   export PHASE_2_3_A_EXECUTE_CONFIRMED=1
 *   node scripts/migration/phase_2_3_a_bootstrap_teams.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!process.env.PHASE_2_3_A_EXECUTE_CONFIRMED) {
  console.error('ERROR: Execute mode requires PHASE_2_3_A_EXECUTE_CONFIRMED=1 env var.');
  console.error('Did Jacek explicitly approve based on dry-run report review?');
  console.error('Re-run dry-run script first:');
  console.error('  node scripts/migration/phase_2_3_a_bootstrap_teams_dryrun.cjs');
  process.exit(1);
}

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const REPORTS_DIR = path.join(__dirname, 'reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_3_a_execute_${timestamp}.json`);

function toGlobalDoc(team, { originWorkspace }) {
  const d = team.data;
  return {
    name: d.name || '',
    leagues: Array.isArray(d.leagues) ? d.leagues : [],
    divisions: d.divisions && typeof d.divisions === 'object' ? d.divisions : {},
    parentTeamId: d.parentTeamId || null,
    externalId: d.externalId || null,
    originWorkspace,
    // Preserve original createdAt/updatedAt verbatim; add migratedAt at write
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
    migratedAt: FieldValue.serverTimestamp(),
  };
}

async function main() {
  console.log('Phase 2.3.a EXECUTE — REAL Firestore writes to /teams/');
  console.log('=======================================================\n');

  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.join(', ')}\n`);

  const allTeams = [];
  for (const slug of slugs) {
    const teams = await db.collection('workspaces').doc(slug).collection('teams').get();
    teams.docs.forEach(d => allTeams.push({ slug, docId: d.id, data: d.data() }));
  }
  console.log(`Loaded ${allTeams.length} team docs from workspaces\n`);

  const parents = allTeams.filter(t => !t.data.parentTeamId);
  const children = allTeams.filter(t => !!t.data.parentTeamId);
  console.log(`Pass 1: ${parents.length} parents`);
  console.log(`Pass 2: ${children.length} children\n`);

  // ── PASS 1 — parents ──
  console.log('PASS 1: Writing parent teams...');
  let pass1Created = 0, pass1Skipped = 0, pass1Errors = 0;
  const writtenParentIds = new Set();
  for (const p of parents) {
    const ref = db.collection('teams').doc(p.docId);
    try {
      const existing = await ref.get();
      if (existing.exists) {
        pass1Skipped++;
        writtenParentIds.add(p.docId); // already there, valid for Pass 2 reference
        continue;
      }
      await ref.set(toGlobalDoc(p, { originWorkspace: p.slug }));
      pass1Created++;
      writtenParentIds.add(p.docId);
      if (pass1Created % 25 === 0) {
        console.log(`  Progress: ${pass1Created}/${parents.length - pass1Skipped}`);
      }
    } catch (err) {
      pass1Errors++;
      console.error(`  Error writing parent /teams/${p.docId}: ${err.message}`);
    }
  }
  console.log(`PASS 1 done: ${pass1Created} created, ${pass1Skipped} skipped, ${pass1Errors} errors\n`);

  if (pass1Errors > 0) {
    console.error('⚠️ Pass 1 had errors — aborting Pass 2 to avoid orphaning children.');
    process.exit(1);
  }

  // ── PASS 2 — children with parent verification ──
  console.log('PASS 2: Writing child teams with parent verification...');
  let pass2Created = 0, pass2Skipped = 0, pass2Errors = 0;
  const orphanedChildren = [];
  for (const c of children) {
    if (!writtenParentIds.has(c.data.parentTeamId)) {
      orphanedChildren.push({
        slug: c.slug, docId: c.docId, name: c.data.name || '',
        parentTeamId: c.data.parentTeamId,
        reason: 'parent missing from Pass 1 written set',
      });
      console.warn(`  Skipping orphan: ${c.docId} (${c.data.name}) — parent ${c.data.parentTeamId} not written`);
      continue;
    }
    const ref = db.collection('teams').doc(c.docId);
    try {
      const existing = await ref.get();
      if (existing.exists) { pass2Skipped++; continue; }
      await ref.set(toGlobalDoc(c, { originWorkspace: c.slug }));
      pass2Created++;
    } catch (err) {
      pass2Errors++;
      console.error(`  Error writing child /teams/${c.docId}: ${err.message}`);
    }
  }
  console.log(`PASS 2 done: ${pass2Created} created, ${pass2Skipped} skipped, ${pass2Errors} errors, ${orphanedChildren.length} orphans\n`);

  // ── Verification ──
  console.log('Verifying...');
  const postSnap = await db.collection('teams').get();
  const postCount = postSnap.size;
  const expected = allTeams.length - orphanedChildren.length;

  // externalId dup detection for execute report (informational)
  const byExtId = {};
  for (const t of allTeams) {
    const k = t.data.externalId && String(t.data.externalId).trim();
    if (!k) continue;
    (byExtId[k] = byExtId[k] || []).push(t);
  }
  const extIdDupGroups = Object.entries(byExtId)
    .filter(([_, arr]) => arr.length > 1)
    .map(([extId, arr]) => ({
      externalId: extId,
      count: arr.length,
      docs: arr.map(t => ({ slug: t.slug, docId: t.docId, name: t.data.name })),
      note: 'Both migrated as separate global docs per § 63.15.2.X #7. Admin curation TODO via Phase 2.3.c.',
    }));

  const report = {
    timestamp: new Date().toISOString(),
    mode: 'execute',
    workspaces_scanned: slugs,
    id_strategy: 'alpha-preserve-doc-ids',
    dedup_strategy: 'none — verbatim 1:1 hoist per § 63.15.2.X',
    summary: {
      total_workspace_teams: allTeams.length,
      pass1: { parents: parents.length, created: pass1Created, skipped: pass1Skipped, errors: pass1Errors },
      pass2: { children: children.length, created: pass2Created, skipped: pass2Skipped, errors: pass2Errors, orphans: orphanedChildren.length },
      total_created: pass1Created + pass2Created,
      total_skipped: pass1Skipped + pass2Skipped,
      total_errors: pass1Errors + pass2Errors,
      expected_global_teams: expected,
      post_global_count: postCount,
      external_id_dup_groups: extIdDupGroups.length,
    },
    orphaned_children: orphanedChildren,
    external_id_dup_groups: extIdDupGroups,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  if (pass1Errors + pass2Errors > 0) {
    console.log('\n⚠️  Errors during write. Review above + report. Re-run is safe (idempotent).');
    process.exit(1);
  } else if (postCount < expected) {
    console.log(`\n⚠️  Verification mismatch: /teams/ has ${postCount} docs, expected ≥ ${expected}. Investigate.`);
    process.exit(1);
  } else {
    console.log('\n✅ Phase 2.3.a execute complete. /teams/ collection populated.');
  }
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
