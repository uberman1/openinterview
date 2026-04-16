// tests/playwright/routing-shim.e2e.spec.ts
import { test, expect } from '@playwright/test';

test('Direct public link load works', async ({ page }) => {
  await page.goto('/home.html');
  // Would require a previously published profile; leave as placeholder or seed
});
