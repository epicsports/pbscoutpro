// READ-ONLY prod diagnostic (admin-SDK; autonomous per Firebase policy). No writes.
// Why is a freshly-granted scout (Majma) stuck on the "Nie masz jeszcze
// przydziału" waiting screen instead of seeing events? Dumps his user doc,
// every workspace membership + roles there, and the tournaments in each.
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();

const EMAIL = process.argv[2] || 'majmaaaaa@gmail.com';

(async () => {
  let user;
  try { user = await admin.auth().getUserByEmail(EMAIL); }
  catch (e) { console.error(`auth.getUserByEmail(${EMAIL}) failed:`, e?.code || e?.message); process.exit(1); }
  const uid = user.uid;
  console.log(`\n=== ${EMAIL} ===`);
  console.log(`uid=${uid}  disabled=${user.disabled}  created=${user.metadata?.creationTime}`);

  const u = await db.doc(`users/${uid}`).get();
  const ud = u.exists ? u.data() : null;
  console.log('\nusers/{uid}:', ud ? JSON.stringify({
    roles: ud.roles ?? '(none)',
    defaultWorkspace: ud.defaultWorkspace ?? null,
    disabled: ud.disabled ?? false,
    globalRole: ud.globalRole ?? null,
  }) : '(missing)');

  const snap = await db.collection('workspaces').where('members', 'array-contains', uid).get();
  console.log(`\nWorkspaces (members array-contains uid): ${snap.size}`);
  for (const d of snap.docs) {
    const data = d.data() || {};
    const roles = (data.userRoles || {})[uid];
    const pending = Array.isArray(data.pendingApprovals) && data.pendingApprovals.includes(uid);
    console.log(`\n  workspace="${d.id}"  name="${data.name || ''}"`);
    console.log(`    userRoles[uid] = ${roles === undefined ? '(UNDEFINED — no membership entry)' : JSON.stringify(roles)}`);
    console.log(`    pendingApproval = ${pending}   rolesVersion=${data.rolesVersion}   members=${(data.members||[]).length}`);
    // Tournaments in this workspace
    const tSnap = await db.collection(`workspaces/${d.id}/tournaments`).get();
    console.log(`    tournaments: ${tSnap.size}`);
    tSnap.forEach(t => {
      const td = t.data() || {};
      console.log(`      - ${t.id}  name="${td.name||''}"  status=${td.status||'(none)'}  year=${td.year||'-'}  createdAt=${td.createdAt?.toDate?.().toISOString?.()||'-'}`);
    });
  }
  process.exit(0);
})().catch((e) => { console.error('READ FAILED:', e?.code || e?.stack || e?.message); process.exit(1); });
