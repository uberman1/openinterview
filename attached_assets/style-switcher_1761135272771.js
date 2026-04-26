
// public/js/style-switcher.js
(function () {
  try {
    const url = new URL(window.location.href);
    const isTest =
      url.searchParams.get("test") === "1" ||
      (typeof window !== "undefined" && window.__TEST__ === true) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("__TEST__") === "1");

    if (!isTest) return;

    const selectors = [
      'script[src*="cdn.tailwindcss.com"]',
      'link[href*="fonts.googleapis"]',
      'link[href*="fonts.gstatic"]',
      'link[rel="preconnect"][href*="fonts.gstatic"]',
      'link[rel="preconnect"][href*="fonts.googleapis"]'
    ];
    document.querySelectorAll(selectors.join(",")).forEach(n => n.remove());

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/app.min.css";
    link.setAttribute("data-test-style", "true");
    document.head.appendChild(link);

    const ensureVisible = () => {
      document.documentElement.style.visibility = "visible";
      document.body.style.visibility = "visible";
      document.body.style.opacity = "1";
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureVisible);
    } else {
      ensureVisible();
    }
  } catch (e) {
    console.error("[style-switcher] failed:", e);
  }
})();
