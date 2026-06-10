// tests/cross-device-audit-full.spec.js — WAVE 2: stress data × 5-role matrix.
// Coach = full baseline; other roles capture all routes but only SCREENSHOT
// role-exclusive routes + routes whose DOM-signature DIFFERS from coach (and
// blocked/redirected routes are recorded, not flagged). 9 checks/route×viewport.
// Output: audit/screenshots-full/<role>/<route>__<viewport>.png + audit/findings-full.json.
//
// Run: JAVA_HOME=… npx playwright test --config playwright.audit-stress.config.js

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from './helpers/auth.js';

const OUT = 'audit';
const SHOTS = path.join(OUT, 'screenshots-full');
const PW = 'test1234';

const ROLES = [
  { role: 'coach',   email: 'coach@audit.local',   baseline: true },
  { role: 'super',   email: 'super@audit.local' },
  { role: 'wsadmin', email: 'wsadmin@audit.local' },
  { role: 'scout',   email: 'scout@audit.local' },
  { role: 'player',  email: 'player@audit.local' },
];

const VIEWPORTS = [
  { name: 'phone-portrait',   width: 390,  height: 844,  orient: 'portrait'  },
  { name: 'phone-landscape',  width: 932,  height: 430,  orient: 'landscape' },
  { name: 'tablet-portrait',  width: 834,  height: 1194, orient: 'portrait'  },
  { name: 'tablet-landscape', width: 1194, height: 834,  orient: 'landscape' },
  { name: 'desktop',          width: 1920, height: 1080, orient: 'landscape' },
];

const L = 'lay-stress', T = 'trn-stress', M = 'mat-stress', TM = 'ateam-0', TH = 'trn-hit-stress';
const ROUTES = [
  { name: 'main-home',        archetype: 'List',   url: '#/' },
  { name: 'teams',            archetype: 'List',   url: '#/teams' },
  { name: 'players',          archetype: 'List',   url: '#/players' },
  { name: 'scouts-ranking',   archetype: 'List',   url: '#/scouts' },
  { name: 'my-issues',        archetype: 'List',   url: '#/my-issues' },
  { name: 'training',         archetype: 'List',   url: `#/training/${TH}` },
  { name: 'members',          archetype: 'List',   url: '#/settings/members' },
  { name: 'team-detail',      archetype: 'Detail', url: `#/team/${TM}` },
  { name: 'player-stats',     archetype: 'Detail', url: `#/player/asp-1/stats` },
  { name: 'scout-detail',     archetype: 'Detail', url: `#/scouts/audit-coach` },
  { name: 'scouted-team',     archetype: 'Detail', url: `#/tournament/${T}/team/${TM}` },
  { name: 'training-results', archetype: 'Detail', url: `#/training/${TH}/results` },
  { name: 'user-detail',      archetype: 'Detail', url: `#/settings/members/audit-coach` },
  { name: 'layout-detail',    archetype: 'Canvas', url: `#/layout/${L}`, canvas: true },
  { name: 'bunker-editor',    archetype: 'Canvas', url: `#/layout/${L}/bunkers`, canvas: true },
  { name: 'ballistics',       archetype: 'Canvas', url: `#/layout/${L}/ballistics`, canvas: true },
  { name: 'layout-analytics', archetype: 'Canvas', url: `#/layout/${L}/analytics/deaths`, canvas: true },
  { name: 'match-review',     archetype: 'Canvas', url: `#/tournament/${T}/match/${M}`, canvas: true },
  { name: 'match-scout',      archetype: 'Canvas', url: `#/tournament/${T}/match/${M}?scout=${TM}&mode=new`, canvas: true },
  { name: 'hitability',       archetype: 'Canvas', url: `#/training/${TH}/hitability`, canvas: true },
  { name: 'layout-wizard',    archetype: 'Form',   url: '#/layout/new' },
  { name: 'training-setup',   archetype: 'Form',   url: `#/training/${TH}/setup` },
  { name: 'training-squads',  archetype: 'Form',   url: `#/training/${TH}/squads` },
  { name: 'profile',          archetype: 'Form',   url: '#/profile' },
  { name: 'debug-flags',      archetype: 'Form',   url: '#/debug/flags' },
  { name: 'ppt-log',          archetype: 'Form',   url: '#/player/log' },
  { name: 'ppt-wizard',       archetype: 'Form',   url: '#/player/log/wizard' },
  { name: 'admin-leagues',    archetype: 'Admin',  url: '#/admin/leagues' },
  { name: 'admin-players',    archetype: 'Admin',  url: '#/admin/players' },
  { name: 'admin-teams',      archetype: 'Admin',  url: '#/admin/teams' },
  { name: 'admin-workspaces', archetype: 'Admin',  url: '#/admin/workspaces' },
  { name: 'admin-layouts',    archetype: 'Admin',  url: '#/admin/layouts' },
];

