// tests/helpers/auth.js
// Handles login gate — reusable across all tests

export async function login(page) {
  const password = process.env.PBSCOUT_PASSWORD;
  if (!password) throw new Error('Set PBSCOUT_PASSWORD env var');

  await page.goto('./');
  // Wait for login gate
  const codeInput = page.locator('input[type="password"], input[type="text"]').first();
  await codeInput.waitFor({ timeout: 10000 });
  await codeInput.fill(password);
  // Submit
  await page.locator('button').filter({ hasText: /enter|wejdź|submit/i }).first().click();
  // Wait for home page to load
  await page.waitForSelector('text=PbScoutPro', { timeout: 15000 });
}

export const VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 15': { width: 393, height: 852 },
  'iPad': { width: 810, height: 1080 },
  'Android': { width: 412, height: 915 },
  'Desktop': { width: 1440, height: 900 },
};
