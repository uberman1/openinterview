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
    if (!data || !data.weekly) {
      friendlyEmpty(slotWrap, "No available time slots.");
      return;
    }

    // Extract slots from weekly schedule (matching original logic)
    const slots = [];
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(day => {
      const times = data.weekly[day] || [];
      times.forEach(time => {
        const label = document.createElement("label");
        label.className = "cursor-pointer";
        label.innerHTML = `<input class="sr-only peer" name="time" type="radio" value="${time}"/><span class="block text-sm font-medium rounded-lg px-4 py-2 border border-subtle-light dark:border-subtle-dark peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary">${time}</span>`;
        slots.push(label);
      });
    });

    slotWrap.innerHTML = '';
    
    // Show up to 8 slots (matching original)
    slots.slice(0, 8).forEach(slot => slotWrap.appendChild(slot));
    
    if (!slots.length) {
      slotWrap.innerHTML = '<span class="text-sm text-muted-light dark:text-muted-dark">No slots available</span>';
    }
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

    if (!profile) {
      console.warn("[public_profile.safe] No profile data available");
      return;
    }

    // Populate all DOM elements (matching original inline script behavior)
    const setText = (sel, val) => { const el = qs(sel); if (el) el.textContent = val || ''; };
    const setHTML = (sel, val) => { const el = qs(sel); if (el) el.innerHTML = val || ''; };
    
    // Hero section
    setText('#heroName', profile.name || handle);
    setText('#heroTitle', profile.title || '');
    
    // Sidebar section
    setText('#sideName', profile.name || handle);
    setText('#sideTitle', profile.title || '');
    setText('#sideCity', profile.city || '');
    setText('#sideAbout', profile.about || '');
    
    // CV/Resume section
    setText('#cvName', profile.name || handle);
    setText('#cvTitle', profile.title || '');
    setHTML('#cvMeta', profile.city ? `<p>${profile.city}</p>` : '');
    setText('#aboutText', profile.about || '');
    
    // Avatar
    if (profile.avatar) {
      const avatarEl = qs('#avatar');
      if (avatarEl) avatarEl.src = profile.avatar;
    }
    
    // Video/Hero background (YouTube thumbnail extraction)
    if (profile.video) {
      const ytId = extractYouTubeId(profile.video);
      if (ytId) {
        const heroBg = qs('#heroBg');
        if (heroBg) {
          heroBg.style.backgroundImage = `url("https://img.youtube.com/vi/${ytId}/maxresdefault.jpg")`;
        }
      }
    }
    
    // Attachments and links
    renderAttachments(profile);
    renderHighlights(profile);

    await initCalendar(profile);
  }
  
  function extractYouTubeId(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch { }
    return null;
  }
  
  function renderAttachments(profile) {
    const wrap = qs('#attachmentsList');
    if (!wrap) return;
    
    wrap.innerHTML = '';
    
    const createLink = (label, href, isDownload) => {
      const a = document.createElement('a');
      a.className = 'flex items-center justify-between p-4 bg-background-light dark:bg-subtle-dark rounded-lg border border-subtle-light dark:border-subtle-dark hover:bg-subtle-light dark:hover:bg-primary/50 transition-colors';
      a.href = href || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      const icon = isDownload ? 
        '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>' :
        '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>';
      a.innerHTML = `<span class="font-medium">${label}</span>${icon}`;
      return a;
    };
    
    if (profile.resume) {
      wrap.appendChild(createLink(profile.resume.name || 'Resume', profile.resume.url, true));
    }
    
    (profile.links || []).forEach(l => {
      wrap.appendChild(createLink(l.label || l.href, l.href, false));
    });
    
    (profile.attachments || []).forEach(f => {
      wrap.appendChild(createLink(f.name, f.url, false));
    });
    
    if (!wrap.children.length) {
      wrap.innerHTML = '<div class="text-muted-light dark:text-muted-dark">No attachments</div>';
    }
  }
  
  function renderHighlights(profile) {
    const list = qs('#highlightsList');
    if (!list) return;
    
    list.innerHTML = '';
    
    (profile.highlights || []).forEach(text => {
      const li = document.createElement('li');
      li.className = 'flex items-start';
      li.innerHTML = '<span class="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 mr-4 shrink-0"></span><p class="text-muted-light dark:text-muted-dark">' + text + '</p>';
      list.appendChild(li);
    });
    
    if (!list.children.length) {
      list.innerHTML = '<li class="text-muted-light dark:text-muted-dark">No highlights</li>';
    }
  }

  onReady(() => {
    applyLayout();
    initProfile().catch((e) => console.warn("[public_profile.safe] init error:", e));
  });
})();
