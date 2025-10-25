import { test, expect } from '@playwright/test';
import { injectMemoryMocks, stubNavigation } from '../utils/mocks';

test.describe('Regression — cross-page persistence', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'pr');
    await stubNavigation(page);
    await page.goto('/profile_edit_enhanced.html?id=pr');
  });

  test('Save & Return persists Location field across reloads', async ({ page }) => {
    const location = page.locator('input[placeholder*="City"], input[placeholder*="Location"]').first();
    await location.fill('New York, NY');
    await page.click('#btnSaveReturn');
    await page.waitForFunction(() => (window as any).__NAV__?.assignedTo !== null);
    await page.goto('/profile_edit_enhanced.html?id=pr');
    await page.waitForLoadState('networkidle');
    await expect(location).toHaveValue('New York, NY');
  });
});
