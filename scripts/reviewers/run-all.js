#!/usr/bin/env node
/**
 * PbScoutPro — Full Review Suite
 * Runs all reviewers and generates consolidated report.
 * 
 * Run: PBSCOUT_PASSWORD=xxx ANTHROPIC_API_KEY=xxx node scripts/reviewers/run-all.js
 * 
 * Options:
 *   --ux        Run UX review only (screenshots + vision analysis)
 *   --code      Run code review only
 *   --ai        Run AI audit only
 *   --lint      Run UI lint only (no API calls needed)
 *   (no flags)  Run everything
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const runAll = args.length === 0;
const runUx = runAll || args.includes('--ux');
const runCode = runAll || args.includes('--code');
const runAi = runAll || args.includes('--ai');
const runLint = runAll || args.includes('--lint');

const CYAN = '\x1b[36m', GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';
const DIR = import.meta.dirname;

function exec(label, cmd) {
  console.log(`\n${CYAN}━━━ ${label} ━━━${RESET}\n`);
  try {
    execSync(cmd, { encoding: 'utf8', stdio: 'inherit', timeout: 300000 });
    console.log(`\n${GREEN}✓ ${label} complete${RESET}`);
    return true;
  } catch (e) {
    console.log(`\n${RED}✗ ${label} failed${RESET}`);
    return false;
  }
}

console.log(`${CYAN}╔══════════════════════════════════════╗${RESET}`);
console.log(`${CYAN}║   PbScoutPro Full Review Suite       ║${RESET}`);
console.log(`${CYAN}╚══════════════════════════════════════╝${RESET}`);

// 1. Lint (no API key needed)
if (runLint) {
  exec('UI Consistency Lint', 'node scripts/lint-ui.js');
}

// 2. UX Review (needs PBSCOUT_PASSWORD + ANTHROPIC_API_KEY)
if (runUx) {
  if (!process.env.PBSCOUT_PASSWORD) {
    console.log(`${YELLOW}⚠ Skipping UX review — PBSCOUT_PASSWORD not set${RESET}`);
  } else if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`${YELLOW}⚠ Skipping UX vision analysis — ANTHROPIC_API_KEY not set${RESET}`);
    exec('Screenshot Capture', `node ${join(DIR, 'capture-screens.js')}`);
  } else {
    exec('Screenshot Capture', `node ${join(DIR, 'capture-screens.js')}`);
    exec('UX Vision Review', `node ${join(DIR, 'ux-review.js')}`);
  }
}

// 3. Code Review (needs ANTHROPIC_API_KEY)
if (runCode) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`${YELLOW}⚠ Skipping code review — ANTHROPIC_API_KEY not set${RESET}`);
  } else {
    exec('Code Review', `node ${join(DIR, 'code-review.js')}`);
  }
}

// 4. AI Audit (needs ANTHROPIC_API_KEY)
if (runAi) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(`${YELLOW}⚠ Skipping AI audit — ANTHROPIC_API_KEY not set${RESET}`);
  } else {
    exec('AI Usage Audit', `node ${join(DIR, 'ai-audit.js')}`);
  }
}

// ── Consolidated summary ──
console.log(`\n${CYAN}━━━ Reports ━━━${RESET}\n`);
const reports = [
  ['UX Review', join(DIR, 'ux-review-report.md')],
  ['Code Review', join(DIR, 'code-review-report.md')],
  ['AI Audit', join(DIR, 'ai-audit-report.md')],
];
for (const [name, path] of reports) {
  if (existsSync(path)) {
    const content = readFileSync(path, 'utf8');
    const critical = (content.match(/CRITICAL|HIGH/g) || []).length;
    const major = (content.match(/MAJOR|MED/g) || []).length;
    console.log(`  📄 ${name}: ${path}`);
    if (critical > 0) console.log(`     ${RED}${critical} high-priority issues${RESET}`);
    if (major > 0) console.log(`     ${YELLOW}${major} medium-priority issues${RESET}`);
  }
}

console.log(`\n${GREEN}Done. Read reports and create briefs for CC.${RESET}\n`);
