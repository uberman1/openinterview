import { test, expect } from '@playwright/test';
import path from 'path';

test.beforeEach(async ({ page }) => {
  await page.goto('/home.html', { waitUntil: 'domcontentloaded' });
});

test('Attachments deduped and single bottom Create New', async ({ page }) => {
  const headers = await page.locator('h2', { hasText: 'Attachments' }).all();
  expect(headers.length).toBe(1);
  const link = page.locator('#link-create-attachment');
  await expect(link).toHaveCount(1);
  const wrapClass = await link.locator('..').first().evaluate(el => el.className);
  expect(wrapClass).toContain('mt-2');
});

test('Resumes has single bottom Add New', async ({ page }) => {
  const link = page.locator('#link-add-resume');
  await expect(link).toHaveCount(1);
  const wrapClass = await link.locator('..').first().evaluate(el => el.className);
  expect(wrapClass).toContain('mt-2');
});

test('Avatar updates and persists', async ({ page }) => {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#avatar-profile').click()
  ]);
  await chooser.setFiles(path.resolve('tests/assets/avatar.png'));
  const headerBg = await page.locator('#avatar-header').evaluate(el => getComputedStyle(el).backgroundImage);
  const profileBg= await page.locator('#avatar-profile').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(headerBg).toContain('data:image');
  expect(profileBg).toContain('data:image');
  await page.reload();
  const headerBg2 = await page.locator('#avatar-header').evaluate(el => getComputedStyle(el).backgroundImage);
  const profileBg2= await page.locator('#avatar-profile').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(headerBg2).toContain('data:image');
  expect(profileBg2).toContain('data:image');
});