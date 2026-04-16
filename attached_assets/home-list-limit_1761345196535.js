// home-list-limit.js
// Limits each table section to 5 rows and injects a left-aligned "Show all" toggle link beneath the table.
// Sections targeted by tbody IDs: upcoming-body, interviews-body, resumes-body, attachments-body

function setupLimiter(tbodyId, linkLabel = "Show all", linkLabelLess = "Show less") {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const MAX = 5;

  if (rows.length <= MAX) return; // nothing to do

  // Hide extra rows
  let expanded = false;
  rows.slice(MAX).forEach(tr => tr.classList.add("hidden"));

  // Insert link container directly after the table card (rounded border container)
  const tableCard = tbody.closest(".overflow-hidden.rounded.border");
  // Fallback to the table element if needed
  const insertAfter = tableCard || tbody.closest("table") || tbody;
  const linkWrap = document.createElement("div");
  linkWrap.className = "mt-2"; // margin top

  const link = document.createElement("a");
  link.href = "#";
  link.textContent = linkLabel;
  link.setAttribute("aria-expanded", "false");
  // Tailwind: small text, brand color, left aligned, inline-block for spacing control
  link.className = "inline-block ml-2 text-sm text-primary/70 hover:text-primary dark:text-white/70 dark:hover:text-white";

  link.addEventListener("click", (e) => {
    e.preventDefault();
    expanded = !expanded;
    if (expanded) {
      rows.slice(MAX).forEach(tr => tr.classList.remove("hidden"));
      link.textContent = linkLabelLess;
      link.setAttribute("aria-expanded", "true");
    } else {
      rows.slice(MAX).forEach(tr => tr.classList.add("hidden"));
      link.textContent = linkLabel;
      link.setAttribute("aria-expanded", "false");
      // Smooth scroll back to the table top so users don't get "lost" after collapsing
      const top = (tableCard || tbody.closest("table")).getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top, behavior: "smooth" });
    }
  });

  linkWrap.appendChild(link);

  // Insert after the container so it appears visually under the table, left aligned
  insertAfter.insertAdjacentElement("afterend", linkWrap);
}

// Initialize for known sections. Extend easily by adding more IDs.
document.addEventListener("DOMContentLoaded", () => {
  ["upcoming-body", "interviews-body", "resumes-body", "attachments-body"].forEach(id => {
    setupLimiter(id);
  });
});
