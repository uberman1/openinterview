// public/js/analytics.track.js
// WP13: Real Analytics - Track Profile Views

(async function initAnalyticsTracker() {
  // Only track on public profile pages
  const path = window.location.pathname;
  if (!path.startsWith('/u/')) return;
  
  const handle = path.split('/').pop();
  if (!handle) return;
  
  try {
    // Get profile ID from handle
    const profileResponse = await fetch(`/api/public/profile/${handle}`);
    if (!profileResponse.ok) return;
    
    const profile = await profileResponse.json();
    if (!profile.id) return;
    
    // Track the view
    await fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: profile.id })
    });
    
    console.log('[analytics] View tracked for profile:', profile.id);
  } catch (error) {
    // Silently fail - don't break the page
    console.debug('[analytics] Tracking failed:', error.message);
  }
})();
