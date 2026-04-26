import { test, expect } from '@playwright/test';
import { injectMemoryMocks, stubNavigation } from './utils/mocks';

test.describe('Regressions', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'pr');
    await stubNavigation(page);
    await page.goto('/profile_edit_enhanced.html?id=pr');
  });

  test('Save & Return persists a basic field', async ({ page }) => {
    const location = page.locator('#contact-bio-section input[placeholder="City, Country"]');
    await location.fill('New York, NY');
    await page.click('#btnSaveReturn');
    await page.reload();
    await expect(location).toHaveValue('New York, NY');
  });
});
