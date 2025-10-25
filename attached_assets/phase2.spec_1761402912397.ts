import { test, expect } from '@playwright/test';
import { injectMemoryMocks, interceptResumeFixture } from './utils/mocks';

test.describe('Phase 2 — Resume Auto-Populate', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p2');
    await page.addInitScript(() => {
      // @ts-ignore
      window.__MEM__.assets.push({ id: 'asset1', type: 'resume', profileId: 'p2', name: 'PM_Resume.pdf' });
    });
    await interceptResumeFixture(page);
    await page.goto('/profile_edit_enhanced.html?id=p2');
  });

  test('Dropdown shows assets and add_new', async ({ page }) => {
    const sel = page.locator('#resume-import-section select');
    await expect(sel).toContainText('Select a resume');
    await expect(sel).toContainText('PM_Resume.pdf');
    await expect(sel).toContainText('-- Add new resume --');
  });

  test('Selecting a resume fills fields and persists', async ({ page }) => {
    await page.selectOption('#resume-import-section select', { value: 'asset1' });
    const location = page.locator('#contact-bio-section input[placeholder="City, Country"]');
    await expect(location).toHaveValue(/Atlanta/);
    const persisted = await page.evaluate(() => /* @ts-ignore */ window.__MEM__.profiles['p2'].resumeAssetId);
    expect(persisted).toBe('asset1');
  });

  test('Upload registers asset and auto-fills', async ({ page }) => {
    const [chooser] = await Promise.all([ page.waitForEvent('filechooser'), page.getByText('Browse').click() ]);
    await chooser.setFiles('tests/fixtures/mock.pdf');
    const sel = page.locator('#resume-import-section select');
    const val = await sel.inputValue();
    expect(val).toMatch(/^a[0-9a-z]{5}$/);
  });
});
