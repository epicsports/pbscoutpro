// tests/helpers/auth.js
// Handles login gate — reusable across all tests

export async function login(page) {
  const password = process.env.PBSCOUT_PASSWORD;
  if (!password) throw new Error('Set PBSCOUT_PASSWORD env var');

  await page.goto('./');
  // Pre-set handedness to prevent overlay blocking tests
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));

  // Wait for either login gate OR already-logged-in dashboard
  const loginInput = page.locator('input[type="password"], input[type="text"]').first();
  const dashboard = page.locator('nav').first();

  const which = await Promise.race([
    loginInput.waitFor({ timeout: 20000 }).then(() => 'login'),
    dashboard.waitFor({ timeout: 20000 }).then(() => 'dashboard'),
  ]).catch(() => 'timeout');

  if (which === 'login') {
    await loginInput.fill(password);
    await page.locator('button').filter({ hasText: /enter|wejdź|submit/i }).first().click();
    await page.waitForSelector('nav', { timeout: 15000 });
  } else if (which === 'dashboard') {
    // Already logged in — nothing to do
  } else {
    throw new Error('Login timeout — neither login gate nor dashboard appeared');
  }
}

export const VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 15': { width: 393, height: 852 },
  'iPad': { width: 810, height: 1080 },
  'Android': { width: 412, height: 915 },
  'Desktop': { width: 1440, height: 900 },
};
