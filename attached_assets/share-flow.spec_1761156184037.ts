// @ts-check
import { test, expect } from '@playwright/test';

test('share flow: requires email, sends, persists, and opens preview', async ({ page, context }) => {
  await page.goto('http://localhost:4173/share.html?profileId=42');
  await expect(page.getByText('Share Profile')).toBeVisible();
  await page.getByRole('button', { name: 'Copy Link (requires email)' }).click();
  await expect(page.getByText('Add a valid email first')).toBeVisible();
  await page.getByPlaceholder('Enter recipient email').fill('nope');
  await page.getByRole('button', { name: 'Send Invite' }).click();
  await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  await page.getByPlaceholder('Enter recipient email').fill('reviewer@example.com');
  await page.getByPlaceholder('Add a personal message (optional)').fill('Hi! Please check this out.');
  const [preview] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Send Invite' }).click()
  ]);
  await preview.waitForLoadState('domcontentloaded');
  const content = await preview.content();
  expect(content.toLowerCase()).toContain('invited');
  const access = await page.evaluate(() => localStorage.getItem('oi.access.42'));
  expect(access).not.toBeNull();
});
