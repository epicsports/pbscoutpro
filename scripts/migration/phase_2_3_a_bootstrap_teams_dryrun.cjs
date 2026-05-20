/**
 * Phase 2.3.a DRY-RUN — simulate /teams/ global bootstrap, write preview JSON.
 *
 * Per DESIGN_DECISIONS § 63.15.2 + § 63.15.2.X + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 3.
 *
 * Option α: preserve workspace doc IDs as global IDs.
 *
 * NO automatic dedup (per § 63.15.2.X locked 2026-05-20):
 *   - externalId duplicates → migrate both as separate global docs, flag
 *     in anomalies. Admin curates via Phase 2.3.c (auto-merge would orphan
 *     children whose parentTeamId points to one of the duplicates).
 *   - Intra-workspace name overlaps → legitimate per § 63.15.2 ("one team
 *     doc per (brand, league, division)"). Same-brand-multiple-divisions
 *     is the correct shape (e.g. Wild Dogs NXL PRO + Wild Dogs NXL PRO3v3
 *     = 2 separate team docs).
 *
 * Two-pass simulation:
 *   Pass 1 — parents (parentTeamId === null) migrate first; build success set
 *   Pass 2 — children verify parent in success set; orphans logged + skipped
 *
 * Schema preserved VERBATIM from workspace (per § 63.15.2.X #6 + Phase 2.1b
 * name-string precedent). Migration adds 3 fields only: originWorkspace,
 * migratedAt, no aliasIds (no dedup happens). Forward-looking § 63.15.2 spec
 * field renames (pbliTeamId, leagueId, divisionId, brandId, shortName, active,
 * createdBy/createdByWorkspace) are deferred to post-Phase-2 reconciliation.
 *
 * NO Firestore writes. Outputs preview JSON to
 * scripts/migration/reports/phase_2_3_a_dryrun_{timestamp}.json.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_2_3_a_bootstrap_teams_dryrun.cjs
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
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_3_a_dryrun_${timestamp}.json`);

function tsToISO(t) {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return null;
}

// Verbatim hoist of workspace fields + 3 migration-tracking fields.
function toGlobalDoc(team, { originWorkspace }) {
  const d = team.data;
  return {
    // Verbatim production schema (§ 63.15.2.X #6)
    name: d.name || '',
    leagues: Array.isArray(d.leagues) ? d.leagues : [],
    divisions: d.divisions && typeof d.divisions === 'object' ? d.divisions : {},
    parentTeamId: d.parentTeamId || null,
    externalId: d.externalId || null,
    // Migration tracking
    originWorkspace,
    createdAt: tsToISO(d.createdAt),
    updatedAt: tsToISO(d.updatedAt),
    migratedAt: '__SERVER_TIMESTAMP__', // placeholder; execute script substitutes
  };
}

async function main() {
  console.log('Phase 2.3.a DRY-RUN — no Firestore writes');
  console.log('==========================================\n');

  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.join(', ')}\n`);

  const allTeams = [];
  for (const slug of slugs) {
    const teams = await db.collection('workspaces').doc(slug).collection('teams').get();
    teams.docs.forEach(d => allTeams.push({ slug, docId: d.id, data: d.data() }));
  }
  console.log(`Loaded ${allTeams.length} team docs from workspaces\n`);

  // ── Pass 1 simulation: parents ──
  const parents = allTeams.filter(t => !t.data.parentTeamId);
  const children = allTeams.filter(t => !!t.data.parentTeamId);
  const parentDocIdSet = new Set(parents.map(p => p.docId));

  const pass1Docs = parents.map(p => ({
    id: p.docId,
    pass: 1,
    ...toGlobalDoc(p, { originWorkspace: p.slug }),
  }));

  // ── Pass 2 simulation: children (verify parent in success set) ──
  const pass2Docs = [];
  const orphanedChildren = [];
  for (const c of children) {
    if (parentDocIdSet.has(c.data.parentTeamId)) {
      pass2Docs.push({
        id: c.docId,
        pass: 2,
        ...toGlobalDoc(c, { originWorkspace: c.slug }),
      });
    } else {
      orphanedChildren.push({
        slug: c.slug, docId: c.docId, name: c.data.name || '',
        parentTeamId: c.data.parentTeamId,
        reason: 'parent not found in Pass 1 success set',
      });
    }
  }

  const globalDocs = [...pass1Docs, ...pass2Docs];

  // ── externalId dup detection (informational — no merge) ──
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
      docs: arr.map(t => ({
        slug: t.slug, docId: t.docId, name: t.data.name,
        parentTeamId: t.data.parentTeamId || null,
      })),
      note: 'Migrated as separate global docs per § 63.15.2.X #7. Admin curates via Phase 2.3.c.',
    }));

  // ── Cross-workspace name overlaps (would-be duplicates across tenants) ──
  const byNameLower = {};
  for (const t of allTeams) {
    const k = (t.data.name || '').toLowerCase().trim();
    if (!k) continue;
    (byNameLower[k] = byNameLower[k] || []).push(t);
  }
  const crossWsNameOverlaps = Object.entries(byNameLower)
    .filter(([_, arr]) => new Set(arr.map(t => t.slug)).size > 1)
    .map(([name, arr]) => ({
      name,
      count: arr.length,
      workspaces: [...new Set(arr.map(t => t.slug))],
      docs: arr.map(t => ({ slug: t.slug, docId: t.docId, externalId: t.data.externalId || null })),
    }));

  // ── Idempotency simulation: check what's already in /teams/ ──
  console.log('Checking /teams/ idempotency state...');
  const existingSnap = await db.collection('teams').get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  const wouldSkip = globalDocs.filter(g => existingIds.has(g.id)).length;
  const wouldCreate = globalDocs.length - wouldSkip;
  console.log(`  /teams/ currently has ${existingIds.size} docs`);
  console.log(`  Would skip (already exist): ${wouldSkip}`);
  console.log(`  Would create: ${wouldCreate}\n`);

  const report = {
    timestamp: new Date().toISOString(),
    mode: 'dry-run',
    workspaces_scanned: slugs,
    id_strategy: 'alpha-preserve-doc-ids',
    dedup_strategy: 'none — verbatim 1:1 hoist per § 63.15.2.X',
    summary: {
      total_workspace_teams: allTeams.length,
      pass1_parents: pass1Docs.length,
      pass2_children: pass2Docs.length,
      orphaned_children_skipped: orphanedChildren.length,
      expected_global_teams: globalDocs.length,
      external_id_dup_groups: extIdDupGroups.length,
      cross_workspace_name_overlaps: crossWsNameOverlaps.length,
      existing_global_docs: existingIds.size,
      would_skip: wouldSkip,
      would_create: wouldCreate,
    },
    orphaned_children: orphanedChildren,
    external_id_dup_groups: extIdDupGroups,
    cross_workspace_name_overlaps: crossWsNameOverlaps,
    global_teams_preview_sample: globalDocs.slice(0, 5),
    global_teams_preview_count: globalDocs.length,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log(`\n${wouldCreate} would be created, ${wouldSkip} would be skipped (idempotent). Re-run execute script with PHASE_2_3_A_EXECUTE_CONFIRMED=1 to perform writes.`);
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
