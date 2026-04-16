/**
 * Help Center: loads data from pages.json only (no hardcoded article body).
 * In-page search + Ask AI (streams from POST /api/help/ai).
 */
import { initHelpAiChat } from '/js/help-ai-chat.js';

const PATH_TO_SLUG = {
  '/docs/help/dashboard': 'dashboard',
  '/docs/help/create-first-openinterview': 'create-first-openinterview',
  '/docs/help/edit-profile': 'edit-profile',
  '/docs/help/share-profile': 'share-profile',
  '/docs/help/create-new-openinterview': 'create-new-openinterview'
};

/** @type {HTMLElement[]} */
let helpSearchMatches = [];
let helpSearchMatchIndex = 0;

/** Loaded from /js/help-center/screenshot-map.json — maps `pageSlug/sectionId` → image filenames */
let screenshotMapData = { baseUrl: '/assets_crousel/helping_docs/screenshots/', bySection: {} };

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSectionBody(text) {
  const t = escapeHtml(text);
  return `<div class="max-w-none text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">${t.replace(/\n/g, '<br/>')}</div>`;
}

async function loadData() {
  const res = await fetch('/js/help-center/pages.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load help content');
  return res.json();
}

async function loadScreenshotMap() {
  try {
    const res = await fetch('/js/help-center/screenshot-map.json', { cache: 'no-store' });
    if (res.ok) screenshotMapData = await res.json();
  } catch {
    /* keep defaults */
  }
}

