#!/usr/bin/env node
/**
 * i18n missing-key lint — every `t('literal')` referenced in src/ MUST be defined
 * in src/utils/i18n.js. Closes the silent "raw key-name rendered in the UI" class:
 * t() returns the key string when the key is undefined, and the call sites use
 * `t('k') || 'fallback'` — but the key string is truthy, so the fallback never
 * fires and the raw key shows (worst on the wide shell). 38 such keys shipped
 * 2026-06-23 before this guard existed.
 *
 * Scope: only LITERAL keys (`t('foo')` / `t("foo")`) — dynamic `t(variable)` is
 * skipped (can't statically resolve, avoids false positives). Exit 1 if any
 * referenced literal key is absent from i18n.js.
 */
import fs from 'fs';
import path from 'path';

const RED = '\x1b[31m', RESET = '\x1b[0m';

function walk(d) {
  let r = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) { if (!/node_modules|dist/.test(p)) r = r.concat(walk(p)); }
    else if (/\.(jsx?|tsx?)$/.test(f)) r.push(p);
  }
  return r;
}

const refs = new Map(); // key -> Set(files)
for (const f of walk('src')) {
  const c = fs.readFileSync(f, 'utf8');
  let m; const re = /\bt\(\s*['"]([a-zA-Z][a-zA-Z0-9_]*)['"]/g;
  while ((m = re.exec(c))) {
    if (!refs.has(m[1])) refs.set(m[1], new Set());
    refs.get(m[1]).add(f.replace(/\\/g, '/').replace(/^src\//, ''));
  }
}

const i18n = fs.readFileSync('src/utils/i18n.js', 'utf8');
const defined = new Set();
let m; const dre = /^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:/gm;
while ((m = dre.exec(i18n))) defined.add(m[1]);

const missing = [...refs.keys()].filter(k => !defined.has(k)).sort();

if (missing.length) {
  console.log(`${RED}✗ ${missing.length} i18n key(s) referenced via t() but NOT defined in src/utils/i18n.js`);
  console.log(`  (they render as the raw key-name in the UI). Add them in BOTH pl + en:${RESET}`);
  for (const k of missing) console.log(`    ${k}  ←  ${[...refs.get(k)].join(', ')}`);
  process.exit(1);
}

console.log(`  ${refs.size} referenced t() keys, all defined in i18n.js`);
process.exit(0);
