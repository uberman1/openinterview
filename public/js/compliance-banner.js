/**
 * Plan downgrade / cancel compliance alerts (storage, video length).
 */
(function () {
  function formatPurgeDate(iso) {
    if (!iso) return 'your next billing reset';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'your next billing reset';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function buildBannerHtml(compliance) {
    const messages = compliance.messages || [];
    if (!messages.length) return '';

    const purgeLabel = formatPurgeDate(compliance.purgeAt);
    const body = messages.map((m) => `<p class="text-sm">${m}</p>`).join('');
    const planNote = compliance.targetPlanName
      ? `<p class="text-xs mt-2 opacity-80">Applies to your upcoming <strong>${compliance.targetPlanName}</strong> limits.</p>`
      : '';

    return `
      <div class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-100"
           role="alert" aria-live="polite">
        <div class="flex gap-3">
          <span class="material-symbols-outlined shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true">warning</span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm">Plan limit notice</p>
            ${body}
            ${planNote}
            <p class="text-xs mt-2 opacity-80">Removal date: <strong>${purgeLabel}</strong> — unless you update your files to fit your new limits before then.</p>
          </div>
        </div>
      </div>
    `;
  }

  function mountComplianceBanner(compliance, rootEl) {
    const root = rootEl || document.getElementById('plan-compliance-banner-root');
    if (!root) return;

    if (!compliance?.hasWarnings) {
      root.innerHTML = '';
      root.classList.add('hidden');
      return;
    }

    root.innerHTML = buildBannerHtml(compliance);
    root.classList.remove('hidden');
  }

  window.PlanComplianceBanner = { mount: mountComplianceBanner };
})();
