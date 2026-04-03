#!/usr/bin/env node
/**
 * PbScoutPro Pre-commit Check
 * Run: node scripts/precommit.js
 * 
 * CC should run this BEFORE every git commit.
 * Exit code 0 = safe to commit, 1 = fix issues first.
 */

import { execSync } from 'child_process';

const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', RESET = '\x1b[0m';
let failed = false;

function run(label, cmd, failOnError = true) {
  console.log(`\n${CYAN}▸ ${label}${RESET}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 60000, stdio: 'pipe' });
    if (out.trim()) console.log(out.trim());
    console.log(`  ${GREEN}✓ passed${RESET}`);
    return true;
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    if (out.trim()) console.log(out.trim());
    if (failOnError) {
      console.log(`  ${RED}✗ FAILED${RESET}`);
      failed = true;
    } else {
      console.log(`  ${YELLOW}⚠ warning${RESET}`);
    }
    return false;
  }
}

console.log(`${CYAN}━━━ PbScoutPro Pre-commit Check ━━━${RESET}`);

// 1. Build check
run('Build compiles', 'npx vite build --logLevel error 2>&1 | tail -3');

// 2. UI lint
run('UI consistency lint', 'node scripts/lint-ui.js');

// 3. Quick grep checks
run('No console.log in pages',
  'grep -rn "console\\.log" src/pages/ | grep -v "console\\.error\\|console\\.warn\\|// " | head -5 && exit 1 || exit 0',
  false);

run('No TODO/FIXME/HACK',
  'grep -rn "TODO\\|FIXME\\|HACK\\|XXX" src/pages/ src/components/ | grep -v node_modules | head -5 && exit 1 || exit 0',
  false);

// 4. Check for debug artifacts
run('No debugger statements',
  'grep -rn "debugger" src/ | head -3 && exit 1 || exit 0');

run('No .only in tests',
  'grep -rn "\\.only" tests/ | head -3 && exit 1 || exit 0',
  false);

// ── Summary ──
console.log(`\n${CYAN}━━━ Summary ━━━${RESET}`);
if (failed) {
  console.log(`${RED}✗ Issues found — fix before committing${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓ All checks passed — safe to commit${RESET}\n`);
  process.exit(0);
}
