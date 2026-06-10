// tests/cross-device-audit.spec.js
// FULL-APP CROSS-DEVICE RENDER AUDIT (read-only crawler).
// Renders every coach-reachable screen across a 5-viewport matrix, runs 7
// automated layout checks per route×viewport, writes screenshots + a JSON
// findings dump to audit/. A node post-step (scripts/audit/build-findings.cjs)
// turns the JSON into audit/FINDINGS.md.
//
// Run on the emulator suite (seeded data so canvas screens render meaningfully):
//   JAVA_HOME=… npx playwright test --config playwright.emulator.config.js cross-device-audit
//
// Delivery: branch audit/cross-device-2026-06 (NOT merged to main).

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from './helpers/auth.js';
import {
  TEST_ACCOUNT, WS, TRN, MATCH, TEAM_A, TRN_HIT, UID, BASE_LAYOUT, LAYOUT,
} from './e2e/fixtures.js';

const OUT = 'audit';
const SHOTS = path.join(OUT, 'screenshots');

// ── 5-viewport device matrix ──
const VIEWPORTS = [
  { name: 'phone-portrait',   width: 390,  height: 844,  orient: 'portrait'  },
  { name: 'phone-landscape',  width: 932,  height: 430,  orient: 'landscape' },
  { name: 'tablet-portrait',  width: 834,  height: 1194, orient: 'portrait'  },
  { name: 'tablet-landscape', width: 1194, height: 834,  orient: 'landscape' },
  { name: 'desktop',          width: 1920, height: 1080, orient: 'landscape' },
];

// ── Route inventory (coach-reachable, seeded). archetype groups the register. ──
// canvas:true → hero-rule (check 5) applies in landscape.
const ROUTES = [
  // List / Feed
  { name: 'main-home',        archetype: 'List',   url: '#/' },
  { name: 'teams',            archetype: 'List',   url: '#/teams' },
  { name: 'players',          archetype: 'List',   url: '#/players' },
  { name: 'layouts',          archetype: 'List',   url: '#/layouts' },
  { name: 'scouts-ranking',   archetype: 'List',   url: '#/scouts' },
  { name: 'my-issues',        archetype: 'List',   url: '#/my-issues' },
  { name: 'training',         archetype: 'List',   url: `#/training/${TRN}` },
  { name: 'members',          archetype: 'List',   url: '#/settings/members' },
  // Detail / Report
  { name: 'team-detail',      archetype: 'Detail', url: `#/team/${TEAM_A}` },
  { name: 'player-stats',     archetype: 'Detail', url: `#/player/pa1/stats` },
  { name: 'scout-detail',     archetype: 'Detail', url: `#/scouts/${UID}` },
  { name: 'scouted-team',     archetype: 'Detail', url: `#/tournament/${TRN}/team/${TEAM_A}` },
  { name: 'training-results', archetype: 'Detail', url: `#/training/${TRN}/results` },
  { name: 'user-detail',      archetype: 'Detail', url: `#/settings/members/${UID}` },
  // Canvas / Tool (hero rule in landscape)
  { name: 'layout-detail',    archetype: 'Canvas', url: `#/layout/${BASE_LAYOUT}`, canvas: true },
  { name: 'bunker-editor',    archetype: 'Canvas', url: `#/layout/${BASE_LAYOUT}/bunkers`, canvas: true },
  { name: 'ballistics',       archetype: 'Canvas', url: `#/layout/${BASE_LAYOUT}/ballistics`, canvas: true },
  { name: 'layout-analytics', archetype: 'Canvas', url: `#/layout/${BASE_LAYOUT}/analytics/deaths`, canvas: true },
  { name: 'match-review',     archetype: 'Canvas', url: `#/tournament/${TRN}/match/${MATCH}`, canvas: true },
  { name: 'match-scout',      archetype: 'Canvas', url: `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`, canvas: true },
  { name: 'hitability',       archetype: 'Canvas', url: `#/training/${TRN_HIT}/hitability`, canvas: true, baseline: true },
  // Form / Config / Wizard
  { name: 'layout-wizard',    archetype: 'Form',   url: '#/layout/new' },
  { name: 'training-setup',   archetype: 'Form',   url: `#/training/${TRN}/setup` },
  { name: 'training-squads',  archetype: 'Form',   url: `#/training/${TRN}/squads` },
  { name: 'profile',          archetype: 'Form',   url: '#/profile' },
  { name: 'debug-flags',      archetype: 'Form',   url: '#/debug/flags' },
  { name: 'ppt-log',          archetype: 'Form',   url: '#/player/log' },
  { name: 'ppt-wizard',       archetype: 'Form',   url: '#/player/log/wizard' },
];

