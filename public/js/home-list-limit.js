// home-list-limit.js
// Limits each table section to 5 rows and injects a left-aligned "Show all" toggle link beneath the table.
// Supports both static content and dynamically loaded rows (e.g., attachments loaded after DOMContentLoaded)
// Handles both row additions and deletions to maintain correct toggle visibility
// Sections targeted by tbody IDs: upcoming-body, interviews-body, resumes-body, attachments-body

(function() {
  const MAX_ROWS = 5;
  const processedSections = new Set(); // Track which sections have been processed

  // Helper function to remove the limiter toggle
  function removeLimiter(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const tableCard = tbody.closest(".overflow-hidden.rounded.border");
    const insertAfter = tableCard || tbody.closest("table") || tbody;
    const existingLink = insertAfter.nextElementSibling;
    
    if (existingLink && existingLink.classList.contains("show-toggle-wrapper")) {
      existingLink.remove();
    }

    // Unhide all rows
    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.forEach(tr => tr.classList.remove("hidden"));

    // Clear processed state
    processedSections.delete(tbodyId);
  }

  function setupLimiter(tbodyId, linkLabel = "Show all", linkLabelLess = "Show less") {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    
    // If we have ≤ MAX rows, remove any existing limiter and return
    if (rows.length <= MAX_ROWS) {
      removeLimiter(tbodyId);
      processedSections.add(tbodyId);
      return;
    }

    // Remove any existing limiter link to avoid duplicates
    const tableCard = tbody.closest(".overflow-hidden.rounded.border");
    const insertAfter = tableCard || tbody.closest("table") || tbody;
    const existingLink = insertAfter.nextElementSibling;
    if (existingLink && existingLink.classList.contains("show-toggle-wrapper")) {
      existingLink.remove();
    }

    // Hide extra rows
    let expanded = false;
    rows.slice(MAX_ROWS).forEach(tr => tr.classList.add("hidden"));

    // Create link container
    const linkWrap = document.createElement("div");
    linkWrap.className = "mt-2 show-toggle-wrapper"; // Added class for identification

    const link = document.createElement("a");
    link.href = "#";
    link.textContent = linkLabel;
    link.setAttribute("aria-expanded", "false");
    link.setAttribute("data-testid", `toggle-${tbodyId}`);
    link.className = "inline-block ml-2 text-sm text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white";

    link.addEventListener("click", (e) => {
      e.preventDefault();
      expanded = !expanded;
      
      // Re-query rows in case they changed
      const currentRows = Array.from(tbody.querySelectorAll("tr"));
      
      if (expanded) {
        currentRows.slice(MAX_ROWS).forEach(tr => tr.classList.remove("hidden"));
        link.textContent = linkLabelLess;
        link.setAttribute("aria-expanded", "true");
      } else {
        currentRows.slice(MAX_ROWS).forEach(tr => tr.classList.add("hidden"));
        link.textContent = linkLabel;
        link.setAttribute("aria-expanded", "false");
        
        // Smooth scroll back to table top
        const top = (tableCard || tbody.closest("table")).getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top, behavior: "smooth" });
      }
    });

    linkWrap.appendChild(link);
    insertAfter.insertAdjacentElement("afterend", linkWrap);
    
    processedSections.add(tbodyId);
  }

  // Set up MutationObserver for dynamic content (handles both additions and deletions)
  function observeSection(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const observer = new MutationObserver((mutations) => {
      // Check if rows were added or removed
      const hasRowChanges = mutations.some(mutation => {
        const hasAdditions = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && node.tagName === 'TR'
        );
        const hasRemovals = Array.from(mutation.removedNodes).some(node => 
          node.nodeType === 1 && node.tagName === 'TR'
        );
        return hasAdditions || hasRemovals;
      });

      if (hasRowChanges) {
        const rowCount = tbody.querySelectorAll("tr").length;
        
        if (rowCount > MAX_ROWS) {
          // Need limiter
          setupLimiter(tbodyId);
        } else if (rowCount <= MAX_ROWS) {
          // Remove limiter if present
          removeLimiter(tbodyId);
        }
      }
    });

    observer.observe(tbody, {
      childList: true,
      subtree: false
    });
  }

  // Initialize on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    // Static sections - set up immediately
    ["upcoming-body", "interviews-body", "resumes-body"].forEach(id => {
      setupLimiter(id);
    });

    // Dynamic sections - set up observer and check current state
    ["attachments-body"].forEach(id => {
      setupLimiter(id); // Try immediately in case content is already there
      observeSection(id); // Watch for future additions AND deletions
    });
  });
})();
