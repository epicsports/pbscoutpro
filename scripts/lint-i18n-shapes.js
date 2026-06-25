#!/usr/bin/env node
/**
 * PbScoutPro i18n call-shape linter
 * Run: node scripts/lint-i18n-shapes.js
 *
 * Sibling to the t()-without-scope discipline. Closes the i18n shape-mismatch
 * crash/render class that pixel-diff + the EN-literal guard cannot see.
 *
 * useLanguage's t() AUTO-INVOKES function values:
 *   const t = (key, ...args) => { const v = T[lang]?.[key] ?? T.en?.[key] ?? key;
 *                                  return typeof v === 'function' ? v(...args, lang) : v; };
 * So the ONLY correct way to pass interpolation args is `t('k', a, b)`. From that
 * follow two rules:
 *
 *   RULE A (crash footgun) — `t('k')(…)` chained invocation is ALWAYS WRONG.
 *     t('k') already invokes the function WITH NO ARGS → returns a string (e.g.
 *     "Strona undefined z undefined"); the trailing (…) then calls that string →
 *     "t(...) is not a function" CRASH. This was the prod AdminPlayers pagination
 *     crash. Use `t('k', …)` instead.
 *
 *   RULE B (silent arg-drop) — `t('k', …args)` requires `k` to be a FUNCTION in
 *     BOTH the pl and en blocks. If it is a plain string, t() ignores the args and
 *     any `{placeholder}` renders LITERALLY (wrong text, no crash).
 *
 * Both are call-site-driven (not "any string with braces"), so documentation
 * braces like `/players/{id}` and manual `.replace` patterns (no arg passed to t)
 * are NOT false-flagged.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = 'src';
const I18N = 'src/utils/i18n.js';
const ERRORS = [];

// ── Classify every key in the pl and en blocks as function vs string ──
// File shape: `const T = { pl: { … }, en: { … } }`. Keys are indented ≥4 spaces;
// the `pl:`/`en:` markers are at 2 spaces, so the ≥4 guard skips them.
function classifyBlocks() {
  const lines = readFileSync(I18N, 'utf8').split(/\r?\n/);
  const plStart = lines.findIndex(l => /^\s{2}pl:\s*\{/.test(l));
  const enStart = lines.findIndex(l => /^\s{2}en:\s*\{/.test(l));
  if (plStart === -1 || enStart === -1) {
    console.error(`lint-i18n-shapes: could not locate pl/en blocks in ${I18N}`);
    process.exit(2);
  }
  const classify = (slice) => {
    const map = {};
    for (const line of slice) {
      const m = line.match(/^\s{4,}([a-zA-Z_]\w*):\s*(.+)$/);
      if (!m) continue;             // continuation line / non-key
      const [, key, restRaw] = m;
      const v = restRaw.trim();
      // arrow function: `(a, b) => …`, `pct => …`, `() => …`, `({ role }) => …`
      // (allow destructuring + default-ish chars in the param list)
      if (/^\(?[\w\s,{}=]*\)?\s*=>/.test(v)) map[key] = 'fn';
      else if (/^['"`]/.test(v)) map[key] = 'str';
      // else: unknown value start (rare) — leave unclassified
    }
    return map;
  };
  return {
    pl: classify(lines.slice(plStart, enStart)),
    en: classify(lines.slice(enStart)),
  };
}

// ── Collect source files (skip the dictionary itself + workers) ──
function walk(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      if (f === 'node_modules' || f === 'workers') continue;
      files.push(...walk(full));
    } else if ((f.endsWith('.jsx') || f.endsWith('.js')) && full.replace(/\\/g, '/') !== I18N) {
      files.push(full);
    }
  }
  return files;
}

// Negative lookbehind avoids matching `format(`, `.t(`, `out(` etc.
// RULE A — chained invocation `t('key')(`
const CHAIN_RE = /(?<![A-Za-z0-9_$.])t\s*\(\s*(['"])([A-Za-z_]\w*)\1\s*\)\s*\(/g;
// RULE B — args passed to t `t('key',`
const ARGS_RE = /(?<![A-Za-z0-9_$.])t\s*\(\s*(['"])([A-Za-z_]\w*)\1\s*,/g;

const { pl, en } = classifyBlocks();

for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = `${relative('.', file)}:${i + 1}`;
    let m;
    // RULE A — always wrong (auto-invoke footgun → crash)
    CHAIN_RE.lastIndex = 0;
    while ((m = CHAIN_RE.exec(line)) !== null) {
      ERRORS.push(
        `${at} — t('${m[2]}')(…) chained invocation crashes: t() auto-invokes the ` +
        `function with NO args (→ a string), then the trailing (…) calls that string. ` +
        `Use t('${m[2]}', …) instead.`
      );
    }
    // RULE B — args passed → key must be a function in both langs
    ARGS_RE.lastIndex = 0;
    while ((m = ARGS_RE.exec(line)) !== null) {
      const key = m[2];
      if (pl[key] !== 'fn' || en[key] !== 'fn') {
        const bad = [];
        if (pl[key] !== 'fn') bad.push(`pl:${pl[key] || 'MISSING'}`);
        if (en[key] !== 'fn') bad.push(`en:${en[key] || 'MISSING'}`);
        ERRORS.push(
          `${at} — t('${key}', …) passes args but '${key}' is not a function (${bad.join(', ')}); ` +
          `the args are silently dropped and any {placeholder} renders literally. ` +
          `Define '${key}' as a function interpolator in BOTH pl+en.`
        );
      }
    }
  });
}

if (ERRORS.length === 0) {
  console.log('✅ i18n call-shapes consistent — every arg-passing t() call has a function definition in both languages.');
  process.exit(0);
}
console.log(`❌ i18n call-shape mismatches (${ERRORS.length}) — must fix:\n`);
ERRORS.forEach(e => console.log(`  ${e}`));
console.log('');
process.exit(1);
