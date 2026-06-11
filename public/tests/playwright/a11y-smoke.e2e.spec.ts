// tests/playwright/a11y-smoke.e2e.spec.ts
import { test, expect } from '@playwright/test';

test('basic focusability', async ({ page }) => {
  await page.goto('/home.html');
  await page.keyboard.press('Tab');
  // Add assertions based on your focus outline
});
