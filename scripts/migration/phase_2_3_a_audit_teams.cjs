/**
 * Phase 2.3.a audit — read-only discovery of team storage state across workspaces.
 *
 * Per DESIGN_DECISIONS § 63.15.2 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 3.
 *
 * Counts teams, splits parents vs children, detects orphaned children
 * (parentTeamId → non-existent parent), surfaces cross-workspace name
 * overlaps, tabulates field presence statistics, surfaces anomalies.
 * Writes JSON report to scripts/migration/reports/phase_2_3_a_audit_{ts}.json.
 *
 * Pure read. NO Firestore writes. Safe to run anytime.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_2_3_a_audit_teams.cjs
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
const REPORT_PATH = path.join(REPORTS_DIR, `phase_2_3_a_audit_${timestamp}.json`);

function tsToISO(t) {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate().toISOString();
  return null;
}

async function main() {
  console.log('Phase 2.3.a Teams AUDIT (read-only)');
  console.log('===================================\n');

  console.log('Loading workspaces...');
  const wsSnap = await db.collection('workspaces').get();
  const slugs = wsSnap.docs.map(d => d.id);
  console.log(`Workspaces: ${slugs.length} (${slugs.join(', ')})\n`);

  const allTeams = [];
  const perWorkspace = {};

  for (const slug of slugs) {
    console.log(`Scanning /workspaces/${slug}/teams ...`);
    const teams = await db.collection('workspaces').doc(slug).collection('teams').get();
    perWorkspace[slug] = teams.size;
    teams.docs.forEach(d => {
      const data = d.data();
      allTeams.push({ slug, docId: d.id, data });
    });
    console.log(`  ${teams.size} teams`);
  }
  console.log(`\nTotal teams across workspaces: ${allTeams.length}`);

  // ── Parent / child split ──
  const parents = allTeams.filter(t => !t.data.parentTeamId);
  const children = allTeams.filter(t => !!t.data.parentTeamId);

  // ── Orphan detection (parent within SAME workspace expected) ──
  const parentIdsBySlug = {};
  for (const p of parents) {
    (parentIdsBySlug[p.slug] = parentIdsBySlug[p.slug] || new Set()).add(p.docId);
  }
  const orphanedChildren = [];
  // Also detect cross-workspace parent refs (suspicious — shouldn't happen)
  const crossWorkspaceParentRefs = [];
  for (const c of children) {
    const sameWsParents = parentIdsBySlug[c.slug] || new Set();
    if (sameWsParents.has(c.data.parentTeamId)) continue;
    // Look anywhere
    const parent = allTeams.find(t => t.docId === c.data.parentTeamId);
    if (!parent) {
      orphanedChildren.push({
        slug: c.slug, docId: c.docId, name: c.data.name || '',
        parentTeamId: c.data.parentTeamId,
      });
    } else {
      // Found in another workspace
      crossWorkspaceParentRefs.push({
        childSlug: c.slug, childDocId: c.docId, childName: c.data.name || '',
        parentSlug: parent.slug, parentDocId: parent.docId, parentName: parent.data.name || '',
      });
    }
  }

  // ── Cross-workspace name overlaps (suspected duplicates) ──
  const byNameLower = {};
  for (const t of allTeams) {
    const k = (t.data.name || '').toLowerCase().trim();
    if (!k) continue;
    (byNameLower[k] = byNameLower[k] || []).push(t);
  }
  const nameOverlaps = Object.entries(byNameLower)
    .filter(([_, arr]) => arr.length > 1)
    .map(([name, arr]) => ({
      name,
      count: arr.length,
      workspaces: [...new Set(arr.map(t => t.slug))],
      docs: arr.map(t => ({
        slug: t.slug, docId: t.docId,
        externalId: t.data.externalId || null,
        leagues: t.data.leagues || [],
        divisions: t.data.divisions || {},
        parentTeamId: t.data.parentTeamId || null,
      })),
      crossWorkspace: [...new Set(arr.map(t => t.slug))].length > 1,
    }));
  const crossWorkspaceOverlaps = nameOverlaps.filter(o => o.crossWorkspace);
  const intraWorkspaceOverlaps = nameOverlaps.filter(o => !o.crossWorkspace);

  // ── externalId (PbLeagues bridge — natural dedup key) ──
  const teamsWithExtId = allTeams.filter(t => t.data.externalId && String(t.data.externalId).trim());
  const byExtId = {};
  for (const t of teamsWithExtId) {
    const k = String(t.data.externalId).trim();
    (byExtId[k] = byExtId[k] || []).push(t);
  }
  const extIdGroups = Object.entries(byExtId).filter(([_, arr]) => arr.length > 1);

  // ── Field presence stats ──
  const fieldStats = {};
  allTeams.forEach(t => {
    Object.keys(t.data).forEach(k => { fieldStats[k] = (fieldStats[k] || 0) + 1; });
  });

  // ── Other anomalies ──
  const anomalies = [];
  const noName = allTeams.filter(t => !t.data.name || !String(t.data.name).trim());
  if (noName.length) anomalies.push({
    type: 'missing_name', count: noName.length,
    samples: noName.slice(0, 5).map(t => ({ slug: t.slug, docId: t.docId })),
  });
  orphanedChildren.forEach(o => anomalies.push({ type: 'orphaned_child', ...o }));
  crossWorkspaceParentRefs.forEach(o => anomalies.push({ type: 'cross_workspace_parent_ref', ...o }));
  crossWorkspaceOverlaps.forEach(o => anomalies.push({
    type: 'cross_workspace_name_overlap', name: o.name, workspaces: o.workspaces, ids: o.docs.map(d => `${d.slug}/${d.docId}`),
  }));
  extIdGroups.forEach(([extId, arr]) => anomalies.push({
    type: 'externalId_dup', externalId: extId, count: arr.length,
    workspaces: [...new Set(arr.map(t => t.slug))],
    ids: arr.map(t => `${t.slug}/${t.docId}`),
  }));

  // ── Report ──
  const report = {
    timestamp: new Date().toISOString(),
    mode: 'audit',
    workspaces_scanned: slugs,
    summary: {
      total_workspace_teams: allTeams.length,
      per_workspace: perWorkspace,
      parents_count: parents.length,
      children_count: children.length,
      orphaned_children_count: orphanedChildren.length,
      cross_workspace_parent_refs: crossWorkspaceParentRefs.length,
      intra_workspace_name_overlaps: intraWorkspaceOverlaps.length,
      cross_workspace_name_overlaps: crossWorkspaceOverlaps.length,
      teams_with_external_id: teamsWithExtId.length,
      external_id_dup_groups: extIdGroups.length,
      anomaly_count: anomalies.length,
    },
    field_presence: Object.fromEntries(
      Object.entries(fieldStats).sort((a, b) => b[1] - a[1])
        .map(([k, n]) => [k, { count: n, percent: Math.round(n / allTeams.length * 100) }]),
    ),
    parents_sample: parents.slice(0, 5).map(p => ({
      slug: p.slug, docId: p.docId, name: p.data.name,
      leagues: p.data.leagues, divisions: p.data.divisions,
      externalId: p.data.externalId || null,
    })),
    children_sample: children.slice(0, 5).map(c => ({
      slug: c.slug, docId: c.docId, name: c.data.name,
      parentTeamId: c.data.parentTeamId,
      leagues: c.data.leagues, divisions: c.data.divisions,
    })),
    name_overlaps: nameOverlaps,
    external_id_dup_groups: extIdGroups.map(([extId, arr]) => ({
      externalId: extId,
      count: arr.length,
      workspaces: [...new Set(arr.map(t => t.slug))],
      docs: arr.map(t => ({ slug: t.slug, docId: t.docId, name: t.data.name })),
    })),
    anomalies,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nField presence:`);
  Object.entries(report.field_presence).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(20)} ${v.count}/${allTeams.length} (${v.percent}%)`);
  });
  console.log(`\nReport: ${REPORT_PATH}`);
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
