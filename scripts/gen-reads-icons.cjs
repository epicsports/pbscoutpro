// Rasterize the Reads avatar (amber dot + seam on #0a0e17) → PWA / home-screen
// icons. No sharp/resvg in the toolchain, so we render the SVG in the Playwright
// Chromium that's already installed for e2e and screenshot each size. Re-run after
// editing the avatar geometry. Source of truth: public/reads-avatar.svg.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PUB = path.resolve(__dirname, '../public');
// Avatar geometry (reads_social_avatar.svg) — bg fills the square + the dot is
// centered well inside the maskable safe zone (80% center), so it doubles as the
// Android maskable icon without a separate art.
const svgAt = (size) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="640" height="640" fill="#0a0e17"/>` +
  `<circle cx="320" cy="320" r="150" fill="#f59e0b"/>` +
  `<rect x="140" y="302" width="360" height="36" fill="#0a0e17"/></svg>`;

const TARGETS = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, size] of TARGETS) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{width:${size}px;height:${size}px;overflow:hidden;background:#0a0e17}svg{display:block}</style></head><body>${svgAt(size)}</body></html>`,
      { waitUntil: 'load' },
    );
    await page.screenshot({ path: path.join(PUB, file), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log('wrote', file, `${size}x${size}`);
  }
  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
