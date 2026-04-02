import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/results',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['html', { outputFolder: 'tests/report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'https://epicsports.github.io/pbscoutpro/',
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iPhone SE',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'iPhone 15',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'Android',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
});
