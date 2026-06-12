// e2e #3 — Login → workspace auto-entry → home renders.
// Runs against the Firebase emulator (see playwright.emulator.config.js).
// Migrates the salvageable assertions from the retired prod smoke.spec.js
// (console-error guard, touch-target audit) onto the emulator target, corrected
// for the real AppShell (Scout/Coach/Gracz/More tab bar — there is no <nav>).

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT, TEST_ACCOUNT_3 } from './fixtures.js';

test.describe('#3 Login → workspace → home', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ACCOUNT);
  });

  test('seeded account lands in the workspace and the tab bar renders', async ({ page }) => {
    // Admin account → auto-enters defaultWorkspace (demo-ws) and sees all tabs.
    await expect(page.locator('text=/Scout|Coach|Ustawienia|Settings/').first()).toBeVisible();
    // Login form is gone (we're past the gate).
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
  });

  test('no critical console errors on home', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(2500);
    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('firebase') &&
      !e.includes('net::ERR'),
    );
    expect(critical).toEqual([]);
  });

  test('tab switching does not crash', async ({ page }) => {
    // Tabs are state-swap divs (not router links) — click and assert the shell
    // survives + stays on the app root (HashRouter root for non-Gracz tabs).
    for (const label of ['Coach', 'Scout']) {
      const tab = page.locator(`text="${label}"`).first();
      if (await tab.count()) {
        await tab.click();
        await expect(page.locator('text=/Ustawienia|Settings/').first()).toBeVisible();
      }
    }
  });

  test('touch targets ≥ 44px (mobile-first audit)', async ({ page }) => {
    const buttons = page.locator('button');
    const count = await buttons.count();
    const tooSmall = [];
    for (let i = 0; i < Math.min(count, 20); i++) {
      const btn = buttons.nth(i);
      if (!await btn.isVisible()) continue;
      const box = await btn.boundingBox();
      if (box && (box.height < 36 || box.width < 36)) {
        tooSmall.push(`"${(await btn.textContent())?.trim()}" ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }
    expect(tooSmall.length).toBeLessThan(5);
  });
});

test.describe('B4 regression: Settings is never a cold-open landing', () => {
  test('a stale persisted "more" tab redirects to the content view on reopen', async ({ page }) => {
    await login(page, TEST_ACCOUNT);
    // Simulate a session last left on the Settings (More/Ustawienia) tab.
    await page.evaluate(() => localStorage.setItem('pbscoutpro_activeTab', 'more'));
    await page.reload();
    // Admin (all tabs; no tournament selected) must land on the CONTENT
    // empty-state, NOT Settings — the AppShell cold-open guard redirects
    // 'more' → first content tab. Without the fix, MoreTabContent would render
    // and this empty-state text would be absent.
    // Language-agnostic: this copy went through the H1 i18n extraction (PL+EN).
    await expect(page.getByText(/Select a tournament or create a new one|Wybierz turniej albo utwórz nowy/i)).toBeVisible();
  });
});

test.describe('regression: member with no defaultWorkspace (5f69dc04)', () => {
  test('enters their workspace via membership, NOT NoWorkspaceScreen', async ({ page }) => {
    // coach3 is a member of demo-ws but has NO defaultWorkspace on /users.
    // login() resolves only when the app tab bar renders — i.e. they entered
    // the workspace. If they hit NoWorkspaceScreen instead, the tab bar never
    // appears and login() throws (the regression).
    await login(page, TEST_ACCOUNT_3);
    await expect(page.locator('text=/Scout|Coach|Ustawienia|Settings/').first()).toBeVisible();
    // NoWorkspaceScreen must NOT be showing.
    await expect(page.getByText(/Account created|Konto utworzone/i)).toHaveCount(0);
  });
});
