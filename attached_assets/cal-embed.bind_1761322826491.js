// /js/cal-embed.bind.js
// Cal.com embed binder for OpenInterview (one profile per page)
//
// Looks for a cal link in priority order:
// 1) #bookingCard[data-cal-link]
// 2) window.__profile?.cal?.calLink
//
// Modes:
// - Inline (default) renders into #calEmbedContainer
// - Popup (opt-in) when #bookingCard[data-cal-mode="popup"] and a .book-btn exists
//
// Fallback:
// - Shows #bookingFallback if no link or embed fails
//
// Native UI:
// - If inline Cal renders, hides #native-booking if present

(function initCalEmbed() {
  const card = document.getElementById("bookingCard");
  const mountSelector = "#calEmbedContainer";
  const fallbackEl = document.getElementById("bookingFallback");
  const nativeBlock = document.getElementById("native-booking");

  // Resolve link from DOM or window.__profile
  const linkFromDom = card?.dataset?.calLink?.trim();
  const linkFromProfile = (window.__profile && window.__profile.cal && window.__profile.cal.calLink) || null;
  const calLink = linkFromDom || linkFromProfile || null;

  // Optional mode (inline|popup), default inline
  const mode = (card?.dataset?.calMode || "inline").toLowerCase();

  function showFallback(reason) {
    if (fallbackEl) fallbackEl.classList.remove("hidden");
    if (window.console && reason) console.warn("[cal-embed] fallback:", reason);
  }

  function hideNativeBooking() {
    if (nativeBlock) nativeBlock.style.display = "none";
  }

  function canUseCal() {
    return typeof window.Cal === "function";
  }

  function renderInline() {
    const mount = document.querySelector(mountSelector);
    if (!mount) return showFallback("Missing mount container");
    try {
      Cal("inline", {
        elementOrSelector: mountSelector,
        calLink,
        layout: "month_view" // alt: "week_view", "column_view"
      });
      hideNativeBooking();
      if (fallbackEl) fallbackEl.classList.add("hidden");
      return true;
    } catch (e) {
      console.error("[cal-embed] inline error:", e);
      showFallback("Render error");
      return false;
    }
  }

  function wirePopup() {
    const btn = card?.querySelector(".book-btn") || document.querySelector(".book-btn");
    if (!btn) return showFallback("No .book-btn for popup mode");
    btn.addEventListener("click", () => {
      try {
        Cal("popup", { calLink });
      } catch (e) {
        console.error("[cal-embed] popup error:", e);
        showFallback("Popup error");
      }
    });
    // In popup we keep native UI hidden if the design expects only popup
    hideNativeBooking();
    if (fallbackEl) fallbackEl.classList.add("hidden");
  }

  function start() {
    if (!card) return; // no booking card on this page
    if (!calLink) return showFallback("No calLink provided");

    if (!canUseCal()) {
      // Retry after window load (embed.js is async)
      window.addEventListener("load", () => {
        if (!canUseCal()) return showFallback("Cal embed not available");
        mode === "popup" ? wirePopup() : renderInline();
      });
      return;
    }

    mode === "popup" ? wirePopup() : renderInline();
  }

  try {
    start();
  } catch (e) {
    console.error("[cal-embed] init error:", e);
    showFallback("Init error");
  }
})();
