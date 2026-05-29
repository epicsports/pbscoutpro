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
  // App-loaded signal: the bottom tab bar (AppShell). It is a plain div with
  // i18n tab labels — match by text (lang-robust: PL "Ustawienia" / EN
  // "Settings", plus Scout/Coach which admins always see). NOTE: there is no
  // <nav> element — the retired smoke helper's `nav` selector never matched.
  const tabBar = page.locator('text=/Scout|Coach|Ustawienia|Settings/').first();

  // Either the login form (LoginPage) or an already-authenticated dashboard.
  const which = await Promise.race([
    emailInput.waitFor({ timeout: 20000 }).then(() => 'login'),
    tabBar.waitFor({ timeout: 20000 }).then(() => 'dashboard'),
  ]).catch(() => 'timeout');

  if (which === 'login') {
    await emailInput.fill(email);
    await page.locator('input[type="password"]').fill(password);
    // LoginPage submit button: "→ Log in".
    await page.locator('button[type="submit"]').click();
    await tabBar.waitFor({ timeout: 20000 });
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
