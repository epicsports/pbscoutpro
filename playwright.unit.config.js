import { defineConfig, devices } from '@playwright/test';

// Pure-function unit tests (no app server, no emulator). Playwright's loader
// resolves the app's extensionless ESM imports that plain `node` can't.
// Run: npx playwright test --config playwright.unit.config.js
export default defineConfig({
  testDir: './tests/unit',
  timeout: 30000,
  reporter: [['list']],
  projects: [{ name: 'unit', use: { ...devices['Desktop Chrome'] } }],
});
