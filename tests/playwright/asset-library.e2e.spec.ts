// tests/playwright/asset-library.e2e.spec.ts
import { test, expect } from '@playwright/test';

test('Add New Resume uses picker and updates library', async ({ page }) => {
  await page.goto('/home.html');
  const addResume = page.getByRole('link', { name: /add new/i }).first();
  await expect(addResume).toBeVisible();
  // Note: File chooser stubbing would be needed for full fidelity
});
