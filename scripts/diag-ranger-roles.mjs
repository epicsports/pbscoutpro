// Diagnostic (read-only): inspect ranger1996 userRoles vs members[].
// Run: node scripts/diag-ranger-roles.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const svc = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(svc) });
const db = getFirestore();

const slug = 'ranger1996';
const snap = await db.doc(`workspaces/${slug}`).get();
if (!snap.exists) { console.error('NO DOC'); process.exit(1); }
const d = snap.data();
const userRoles = d.userRoles || {};
const members = d.members || [];
const pending = d.pendingApprovals || [];

const keys = Object.keys(userRoles);
console.log(`\n=== ${slug} ===`);
console.log(`userRoles keys: ${keys.length}`);
console.log(`members: ${members.length}`);
console.log(`pendingApprovals: ${pending.length}`);

const emptyRole = keys.filter(k => !Array.isArray(userRoles[k]) || userRoles[k].length === 0);
console.log(`\nEMPTY-ROLE userRoles keys (${emptyRole.length}):`);
for (const k of emptyRole) {
  console.log(`  ${k}  roles=${JSON.stringify(userRoles[k])}  inMembers=${members.includes(k)}  pending=${pending.includes(k)}`);
}

console.log(`\nNON-EMPTY userRoles keys (${keys.length - emptyRole.length}):`);
for (const k of keys.filter(k => Array.isArray(userRoles[k]) && userRoles[k].length)) {
  console.log(`  ${k}  roles=${JSON.stringify(userRoles[k])}  inMembers=${members.includes(k)}`);
}

console.log(`\nMembers NOT in userRoles (would be role-less members):`);
for (const m of members) {
  if (!keys.includes(m)) console.log(`  ${m}`);
}
process.exit(0);
