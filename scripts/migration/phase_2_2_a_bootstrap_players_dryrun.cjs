/**
 * Phase 2.2.a DRY-RUN — simulate /players/ global bootstrap, write preview JSON.
 *
 * Per DESIGN_DECISIONS § 63.15.3 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 2.
 *
 * Option α: preserve workspace doc IDs as global IDs. Per pbliId group: canonical
 * = earliest createdAt; others become aliasIds[] on canonical (legacy preserved
 * via /workspaces/{slug}/players/ subcollection untouched). Empty-pbliId players
 * migrate 1:1 (no dedup attempt — high false-positive risk).
 *
 * NO Firestore writes. Outputs preview JSON to
 * scripts/migration/reports/phase_2_2_a_dryrun_{timestamp}.json.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_2_2_a_bootstrap_players_dryrun.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

const REPORTS_DIR = path.join(__dirname, 'reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_2_a_dryrun_${timestamp}.json`);

function tsToMs(t) {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  return 0;
}
function tsToISO(t) {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return null;
}

// Stripped + normalized player payload for global doc. Preserves stored field
// shape for backward compat; adds originWorkspace + migratedAt + aliasIds.
function toGlobalDoc(player, { originWorkspace, aliasIds = [] }) {
  const d = player.data;
  return {
    // Identity
    name: d.name || '',
    nickname: d.nickname || '',
    number: d.number || '',
    pbliId: d.pbliId || null,
    pbliIdFull: d.pbliIdFull || null,
    // Workspace context (note: teamId stays as workspace-scoped reference;
    // Phase 2.3 will hoist teams to global, this field gets renamed/relinked then)
    teamId: d.teamId || null,
    teamHistory: d.teamHistory || [],
    // Profile
    age: d.age || null,
    favoriteBunker: d.favoriteBunker || null,
    playerClass: d.playerClass || null,
    role: d.role || 'player',
    nationality: d.nationality || null,
    photoURL: d.photoURL || null,
    comment: d.comment || null,
    // System flags
    hero: !!d.hero,
    linkedUid: d.linkedUid || null,
    linkedAt: d.linkedAt || null,
    unlinkedAt: d.unlinkedAt || null,
    emails: d.emails || null,
    // Migration tracking
    originWorkspace,
    aliasIds: aliasIds.length ? aliasIds : null,
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
    migratedAt: '__SERVER_TIMESTAMP__', // placeholder; execute script substitutes
  };
}

async function main() {
  console.log('Phase 2.2.a DRY-RUN — no Firestore writes');
  console.log('==========================================\n');

  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.join(', ')}\n`);

  const allPlayers = [];
  for (const slug of slugs) {
    const players = await db.collection('workspaces').doc(slug).collection('players').get();
    players.docs.forEach(d => allPlayers.push({ slug, docId: d.id, data: d.data() }));
  }
  console.log(`Loaded ${allPlayers.length} player docs\n`);

  // ── PBLI group + canonical selection ──
  const byPbli = {};
  const unlinked = [];
  for (const p of allPlayers) {
    const key = p.data.pbliId && String(p.data.pbliId).trim();
    if (key) (byPbli[key] = byPbli[key] || []).push(p);
    else unlinked.push(p);
  }

  const globalDocs = [];
  const dupMappings = []; // for report — aliasId → canonical mapping per dup group

  // Linked players: dedup per pbliId
  for (const [pbliId, group] of Object.entries(byPbli)) {
    // Canonical = earliest createdAt; tie-break = lexicographically smallest docId
    const sorted = [...group].sort((a, b) => {
      const ta = tsToMs(a.data.createdAt);
      const tb = tsToMs(b.data.createdAt);
      if (ta !== tb) return ta - tb;
      return a.docId.localeCompare(b.docId);
    });
    const canonical = sorted[0];
    const aliases = sorted.slice(1);
    const aliasIds = aliases.map(a => a.docId);
    globalDocs.push({
      id: canonical.docId,
      ...toGlobalDoc(canonical, { originWorkspace: canonical.slug, aliasIds }),
    });
    if (aliases.length > 0) {
      dupMappings.push({
        pbliId,
        canonical: { slug: canonical.slug, docId: canonical.docId, name: canonical.data.name, createdAt: tsToISO(canonical.data.createdAt) },
        aliases: aliases.map(a => ({ slug: a.slug, docId: a.docId, name: a.data.name, createdAt: tsToISO(a.data.createdAt) })),
      });
    }
  }

  // Unlinked players: 1:1 migration
  for (const p of unlinked) {
    globalDocs.push({
      id: p.docId,
      ...toGlobalDoc(p, { originWorkspace: p.slug, aliasIds: [] }),
    });
  }

  // ── Idempotency simulation: check what's already in /players/ ──
  console.log('Checking /players/ idempotency state...');
  const existingSnap = await db.collection('players').get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const wouldSkip = globalDocs.filter(g => existingIds.has(g.id)).length;
  const wouldCreate = globalDocs.length - wouldSkip;
  console.log(`  /players/ currently has ${existingIds.size} docs`);
  console.log(`  Would skip (already exist): ${wouldSkip}`);
  console.log(`  Would create: ${wouldCreate}\n`);

  const report = {
    timestamp: new Date().toISOString(),
    mode: 'dry-run',
    workspaces_scanned: slugs,
    id_strategy: 'alpha-preserve-canonical-earliest-createdAt',
    summary: {
      total_workspace_players: allPlayers.length,
      expected_global_players: globalDocs.length,
      dedup_count: allPlayers.length - globalDocs.length,
      linked_count: allPlayers.length - unlinked.length,
      unlinked_count: unlinked.length,
      dup_groups: dupMappings.length,
      existing_global_docs: existingIds.size,
      would_skip: wouldSkip,
      would_create: wouldCreate,
    },
    dup_mappings: dupMappings,
    global_players_preview_sample: globalDocs.slice(0, 5),
    global_players_preview_count: globalDocs.length,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`\n${wouldCreate} would be created, ${wouldSkip} would be skipped (idempotent). Re-run execute script with PHASE_2_2_A_EXECUTE_CONFIRMED=1 to perform writes.`);
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
