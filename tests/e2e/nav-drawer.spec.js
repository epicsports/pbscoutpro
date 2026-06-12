// e2e — §C nav drawer restructure (mockup-7, gated 2026-06-11/12).
//
// Coverage (brief C5):
//   1. drawer open/close — reads-ball trigger, scrim tap, explicit ×; never
//      auto-opens (cold load shows no drawer).
//   2. workspace switcher row — visible ONLY at >1 membership (test-nav has 2
//      workspaces; test-coach has only demo-ws).
//   3. single-role user — no tab bar at all (full-bleed content).
//   4. multi-role user — content role tabs only; no More/Settings tab.
//   5. stale persisted 'more' migration — covered in login.spec.js (kept
//      there: it is the historical B4 regression slot).
//   6. viewer-only terminal state — workspace summary card home; the drawer
//      still opens (their whole settings surface).
//
// Fixtures: isolated nav-ws-1/nav-ws-2 accounts (seed-emulator.cjs §C block) +
// existing stable demo-ws / b4-roles-ws accounts. READ-ONLY against shared
// fixtures — no mutations (serial shared-state rule).
//
// FAIL-FIRST: pre-§C there is no `nav-ball` / `nav-drawer` testid anywhere and
// the More tab still renders → RED until the feature lands.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import {
  TEST_ACCOUNT, NAV_ACCOUNT, VIEWER_ACCOUNT, B4_SCOUT_ACCOUNT,
} from './fixtures.js';

// Non-coach fresh accounts can hit the "Podłącz profil gracza" onboarding gate
// (§49.8) before the home — skip it when shown (same helper as b4-home.spec).
const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 5000 }).then(() => skip.click()).catch(() => {});
};

test.describe('§C nav drawer — open/close mechanics', () => {
  test('ball opens; scrim tap and × close; drawer never auto-opens', async ({ page }) => {
    await login(page, TEST_ACCOUNT);

    // NEVER auto-opens: cold load shows the trigger but no drawer.
    await expect(page.getByTestId('nav-ball')).toBeVisible();
    await expect(page.getByTestId('nav-drawer')).toHaveCount(0);

    // Ball → drawer + scrim. Settings content is the REUSED MoreTabContent
    // (account section renders, e.g. the profile row).
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByTestId('nav-drawer-scrim')).toBeVisible();
    await expect(page.getByText(/Mój profil|My profile/).first()).toBeVisible();
    // Brand footer with the app version.
    await expect(page.getByTestId('nav-drawer')).toContainText('PAINTBALL INTELLIGENCE');

    // Scrim tap closes.
    await page.getByTestId('nav-drawer-scrim').click();
    await expect(page.getByTestId('nav-drawer')).toHaveCount(0);

    // Explicit × closes too.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await page.getByTestId('nav-drawer-close').click();
    await expect(page.getByTestId('nav-drawer')).toHaveCount(0);

    // Still no auto-open after a reload mid-session.
    await page.reload();
    await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('nav-drawer')).toHaveCount(0);
  });
});

test.describe('§C nav drawer — workspace switcher visibility', () => {
  test('switcher row renders for a >1-membership user', async ({ page }) => {
    await login(page, NAV_ACCOUNT);
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByTestId('ws-switcher-row')).toBeVisible();
    // Tapping it opens the §92 picker modal listing both workspaces.
    // ('Nav One' also sits in the drawer identity header → .first()).
    await page.getByTestId('ws-switcher-row').click();
    await expect(page.getByText('Nav One').first()).toBeVisible();
    await expect(page.getByText('Nav Two').first()).toBeVisible();
  });

  test('switcher row is ABSENT for a single-membership user', async ({ page }) => {
    await login(page, TEST_ACCOUNT); // member of demo-ws only
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByTestId('ws-switcher-row')).toHaveCount(0);
  });
});

test.describe('§C3 tab bar — content tabs only, ≥2-tab rule', () => {
  test('single-role scout gets NO tab bar (full-bleed content)', async ({ page }) => {
    await login(page, B4_SCOUT_ACCOUNT);
    await skipOnboarding(page);
    // The scout waiting state renders (their content)…
    await expect(page.getByTestId('b4-scout-empty')).toBeVisible({ timeout: 20000 });
    // …with zero bottom chrome.
    await expect(page.getByTestId('tab-bar')).toHaveCount(0);
    // Settings stay reachable through the drawer.
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByText(/Wyloguj się|Sign out/).first()).toBeVisible();
  });

  test('multi-role user sees role tabs only — no More/Settings tab', async ({ page }) => {
    await login(page, TEST_ACCOUNT); // admin → all content tabs
    await expect(page.getByTestId('tab-bar')).toBeVisible();
    await expect(page.getByTestId('tab-scout')).toBeVisible();
    await expect(page.getByTestId('tab-coach')).toBeVisible();
    await expect(page.getByTestId('tab-ppt')).toBeVisible();
    await expect(page.getByTestId('tab-more')).toHaveCount(0);
    await expect(page.getByTestId('tab-bar')).not.toContainText(/Ustawienia|Settings/);
  });
});

test.describe('§C4 viewer-only terminal state', () => {
  test('viewer gets the workspace summary card; drawer is the whole surface', async ({ page }) => {
    await login(page, VIEWER_ACCOUNT);
    await skipOnboarding(page);
    // Terminal home: summary card with workspace identity + viewer role.
    await expect(page.getByTestId('viewer-home')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('viewer-home')).toContainText('Nav One');
    // No content tabs → no tab bar.
    await expect(page.getByTestId('tab-bar')).toHaveCount(0);
    // The drawer opens and carries the settings surface (sign out reachable).
    await page.getByTestId('nav-ball').click();
    await expect(page.getByTestId('nav-drawer')).toBeVisible();
    await expect(page.getByText(/Wyloguj się|Sign out/).first()).toBeVisible();
  });
});
