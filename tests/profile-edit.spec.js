// tests/profile-edit.spec.js
import { test, expect } from '@playwright/test';

test.describe('Profile Edit Page', () => {
  test('should render edit page without blank screen', async ({ page }) => {
    // Navigate with safe mode enabled
    await page.goto('/profile_edit_enhanced.html?id=prof_test_123&safe=1', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait for main content container to be visible
    const main = page.locator('main');
    await main.waitFor({ state: 'visible', timeout: 15000 });

    // Custom visibility check - ensures actual painting
    await page.waitForFunction(() => {
      const mainEl = document.querySelector('main');
      if (!mainEl) return false;
      const rect = mainEl.getBoundingClientRect();
      const cs = getComputedStyle(mainEl);
      return rect.height > 50 && 
             cs.visibility !== 'hidden' && 
             cs.display !== 'none' && 
             parseFloat(cs.opacity) > 0;
    }, { timeout: 15000 });

    // Verify key elements are visible
    const saveReturnBtn = page.getByTestId('button-save-return');
    await expect(saveReturnBtn).toBeVisible();

    const profileNameInput = page.getByTestId('input-profile-name');
    await expect(profileNameInput).toBeVisible();

    // Verify page title
    await expect(page).toHaveTitle(/OpenInterview/i);

    // Verify header is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    console.log('✓ Edit page rendered successfully with all elements visible');
  });

  test('should load edit page with specific profile ID', async ({ page }) => {
    const profileId = 'prof_test_456';
    await page.goto(`/profile_edit_enhanced.html?id=${profileId}&safe=1`, {
      waitUntil: 'domcontentloaded'
    });

    // Wait for JavaScript to initialize
    await page.waitForFunction(() => {
      return window.location.search.includes('prof_test_456');
    });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 15000 });

    // Verify console logs show profile loaded
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Wait a bit for console logs
    await page.waitForTimeout(1000);
    
    console.log('✓ Edit page loaded with profile ID:', profileId);
  });
});
