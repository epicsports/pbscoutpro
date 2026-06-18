// Migration: prune ORPHAN empty-role userRoles keys in ranger1996.
//
// Orphan = userRoles[uid] is [] AND uid is NOT in members[] AND NOT pending.
// These are stale map entries (no role, no membership) — pure cruft.
//
// EXCLUDED: a uid with empty roles that IS a member (a real role-less member).
// Deleting that would evict a real person or strand them role-less; their
// desired role is a product decision, left for Jacek. (G1, 2026-06-19.)
//
// Dry by default. Pass --live to write.
//   node scripts/migrate-prune-empty-roles.mjs            (dry)
//   node scripts/migrate-prune-empty-roles.mjs --live     (write)
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const LIVE = process.argv.includes('--live');
const slug = 'ranger1996';

const svc = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
initializeApp({ credential: cert(svc) });
const db = getFirestore();

const ref = db.doc(`workspaces/${slug}`);
const snap = await ref.get();
if (!snap.exists) { console.error(`NO DOC ${slug}`); process.exit(1); }
const d = snap.data();
const userRoles = d.userRoles || {};
const members = d.members || [];
const pending = d.pendingApprovals || [];

const orphans = Object.keys(userRoles).filter(k =>
  (!Array.isArray(userRoles[k]) || userRoles[k].length === 0)
  && !members.includes(k)
  && !pending.includes(k)
);
const roleLessMembers = Object.keys(userRoles).filter(k =>
  (!Array.isArray(userRoles[k]) || userRoles[k].length === 0) && members.includes(k)
);

console.log(`\n=== prune-empty-roles ${slug} (${LIVE ? 'LIVE' : 'DRY'}) ===`);
console.log(`Orphans to delete (${orphans.length}):`);
orphans.forEach(k => console.log(`  - ${k}`));
console.log(`Role-less MEMBERS left untouched (${roleLessMembers.length}):`);
roleLessMembers.forEach(k => console.log(`  · ${k} (member — escalate to Jacek for role)`));

if (!orphans.length) { console.log('\nNothing to prune.'); process.exit(0); }

if (!LIVE) { console.log('\nDRY run — pass --live to apply.'); process.exit(0); }

const patch = {};
orphans.forEach(k => { patch[`userRoles.${k}`] = FieldValue.delete(); });
await ref.update(patch);
console.log(`\n✓ Deleted ${orphans.length} orphan userRoles keys.`);
process.exit(0);
