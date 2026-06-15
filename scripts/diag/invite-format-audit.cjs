// READ-ONLY prod diagnostic (admin-SDK). No writes.
// (1) biuro's auth emailVerified + their invite doc — does the new email_verified
//     rule block a password-login self-claim? (2) classify the /invites collection:
//     email-keyed (id == email, has `email` + `status`) vs token-keyed (random id,
//     has `redeemedBy`/no `email`) — to spot a format split that would make the
//     email-keyed self-claim lookup miss.
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const BIURO = 'biuro@epicsports.pl';
const looksLikeEmail = (s) => /@/.test(s);

(async () => {
  // (1) biuro auth + invite
  try {
    const u = await auth.getUserByEmail(BIURO);
    console.log(`biuro auth: uid=${u.uid} emailVerified=${u.emailVerified} providers=${u.providerData.map(p => p.providerId).join(',')}`);
  } catch (e) { console.log('biuro auth: NOT FOUND', e.code || e.message); }
  const inv = await db.doc(`invites/${BIURO}`).get();
  console.log('invites/biuro:', inv.exists ? JSON.stringify(inv.data()) : '(missing)');

  // (2) classify all invites
  const snap = await db.collection('invites').get();
  let emailKeyed = 0, tokenKeyed = 0, weird = 0;
  const rows = [];
  snap.forEach((d) => {
    const data = d.data() || {};
    const idIsEmail = looksLikeEmail(d.id);
    const hasEmailField = typeof data.email === 'string' && data.email.length > 0;
    const hasStatus = 'status' in data;
    const hasRedeemedBy = 'redeemedBy' in data;
    let kind;
    if (idIsEmail && hasEmailField && hasStatus) { kind = 'email-keyed'; emailKeyed++; }
    else if (!idIsEmail && (hasRedeemedBy || !hasEmailField)) { kind = 'token-keyed'; tokenKeyed++; }
    else { kind = 'WEIRD'; weird++; }
    rows.push({ id: idIsEmail ? d.id : d.id.slice(0, 8) + '…', kind, status: data.status ?? null, ws: data.workspaceSlug ?? null, role: data.role ?? null, emailField: hasEmailField });
  });
  console.log(`\ninvites total=${snap.size}  email-keyed=${emailKeyed}  token-keyed=${tokenKeyed}  WEIRD=${weird}`);
  rows.forEach(r => console.log(`  [${r.kind}] ${r.id}  status=${r.status} ws=${r.ws} role=${r.role} emailField=${r.emailField}`));
  process.exit(0);
})().catch((e) => { console.error('AUDIT FAILED:', e?.code || e?.message); process.exit(1); });
