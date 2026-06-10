import { defineConfig, devices } from '@playwright/test';

// Cross-device render audit config. Reuses the emulator webServer + seed (so
// canvas screens render with real data) but is SEPARATE from playwright.emulator
// .config.js so the heavy screenshot crawler never joins the deploy-gating e2e
// suite. Run: JAVA_HOME=… npx playwright test --config playwright.audit.config.js

const EMULATOR_ENV = {
  VITE_USE_EMULATOR: 'true',
  VITE_FIREBASE_PROJECT_ID: 'demo-pbscoutpro',
  VITE_FIREBASE_API_KEY: 'demo-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-pbscoutpro.firebaseapp.com',
  VITE_FIREBASE_APP_ID: 'demo-app',
  GCLOUD_PROJECT: 'demo-pbscoutpro',
};

export default defineConfig({
  testDir: './tests',
  testMatch: /cross-device-audit\.spec\.js/,
  outputDir: './tests/results-audit',
  timeout: 20 * 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173/',
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command:
      'npx firebase-tools emulators:exec --project demo-pbscoutpro --only auth,firestore ' +
      '"node scripts/test/seed-emulator.cjs && npx vite --port 5173 --strictPort"',
    url: 'http://localhost:5173/',
    timeout: 180000,
    reuseExistingServer: true,
    env: EMULATOR_ENV,
  },
});
