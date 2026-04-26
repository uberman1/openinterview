import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/home.html', { waitUntil: 'domcontentloaded' });
});

test('top nav contains only four items', async ({ page }) => {
  const items = page.locator('header nav a');
  await expect(items).toHaveCount(4);
  const texts = await items.allTextContents();
  expect(texts).toEqual(['Home','Subscription','Password','Log Out']);
});

test('no Profiles or Uploads in top nav', async ({ page }) => {
  const navText = await page.locator('header nav').innerText();
  expect(navText).not.toMatch(/Profiles/i);
  expect(navText).not.toMatch(/Uploads/i);
});

test('legacy /profile redirects to #profile on home', async ({ page }) => {
  const [resp] = await Promise.all([
    page.waitForNavigation(),
    page.goto('/profile')
  ]);
  expect(page.url()).toMatch(/home(\.html)?#profile$/);
});

test('legacy /uploads redirects to #attachments on home', async ({ page }) => {
  const [resp] = await Promise.all([
    page.waitForNavigation(),
    page.goto('/uploads')
  ]);
  expect(page.url()).toMatch(/home(\.html)?#attachments$/);
});