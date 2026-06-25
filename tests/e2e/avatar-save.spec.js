// e2e — avatar save persists. Regression guard for the firestore.rules self-update
// whitelist (2026-06-21): setUserAvatarSpec writes { avatarSpec, updatedAt } to
// /users/{uid}. If those keys aren't in the `hasOnly(...)` allow-list the write is
// SILENTLY permission-denied (the original bug — the pixel-avatar builder shipped but
// avatars never saved). Mechanics: builder Save → AvatarBuilderPage.onSave persists via
// setUserAvatarSpec then navigate('/profile'). A denied write rejects the await → the
// navigate never runs → the builder (with #avatar-save) stays mounted. So "the builder
// unmounts after Save" proves the rule allowed the write.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { TEST_ACCOUNT } from './fixtures.js';

test('avatar save persists — firestore self-update whitelist allows avatarSpec', async ({ page }) => {
  await login(page, TEST_ACCOUNT);
  await page.goto('/#/profile/avatar');

  const saveBtn = page.getByTestId('avatar-save');
  await expect(saveBtn).toBeVisible({ timeout: 20000 });
  await saveBtn.click();

  // Successful write → onSave navigates to /profile → builder unmounts.
  // A permission-denied write would reject the await, leaving the builder mounted.
  await expect(saveBtn).toHaveCount(0, { timeout: 10000 });
});
