// Self-claim picker must show the FULL global player catalog (Jacek 2026-06-14):
// a player matching their profile was seeing NOBODY because the §85 picker filter
// restricted candidates to players OWNED BY the user's own workspace — empty when
// that workspace owns none (Maks's case). /players read is open, so the picker
// should show the whole DB.
//
// Fixture: B4_PLAYER — role 'player', unlinked, member of b4-roles-ws which owns
// ZERO players, while the global catalog has the demo-ws roster ("A Player …").
// Old filter → empty picker (fail-first RED). Fix (full catalog) → roster visible.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { B4_PLAYER_ACCOUNT } from './fixtures.js';

test('self-claim picker shows the global player catalog (not just own workspace)', async ({ page }) => {
  await login(page, B4_PLAYER_ACCOUNT);
  // B4_PLAYER may land on the onboarding gate (unlinked, not skipped) or — if an
  // earlier serial spec already skipped it — in the app. Skip if the gate is up.
  const skip = page.getByRole('button', { name: /Pomiń na razie|Skip for now/ });
  await skip.click({ timeout: 4000 }).catch(() => {});
  await expect(page.getByTestId('nav-ball')).toBeVisible({ timeout: 20000 });

  await page.goto('/#/profile');
  // Open the self-claim picker.
  await page.getByRole('button', { name: /Połącz profil żeby zobaczyć statystyki|Link profile/ }).click();

  // The picker (empty query → full unlinked roster) must surface the global
  // demo-ws players, even though B4_PLAYER's own workspace owns none.
  await expect(page.getByText(/A Player/).first()).toBeVisible({ timeout: 10000 });
});
