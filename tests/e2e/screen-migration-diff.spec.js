// H0 migration gate (arc-B model C) — proves a page migrated to <Screen> is
// pixel-identical at PHONE + TABLET (the model-C promise: only desktop changes).
// Flow per page: baseline on pre-migration code (--update-snapshots), migrate,
// re-run → phone + tablet diff must be 0. Desktop is the intended cap (NOT shot
// here — it gets a register row, not a diff assertion). Isolated/clean-seed
// (run via test:e2e:migrationdiff), excluded from the shared suite.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, SUPER_ACCOUNT, WS, ADMIN_WS, TEAM_A, TRN_TRAIN_REVIEW } from './fixtures.js';

const PHONE = { width: 414, height: 896 };
const TABLET = { width: 768, height: 1024 };

const PAGES = [
  { name: 'team-detail', url: `/#/team/${TEAM_A}` },
  { name: 'profile', url: '/#/profile' },
  // list batch (tier 960)
  { name: 'teams', url: '/#/teams' },
  { name: 'players', url: '/#/players' },
  { name: 'layouts', url: '/#/layouts' },
  // batch 3 — members + results (list 960). user-detail deferred: 68px content
  // noise (async profile load) made phone+tablet diff non-zero — needs a
  // deterministic wait/mask before it can prove 0; flagged in NEXT_TASKS.
  { name: 'members', url: '/#/settings/members' },
  { name: 'training-results', url: `/#/training/${TRN_TRAIN_REVIEW}/results` },
  // admin batch — super_admin reach. The app shell is membership-gated, so super
  // enters its OWN isolated workspace (ADMIN_WS); the pages read GLOBAL collections
  // so content is workspace-independent (pixel-deterministic). AdminLayouts = clean
  // R.layout shell; the 3 bare-<>-fragment pages wrap with padBottom={false}.
  { name: 'admin-layouts', url: '/#/admin/layouts', account: SUPER_ACCOUNT, ws: ADMIN_WS },
  { name: 'admin-leagues', url: '/#/admin/leagues', account: SUPER_ACCOUNT, ws: ADMIN_WS },
  { name: 'admin-players', url: '/#/admin/players', account: SUPER_ACCOUNT, ws: ADMIN_WS },
  { name: 'admin-teams', url: '/#/admin/teams', account: SUPER_ACCOUNT, ws: ADMIN_WS },
];

async function dismissNudge(page) {
  const n = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
  if (await n.isVisible().catch(() => false)) await n.click();
}

for (const p of PAGES) {
  for (const [vpName, vp] of [['phone', PHONE], ['tablet', TABLET]]) {
    test(`${p.name} @ ${vpName} pixel-stable (model C: below-desktop unchanged)`, async ({ page }) => {
      await login(page, p.account || TEST_ACCOUNT);
      await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
      await page.evaluate(s => window.__pbtest && window.__pbtest.setWorkspace(s), p.ws || WS).catch(() => {});
      await page.setViewportSize(vp);
      await page.goto(p.url);
      await dismissNudge(page);
      await page.waitForTimeout(1500);
      await expect(page).toHaveScreenshot(`${p.name}-${vpName}.png`, {
        animations: 'disabled', maxDiffPixels: 0, fullPage: true,
      });
    });
  }
}