// In-page: 9 checks + a DOM structure signature + the requested-vs-actual hash.
const CHECK_FN = (reqHash) => {
  const vw = window.innerWidth, vh = window.innerHeight, tol = 2;
  const out = { vw, vh };
  out.actualHash = location.hash;
  out.redirected = !location.hash.startsWith(reqHash.split('?')[0]);
  out.hScroll = Math.max(0, document.documentElement.scrollWidth - vw);
  let offRight = 0, worstRight = 0, tooWide = 0, vClip = 0;
  const all = document.querySelectorAll('body *');
  const tagCount = {};
  for (const el of all) {
    const cs = getComputedStyle(el);
    tagCount[el.tagName] = (tagCount[el.tagName] || 0) + 1;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (cs.position !== 'fixed' && r.right > vw + tol) { offRight++; worstRight = Math.max(worstRight, r.right - vw); }
    if (r.width > vw + tol) tooWide++;
    // NEW check — vertical overflow of a fixed/constrained-height container.
    if ((cs.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > 0) vClip++;
  }
  out.offRight = offRight; out.worstRight = Math.round(worstRight); out.tooWide = tooWide; out.vClip = vClip;
  let small = 0; const smallSamples = [];
  for (const el of document.querySelectorAll('button,[role="button"],a,input,select,textarea')) {
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.height < 44 - tol || r.width < 44 - tol) { small++; if (smallSamples.length < 4) smallSamples.push(`<${el.tagName.toLowerCase()}> ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 16)}"`); }
  }
  out.smallTargets = small; out.smallSamples = smallSamples;
  // NEW check — text-clip class: ellipsis-by-design vs broken.
  let ellipsis = 0, brokenClip = 0;
  for (const el of all) {
    if (el.children.length || !el.textContent || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + tol) {
      if (cs.textOverflow === 'ellipsis' && cs.whiteSpace === 'nowrap' && (cs.overflow === 'hidden' || cs.overflowX === 'hidden')) ellipsis++;
      else brokenClip++;
    }
  }
  out.textEllipsis = ellipsis; out.textBrokenClip = brokenClip;
  const c = document.querySelector('canvas');
  out.canvasH = c ? Math.round(c.getBoundingClientRect().height) : null;
  out.bodyBg = getComputedStyle(document.body).backgroundColor;
  out.bodyText = (document.body.innerText || '').trim().length;
  // CHECK #8 (error-state). crashUI = the SentryFallback error boundary
  // (App.jsx <h2>Crash Report</h2>) — definitive. errorText = weak body signal.
  out.crashUI = [...document.querySelectorAll('h2')].some(h => (h.textContent || '').trim() === 'Crash Report');
  out.errorText = /\b(error|błąd|failed|nie udało)\b/i.test(document.body.innerText || '');
  // DOM signature — structure (tag:count) + bucketed text length; tolerant of
  // avatar/name (those don't change the tag skeleton or the length bucket much).
  const skel = Object.entries(tagCount).sort().map(([t, n]) => `${t}:${n}`).join(',');
  out.sig = `${out.redirected ? 'R' : 'P'}|${Math.round(out.bodyText / 80)}|${skel}`;
  return out;
};

const WS = 'audit-ws';
async function clearAuthAndLogin(page, email) {
  await page.goto('./').catch(() => {});
  await page.context().clearCookies();
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('firebaseLocalStorageDb'); } catch (_) {} }).catch(() => {});
  await page.goto('./');
  await login(page, { email, password: PW });
  // login resolves the workspace (tab bar appeared). We then navigate by HASH
  // (no document reload) so auto-enter never re-runs — the bridge setWorkspace
  // caused a reload loop, and page.goto re-ran the slow non-admin auto-enter.
}

