import { test, expect } from '@playwright/test';
import { injectMemoryMocks, stubNavigation } from '../utils/mocks';

test.describe('Phase 1 — HTML & UX integrity', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p1');
    await stubNavigation(page);
    await page.goto('/profile_edit_enhanced.html?id=p1');
  });

  test('Only "Save & Return" is present', async ({ page }) => {
    // Legacy "Save Profile" should not exist
    await expect(page.locator('button').filter({ hasText: /^Save Profile$/i })).toHaveCount(0);
    // Save & Return button present
    await expect(page.locator('#btnSaveReturn')).toBeVisible();
  });

  test('Profile Name is required', async ({ page }) => {
    const input = page.locator('#profileNameInput');
    await input.fill('');
    await page.click('#btnSaveReturn');
    // Error must be visible and page should not navigate
    await expect(page.locator('#profile-name-error')).toBeVisible();
    await expect(page).toHaveURL(/profile_edit_enhanced\.html/);
  });

  test('Availability section has help text, no local Save/Revert', async ({ page }) => {
    const avail = page.locator('#availability-section');
    // No Save or Revert buttons inside availability
    await expect(avail.locator('button').filter({ hasText: /^Save$/i })).toHaveCount(0);
    await expect(avail.locator('button').filter({ hasText: /^Revert$/i })).toHaveCount(0);
    // Help text under Increments, Buffers, Daily Cap
    await expect(avail.getByText(/How often time slots appear as available/i)).toBeVisible();
    await expect(avail.getByText(/leave blank for unlimited interviews/i)).toBeVisible();
    await expect(avail.getByText(/Extra time automatically added/i)).toBeVisible();
  });
});
