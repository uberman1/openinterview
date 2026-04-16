import { test, expect } from '@playwright/test';
import { injectMemoryMocks } from '../utils/mocks';

test.describe('Phase 3 — Availability mechanics & public slots', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p3');
    await page.goto('/profile_edit_enhanced.html?id=p3');
  });

  test('Toggle day, add non-overlap block (single prompt), reject overlap, remove', async ({ page }) => {
    await page.locator('#mon').check();

    // Add 09:00-12:00 via SINGLE prompt
    page.once('dialog', async d => {
      expect(d.message()).toMatch(/HH:MM-HH:MM/);
      await d.accept('09:00-12:00');
    });
    await page.getByText('Add Block', { exact: false }).first().click();
    await page.waitForTimeout(300);

    const list = page.locator('.oi-blocks').first();
    await expect(list).toContainText(/09:00.*12:00/);

    // Attempt overlapping 11:00-13:00
    page.once('dialog', async d => { await d.accept('11:00-13:00'); });
    await page.getByText('Add Block', { exact: false }).first().click();
    await page.waitForTimeout(200);

    // Still only one block shown
    await expect(list.locator('span').filter({ hasText: /\d{2}:\d{2}/ })).toHaveCount(1);

    // Remove block
    await list.locator('button').first().click();
    await expect(list).toContainText(/No hours set/i);
  });

  test('Rules persist and public renders slots', async ({ page, context }) => {
    // Choose lowest min notice (assume first option if "Immediate" missing)
    const minNotice = page.locator('#min-notice');
    const hasImmediate = await minNotice.locator('option[value="immediate"]').count() > 0;
    if (hasImmediate) await minNotice.selectOption('immediate');
    else await minNotice.selectOption({ index: 0 });

    await page.fill('#window', '3 days into the future');
    await page.selectOption('#increments', { label: '30 minutes' });
    // Buffers
    const buffers = page.locator('label:has-text("Buffers")').locator('input[type="number"]');
    await buffers.first().fill('0');
    await buffers.nth(1).fill('0');
    await page.fill('#daily-cap', '');

    // Add Monday 09:00-11:00
    await page.locator('#mon').check();
    page.once('dialog', async d => { await d.accept('09:00-11:00'); });
    await page.getByText('Add Block', { exact: false }).first().click();
    await page.waitForTimeout(300);

    // Save & Return (navigation is allowed; app redirects to public template)
    await page.click('#btnSaveReturn').catch(() => {});
    await page.waitForTimeout(600);

    // Open public page
    const pub = await context.newPage();
    await pub.goto('/public/index.html?id=p3').catch(async () => { await pub.goto('/index.html?id=p3'); });
    await pub.waitForLoadState('networkidle');

    const container = pub.locator('[data-booking-slots], #booking-slots');
    await expect(container.first()).toBeVisible({ timeout: 5000 });
    const buttonCount = await container.first().locator('button').count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
