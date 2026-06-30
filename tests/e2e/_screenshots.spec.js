// _screenshots — CURRENT-STATE capture harness ("what prod looks like now").
//
// WHY THIS EXISTS
// Generalizes the `_render-scout` render-verify harness (which proved the
// login-stall trap and captured ONLY the scout editor) into a multi-screen
// capture tool. It authenticates against the EMULATOR (seeded auth + fixtures,
// exactly like the real e2e suite) and walks a SET of key app screens, writing
// one PNG per screen × width to the repo-root `/screenshots/` folder. Those PNGs
// are COMMITTED artifacts — a visual snapshot of the current UI. Refresh them
// after a visual change (see tests/e2e/README-render.md) and commit the result.
//
// Like `_render-scout` this is NOT a gate spec: the describe title carries the
// `render-verify` tag, which `npm run test:e2e` excludes via
// `--grep-invert "pixel-diff|model C|render-verify"`. Run it explicitly:
//   npm run screenshots
//   (= playwright test --config playwright.emulator.config.js _screenshots)
//
// Each screen self-asserts it is NOT the login form before capturing, so a
// login-stall can never masquerade as a real screen (the trap `_render-scout`
// was built to kill). Pure test-infra — NO app/src changes.

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { login } from '../helpers/auth.js';
import {
  TEST_ACCOUNT, SUPER_ACCOUNT, WS, ADMIN_WS,
  TRN, TRN_PSTATS, MATCH_PSTATS, TEAM_A, ROSTER_A_IDS, matchModesScoutUrl,
} from './fixtures.js';

const OUT_DIR = path.resolve('screenshots'); // repo-root /screenshots/ (committed, NOT gitignored)

// Standard widths: 390 phone · 834 tablet · 1280 desktop · 1000 immersive
// (tablet-landscape; useDevice maps w<1024 → 'tablet' and w>h → landscape, which
// drives the immersive scout rail / live-scoring sidebar).
const H = { 390: 844, 834: 1112, 1280: 800, 1000: 720 };
const vp = (w) => ({ width: w, height: H[w] });

// ── Screen catalog ──────────────────────────────────────────────────────────
// Each screen: a hash URL (or `/` + seeded localStorage for the tab home), the
// account + workspace to authenticate as, the widths to capture, and a `ready`
// locator (or null → generic networkidle settle). `vsOff` disables the scout
// VS-intro overlay so the field chrome (base labels, side-swap strip) is visible.
const PLAYER = ROSTER_A_IDS[0]; // pa1 — has hero/heatmap data on MATCH_PSTATS

