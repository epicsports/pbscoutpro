/**
 * Phase 2.2.a audit — read-only discovery of player storage state across workspaces.
 *
 * Per DESIGN_DECISIONS § 63.15.3 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 2.
 *
 * Counts players, identifies PBLI dedup candidates, tabulates field presence
 * statistics, surfaces anomalies. Writes JSON report to
 * scripts/migration/reports/phase_2_2_a_audit_{timestamp}.json.
 *
 * Pure read. NO Firestore writes. Safe to run anytime.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_2_2_a_audit_players.cjs
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
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_2_a_audit_${timestamp}.json`);

function tsToISO(t) {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return null;
}

async function main() {
  console.log('Phase 2.2.a Players AUDIT (read-only)');
  console.log('=====================================\n');

  console.log('Loading workspaces...');
  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.length} (${slugs.join(', ')})\n`);

  const allPlayers = [];
  const perWorkspace = {};

  for (const slug of slugs) {
    console.log(`Scanning /workspaces/${slug}/players ...`);
    const players = await db.collection('workspaces').doc(slug).collection('players').get();
    perWorkspace[slug] = players.size;
    players.docs.forEach(d => {
      const data = d.data();
      allPlayers.push({
        slug,
        docId: d.id,
        data,
      });
    });
    console.log(`  ${players.size} players`);
  }
  console.log(`\nTotal players across workspaces: ${allPlayers.length}`);

  // ── PBLI stats ──
  const linked = allPlayers.filter(p => p.data.pbliId && String(p.data.pbliId).trim());
  const unlinked = allPlayers.filter(p => !p.data.pbliId || !String(p.data.pbliId).trim());

  // ── PBLI dedup groups ──
  const byPbli = {};
  linked.forEach(p => {
    const key = String(p.data.pbliId).trim();
    (byPbli[key] = byPbli[key] || []).push(p);
  });
  const dupGroups = Object.entries(byPbli).filter(([_, arr]) => arr.length > 1);
  const dupGroupsDetail = dupGroups.map(([pbliId, arr]) => ({
    pbliId,
    count: arr.length,
    workspaces: [...new Set(arr.map(p => p.slug))],
    docs: arr.map(p => ({
      slug: p.slug, docId: p.docId, name: p.data.name || '',
      pbliIdFull: p.data.pbliIdFull || null,
      teamId: p.data.teamId || null,
      createdAt: tsToISO(p.data.createdAt),
    })),
    distinctNames: [...new Set(arr.map(p => (p.data.name || '').toLowerCase().trim()))],
    nameConflict: [...new Set(arr.map(p => (p.data.name || '').toLowerCase().trim()))].length > 1,
  }));
  const nameConflicts = dupGroupsDetail.filter(g => g.nameConflict);

  // ── Field presence stats ──
  const fieldStats = {};
  allPlayers.forEach(p => {
    Object.keys(p.data).forEach(k => { fieldStats[k] = (fieldStats[k] || 0) + 1; });
  });

  // ── Anomalies ──
  const anomalies = [];
  // Missing name
  const noName = allPlayers.filter(p => !p.data.name || !String(p.data.name).trim());
  if (noName.length) anomalies.push({ type: 'missing_name', count: noName.length, samples: noName.slice(0, 3).map(p => ({ slug: p.slug, docId: p.docId })) });
  // Same pbliId, different name (real PBLI conflict)
  nameConflicts.forEach(g => {
    anomalies.push({ type: 'pbliId_name_conflict', pbliId: g.pbliId, workspaces: g.workspaces, distinctNames: g.distinctNames });
  });

  // ── Report ──
  const report = {
    timestamp: new Date().toISOString(),
    mode: 'audit',
    workspaces_scanned: slugs,
    summary: {
      total_workspace_players: allPlayers.length,
      per_workspace: perWorkspace,
      linked_count: linked.length,
      unlinked_count: unlinked.length,
      distinct_pbli_ids: Object.keys(byPbli).length,
      pbli_dedup_groups: dupGroups.length,
      pbli_dedup_doc_excess: dupGroups.reduce((sum, [_, arr]) => sum + arr.length - 1, 0),
      cross_workspace_pbli_overlap: dupGroupsDetail.filter(g => g.workspaces.length > 1).length,
      intra_workspace_pbli_dups: dupGroupsDetail.filter(g => g.workspaces.length === 1).length,
      name_conflicts_on_pbli: nameConflicts.length,
      anomaly_count: anomalies.length,
    },
    field_presence: Object.fromEntries(
      Object.entries(fieldStats).sort((a,b) => b[1] - a[1]).map(([k, n]) => [k, { count: n, percent: Math.round(n / allPlayers.length * 100) }])
    ),
    dup_groups: dupGroupsDetail,
    anomalies,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
