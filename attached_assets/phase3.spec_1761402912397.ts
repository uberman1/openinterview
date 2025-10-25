import { test, expect } from '@playwright/test';
import { injectMemoryMocks } from './utils/mocks';

test.describe('Phase 3 — Availability & Slots', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p3');
    await page.goto('/profile_edit_enhanced.html?id=p3');
  });

  test('Toggle day, add block, reject overlap, remove', async ({ page }) => {
    await page.locator('#mon').check();
    page.on('dialog', async d => {
      if (d.message().includes('Start')) await d.accept('09:00');
      else if (d.message().includes('End')) await d.accept('12:00');
    });
    await page.getByText('Add Block', { exact: false }).first().click();
    await expect(page.locator('.oi-blocks span')).toContainText('09:00–12:00');

    page.on('dialog', async d => {
      if (d.message().includes('Start')) await d.accept('11:00');
      else if (d.message().includes('End')) await d.accept('13:00');
    });
    await page.getByText('Add Block', { exact: false }).first().click();
    await expect(page.locator('.oi-blocks span')).toHaveCount(1);

    await page.locator('.oi-blocks span button').first().click();
    await expect(page.locator('.oi-blocks')).toContainText('No hours set');
  });

  test('Rules persist and public renders slots', async ({ page, context }) => {
    await page.selectOption('#min-notice', { label: '0 hours' });
    await page.fill('#window', '3 days into the future');
    await page.selectOption('#increments', { label: '30 minutes' });
    const bufferInputs = page.locator('div:has(> input.w-20) input.w-20');
    await bufferInputs.nth(0).fill('0'); await bufferInputs.nth(1).fill('0');
    await page.fill('#daily-cap', '');

    await page.locator('#mon').check();
    page.on('dialog', async d => {
      if (d.message().includes('Start')) await d.accept('09:00');
      else if (d.message().includes('End')) await d.accept('11:00');
    });
    await page.getByText('Add Block', { exact: false }).first().click();

    await page.click('#btnSaveReturn').catch(()=>{});

    const pub = await context.newPage();
    await injectMemoryMocks(pub, 'p3');
    await pub.goto('/public/index.html?id=p3').catch(async () => { await pub.goto('/index.html?id=p3'); });
    const container = pub.locator('[data-booking-slots], #booking-slots');
    await expect(container).toBeVisible();
    await expect(container.locator('button')).toHaveCountGreaterThan(0);
  });
});
