// STAGE 1 collector — NXL EU Pro team tiles (JS-rendered Wix gallery).
// Collects TEAM tiles only (FB/IG socials); sponsors (vendor domains) + league
// handles are excluded. Emits scripts/logos/nxl_eu_raw.json. No writes elsewhere.
//   node scripts/logos/collect_nxl_eu.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = 'https://www.nxlpaintball.com/eu-pro-teams';
const LEAGUE_HANDLES = ['nxleurope', 'nxlpaintball']; // league socials, not teams
const OUT = path.resolve('scripts/logos/nxl_eu_raw.json');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 3000 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
});
// Wix keeps the network busy (analytics/beacons) so `networkidle` never fires —
// wait for DOM + the gallery images explicitly instead.
await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('img[src*="wixstatic.com/media"]', { timeout: 45000 });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // trigger lazy tiles
await page.waitForTimeout(3500); // let the Wix gallery hydrate fully

const items = await page.evaluate((leagueHandles) => {
  const orig = (u) => u.replace(/(~mv2\.[a-z0-9]+).*/i, '$1'); // strip Wix transform
  const seen = new Set();
  const out = [];
  const anchors = document.querySelectorAll('a[href*="facebook.com"], a[href*="instagram.com"]');
  for (const a of anchors) {
    const img = a.querySelector('img[src*="wixstatic.com/media"]');
    if (!img) continue;
    const href = a.href;
    if (leagueHandles.some((h) => href.toLowerCase().includes(h))) continue;
    const r = img.getBoundingClientRect();
    if (Math.max(r.width, r.height) < 60) continue; // social-icon sized
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ social: href, img: orig(img.currentSrc || img.src), alt: img.alt || '' });
  }
  return out;
}, LEAGUE_HANDLES);

await browser.close();
fs.writeFileSync(OUT, JSON.stringify(items, null, 2));
console.log(`collected ${items.length} team tiles → ${OUT}`);
for (const it of items) console.log(`  ${(it.alt || '(no alt)').padEnd(28)} ${it.social}`);
// Sanity: expect ~14-18; no img host should be a vendor/sponsor domain.
const badHost = items.filter((i) => !/wixstatic\.com/i.test(i.img));
if (badHost.length) console.log(`\n⚠ ${badHost.length} img(s) not on wixstatic — inspect`);
