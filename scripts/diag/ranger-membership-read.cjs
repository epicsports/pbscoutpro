// READ-ONLY prod diagnostic (admin-SDK; autonomous per Firebase policy). No writes.
// Answers: is the stuck user a member of >1 workspace, and what are their roles in
// each? This decides whether the auto-enter source-of-truth fix self-heals them.
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS (prod project)
const db = admin.firestore();

const UID = process.argv[2];
if (!UID) { console.error('usage: node ranger-membership-read.cjs <UID>'); process.exit(1); }

(async () => {
  const snap = await db.collection('workspaces').where('members', 'array-contains', UID).get();
  console.log(`\nWorkspaces where members array-contains the UID: ${snap.size}`);
  const rows = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    const roles = (data.userRoles || {})[UID];
    const pending = Array.isArray(data.pendingApprovals) && data.pendingApprovals.includes(UID);
    rows.push({ slug: d.id, userRoles: roles === undefined ? '(undefined)' : JSON.stringify(roles), pending, rolesVersion: data.rolesVersion });
  });
  // Firestore default query order = document name (slug) ascending — same order
  // the client auto-enter sees, so docs[0] here == the old code's pick.
  rows.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  rows.forEach((r, i) => console.log(`  [${i}] ${r.slug}  userRoles=${r.userRoles}  pending=${r.pending}  rolesVersion=${r.rolesVersion}`));

  const u = await db.doc(`users/${UID}`).get();
  const ud = u.exists ? u.data() : null;
  console.log('\nusers/{uid}:', ud ? JSON.stringify({ roles: ud.roles ?? '(none)', defaultWorkspace: ud.defaultWorkspace ?? null, linkSkippedAt: !!ud.linkSkippedAt }) : '(missing)');

  // Verdict
  const withRoles = rows.filter(r => r.userRoles !== '(undefined)' && r.userRoles !== '[]');
  console.log('\n--- verdict ---');
  console.log(`memberships=${rows.length}  role-bearing=${withRoles.length}  oldCodePick=${rows[0]?.slug || '(none)'}  fixPick=${(withRoles[0] || rows[0])?.slug || '(none)'}`);
  process.exit(0);
})().catch((e) => { console.error('READ FAILED:', e?.code || e?.message); process.exit(1); });
