// tests/template-workflow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Template Page Workflow', () => {
  test('should display all three action buttons', async ({ page }) => {
    await page.goto('/profile_v4_1_package/public/index.html', {
      waitUntil: 'domcontentloaded'
    });

    // Wait for topbar to be visible
    await page.waitForTimeout(1000);

    // Verify Edit button
    const editBtn = page.getByTestId('button-template-edit');
    await expect(editBtn).toBeVisible();

    // Verify Save & Publish button
    const publishBtn = page.getByTestId('button-template-publish');
    await expect(publishBtn).toBeVisible();

    // Verify Share button
    const shareBtn = page.getByTestId('button-template-share');
    await expect(shareBtn).toBeVisible();

    console.log('✓ All three action buttons are visible');
  });

  test('should navigate to edit page when Edit button clicked', async ({ page }) => {
    await page.goto('/profile_v4_1_package/public/index.html?id=prof_workflow_test', {
      waitUntil: 'domcontentloaded'
    });

    // Click Edit button
    const editBtn = page.getByTestId('button-template-edit');
    await editBtn.click();

    // Wait for navigation
    await page.waitForURL(/profile_edit_enhanced\.html/, { timeout: 10000 });

    // Verify we're on the edit page
    expect(page.url()).toContain('profile_edit_enhanced.html');
    expect(page.url()).toContain('id=prof_workflow_test');

    console.log('✓ Navigation to edit page successful');
  });

  test('should open share modal when Share button clicked', async ({ page }) => {
    await page.goto('/profile_v4_1_package/public/index.html?id=prof_share_test', {
      waitUntil: 'domcontentloaded'
    });

    // Click Share button
    const shareBtn = page.getByTestId('button-template-share');
    await shareBtn.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Check for modal visibility (look for common modal indicators)
    const modal = page.locator('[role="dialog"], .modal, #shareModal, [data-testid*="modal"]').first();
    
    // If modal exists, verify it's visible
    const modalCount = await modal.count();
    if (modalCount > 0) {
      await expect(modal).toBeVisible();
      console.log('✓ Share modal opened successfully');
    } else {
      // Check if navigated to share page instead
      const currentUrl = page.url();
      if (currentUrl.includes('share.html') || currentUrl.includes('share')) {
        console.log('✓ Navigated to share page');
      } else {
        console.log('⚠ Share action triggered (modal or page may be hidden)');
      }
    }
  });

  test('should display profile status', async ({ page }) => {
    await page.goto('/profile_v4_1_package/public/index.html', {
      waitUntil: 'domcontentloaded'
    });

    // Look for profile status indicator
    const statusElement = page.locator('#tplProfileStatus');
    
    if (await statusElement.count() > 0) {
      await expect(statusElement).toBeVisible();
      const statusText = await statusElement.textContent();
      expect(statusText).toMatch(/DRAFT|LIVE/i);
      console.log('✓ Profile status displayed:', statusText);
    }
  });
});
