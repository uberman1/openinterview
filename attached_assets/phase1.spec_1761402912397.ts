import { test, expect } from '@playwright/test';
import { injectMemoryMocks, stubNavigation } from './utils/mocks';

test.describe('Phase 1 — HTML & UX', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p1');
    await stubNavigation(page);
    await page.goto('/profile_edit_enhanced.html?id=p1');
  });

  test('Only Save & Return is present', async ({ page }) => {
    await expect(page.getByTestId('button-save-profile')).toHaveCount(0);
    await expect(page.locator('#btnSaveReturn')).toBeVisible();
  });

  test('Profile Name is required', async ({ page }) => {
    const input = page.locator('#profile-name-section input');
    await input.fill('');
    await page.click('#btnSaveReturn');
    // stayed put
    await expect(page).toHaveURL(/profile_edit_enhanced\.html/);
  });

  test('Availability help text and no buttons', async ({ page }) => {
    const avail = page.locator('#availability-section');
    await expect(avail.getByText('Revert')).toHaveCount(0);
    await expect(avail.getByText('Save')).toHaveCount(0);
    await expect(avail.getByText('How often time slots appear as available')).toBeVisible();
    await expect(avail.getByText('leave blank for unlimited interviews', { ignoreCase: true })).toBeVisible();
    await expect(avail.getByText('Extra time automatically added')).toBeVisible();
  });
});
