// tests/ui-mock-format.spec.ts
import { test, expect } from '@playwright/test';

test('UI mock: layout & typography sanity', async ({ page }) => {
  await page.goto('/mock/profile_editor_mock.html', { waitUntil: 'domcontentloaded' });
  const root = page.locator('#editor-root');
  await root.waitFor({ state: 'visible' });

  await expect(page.getByRole('button', { name: /save & return/i })).toBeVisible();
  await expect(page.getByPlaceholder('Jane Doe')).toBeVisible();
  await expect(page.getByPlaceholder('Senior Frontend Engineer')).toBeVisible();

  const nameInput = page.getByPlaceholder('Jane Doe');
  const fontSize = await nameInput.evaluate(el => getComputedStyle(el).fontSize);
  const paddingLeft = await nameInput.evaluate(el => getComputedStyle(el).paddingLeft);
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(12);
  expect(parseFloat(fontSize)).toBeLessThanOrEqual(16);
  expect(parseFloat(paddingLeft)).toBeGreaterThanOrEqual(10);
  expect(parseFloat(paddingLeft)).toBeLessThanOrEqual(16);

  const gridCols = await root.evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(gridCols.split(' ').length).toBeGreaterThanOrEqual(2);
});
