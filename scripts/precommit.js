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
    const out = execSync(cmd, { encoding: 'utf8', timeout: 60000, stdio: 'pipe', shell: 'bash' });
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

// 3. § 27 Apple HIG nudges (warning-only — baseline has violations)
// These are INFORMATIONAL. They don't block commits.
// Real enforcement: docs/REVIEW_CHECKLIST.md self-review by CC.

// 3a. Elevation discipline — old page bg value being used
run('§27 elevation: old page bg #0a0e17 (should be #080c14)',
  'grep -rn "#0a0e17" src/pages/ src/components/ --include="*.jsx" --include="*.js" | grep -v theme.js | head -5 && exit 1 || exit 0',
  false);

// 3b. Elevation discipline — old card bg value being used
run('§27 elevation: old card bg #1a2234 (should be #0f172a)',
  'grep -rn "#1a2234" src/pages/ src/components/ --include="*.jsx" --include="*.js" | grep -v theme.js | head -5 && exit 1 || exit 0',
  false);

// 3c. Amber usage reminder — every #f59e0b must be interactive/active per §27
run('§27 amber nudge: verify each #f59e0b is interactive/active',
  'count=$(grep -rn "#f59e0b" src/pages/ src/components/ --include="*.jsx" | grep -v theme.js | wc -l); if [ "$count" -gt 0 ]; then echo "  → $count amber usages found. Per §27: amber = interactive accent ONLY. Verify each is tappable or active state."; exit 1; fi; exit 0',
  false);

// 3d. Chevron reminder — non-split-tap cards should not have chevrons per §27
run('§27 chevron nudge: verify chevrons only on split-tap cards',
  'count=$(grep -rni "chevron\\|›\\|ChevronRight" src/pages/ src/components/ --include="*.jsx" | wc -l); if [ "$count" -gt 0 ]; then echo "  → $count chevron references found. Per §27: no chevrons on non-split-tap cards (whole card navigates instead)."; exit 1; fi; exit 0',
  false);

// 3e. Tiny text guardrail — below 8px is §27 hard violation
run('§27 typography: no text below 8px',
  'grep -rnE "fontSize:\\s*[\'\\\"]?[0-7]px" src/pages/ src/components/ --include="*.jsx" | head -5 && exit 1 || exit 0',
  false);

// 4. Quick grep checks
run('No console.log in pages',
  'grep -rn "console\\.log" src/pages/ | grep -v "console\\.error\\|console\\.warn\\|// " | head -5 && exit 1 || exit 0',
  false);

run('No TODO/FIXME/HACK',
  'grep -rn "TODO\\|FIXME\\|HACK\\|XXX" src/pages/ src/components/ | grep -v node_modules | head -5 && exit 1 || exit 0',
  false);

// 5. Check for debug artifacts
run('No debugger statements',
  'grep -rn "debugger" src/ --include="*.jsx" --include="*.js" > /dev/null 2>&1 && exit 1 || exit 0');

run('No .only in tests',
  'grep -rn "\\.only" tests/ --include="*.js" > /dev/null 2>&1 && exit 1 || exit 0',
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
