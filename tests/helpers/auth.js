// tests/helpers/auth.js
// Email/password login helper (replaces the retired team-code gate).
// Used by the emulator e2e suite (seeded creds) and the prod responsive-audit
// (creds via PBSCOUT_EMAIL / PBSCOUT_PASSWORD env).

export async function login(page, { email = process.env.PBSCOUT_EMAIL, password = process.env.PBSCOUT_PASSWORD } = {}) {
  if (!email || !password) {
    throw new Error('login(): provide { email, password } or set PBSCOUT_EMAIL / PBSCOUT_PASSWORD');
  }

  await page.goto('./');
  // Pre-set handedness so the first-run overlay never blocks the suite.
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));

  const emailInput = page.locator('input[type="email"]');
  // App-loaded signal (§C nav drawer): the reads-ball drawer trigger
  // (`nav-ball`) — rendered in the AppShell top bar AND the PPT top bar, so it
  // covers every role (the old tab-bar text signal broke for single-role users,
  // whose bar no longer renders). Accounts that hit the PBLeagues onboarding
  // gate first resolve on its skip CTA instead (specs then call their
  // skip helper) — same semantics the loose text match provided before.
  const appReady = page.locator(
    '[data-testid="nav-ball"], button:has-text("Pomiń na razie"), button:has-text("Skip for now")',
  ).first();

  // Either the login form (LoginPage) or an already-authenticated dashboard.
  const which = await Promise.race([
    emailInput.waitFor({ timeout: 20000 }).then(() => 'login'),
    appReady.waitFor({ timeout: 20000 }).then(() => 'dashboard'),
  ]).catch(() => 'timeout');

  if (which === 'login') {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(password);
    // LoginPage submit button: "→ Log in".
    await page.locator('button[type="submit"]').click();
    await appReady.waitFor({ timeout: 20000 });
  } else if (which === 'timeout') {
    throw new Error('Login timeout — neither login form nor dashboard appeared');
  }
  // 'dashboard' → already signed in, nothing to do.
}

export const VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 15': { width: 393, height: 852 },
  'iPad': { width: 810, height: 1080 },
  'Android': { width: 412, height: 915 },
  'Desktop': { width: 1440, height: 900 },
};