const withTimeout = (p, ms, label) => {
  let to;
  // Swallow the loser's late settlement: on timeout the wrapped op is orphaned
  // (it keeps running on a possibly-wedged page); attaching .catch here prevents
  // its eventual rejection from surfacing as an unhandledRejection. The NEXT
  // capture's about:blank goto (itself guarded) resets the page.
  Promise.resolve(p).catch(() => {});
  const guard = new Promise((_, rej) => {
    to = setTimeout(() => rej(new Error(`hard-timeout ${ms}ms${label ? ` (${label})` : ''}`)), ms);
  });
  return Promise.race([p, guard]).finally(() => clearTimeout(to));
};

// App-ready predicate: past the loading/auth screens (workspace resolved).
const READY_PRED = () => {
  const t = (document.body.innerText || '');
  if (/Preparing your workspace|Preparing data|Checking session|Joining workspace/i.test(t)) return false;
  // An auth/sign-in screen can NEVER count as a captured route. The email field
  // is the stable login marker (cf. login.spec). Without this, a login page
  // (bodyText > 40) passed READY_PRED and was captured as a hollow baseline —
  // the 2026-06-10 v2 coach failure (login() false-positived because its tab-bar
  // text /Scout/ also matches the login footer "paintball scouting").
  if (document.querySelector('input[type="email"]')) return false;
  return !!document.querySelector('canvas') || document.body.innerText.trim().length > 40;
};

