// §85 player self-edit (2026-06-15, Maks repro). A linked player editing their own
// roster identity on /profile ("Dane gracza") goes through the REAL updatePlayer
// path, which bumps the super-admin-only /meta catalogVersion. Maks (a non-super
// player) saw "nie mogę zapisać profilu" because that bump threw — even though the
// player doc had already saved. The bump is now best-effort, so a non-super
// self-edit succeeds.
//
// Fail-first: with the bump awaited unconditionally, the call returns
// 'ERR:permission-denied' (RED). Best-effort bump → 'ok' (GREEN). selfedit is a
// non-super player linked to PLAYER_SELFEDIT (owned by their workspace).
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SELFEDIT_ACCOUNT, PLAYER_SELFEDIT } from './fixtures.js';

test('linked non-super player self-edits roster identity without a false save error', async ({ page }) => {
  await login(page, SELFEDIT_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 });

  const res = await page.evaluate(
    (id) => window.__pbtest.editLinkedPlayer(id, { nickname: 'EditedNick', number: '7' })
      .then(() => 'ok').catch(e => 'ERR:' + (e?.code || e?.message)),
    PLAYER_SELFEDIT,
  );
  expect(res).toBe('ok');
});
