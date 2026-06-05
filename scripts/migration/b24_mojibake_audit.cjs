/**
 * B24 — player-name mojibake audit (READ-ONLY discovery).
 *
 * ZERO writes. Reads the global /players catalog (workspace player twins were
 * decommissioned §90 2B), flags names/nicknames that look like double-encoded
 * UTF-8 mojibake (e.g. "André" → "AndrÃ©", "Reppesgård" → "ReppesgÃ¥rd"), and
 * for each shows: stored string, hex bytes, the latin1→utf8 repair candidate,
 * createdAt/updatedAt, ownerWorkspaceId. Reports scope + new-vs-legacy split.
 *
 * Detection: the classic "UTF-8 bytes decoded as Windows-1252/Latin-1" mojibake
 * is reversed by Buffer.from(str,'latin1').toString('utf8'). We flag a value when
 * that round-trip CHANGES it AND the repaired form re-encodes cleanly (no U+FFFD)
 * AND the original carries a mojibake marker (Ã Â Å Ä Ð Þ … or U+FFFD).
 *
 * RUN (read-only):
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\...\adminsdk.json
 *   node scripts/migration/b24_mojibake_audit.cjs
 */

const admin = require('firebase-admin');
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) { console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

const MARKER = /[Â-ÅÐÞ�-]/; // Ã Â Å Ä Ð Þ, C1 controls, replacement
const hex = (s) => Buffer.from(s, 'utf8').toString('hex').match(/../g).join(' ');

// Reverse double-encoding: treat the JS string's code points as Latin-1 bytes,
// re-decode as UTF-8. Returns null if not reversible / unchanged / produces junk.
function repair(s) {
  if (!s || ![...s].some(c => c.charCodeAt(0) >= 0x80)) return null; // pure ASCII → fine
  if (![...s].every(c => c.charCodeAt(0) <= 0xFF)) return null;       // has real unicode → already ok
  let cand;
  try { cand = Buffer.from(s, 'latin1').toString('utf8'); } catch { return null; }
  if (cand === s) return null;
  if (cand.includes('�')) return null;     // not cleanly reversible
  return cand;
}

(async () => {
  console.log('\n================================================================');
  console.log(' B24 — player-name mojibake audit (READ-ONLY, global /players)');
  console.log('================================================================\n');

  const snap = await db.collection('players').get();
  const total = snap.size;
  const hits = [];
  let withDiacritics = 0;

  snap.forEach(d => {
    const x = d.data();
    const fields = [['name', x.name], ['nickname', x.nickname]];
    if (fields.some(([, v]) => v && [...String(v)].some(c => c.charCodeAt(0) >= 0x80))) withDiacritics++;
    for (const [field, raw] of fields) {
      if (!raw) continue;
      const s = String(raw);
      const marked = MARKER.test(s);
      const rep = repair(s);
      if (marked && rep && rep !== s) {
        hits.push({
          id: d.id, field, orig: s, hexBytes: hex(s), repaired: rep,
          owner: x.ownerWorkspaceId || x.originWorkspace || '(none)',
          createdAt: x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toISOString() : (x.createdAt || null),
          updatedAt: x.updatedAt && x.updatedAt.toDate ? x.updatedAt.toDate().toISOString() : (x.updatedAt || null),
        });
      }
    }
  });

  console.log(`global /players total        : ${total}`);
  console.log(`names/nicknames w/ non-ASCII : ${withDiacritics}`);
  console.log(`mojibake hits (name+nick)    : ${hits.length}\n`);

  // New-vs-legacy split by createdAt (legacy import era = before §90 work).
  const byOwner = {}, byYearMonth = {};
  hits.forEach(h => {
    byOwner[h.owner] = (byOwner[h.owner] || 0) + 1;
    const ym = h.createdAt ? h.createdAt.slice(0, 7) : 'unknown';
    byYearMonth[ym] = (byYearMonth[ym] || 0) + 1;
  });
  console.log('by ownerWorkspaceId:');
  Object.entries(byOwner).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${String(k).padEnd(16)} ${v}`));
  console.log('\nby createdAt (YYYY-MM) — newest entries = still-producing?:');
  Object.entries(byYearMonth).sort().forEach(([k, v]) => console.log(`   ${k}  ${v}`));

  console.log('\n── samples (up to 30): stored | hex | repair candidate | owner | created ──');
  hits.slice(0, 30).forEach(h => {
    console.log(`   [${h.field}] "${h.orig}"`);
    console.log(`        hex: ${h.hexBytes}`);
    console.log(`        ->   "${h.repaired}"   owner=${h.owner}  created=${h.createdAt || '?'}`);
  });
  if (hits.length > 30) console.log(`   …(+${hits.length - 30} more)`);

  console.log('\nREAD-ONLY. No writes performed.\n');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
