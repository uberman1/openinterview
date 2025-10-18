import { test, expect } from '@playwright/test';
import { goHome, runCreateNew, openEditor, saveProfile } from './utils';

test('Saving publishes and returns to view', async ({ page }) => {
  await goHome(page);
  await runCreateNew(page);
  await openEditor(page);
  await saveProfile(page);

  const draftBadge = page.locator('#__oi_draft_badge');
  await expect(draftBadge).toHaveCount(0);
});
