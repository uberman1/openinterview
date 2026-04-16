import { test } from '@playwright/test';
import { goHome, runCreateNew, assertViewPage } from './utils';

test('Create New routes to view-first profile', async ({ page }) => {
  await goHome(page);
  await runCreateNew(page);
  await assertViewPage(page);
});