const SCREENS = [
  {
    name: 'scout-point-editor',
    url: '/' + matchModesScoutUrl,
    account: TEST_ACCOUNT, ws: WS, vsOff: true,
    widths: [390, 834, 1280, 1000],
    ready: (p) => p.getByText(/Select winner to save|Save point/i).first(),
  },
  {
    name: 'match-review',
    url: `/#/tournament/${TRN_PSTATS}/match/${MATCH_PSTATS}`,
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834],                 // portrait → inline heatmap + point list
    ready: (p) => p.locator('canvas').first(),
  },
  {
    name: 'live-scoring',
    url: `/#/tournament/${TRN_PSTATS}/match/${MATCH_PSTATS}`,
    account: TEST_ACCOUNT, ws: WS,
    widths: [1280, 1000],               // landscape → TabletLiveScoring sidebar + field
    ready: (p) => p.getByTestId('review-scoreboard'),
  },
  {
    name: 'opponent-analysis',
    url: `/#/tournament/${TRN_PSTATS}/team/${TEAM_A}`,
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834, 1280],
    ready: (p) => p.getByTestId('opponent-field-card'),
  },
  {
    name: 'player-stats',
    url: `/#/player/${PLAYER}/stats?scope=tournament&tid=${TRN_PSTATS}`,
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834, 1280],
    ready: (p) => p.getByTestId('player-stat-grid'),
  },
  {
    name: 'coach-tab',
    url: '/',
    account: TEST_ACCOUNT, ws: WS,
    localStorage: { pbscoutpro_activeTab: 'coach', pbscoutpro_activeTournament: TRN, pbscoutpro_lastKind: 'tournament' },
    widths: [390, 834, 1280],
    ready: (p) => p.getByTestId('nav-ball'),
  },
  {
    name: 'scout-tab',
    url: '/',
    account: TEST_ACCOUNT, ws: WS,
    localStorage: { pbscoutpro_activeTab: 'scout', pbscoutpro_activeTournament: TRN, pbscoutpro_lastKind: 'tournament' },
    widths: [390, 834, 1280],
    ready: (p) => p.getByTestId('nav-ball'),
  },
  {
    name: 'team-detail',
    url: `/#/team/${TEAM_A}`,
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834, 1280],
    ready: (p) => p.getByText(/Team Alpha/i).first(),
  },
  {
    name: 'admin-teams',
    url: '/#/admin/teams',
    account: SUPER_ACCOUNT, ws: ADMIN_WS,
    widths: [390, 834, 1280],
    ready: null,
  },
  {
    name: 'layouts',
    url: '/#/layouts',
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834, 1280],
    ready: null,
  },
  {
    name: 'profile',
    url: '/#/profile',
    account: TEST_ACCOUNT, ws: WS,
    widths: [390, 834, 1280],
    ready: null,
  },
];

test.describe('render-verify — current-state screenshots (seeded, NOT a gate spec)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  });

  for (const screen of SCREENS) {
    test(`render-verify capture — ${screen.name}`, async ({ page }) => {
      // Pin locale to English + pre-set first-run flags BEFORE the app mounts.
      // addInitScript runs before any page script on every navigation, so these
      // hold across each width's re-navigation. Pure test setup, no app change.
      await page.addInitScript(() => {
        localStorage.setItem('pbscoutpro_lang', 'en');
        localStorage.setItem('pbscoutpro-handedness', 'right');
        // Disable the scout VS-intro overlay so the field chrome (base labels,
        // side-swap strip) is visible, not covered by the intro splash.
        localStorage.setItem('pbscoutpro-vsintro', 'off');
      });
      if (screen.localStorage) {
        await page.addInitScript((kv) => {
          for (const k of Object.keys(kv)) localStorage.setItem(k, kv[k]);
        }, screen.localStorage);
      }

      await login(page, screen.account);
      if (screen.ws) {
        await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
        await page.evaluate((s) => window.__pbtest && window.__pbtest.setWorkspace(s), screen.ws).catch(() => {});
      }

      for (const w of screen.widths) {
        // Viewport BEFORE navigation so useDevice resolves the right device class
        // on first mount (immersive / live-sidebar depend on width at render time).
        await page.setViewportSize(vp(w));
        // `load` (goto default) is enough — do NOT wait for `networkidle`: the
        // app holds Firestore real-time listeners open, so the network never goes
        // idle and a networkidle wait would burn the whole test timeout.
        await page.goto(screen.url);

        // SELF-ASSERT: real screen, not the login form (the login-stall trap).
        await expect(page.locator('input[type="email"]')).toHaveCount(0);

        // Screen-specific readiness marker when we have a reliable one. For the
        // `ready: null` screens (admin / layouts / profile) the login-absent
        // assert above + the settle below are the proof it's the real screen.
        if (screen.ready) {
          await expect(screen.ready(page)).toBeVisible({ timeout: 20000 });
        }
        await page.waitForTimeout(1200); // let the field canvas + web fonts paint

        const file = path.join(OUT_DIR, `${screen.name}-${w}.png`);
        await page.screenshot({ path: file, fullPage: false });
        // eslint-disable-next-line no-console
        console.log(`[screenshots] ${screen.name} @ ${w} → ${file}`);
      }
    });
  }
});
