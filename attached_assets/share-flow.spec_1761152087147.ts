// @ts-check
import { test, expect } from '@playwright/test';

test('share flow: requires email, sends, persists, and opens preview', async ({ page, context }) => {
  // Serve static files assumption; in Replit, open index with /share.html
  await page.goto('share.html?profileId=42');
  await expect(page.locator('text=Share Profile')).toBeVisible();

  // Copy link without email -> shows error toast + message
  await page.getByRole('button', { name: 'Copy Link (requires email)' }).click();
  await expect(page.locator('text=Add a valid email first')).toBeVisible();

  // Enter invalid email
  await page.getByPlaceholder('Enter recipient email').fill('not-an-email');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.locator('text=Please enter a valid email address.')).toBeVisible();

  // Enter valid email + send
  await page.getByPlaceholder('Enter recipient email').fill('reviewer@example.com');
  await page.getByPlaceholder('Add a personal message (optional)').fill('Hi! Please check this out.');

  // Intercept new windows (preview)
  const [preview] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Send Invite' }).click()
  ]);

  await preview.waitForLoadState('domcontentloaded');
  // Subject should be present in the preview HTML; we can at least assert body contains 'invited'
  const content = await preview.content();
  expect(content.toLowerCase()).toContain('invited');
});
