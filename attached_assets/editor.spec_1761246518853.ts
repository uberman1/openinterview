// tests/editor.spec.ts
import { test, expect } from '@playwright/test';

test('profile editor paints and exposes controls', async ({ page }) => {
  await page.goto('/profile_edit_enhanced.html?id=prof_demo_123&safe=1', { waitUntil: 'domcontentloaded' });
  const root = page.locator('#editor-root, [data-editor-root], main');
  await root.first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('#editor-root, [data-editor-root], main');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  }, { timeout: 15000 });
  const saveBtn = page.getByRole('button', { name: /save & return/i });
  await expect(saveBtn).toBeVisible();
  await expect(page).toHaveTitle(/profile/i);
});
