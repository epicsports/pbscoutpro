// Durable invite — admin re-send must be idempotent (2026-06-15). Creating an email
// invite for an address that ALREADY has one was a `setDoc` overwrite = an UPDATE,
// which the /invites rules grant only to the invitee's own self-claim, never to an
// admin → the re-send 403s ("insufficient or missing permissions"). Jacek hit this
// re-inviting biuro@epicsports.pl (pending invite already existed).
//
// Fail-first: before the fix, sendEmailInvite → createEmailInvite setDoc-on-existing
// → PERMISSION_DENIED → 'ERR:...' (RED). The fix makes createEmailInvite skip the
// write when the invite exists (re-send is a no-op on the doc; the email-link still
// re-sends) → 'ok' (GREEN). adminview@test.local is seeded pending on ADMIN_WS.
import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.js';
import { SUPER_ACCOUNT, ADMIN_WS } from './fixtures.js';

test('admin re-sends an email invite to an already-invited address (idempotent, no permission error)', async ({ page }) => {
  await login(page, SUPER_ACCOUNT);
  await page.waitForFunction(() => !!window.__pbtest, { timeout: 20000 }).catch(() => {});
  await page.evaluate(s => window.__pbtest && window.__pbtest.setWorkspace(s), ADMIN_WS).catch(() => {});

  const res = await page.evaluate(
    ({ slug, email }) => window.__pbtest.sendEmailInvite(slug, 'scout', email)
      .then(() => 'ok').catch(e => 'ERR:' + (e?.code || e?.message)),
    { slug: ADMIN_WS, email: 'adminview@test.local' },
  );
  expect(res).toBe('ok');
});
