import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  fullyParallel: true,
  retries: 0,
  use: { 
    headless: true, 
    baseURL: 'http://localhost:5000',
    trace: 'on-first-retry' 
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
