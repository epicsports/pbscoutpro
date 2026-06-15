// READ-ONLY prod audit (admin-SDK; autonomous). No writes.
// Finds the "stamp-recoverable" stranded class: users with defaultWorkspace
// null/missing who are a ROLE-BEARING member of EXACTLY ONE workspace. On a fresh
// bundle the membership-fallback (STEP-9) enters them fine; on a STALE cached
// bundle (pre-2026-06-14) they strand on NoWorkspaceScreen. Stamping
// defaultWorkspace makes them robust across all bundles.
//
// Also reports adjacent classes for context (NOT auto-stampable):
//   - role-bearing member of >1 workspace (entry is ambiguous; the hardening fix
//     picks a role-bearing ws, but we don't pick a default for them here)
//   - member of >=1 workspace but with EMPTY roles everywhere (genuinely pending —
//     needs an ADMIN GRANT, not a stamp)
// Writes the full list (with PII) to a local file; prints a masked summary.
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();

const mask = (s) => (s && s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

(async () => {
  // 1. Load all workspaces → uid -> [{slug, roles}]
  const wsSnap = await db.collection('workspaces').get();
  const memberOf = new Map();
  wsSnap.forEach((d) => {
    const data = d.data() || {};
    const members = Array.isArray(data.members) ? data.members : [];
    const userRoles = data.userRoles || {};
    members.forEach((uid) => {
      const roles = Array.isArray(userRoles[uid]) ? userRoles[uid] : [];
      if (!memberOf.has(uid)) memberOf.set(uid, []);
      memberOf.get(uid).push({ slug: d.id, roles });
    });
  });
  console.log(`workspaces scanned: ${wsSnap.size}`);

  // 2. Scan users with no defaultWorkspace
  const usersSnap = await db.collection('users').get();
  const stampable = []; // defaultWorkspace null + role-bearing member of EXACTLY ONE ws
  const multiRoleBearing = []; // >1 role-bearing ws, no default
  const pendingNoRoles = []; // member(s) but empty roles everywhere, no default
  usersSnap.forEach((d) => {
    const u = d.data() || {};
    if (u.defaultWorkspace) return; // already has a default → not in this class
    const mships = memberOf.get(d.id) || [];
    const withRoles = mships.filter((m) => m.roles.length > 0);
    const row = { uid: d.id, email: u.email || '(none)', linkSkippedAt: !!u.linkSkippedAt, memberships: mships.map((m) => `${m.slug}:[${m.roles.join(',')}]`) };
    if (withRoles.length === 1) stampable.push({ ...row, slug: withRoles[0].slug, roles: withRoles[0].roles });
    else if (withRoles.length > 1) multiRoleBearing.push(row);
    else if (mships.length >= 1) pendingNoRoles.push(row);
  });
  console.log(`users scanned: ${usersSnap.size}\n`);

  const out = { generatedAtUtc: new Date().toISOString?.() || 'n/a', stampable, multiRoleBearing, pendingNoRoles };
  const file = path.resolve(__dirname, 'stranded-accounts-audit.local.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log(`=== STAMPABLE (defaultWorkspace:null + role-bearing member of EXACTLY ONE ws) : ${stampable.length} ===`);
  stampable.forEach((r) => console.log(`  ${mask(r.uid)}  ${r.email}  → ${r.slug} [${r.roles.join(',')}]  linkSkipped=${r.linkSkippedAt}`));
  console.log(`\n=== multi role-bearing (>1 ws, no default) : ${multiRoleBearing.length} === (hardening-fix territory; not stamped here)`);
  multiRoleBearing.forEach((r) => console.log(`  ${mask(r.uid)}  ${r.email}  ${r.memberships.join('  ')}`));
  console.log(`\n=== pending — member but EMPTY roles everywhere : ${pendingNoRoles.length} === (needs ADMIN GRANT, not a stamp)`);
  pendingNoRoles.forEach((r) => console.log(`  ${mask(r.uid)}  ${r.email}  ${r.memberships.join('  ')}  linkSkipped=${r.linkSkippedAt}`));
  console.log(`\nFull list (with PII) written locally: ${file}`);
  process.exit(0);
})().catch((e) => { console.error('AUDIT FAILED:', e?.code || e?.message); process.exit(1); });
