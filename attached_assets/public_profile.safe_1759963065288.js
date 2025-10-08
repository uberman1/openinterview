/* public_profile.safe.js — consolidated, non-destructive binder & guards (v1.0)
   - Additive classes only (no className replacement)
   - No body overflow locking
   - Error-guarded API calls; non-fatal fallbacks
*/

(function () {
  // ------------ Utilities ------------
  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  };

  const addClass = (el, ...classes) => {
    if (!el) return;
    classes.forEach(c => c && el.classList && el.classList.add(c));
  };

  const has = (el, cls) => !!(el && el.classList && el.classList.contains(cls));

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  // Global guard against unhandled promise rejections
  window.addEventListener("unhandledrejection", (ev) => {
    console.warn("[public_profile.safe] Suppressed unhandled rejection:", ev.reason);
    ev.preventDefault();
  });

  // ------------ API helpers (non-fatal) ------------
  async function apiJSON(url, opts = {}) {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status} on ${url}`);
      }
      return await r.json();
    } catch (err) {
      console.warn("[public_profile.safe] API error:", err.message || err);
      return null; // non-fatal
    }
  }

  function friendlyEmpty(el, msg) {
    if (!el) return;
    const p = document.createElement("div");
    p.setAttribute("data-safe-empty", "true");
    p.className = "text-sm text-gray-500";
    p.textContent = msg;
    el.appendChild(p);
  }

  // ------------ Layout / Scrolling (additive only) ------------
  function applyLayout() {
    // Hero: try by id/data-role first, then fallback to class selector
    const hero = qs('[data-role="hero"]') || qs("#hero") || qs("div.relative.aspect-video.w-full, .relative.aspect-video.w-full");
    if (hero) {
      // Prefer sticky hero with natural page scroll
      const heroWrapper = hero.closest(".sticky, [data-sticky]") || hero.parentElement;
      if (heroWrapper) {
        addClass(heroWrapper, "sticky", "top-12", "z-10");
      }
    }

    // Content/scroll area: ensure spacing under hero
    const content = qs('[data-role="content"]') || qs("#profile-content") || qs("#content") || hero?.parentElement?.nextElementSibling;
    if (content) {
      if (!has(content, "mt-12")) addClass(content, "mt-12");
      // Keep any existing spacing utilities, do not remove
    }

    // Ensure we don't globally lock scrolling
    try {
      if (document.body && document.body.style.overflow === "hidden") {
        document.body.style.overflow = ""; // unlock to natural scroll
      }
    } catch (_) {}
  }

  // ------------ Calendar (non-fatal) ------------
  async function initCalendar(profile) {
    const slotWrap = qs("#slotButtons") || qs('[data-role="availability"]');
    if (!slotWrap) return;

    if (!profile || !profile.userId) {
      friendlyEmpty(slotWrap, "No available time slots.");
      return;
    }

    const data = await apiJSON(`/api/availability?userId=${encodeURIComponent(profile.userId)}`);
    if (!data || !Array.isArray(data.slots) || data.slots.length === 0) {
      friendlyEmpty(slotWrap, "No available time slots.");
      return;
    }

    // Minimal rendering (avoid styling conflicts)
    data.slots.forEach((iso) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "px-3 py-2 rounded border text-sm";
      try {
        const d = new Date(iso);
        btn.textContent = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`;
      } catch { btn.textContent = iso; }
      slotWrap.appendChild(btn);
    });
  }

  // ------------ Profile bootstrap (non-fatal) ------------
  function extractHandleFromURL() {
    // Accept routes like /public/:handle or /profile/:handle or query ?handle=
    const u = new URL(window.location.href);
    const qp = u.searchParams.get("handle");
    if (qp) return qp;
    const parts = u.pathname.split("/").filter(Boolean);
    // find last token that isn't common route word
    const ignore = new Set(["public", "profile", "profiles"]);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!ignore.has(parts[i])) return parts[i];
    }
    return "testuser";
  }

  async function initProfile() {
    const handle = extractHandleFromURL();
    const profile = await apiJSON(`/api/public/profile/${encodeURIComponent(handle)}`);

    // Render minimal shell info if desired (non-fatal if null)
    const nameEl = qs("#profileName") || qs('[data-role="name"]');
    if (nameEl) {
      nameEl.textContent = profile?.name || handle;
    }

    await initCalendar(profile);
  }

  onReady(() => {
    applyLayout();
    initProfile().catch((e) => console.warn("[public_profile.safe] init error:", e));
  });
})();
