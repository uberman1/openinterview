// tests/editor-dev.spec.ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = route.request().url();
    const local = url.startsWith('http://localhost:5000/') || url.startsWith('http://127.0.0.1:5000/') || url.startsWith('data:');
    if (!local) return route.abort();
    return route.continue();
  });
});

test('Dev editor: paints, basic controls respond', async ({ page }) => {
  await page.goto('/dev/profile_edit_dev.html?safe=1', { waitUntil: 'domcontentloaded' });

  const root = page.locator('#editor-root');
  await root.waitFor({ state: 'visible', timeout: 15000 });

  await page.waitForFunction(() => {
    const el = document.querySelector('#editor-root');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  }, { timeout: 15000 });

  await expect(page.getByRole('button', { name: /save & return/i })).toBeVisible();
  await page.getByRole('button', { name: /share/i }).click();
});
