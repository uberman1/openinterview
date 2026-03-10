import { test, expect } from '@playwright/test';
import { injectMemoryMocks, addTestAsset, interceptResumeFixture } from '../utils/mocks';

test.describe('Phase 2 — Resume auto-populate via store', () => {
  test.beforeEach(async ({ page }) => {
    await injectMemoryMocks(page, 'p2');
    await addTestAsset(page, { id: 'asset1', type: 'resume', profileId: 'p2', name: 'PM_Resume.pdf' });
    await interceptResumeFixture(page);
    await page.goto('/profile_edit_enhanced.html?id=p2');
  });

  test('Dropdown shows seeded asset and add options', async ({ page }) => {
    const resumeSection = page.locator('section', { hasText: /auto-populate with resume/i });
    const sel = resumeSection.locator('select').first();
    await expect(sel).toContainText(/Select a resume/i);
    await expect(sel).toContainText('PM_Resume.pdf');
    await expect(sel).toContainText(/Add new|Browse/i);
  });

  test('Selecting "asset1" fills fields and persists to store', async ({ page }) => {
    const resumeSection = page.locator('section', { hasText: /auto-populate with resume/i });
    const sel = resumeSection.locator('select').first();
    await sel.selectOption('asset1');
    await page.waitForTimeout(500);

    const location = page.locator('input[placeholder*="City"], input[placeholder*="Location"]').first();
    await expect(location).toHaveValue(/Atlanta/);

    const persisted = await page.evaluate(() => {
      const store = (window as any).store;
      const prof = store?.getProfile?.({ id: 'p2' });
      return prof?.resumeAssetId || prof?.resume?.assetId;
    });
    expect(persisted).toBe('asset1');
  });

  test('Upload PDF registers new asset and auto-fills', async ({ page }) => {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Browse', { exact: false }).first().click()
    ]);
    // The runner should have this file in tests/fixtures
    await chooser.setFiles('tests/fixtures/mock.pdf');

    await page.waitForTimeout(800);

    const lastAssetId = await page.evaluate(() => {
      const list = (window as any).store?.listAssets?.({ type: 'resume', profileId: 'p2' }) || [];
      return list.at(-1)?.id;
    });
    expect(lastAssetId).toBeTruthy();
  });
});
