import { Page } from '@playwright/test';
export async function injectMemoryMocks(page: Page, profileId: string) {
  await page.addInitScript(({ profileId }) => {
    // @ts-ignore
    window.__MEM__ = window.__MEM__ || { profiles: {}, assets: [] };
    // @ts-ignore
    window.__MEM__.profiles[profileId] = window.__MEM__.profiles[profileId] || {};
    // @ts-ignore
    window.getProfile = async (id) => (window.__MEM__.profiles[id] || {});
    // @ts-ignore
    window.updateProfile = async (id, next) => (window.__MEM__.profiles[id] = next);
    // @ts-ignore
    window.listAssets = async ({ type, profileId }) => window.__MEM__.assets.filter(a => a.type === type && a.profileId === profileId);
    // @ts-ignore
    window.createAsset = async ({ type, profileId, name }) => {
      const id = 'a' + Math.random().toString(36).slice(2,7);
      const a = { id, type, profileId, name };
      // @ts-ignore
      window.__MEM__.assets.push(a);
      return a;
    };
    // @ts-ignore
    window.env = { USE_MOCK_GPT: true };
  }, { profileId });
}
export async function stubNavigation(page: Page) {
  await page.addInitScript(() => {
    // @ts-ignore
    window.__NAV__ = { assignedTo: null };
    const orig = window.location.assign.bind(window.location);
    Object.defineProperty(window.location, 'assign', { value: (u)=>{ /* @ts-ignore */ window.__NAV__.assignedTo = String(u); }, writable: false });
  });
}
export async function interceptResumeFixture(page: Page) {
  await page.route('**/fixtures/resume_parse_fixture.json', async route => {
    try {
      const res = await page.request.fetch(route.request());
      if (res.ok()) return route.fulfill({ response: res });
    } catch {}
    const body = await (await fetch('/tests/fixtures/resume_parse_fixture.json')).text();
    return route.fulfill({ contentType: 'application/json', body });
  });
}
