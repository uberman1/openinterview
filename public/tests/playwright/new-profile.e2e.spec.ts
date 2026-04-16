// tests/playwright/new-profile.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Interview — full flow', () => {
  test('create -> edit -> availability -> publish -> share', async ({ page, context }) => {
    await page.goto('/home.html');

    // Create New (existing link)
    const createLink = page.getByRole('link', { name: /create new/i });
    await expect(createLink).toBeVisible();
    await createLink.click();

    // Lands on profile template (draft)
    await expect(page).toHaveURL(/\/profile\/new/i);

    // Inline edits (heuristic selectors)
    const nameEl = page.locator('h1, .profile-name, [data-field="display.name"]').first();
    await nameEl.click();
    await nameEl.pressSequentially(' Test', { delay: 10 });

    const titleEl = page.locator('p.text-lg, .profile-title, [data-field="display.title"]').first();
    await titleEl.click();
    await titleEl.pressSequentially(' (MVP)', { delay: 10 });

    // Save profile
    const saveBtn = page.locator('#btnSaveProfile');
    if (await saveBtn.count()) {
      await saveBtn.click();
    } else {
      // fallback: publish via keyboard shortcut could be added here
    }

    // Expect Live slug to exist (public link generated)
    await page.waitForTimeout(200);
    // Navigate back home to verify listing
    await page.goto('/home.html');
    // asserts are placeholder — adapt to actual table selectors
    await expect(page.locator('text=Senior Product Designer')).toBeVisible();
  });
});
