/**
 * Phase 2.2.a EXECUTE — actual bootstrap to /players/ global collection.
 *
 * Per DESIGN_DECISIONS § 63.15.3 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 2.
 *
 * Mirrors dry-run logic exactly but writes to Firestore. ⚠️ DO NOT RUN WITHOUT
 * EXPLICIT JACEK APPROVAL based on prior dry-run report review.
 *
 * Option α (preserve doc IDs as global IDs). Idempotent — skips docs that
 * already exist in /players/. Re-run safe.
 *
 * Gated by PHASE_2_2_A_EXECUTE_CONFIRMED env var to prevent accidental
 * execution.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   export PHASE_2_2_A_EXECUTE_CONFIRMED=1
 *   node scripts/migration/phase_2_2_a_bootstrap_players.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!process.env.PHASE_2_2_A_EXECUTE_CONFIRMED) {
  console.error('ERROR: Execute mode requires PHASE_2_2_A_EXECUTE_CONFIRMED=1 env var.');
  console.error('Did Jacek explicitly approve based on dry-run report review?');
  console.error('Re-run dry-run script first:');
  console.error('  node scripts/migration/phase_2_2_a_bootstrap_players_dryrun.cjs');
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
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_2_a_execute_${timestamp}.json`);

function tsToMs(t) {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return 0;
}

function toGlobalDoc(player, { originWorkspace, aliasIds = [] }) {
  const d = player.data;
  return {
    name: d.name || '',
    nickname: d.nickname || '',
    number: d.number || '',
    pbliId: d.pbliId || null,
    pbliIdFull: d.pbliIdFull || null,
    teamId: d.teamId || null,
    teamHistory: d.teamHistory || [],
    age: d.age || null,
    favoriteBunker: d.favoriteBunker || null,
    playerClass: d.playerClass || null,
    role: d.role || 'player',
    nationality: d.nationality || null,
    photoURL: d.photoURL || null,
    comment: d.comment || null,
    hero: !!d.hero,
    linkedUid: d.linkedUid || null,
    linkedAt: d.linkedAt || null,
    unlinkedAt: d.unlinkedAt || null,
    emails: d.emails || null,
    originWorkspace,
    aliasIds: aliasIds.length ? aliasIds : null,
    // Preserve original createdAt/updatedAt verbatim; add migratedAt at write
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
    migratedAt: FieldValue.serverTimestamp(),
  };
}

async function main() {
  console.log('Phase 2.2.a EXECUTE — REAL Firestore writes to /players/');
  console.log('=========================================================\n');

  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.join(', ')}\n`);

  const allPlayers = [];
  for (const slug of slugs) {
    const players = await db.collection('workspaces').doc(slug).collection('players').get();
    players.docs.forEach(d => allPlayers.push({ slug, docId: d.id, data: d.data() }));
  }
  console.log(`Loaded ${allPlayers.length} player docs from workspaces\n`);

  // Build canonical groups (same logic as dry-run)
  const byPbli = {};
  const unlinked = [];
  for (const p of allPlayers) {
    const key = p.data.pbliId && String(p.data.pbliId).trim();
    if (key) (byPbli[key] = byPbli[key] || []).push(p);
    else unlinked.push(p);
  }

  const globalDocsToWrite = [];
  const dupMappings = [];
  for (const [pbliId, group] of Object.entries(byPbli)) {
    const sorted = [...group].sort((a, b) => {
      const ta = tsToMs(a.data.createdAt);
      const tb = tsToMs(b.data.createdAt);
      if (ta !== tb) return ta - tb;
      return a.docId.localeCompare(b.docId);
    });
    const canonical = sorted[0];
    const aliases = sorted.slice(1);
    const aliasIds = aliases.map(a => a.docId);
    globalDocsToWrite.push({
      id: canonical.docId,
      data: toGlobalDoc(canonical, { originWorkspace: canonical.slug, aliasIds }),
    });
    if (aliases.length) {
      dupMappings.push({
        pbliId,
        canonical: { slug: canonical.slug, docId: canonical.docId },
        aliasIds,
      });
    }
  }
  for (const p of unlinked) {
    globalDocsToWrite.push({
      id: p.docId,
      data: toGlobalDoc(p, { originWorkspace: p.slug, aliasIds: [] }),
    });
  }
  console.log(`Computed ${globalDocsToWrite.length} global player docs (${allPlayers.length - globalDocsToWrite.length} collapsed via dedup)\n`);

  // Write phase — idempotent skip-if-exists
  console.log('Writing to /players/ ...');
  let created = 0, skipped = 0, errors = 0;
  for (const { id, data } of globalDocsToWrite) {
    const ref = db.collection('players').doc(id);
    try {
      const existing = await ref.get();
      if (existing.exists) { skipped++; continue; }
      await ref.set(data);
      created++;
      if (created % 50 === 0) console.log(`  Progress: ${created}/${globalDocsToWrite.length - skipped}`);
    } catch (err) {
      errors++;
      console.error(`  Error writing /players/${id}: ${err.message}`);
    }
  }

  // Verification re-audit
  console.log('\nVerifying...');
  const postSnap = await db.collection('players').get();
  const postCount = postSnap.size;

  const report = {
    timestamp: new Date().toISOString(),
    mode: 'execute',
    workspaces_scanned: slugs,
    id_strategy: 'alpha-preserve-canonical-earliest-createdAt',
    summary: {
      total_workspace_players: allPlayers.length,
      expected_global_players: globalDocsToWrite.length,
      dedup_count: allPlayers.length - globalDocsToWrite.length,
      created,
      skipped,
      errors,
      post_global_count: postCount,
    },
    dup_mappings: dupMappings,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  if (errors > 0) {
    console.log('\n⚠️  Errors during write. Review above + report. Re-run is safe (idempotent).');
    process.exit(1);
  } else if (postCount !== globalDocsToWrite.length) {
    console.log(`\n⚠️  Verification mismatch: /players/ has ${postCount} docs, expected ${globalDocsToWrite.length}. Investigate.`);
    process.exit(1);
  } else {
    console.log('\n✅ Phase 2.2.a execute complete. /players/ collection populated.');
  }
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
