import { defineConfig, devices } from '@playwright/test';

// Wave-2 stress audit config. Same emulator webServer as playwright.audit.config.js
// but seeds the STRESS fixture (scripts/audit/seed-stress.cjs) and runs the 5-role
// delta crawler. Isolated from the deploy-gating e2e suite.
// Run: JAVA_HOME=… npx playwright test --config playwright.audit-stress.config.js

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
  testMatch: /cross-device-audit-full\.spec\.js/,
  outputDir: './tests/results-audit-stress',
  timeout: 120 * 60 * 1000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5173/', screenshot: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npx firebase-tools emulators:exec --project demo-pbscoutpro --only auth,firestore ' +
      '"node scripts/audit/seed-stress.cjs && npx vite --port 5173 --strictPort"',
    url: 'http://localhost:5173/',
    timeout: 180000,
    reuseExistingServer: false,
    env: EMULATOR_ENV,
  },
});