function filenameToAlt(fn) {
  return String(fn)
    .replace(/\.(png|jpe?g|webp|gif)$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

function renderScreenshotsBlock(pageSlug, sectionId) {
  const key = `${pageSlug}/${sectionId}`;
  const list = screenshotMapData.bySection?.[key];
  if (!Array.isArray(list) || !list.length) return '';
  const base = (screenshotMapData.baseUrl || '/assets_crousel/helping_docs/screenshots/').replace(/\/?$/, '/');
  const figures = list
    .map((fn) => {
      const name = String(fn).trim();
      if (!name) return '';
      const src = base + encodeURIComponent(name);
      const alt = filenameToAlt(name);
      return `<figure class="help-doc-shot overflow-hidden rounded-md border border-neutral-300/80 bg-white dark:border-neutral-700 dark:bg-neutral-900">
      <img src="${src}" alt="${escapeHtml(alt)}" class="help-doc-shot-img w-full object-contain" loading="lazy" decoding="async" />
    </figure>`;
    })
    .filter(Boolean)
    .join('');
  if (!figures) return '';
  return `<div class="help-doc-shots mt-4 space-y-4" aria-label="Screenshots">${figures}</div>`;
}

function renderSection(pageSlug, s) {
  const body = renderSectionBody(s.text);
  const shots = renderScreenshotsBlock(pageSlug, s.id);
  return `<section id="${escapeHtml(s.id)}" class="help-doc-section mb-10 scroll-mt-24 border-b border-neutral-100 pb-10 last:mb-0 last:border-0 last:pb-0 dark:border-neutral-800/80">
      <h2 class="mb-3 text-lg font-bold text-primary dark:text-white">${escapeHtml(s.title)}</h2>
      ${body}
      ${shots}
    </section>`;
}

function renderMain(page, pageSlug) {
  const el = document.getElementById('help-main');
  document.title = `${page.title} — Help — OpenInterview`;
  const sectionsHtml = page.sections.map((s) => renderSection(pageSlug, s)).join('');
  el.innerHTML = `<h1 class="mb-8 text-2xl font-black tracking-tight text-primary dark:text-white md:text-3xl">${escapeHtml(page.title)}</h1>${sectionsHtml}`;
}

function currentSlug() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return PATH_TO_SLUG[path] || null;
}

function renderNav(pages, activeSlug) {
  const el = document.getElementById('help-nav');
  el.innerHTML = pages
    .map((p) => {
      const slug = PATH_TO_SLUG[p.slug];
      const active = slug === activeSlug;
      return `<a href="${p.slug}" class="block rounded-md px-2 py-1.5 ${active ? 'bg-neutral-100 font-semibold dark:bg-neutral-800' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'}">${escapeHtml(p.title)}</a>`;
    })
    .join('');
}

function renderToc(sections) {
  const el = document.getElementById('help-toc');
  if (!sections.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML =
    '<p class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">On this page</p><ul class="space-y-1">' +
    sections
      .map(
        (s) =>
          `<li><a href="#${escapeHtml(s.id)}" class="text-neutral-600 hover:text-primary dark:text-neutral-400 dark:hover:text-white">${escapeHtml(s.title)}</a></li>`
      )
      .join('') +
    '</ul>';
}

function clearHelpSearchHighlights() {
  document.querySelectorAll('#help-main section.help-search-hit').forEach((sec) => sec.classList.remove('help-search-hit'));
}

function updateSearchNavButtons() {
  const prev = document.getElementById('help-search-prev');
  const next = document.getElementById('help-search-next');
  const n = helpSearchMatches.length;
  const disabled = n <= 1;
  if (prev) {
    prev.disabled = disabled;
    prev.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }
  if (next) {
    next.disabled = disabled;
    next.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }
}

function setSearchHint(text) {
  const hint = document.getElementById('help-search-hint');
  if (!hint) return;
  if (!text) {
    hint.classList.add('hidden');
    hint.textContent = '';
    return;
  }
  hint.textContent = text;
  hint.classList.remove('hidden');
}

function scrollToSearchMatch(i) {
  if (!helpSearchMatches.length) return;
  const idx = ((i % helpSearchMatches.length) + helpSearchMatches.length) % helpSearchMatches.length;
  helpSearchMatchIndex = idx;
  clearHelpSearchHighlights();
  const sec = helpSearchMatches[idx];
  sec.classList.add('help-search-hit');
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const total = helpSearchMatches.length;
  setSearchHint(total > 1 ? `Match ${idx + 1} of ${total}` : '1 match on this page');
  updateSearchNavButtons();
}

function runHelpSearch(rawQuery) {
  clearHelpSearchHighlights();
  helpSearchMatches = [];
  helpSearchMatchIndex = 0;
  updateSearchNavButtons();

  const q = String(rawQuery || '').trim();
  if (!q) {
    setSearchHint('');
    return;
  }
  const low = q.toLowerCase();
  const sections = document.querySelectorAll('#help-main section');
  sections.forEach((sec) => {
    if (sec.textContent.toLowerCase().includes(low)) {
      helpSearchMatches.push(sec);
    }
  });

  if (!helpSearchMatches.length) {
    setSearchHint('No matches on this page.');
    return;
  }
  scrollToSearchMatch(0);
}

function goHelpSearchMatch(delta) {
  if (!helpSearchMatches.length) return;
  scrollToSearchMatch(helpSearchMatchIndex + delta);
}

function setupHelpSearch() {
  const input = document.getElementById('help-search-input');
  const prev = document.getElementById('help-search-prev');
  const next = document.getElementById('help-search-next');
  if (!input) return;
  let debounceId = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => runHelpSearch(input.value), 400);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.clearTimeout(debounceId);
      runHelpSearch(input.value);
      return;
    }
    if (helpSearchMatches.length > 1 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      goHelpSearchMatch(e.key === 'ArrowDown' ? 1 : -1);
    }
  });
  prev?.addEventListener('click', () => goHelpSearchMatch(-1));
  next?.addEventListener('click', () => goHelpSearchMatch(1));
}

function setupHelpUi() {
  setupHelpSearch();
  initHelpAiChat({ idPrefix: '', placement: 'center' });
}

async function init() {
  const slug = currentSlug();
  await loadScreenshotMap();
  const data = await loadData();
  const pages = data.pages || [];
  if (!slug || !pages.some((p) => PATH_TO_SLUG[p.slug] === slug)) {
    document.getElementById('help-main').innerHTML =
      '<p class="text-neutral-600 dark:text-neutral-400">This help page was not found.</p>';
    renderNav(pages, null);
    document.getElementById('help-toc').innerHTML = '';
    return;
  }
  const page = pages.find((p) => PATH_TO_SLUG[p.slug] === slug);
  renderNav(pages, slug);
  renderMain(page, slug);
  renderToc(page.sections);
}

setupHelpUi();
init().catch((e) => {
  console.error(e);
  document.getElementById('help-main').innerHTML =
    '<p class="text-red-600">Help content could not be loaded.</p>';
});
