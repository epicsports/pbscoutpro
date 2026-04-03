/**
 * PbScoutPro — Screenshot Capture
 * Takes screenshots of all screens at mobile viewport.
 * Run: PBSCOUT_PASSWORD=xxx node scripts/reviewers/capture-screens.js
 * Output: scripts/reviewers/screenshots/*.png
 */

import { chromium } from '@playwright/test';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://epicsports.github.io/pbscoutpro/';
const OUT_DIR = join(import.meta.dirname, 'screenshots');
const PASSWORD = process.env.PBSCOUT_PASSWORD;

if (!PASSWORD) { console.error('Set PBSCOUT_PASSWORD env var'); process.exit(1); }

// Screens to capture — ordered by navigation flow
const SCREENS = [
  { name: '01-home',             path: '#/',              wait: 3000 },
  { name: '02-layouts-list',     path: '#/layouts',       wait: 2000 },
  { name: '03-teams-list',       path: '#/teams',         wait: 2000 },
  { name: '04-players-list',     path: '#/players',       wait: 2000 },
  // Detail pages need real IDs — we'll discover them dynamically
];

async function login(page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.setItem('pbscoutpro-handedness', 'right'));
  await page.goto(BASE_URL);

  const loginInput = page.locator('input[type="password"], input[type="text"]').first();
  const dashboard = page.locator('text=PbScoutPro').first();

  const which = await Promise.race([
    loginInput.waitFor({ timeout: 15000 }).then(() => 'login'),
    dashboard.waitFor({ timeout: 15000 }).then(() => 'dashboard'),
  ]).catch(() => 'timeout');

  if (which === 'login') {
    await loginInput.fill(PASSWORD);
    await page.locator('button').filter({ hasText: /enter|wejdź|submit/i }).first().click();
    await page.waitForSelector('text=PbScoutPro', { timeout: 15000 });
  }
  console.log('✓ Logged in');
}

async function capture(page, name, waitMs = 2000) {
  await page.waitForTimeout(waitMs);
  // Wait for any loading spinners to disappear
  try {
    await page.waitForSelector('text=Loading', { state: 'hidden', timeout: 5000 });
  } catch {}
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${name}`);
}

async function discoverAndCapture(page) {
  // Discover real entity IDs from the app
  // 1. Go to layouts, find first layout
  await page.goto(`${BASE_URL}#/layouts`);
  await page.waitForTimeout(2000);
  const layoutLinks = page.locator('div[style*="cursor: pointer"] img').first();
  if (await layoutLinks.count() > 0) {
    await layoutLinks.click();
    await page.waitForTimeout(3000);
    await capture(page, '05-layout-detail');

    // Check if there are tactics
    const tacticsTab = page.locator('text=Tactics').first();
    if (await tacticsTab.isVisible()) {
      await tacticsTab.click();
      await page.waitForTimeout(1000);
      await capture(page, '06-layout-tactics');
    }
  }

  // 2. Go home, find first tournament
  await page.goto(`${BASE_URL}#/`);
  await page.waitForTimeout(2000);
  const tournamentCards = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /Cup|Open|Event|League|Tournament/i }).first();
  if (await tournamentCards.count() > 0) {
    await tournamentCards.click();
    await page.waitForTimeout(3000);
    await capture(page, '07-tournament-detail');

    // Find first match
    const matchLinks = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /vs|:/ }).first();
    if (await matchLinks.count() > 0) {
      await matchLinks.click();
      await page.waitForTimeout(3000);
      // Side picker
      await capture(page, '08-match-side-picker');
      // Click HOME to enter match
      const homeBtn = page.locator('text=HOME').first();
      if (await homeBtn.isVisible()) {
        await homeBtn.click();
        await page.waitForTimeout(3000);
        await capture(page, '09-match-scouting');
      }
    }

    // Find first team
    await page.goBack();
    await page.goBack();
    await page.waitForTimeout(2000);
    const teamLinks = page.locator('div[style*="cursor: pointer"]').filter({ hasText: /team|roster/i }).first();
    if (await teamLinks.count() > 0) {
      await teamLinks.click();
      await page.waitForTimeout(2000);
      await capture(page, '10-scouted-team');
    }
  }

  // 3. Teams detail
  await page.goto(`${BASE_URL}#/teams`);
  await page.waitForTimeout(2000);
  const teamCard = page.locator('div[style*="cursor: pointer"]').first();
  if (await teamCard.count() > 0) {
    await teamCard.click();
    await page.waitForTimeout(2000);
    await capture(page, '11-team-detail');
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone SE
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log('\n📷 PbScoutPro Screenshot Capture\n');
  await login(page);

  // Static screens
  for (const s of SCREENS) {
    await page.goto(`${BASE_URL}${s.path}`);
    await capture(page, s.name, s.wait);
  }

  // Dynamic screens (discover IDs)
  await discoverAndCapture(page);

  await browser.close();
  console.log(`\n✅ Screenshots saved to ${OUT_DIR}/\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
