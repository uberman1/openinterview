import { test, expect } from '@playwright/test';
import { goHome, runCreateNew, assertViewPage, openEditor } from './utils';

test('Owner can see Edit Profile and open editor', async ({ page }) => {
  await goHome(page);
  await runCreateNew(page);
  await assertViewPage(page);
  await openEditor(page);
  await expect(page).toHaveURL(/profile_edit\.html\?id=/);
});
