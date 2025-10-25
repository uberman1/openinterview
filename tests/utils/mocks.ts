import { Page } from '@playwright/test';

/**
 * Initialize a draft profile in the real localStorage-backed store.
 * This assumes /public/js/data-store.js exposes window.store with methods.
 */
export async function injectMemoryMocks(page: Page, profileId: string) {
  await page.addInitScript(({ profileId }) => {
    const initProfile = () => {
      const w = window as any;
      // If store hasn't booted yet, try later.
      const ensure = () => {
        try {
          const store = w.store;
          if (!store) return false;
          const existing = store.getProfile?.({ id: profileId });
          if (existing) return true;
          // Create a draft and persist under the test ID
          const draft = store.createDraftProfile?.() || { id: crypto.randomUUID() };
          const idxKey = 'oi:profiles:index';
          const profKey = `oi:profiles:${profileId}`;
          // Persist a minimal profile object with the requested id
          const next = { ...draft, id: profileId };
          localStorage.setItem(profKey, JSON.stringify(next));
          const idx = JSON.parse(localStorage.getItem(idxKey) || '[]');
          if (!idx.includes(profileId)) {
            idx.unshift(profileId);
            localStorage.setItem(idxKey, JSON.stringify(idx));
          }
          return true;
        } catch { return false; }
      };
      if (!ensure()) {
        document.addEventListener('DOMContentLoaded', ensure, { once: true });
      }
    };
    initProfile();
  }, { profileId });
}

/** Prevent actual navigation on Save & Return; record target URL for assertions. */
export async function stubNavigation(page: Page) {
  await page.addInitScript(() => {
    (window as any).__NAV__ = { assignedTo: null };
    const orig = window.location.assign.bind(window.location);
    Object.defineProperty(window.location, 'assign', {
      value: (url: string) => { (window as any).__NAV__.assignedTo = String(url); },
      writable: false
    });
  });
}

/** Seed an asset into the localStorage asset index the way the app expects. */
export async function addTestAsset(page: Page, asset: {
  id: string; type: string; profileId: string; name: string;
}) {
  await page.evaluate((asset) => {
    const idxKey = 'oi:assets:index';
    const key = `oi:assets:${asset.id}`;
    const idx = JSON.parse(localStorage.getItem(idxKey) || '[]');
    if (!idx.includes(asset.id)) {
      idx.push(asset.id);
      localStorage.setItem(idxKey, JSON.stringify(idx));
    }
    localStorage.setItem(key, JSON.stringify(asset));
  }, asset);
}

/** Intercept the resume fixture and return a stable JSON for the mock GPT path. */
export async function interceptResumeFixture(page: Page) {
  await page.route('**/fixtures/resume_parse_fixture.json', async (route) => {
    const fixtureData = {
      contact: { location: "Atlanta, GA", phone: "+1 (404) 555-1212", email: "jane.sample@domain.com" },
      bioShort: "Senior Product Manager with 8+ years...",
      highlights: ["One", "Two", "Three", "Four", "Five"]
    };
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixtureData) });
  });
}