// EXCLUSIONS (recorded in FINDINGS.md):
//  - super_admin-only: /admin/leagues, /admin/players, /admin/teams,
//    /admin/workspaces, /admin/layouts (need SUPER_ACCOUNT + own data).
//  - not-seeded params: TacticPage (no tactic id), training matchup MatchPage
//    (no matchup id). MatchPage canvas archetype IS covered via match-review/scout.
//  - Kiosk: an in-flow overlay, not a standalone route.

// DOM/layout checks — run in the page. Returns raw measurements; severity is
// assigned host-side in the findings builder.
const CHECK_FN = () => {
  const vw = window.innerWidth, vh = window.innerHeight, tol = 2;
  const out = { vw, vh };
  out.hScroll = Math.max(0, document.documentElement.scrollWidth - vw);
  let offRight = 0, worstRight = 0, tooWide = 0;
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (cs.position !== 'fixed' && r.right > vw + tol) { offRight++; worstRight = Math.max(worstRight, r.right - vw); }
    if (r.width > vw + tol) tooWide++;
  }
  out.offRight = offRight; out.worstRight = Math.round(worstRight); out.tooWide = tooWide;
  let small = 0; const smallSamples = [];
  for (const el of document.querySelectorAll('button,[role="button"],a,input,select,textarea')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 44 - tol || r.width < 44 - tol) {
      small++;
      if (smallSamples.length < 4) smallSamples.push(`<${el.tagName.toLowerCase()}> ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 18)}"`);
    }
  }
  out.smallTargets = small; out.smallSamples = smallSamples;
  let trunc = 0;
  for (const el of all) {
    if (el.children.length || !el.textContent || !el.textContent.trim()) continue;
    if (el.scrollWidth > el.clientWidth + tol) trunc++;
  }
  out.textOverflow = trunc;
  const c = document.querySelector('canvas');
  out.canvasH = c ? Math.round(c.getBoundingClientRect().height) : null;
  out.bodyBg = getComputedStyle(document.body).backgroundColor;
  out.rootBg = (() => { const el = document.querySelector('#root > *') || document.body; return getComputedStyle(el).backgroundColor; })();
  out.bodyText = (document.body.innerText || '').trim().length; // blank-screen detector
  return out;
};

test.describe('cross-device render audit', () => {
  test('crawl all routes × 5 viewports', async ({ page }) => {
    test.setTimeout(20 * 60 * 1000);
    fs.mkdirSync(SHOTS, { recursive: true });
    const findings = [];

    await login(page, TEST_ACCOUNT);
    // Set the active workspace once (bridge); the app's defaultWorkspace=demo-ws
    // also resolves it across reloads.
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
    await page.evaluate((s) => window.__pbtest && window.__pbtest.setWorkspace(s), WS).catch(() => {});

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of ROUTES) {
        const rec = { route: route.name, archetype: route.archetype, viewport: vp.name, orient: vp.orient, canvas: !!route.canvas, baseline: !!route.baseline, url: route.url };
        try {
          await page.goto('./' + route.url, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1200); // settle: render + ResizeObserver + canvas fit
          const m = await page.evaluate(CHECK_FN);
          Object.assign(rec, m);
          await page.screenshot({ path: path.join(SHOTS, `${route.name}__${vp.name}.png`) });
        } catch (e) {
          rec.error = String(e).slice(0, 200);
        }
        findings.push(rec);
      }
    }

    fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify({ generatedFor: '2026-06', viewports: VIEWPORTS, routeCount: ROUTES.length, findings }, null, 2));
    // Sanity: the run produced findings for every route×viewport.
    expect(findings.length).toBe(ROUTES.length * VIEWPORTS.length);
  });
});