test.describe('wave-2 stress × 5-role audit', () => {
  test('capture + delta', async ({ page }) => {
    test.setTimeout(120 * 60 * 1000);
    fs.mkdirSync(SHOTS, { recursive: true });
    const findings = [];
    const coachSig = {}; // key route|viewport → coach sig
    // CHECK #8 (error-state): count console.error + pageerror per capture.
    let consoleErrors = 0; const errSample = [];
    page.on('console', (m) => { if (m.type() === 'error') { consoleErrors++; if (errSample.length < 3) errSample.push(m.text().slice(0, 100)); } });
    page.on('pageerror', (e) => { consoleErrors++; if (errSample.length < 3) errSample.push('pageerror: ' + String(e.message).slice(0, 90)); });

    // AUDIT_SMOKE=1 → fast validation slice (coach · phone-portrait · 4 routes).
    const smoke = process.env.AUDIT_SMOKE === '1';
    const useRoles = smoke ? ROLES.filter(r => r.baseline) : ROLES;
    const useVps = smoke ? VIEWPORTS.slice(0, 1) : VIEWPORTS;
    const useRoutes = smoke ? ROUTES.filter(r => ['main-home', 'players', 'layout-analytics', 'match-review'].includes(r.name)) : ROUTES;

    for (const R of useRoles) {
      fs.mkdirSync(path.join(SHOTS, R.role), { recursive: true });
      // ROLE-LEVEL fail-fast: login bounded to 60s. A non-admin role whose
      // auto-enter never resolves (stuck "Preparing…") would otherwise hang the
      // whole run — instead record every route as FAILED(login-blocked) + skip
      // to the next role. (Known: scout/player non-admin auto-enter latency.)
      // login() can FALSE-POSITIVE: its tab-bar text /Scout/ also matches the
      // login footer "paintball scouting", so it can return without actually
      // authenticating. After each attempt assert a genuine authenticated state
      // (NO sign-in form present AND not stuck on a loading screen). ≤2 attempts;
      // on repeated failure the whole role is recorded blocked and the run
      // continues — never 160 hollow login-page captures (the v2 coach failure).
      let loginOk = false;
      for (let attempt = 1; attempt <= 2 && !loginOk; attempt++) {
        try {
          await withTimeout(clearAuthAndLogin(page, R.email), 60000, `${R.role} login #${attempt}`);
          const authed = await page.evaluate(() => {
            if (document.querySelector('input[type="email"]')) return false; // still on sign-in
            const t = document.body.innerText || '';
            if (/Preparing your workspace|Checking session|Joining workspace/i.test(t)) return false;
            return t.trim().length > 40;
          }).catch(() => false);
          if (authed) loginOk = true;
          else console.log(`[ROLE-RETRY] ${R.role} login attempt ${attempt} — not authenticated (sign-in form still present)`);
        } catch (e) {
          console.log(`[ROLE-RETRY] ${R.role} login attempt ${attempt} threw — ${String(e && e.message || e).slice(0, 100)}`);
        }
      }
      if (!loginOk) console.log(`[ROLE-BLOCKED] ${R.role} — no authenticated state after 2 attempts`);
      if (!loginOk) {
        for (const vp of useVps) for (const route of useRoutes) {
          findings.push({ role: R.role, route: route.name, archetype: route.archetype, viewport: vp.name, orient: vp.orient, canvas: !!route.canvas, novelty: 'FAILED', error: 'LOGIN-BLOCKED: no authenticated state after 2 attempts (post-login assertion)' });
        }
        fs.writeFileSync(path.join(OUT, 'findings-full.json'), JSON.stringify({ generatedFor: '2026-06-wave2', roles: ROLES.map(r => r.role), viewports: VIEWPORTS, routeCount: ROUTES.length, findings }, null, 2));
        continue;
      }
      for (const vp of useVps) {
        for (const route of useRoutes) {
          const rec = { role: R.role, route: route.name, archetype: route.archetype, viewport: vp.name, orient: vp.orient, canvas: !!route.canvas };
          const label = `${R.role} · ${vp.name} · ${route.name}`;
          console.log(`[capture] ${label}`); // progress log — last line printed = last attempted
          // GUARD #1 (Jacek): the ENTIRE per-capture work unit — viewport +
          // nav + reload + wait-for-ready + checks + screenshot — runs inside a
          // SINGLE hard timeout. No `await` in this loop lives outside the guard;
          // a wedged page (e.g. a pegged renderer that hangs page.evaluate /
          // page.screenshot, which have no native timeout) can no longer stall
          // the run — it fails this capture and advances. (The run-level
          // watchdog sidecar is the second, cross-process backstop.)
          const captureOne = async () => {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            consoleErrors = 0; errSample.length = 0;
            // CASCADE ISOLATION: a hash-only page.goto does NOT reload the document,
            // so a crashed React tree would persist across captures (the v1 bug).
            // Force a fresh document every route via about:blank → app reload.
            await page.goto('about:blank');
            await page.goto('./' + route.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            let ready = true;
            try { await page.waitForFunction(READY_PRED, { timeout: 15000 }); } catch { ready = false; }
            if (!ready) { rec.novelty = 'FAILED'; rec.error = 'not-ready: stuck loading >15s'; return; }
            await page.waitForTimeout(600); // settle ResizeObserver / canvas fit
            const m = await page.evaluate(CHECK_FN, route.url);
            Object.assign(rec, m);
            rec.consoleErrors = consoleErrors;
            if (errSample.length) rec.consoleErrSample = [...errSample];
            if (m.crashUI) rec.contentStatus = 'FAILED-CONTENT'; // crash screen → exclude from layout checks
            const key = `${route.name}|${vp.name}`;
            const shotPath = path.join(SHOTS, R.role, `${route.name}__${vp.name}.png`);
            if (R.baseline) {
              coachSig[key] = m.sig;
              rec.novelty = 'baseline';
              await page.screenshot({ path: shotPath, timeout: 15000 });
            } else {
              const base = coachSig[key];
              if (m.redirected) { rec.novelty = 'blocked'; rec.delta = false; }
              else if (base === undefined) { rec.novelty = 'role-exclusive'; rec.delta = true; }
              else if (m.sig !== base) { rec.novelty = 'differs-from-coach'; rec.delta = true; }
              else { rec.novelty = 'same-as-coach'; rec.delta = false; }
              if (rec.delta) await page.screenshot({ path: shotPath, timeout: 15000 });
            }
          };
          try {
            await withTimeout(captureOne(), 55000, label); // 55s > worst legit (20+15+0.6+eval+shot); < watchdog 120s
          } catch (e) {
            rec.novelty = 'FAILED'; rec.error = String(e && e.message || e).slice(0, 160);
          }
          if (rec.novelty === 'FAILED') console.log(`[FAILED]  ${label} — ${rec.error}`);
          findings.push(rec);
          // Incremental write — partial results survive a crash/kill AND feed the
          // run-level watchdog (it treats this file's mtime as the liveness clock).
          fs.writeFileSync(path.join(OUT, 'findings-full.json'), JSON.stringify({ generatedFor: '2026-06-wave2', roles: ROLES.map(r => r.role), viewports: VIEWPORTS, routeCount: ROUTES.length, findings }, null, 2));
        }
      }
    }

    const failed = findings.filter(f => f.novelty === 'FAILED');
    console.log(`\n=== DONE: ${findings.length} captures, ${failed.length} FAILED ===`);
    if (failed.length) console.log('FAILED routes:\n' + failed.map(f => `  ${f.role} ${f.viewport} ${f.route}: ${f.error}`).join('\n'));
    expect(findings.length).toBe(useRoles.length * useVps.length * useRoutes.length);
  });
});
