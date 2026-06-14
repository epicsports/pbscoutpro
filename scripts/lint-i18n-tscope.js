#!/usr/bin/env node
/**
 * PbScoutPro i18n t-SCOPE linter
 * Run: node scripts/lint-i18n-tscope.js
 *
 * Sibling to scripts/lint-i18n-shapes.js (call-shape) and the EN-literal guard.
 * Closes the "can't find variable t" / ReferenceError crash class: a `t(…)` call
 * in a scope that has no `t` binding. This bit us 3× (QuickLogView PlayerTileGrid,
 * CoachTabContent, ShotDrawer ShotMenuOverlay) — MODULE-LEVEL sub-components that
 * call t() but, not being nested in the main component, don't inherit its
 * `const { t } = useLanguage()`. The crashes only fired on e2e-uncovered render
 * paths, so the suite stayed green. (NEXT_TASKS "OWED — precommit lint".)
 *
 * Uses real scope resolution (@babel/parser + @babel/traverse `scope.hasBinding`),
 * so params, destructuring (`const { t } = useLanguage()`), `t` props, imports,
 * and shadowing are all handled correctly — no regex guesswork.
 *
 * RULE: a CallExpression whose callee is the bare identifier `t` must have `t`
 * resolvable in its scope chain (own `useLanguage()` destructure, a `t` param, or
 * an enclosing scope that binds it).
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const SRC = 'src';
const ERRORS = [];
const PARSE_SKIPS = [];

function walk(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      if (f === 'node_modules' || f === 'workers') continue;
      files.push(...walk(full));
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

for (const file of walk(SRC)) {
  const code = readFileSync(file, 'utf8');
  if (!/\bt\s*\(/.test(code)) continue; // fast skip: no t() calls at all
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (e) {
    PARSE_SKIPS.push(`${relative('.', file)} — parse error: ${e.message.split('\n')[0]}`);
    continue;
  }
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'Identifier' || callee.name !== 't') return;
      if (!path.scope.hasBinding('t')) {
        const line = path.node.loc ? path.node.loc.start.line : '?';
        ERRORS.push(
          `${relative('.', file)}:${line} — t(…) called with no \`t\` in scope. ` +
          `Add \`const { t } = useLanguage()\` to this component/sub-component (or receive \`t\` as a prop).`
        );
      }
    },
  });
}

if (PARSE_SKIPS.length) {
  console.log(`⚠️  ${PARSE_SKIPS.length} file(s) skipped (parse error — not linted):`);
  PARSE_SKIPS.forEach(s => console.log(`  ${s}`));
  console.log('');
}

if (ERRORS.length === 0) {
  console.log('✅ i18n t-scope consistent — every t(…) call has a `t` in scope.');
  process.exit(0);
}
console.log(`❌ i18n t-scope violations (${ERRORS.length}) — must fix:\n`);
ERRORS.forEach(e => console.log(`  ${e}`));
console.log('');
process.exit(1);
