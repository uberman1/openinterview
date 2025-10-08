// public/js/public_profile.hero-shrink.bind.js
(function(){
  const CSS_ID = "oi-ui-scroll-hero-v1-style";

  function injectStyle() {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = [
      "/* OI-UI-Scroll-Hero-v1:START */",
      "html { scrollbar-gutter: stable both-edges; }",
      "#heroWrapper {",
      "  height: var(--hero-h);",
      "  transition: height 160ms linear;",
      "  contain: layout paint;",
      "}",
      "#heroWrapper > .absolute {",
      "  transform: scale(var(--hero-scale));",
      "  transform-origin: center center;",
      "  transition: transform 160ms linear;",
      "  will-change: transform;",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  #heroWrapper { transition: none; }",
      "  #heroWrapper > .absolute { transition: none; }",
      "}",
      "/* OI-UI-Scroll-Hero-v1:END */"
    ].join("\n");
    document.head.appendChild(style);
  }

  function q(selector, ctx){ return (ctx||document).querySelector(selector); }
  function qa(selector, ctx){ return Array.from((ctx||document).querySelectorAll(selector)); }

  function closestSectionWithHeaderText(text){
    const h2s = qa("h2");
    for (const h of h2s) {
      if ((h.textContent||"").trim().toLowerCase() === text.toLowerCase()) {
        const sec = h.closest("section");
        if (sec) return sec;
      }
    }
    return null;
  }

  function addHeroIdsAndSticky() {
    let hero = q("div.relative.aspect-video.w-full");
    if (!hero) return null;
    if (!hero.id) hero.id = "heroWrapper";
    hero.classList.add("lg:sticky","lg:top-0","lg:z-10");
    hero.style.setProperty("--hero-h","auto");
    hero.style.setProperty("--hero-scale","1");

    let overlay = q("#heroWrapper > .absolute.inset-0[class*='bg-black/30']") || q("#heroWrapper > .absolute.inset-0.flex");
    if (!overlay) {
      const candidates = qa("#heroWrapper > .absolute.inset-0");
      overlay = candidates.find(el => !el.className.includes("bg-cover"));
    }
    if (overlay && !overlay.id) overlay.id = "heroInner";
    return hero;
  }

  function buildBelowResumeScroll() {
    let wrapper = q("#below-resume-scroll");
    if (wrapper) return wrapper;

    const resumeSection = closestSectionWithHeaderText("Resume");
    if (!resumeSection) return null;

    wrapper = document.createElement("div");
    wrapper.id = "below-resume-scroll";
    wrapper.className = "space-y-6 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-2";
    resumeSection.parentNode.insertBefore(wrapper, resumeSection.nextSibling);

    const spans = qa("span", resumeSection);
    const hasPageSpan = spans.find(s => /Page\s+\d+\s+of\s+\d+/i.test((s.textContent||"").trim()));
    if (hasPageSpan) {
      const pg = hasPageSpan.closest("div");
      if (pg && pg.parentElement === resumeSection) {
        wrapper.appendChild(pg);
      }
    }
    return wrapper;
  }

  function setupScrollShrink(scroller, hero) {
    if (!hero) return;
    const targetRatio = 0.75;
    const threshold = 240;
    let baseHeight = 0;
    let ticking = false;

    const measure = () => {
      const rect = hero.getBoundingClientRect();
      baseHeight = rect.height || hero.offsetHeight || 0;
      hero.style.setProperty("--hero-h", baseHeight + "px");
      hero.style.setProperty("--hero-scale", "1");
    };

    const getScrollTop = () => {
      if (!scroller || scroller === window) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      return scroller.scrollTop || 0;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = getScrollTop();
        const p = Math.max(0, Math.min(1, y / threshold));
        const h = Math.round(baseHeight * (1 + (0.75 - 1) * p));
        const s = 1 + (0.75 - 1) * p;
        hero.style.setProperty("--hero-h", h + "px");
        hero.style.setProperty("--hero-scale", s.toFixed(3));
        ticking = false;
      });
    };

    window.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    (scroller || window).addEventListener("scroll", onScroll, { passive: true });
  }

  function init() {
    injectStyle();
    const hero = addHeroIdsAndSticky();
    const below = buildBelowResumeScroll();
    const scroller = below || window;
    setupScrollShrink(scroller, hero);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
