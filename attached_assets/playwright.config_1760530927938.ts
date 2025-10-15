import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/specs',
  use: { headless: true, baseURL: 'http://localhost:3000' },
  timeout: 45000,
  webServer: {
    command: 'node serve.mjs',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});