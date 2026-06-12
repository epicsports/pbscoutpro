// e2e — B4 role-aware home (CC_BRIEF_DAY2_PART3, mockup-4 gate 2026-06-10).
// Runs against the Firebase emulator on FRESH fixture workspaces (b4-ws /
// b4-roles-ws — zero events, zero overlays) so the demo-ws specs see nothing.
//
// Acceptance (brief STAGE 3):
//   - coach/admin cold open on a fresh workspace ⇒ checklist visible, step
//     "event" highlighted as NEXT, progress 1/5 (admin = 5 steps)
//   - a tournament appears ⇒ step "event" done, step "layout" next, 2/5
//     (live subscription + survives reload)
//   - "Zrobię to później" ⇒ the empty dashboard (NoTournamentEmptyState)
//   - scout with no active event ⇒ B4 waiting empty state
//   - unlinked player on PPT ⇒ claim card; CTA deep-links to /profile
//
// Fail-first: pre-B4 there is no `b4-checklist` / `b4-scout-empty` / `b4-claim`
// testid anywhere → RED until the feature lands.

import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import {
  B4_ADMIN_ACCOUNT, B4_SCOUT_ACCOUNT, B4_PLAYER_ACCOUNT, B4_WS,
} from './fixtures.js';

// Fresh non-coach accounts hit the first-login "Podłącz profil gracza"
// onboarding gate (§49.8) before the home — skip it (existing flow, out of
// B4 scope; the B4 claim card is exactly the post-skip surface).
const skipOnboarding = async (page) => {
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.waitFor({ state: 'visible', timeout: 10000 }).then(() => skip.click()).catch(() => {});
};

test.describe('B4 — role-aware home', () => {
  test('coach checklist: 1/5 → add tournament → 2/5; later ⇒ empty dashboard', async ({ page }) => {
    await login(page, B4_ADMIN_ACCOUNT);
    await expect(page.getByTestId('b4-checklist')).toBeVisible({ timeout: 20000 });
    // Dismiss the roles-migration nudge modal (rolesVersion notice) if shown —
    // its scrim intercepts clicks on the checklist underneath.
    const rolesNudge = page.getByRole('button', { name: /^(Zrobię to później|I'll do it later)$/ });
    await rolesNudge.waitFor({ state: 'visible', timeout: 5000 }).then(() => rolesNudge.click()).catch(() => {});
    await expect(page.getByTestId('b4-progress')).toHaveText('1/5');
    await expect(page.getByTestId('b4-step-event')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('b4-step-layout')).toHaveAttribute('data-state', 'todo');

    // Flip the hasEvent signal via the bridge → the checklist updates LIVE.
    await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });
    await page.evaluate(s => window.__pbtest.setWorkspace(s), B4_WS);
    await page.evaluate(() => window.__pbtest.addTournament({ name: 'B4 Cup', league: 'NXL' }));
    await expect(page.getByTestId('b4-progress')).toHaveText('2/5');
    await expect(page.getByTestId('b4-step-event')).toHaveAttribute('data-state', 'done');
    await expect(page.getByTestId('b4-step-layout')).toHaveAttribute('data-state', 'next');

    // Survives reload (state is derived from data, not stored).
    await page.reload();
    await expect(page.getByTestId('b4-progress')).toHaveText('2/5', { timeout: 20000 });

    // "Zrobię to później" → the normal empty dashboard, not the checklist.
    await page.getByTestId('b4-later').click();
    await expect(page.getByTestId('b4-checklist')).toHaveCount(0);
    await expect(page.getByText('Select a tournament or create a new one')).toBeVisible();
  });

  test('scout with no active event sees the B4 waiting state', async ({ page }) => {
    await login(page, B4_SCOUT_ACCOUNT);
    await skipOnboarding(page);
    await expect(page.getByTestId('b4-scout-empty')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/(Nie masz jeszcze przydziału|No assignment yet)/)).toBeVisible();
  });

  test('unlinked player sees the claim card; CTA deep-links to /profile', async ({ page }) => {
    await login(page, B4_PLAYER_ACCOUNT);
    await skipOnboarding(page);
    // Player cold open redirects to PPT (/player/log) — claim card on top.
    await expect(page.getByTestId('b4-claim')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('b4-claim-cta').click();
    await expect(page).toHaveURL(/#\/profile/);
  });
});
