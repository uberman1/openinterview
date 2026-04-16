// Editor linting only; runner drives Playwright programmatically.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout: 30000,
  expect: { timeout: 4000 },
  use: {
    headless: true,
    video: "off",
    screenshot: "only-on-failure",
    trace: "off"
  },
  retries: 0
});
