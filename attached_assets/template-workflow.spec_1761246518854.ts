// tests/template-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('template page basic workflow', async ({ page, context }) => {
  await page.goto('/profile_v4_1_package/public/index.html?u=demo', { waitUntil: 'domcontentloaded' });
  const share = page.getByRole('button', { name: /share/i }).or(page.getByRole('link', { name: /share/i }));
  await expect(share).toBeVisible();
  const maybePopup = context.waitForEvent('page').catch(() => null);
  await share.click();
  const popup = await maybePopup;
  if (popup) {
    await popup.waitForLoadState('domcontentloaded');
    const html = await popup.content();
    expect(html.length).toBeGreaterThan(50);
    await popup.close();
  } else {
    await expect(page).toHaveURL(/share\.html/i);
  }
});
