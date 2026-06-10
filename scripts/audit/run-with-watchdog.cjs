#!/usr/bin/env node
/**
 * run-with-watchdog.cjs — run the cross-device audit under a run-level watchdog.
 *
 * GUARD #2 (Jacek): "brak powiadomienia ≠ działa; watchdog jest jedynym źródłem
 * prawdy o życiu przebiegu." A hang must stop being a possible terminal state.
 *
 * This sidecar:
 *   1. Resets audit/findings-full.json to a fresh empty file so the liveness
 *      clock starts NOW (not on a stale prior run's mtime).
 *   2. Spawns `npx playwright test --config playwright.audit-stress.config.js`
 *      as a child (whole tree: playwright + emulator + vite + chromium).
 *   3. Every 30s checks findings-full.json mtime. After a boot grace, if the
 *      file is STALE > STALE_MS (120s) → the run is wedged: append a
 *      RUN-ABORTED-WATCHDOG record (with the last completed capture + reason),
 *      taskkill /F /T the child tree, and exit non-zero. The background task
 *      then COMPLETES → the completion notification fires on its own.
 *
 * Worst case is now an automatic abort ~2 min after a wedge, WITH diagnostics —
 * never 27 minutes of silence.
 *
 * RUN (env already set by caller: JAVA_HOME/PATH for the JRE):
 *   node scripts/audit/run-with-watchdog.cjs
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = 'audit';
const FINDINGS = path.join(OUT, 'findings-full.json');
const POLL_MS = 30000;       // check cadence
const STALE_MS = 120000;     // staleness that means "wedged"
const BOOT_GRACE_MS = 180000; // seed + emulator + vite + first login can take a while

fs.mkdirSync(OUT, { recursive: true });
// Reset liveness clock: empty findings file, mtime = now.
fs.writeFileSync(FINDINGS, JSON.stringify({ generatedFor: '2026-06-wave2', findings: [] }, null, 2));

const start = Date.now();
let aborting = false;

const child = spawn('npx', ['playwright', 'test', '--config', 'playwright.audit-stress.config.js'], {
  shell: true,            // resolve npx.cmd on Windows; child.pid = shell, /T kills the tree
  stdio: ['ignore', 'inherit', 'inherit'],
  env: process.env,
});

function lastCapture() {
  try {
    const d = JSON.parse(fs.readFileSync(FINDINGS, 'utf8'));
    const f = d.findings || [];
    const last = f[f.length - 1];
    return { count: f.length, last: last ? `${last.role}/${last.route}/${last.viewport}` : '(none yet)' };
  } catch { return { count: -1, last: '(unreadable)' }; }
}

function abort(reason) {
  if (aborting) return;
  aborting = true;
  const { count, last } = lastCapture();
  const msg = `[WATCHDOG] ${reason} — last completed: ${last} (${count} captures). Killing run.`;
  console.error('\n' + msg);
  // Kill the whole child tree FIRST so it can't race our final write.
  try { execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' }); } catch (_) {}
  // Then append the abort record (single writer now).
  try {
    const d = JSON.parse(fs.readFileSync(FINDINGS, 'utf8'));
    d.findings = d.findings || [];
    d.findings.push({ role: '—', route: '—', viewport: '—', novelty: 'RUN-ABORTED-WATCHDOG', error: `${reason}; last completed ${last}` });
    fs.writeFileSync(FINDINGS, JSON.stringify(d, null, 2));
  } catch (e) { console.error('[WATCHDOG] could not append abort record:', e.message); }
  setTimeout(() => process.exit(2), 500); // give taskkill a beat
}

const timer = setInterval(() => {
  if (aborting) return;
  const sinceStart = Date.now() - start;
  if (sinceStart < BOOT_GRACE_MS) {
    console.error(`[WATCHDOG] boot grace ${Math.round((BOOT_GRACE_MS - sinceStart) / 1000)}s left…`);
    return;
  }
  let mtime = 0;
  try { mtime = fs.statSync(FINDINGS).mtimeMs; } catch (_) {}
  const stale = Date.now() - mtime;
  if (stale > STALE_MS) {
    abort(`no findings-full.json progress for ${Math.round(stale / 1000)}s (>${STALE_MS / 1000}s)`);
  } else {
    const { count } = lastCapture();
    console.error(`[WATCHDOG] alive — ${count} captures, last write ${Math.round(stale / 1000)}s ago`);
  }
}, POLL_MS);

child.on('exit', (code, signal) => {
  clearInterval(timer);
  if (aborting) return; // we already decided the exit code
  console.error(`[WATCHDOG] run exited code=${code} signal=${signal}`);
  process.exit(code == null ? 1 : code);
});
child.on('error', (e) => {
  clearInterval(timer);
  console.error('[WATCHDOG] failed to spawn run:', e.message);
  process.exit(1);
});
