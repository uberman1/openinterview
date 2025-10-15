import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/specs',
  use: { headless: true, baseURL: 'http://localhost:5000' },
  timeout: 45000,
  // Use existing workflow server on port 5000
});