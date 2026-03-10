import { expect, Page } from '@playwright/test';

export async function goHome(page: Page){
  await page.goto('/home.html').catch(async ()=>{ await page.goto('/index.html'); });
}

export async function runCreateNew(page: Page){
  const buttons = page.locator('text=/create new|add new|new interview/i');
  if (await buttons.count()) { await buttons.first().click(); return; }
  const hasAPI = await page.evaluate(() => typeof (window as any).startNewProfileFlow === 'function');
  if (hasAPI){ await page.evaluate(() => (window as any).startNewProfileFlow()); return; }
  const id = await page.evaluate(() => {
    const w:any = window;
    if (w.store?.createDraftProfile){ return w.store.createDraftProfile().id; }
    return 'prof_test_' + Math.random().toString(36).slice(2,8);
  });
  await page.goto(`/profile/${encodeURIComponent(id as string)}`);
}

export async function assertViewPage(page: Page){
  await expect(page).not.toHaveURL(/profile_edit\\.html/);
  await expect(page.locator('#resumeCanvas')).toBeVisible();
  await expect(page.locator('#bookingCard')).toBeVisible();
}

export async function openEditor(page: Page){
  const edit = page.locator('text=Edit Profile');
  if (await edit.count() === 0){
    const url = new URL(page.url());
    const id = url.pathname.split('/').filter(Boolean)[1] || url.searchParams.get('profileId') || url.searchParams.get('id');
    await page.goto(`/profile_edit.html?id=${id}`);
  } else {
    await edit.first().click();
  }
}

export async function saveProfile(page: Page){
  const name = page.locator('#inpName');
  const title = page.locator('#inpTitle');

  if (await name.count()) await name.fill('Test Candidate');
  if (await title.count()) await title.fill('QA Engineer');

  const save = page.locator('#btnSaveProfile');
  await expect(save).toBeVisible();
  await save.click();

  await expect(page).toHaveURL(/\\/profile\\/.+/);
}
