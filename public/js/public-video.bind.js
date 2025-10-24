// Public profile video player binder
// Handles HLS streaming with native fallback for Safari, MP4 fallback for others

export async function initPublicVideoBinder() {
  const el = document.getElementById('headerVideo');
  if (!el || !window.profile) return;

  const v = window.profile?.display?.video;
  if (!v || (!v.hlsUrl && !v.mp4Url)) return;

  // Check for HLS support
  const hasHls = v.hlsUrl && typeof window.Hls !== 'undefined';
  const supportsNativeHls = el.canPlayType && el.canPlayType('application/vnd.apple.mpegURL');

  // Strategy: Try HLS first (best quality), fall back to MP4
  if (hasHls && window.Hls.isSupported()) {
    // Use HLS.js for browsers that don't natively support HLS
    const hls = new window.Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90
    });
    hls.loadSource(v.hlsUrl);
    hls.attachMedia(el);
  } else if (supportsNativeHls && v.hlsUrl) {
    // Safari and iOS support HLS natively
    el.src = v.hlsUrl;
  } else if (v.mp4Url) {
    // Fallback to MP4 for maximum compatibility
    el.src = v.mp4Url;
  }

  // Set poster image based on mode
  if (v.posterMode === 'custom' && v.posterUrl) {
    el.setAttribute('poster', v.posterUrl);
  } else if (v.posterMode === 'auto' && v.posterUrl) {
    el.setAttribute('poster', v.posterUrl);
  }
  // If posterMode is 'default', don't set poster - let HTML template handle it
}

document.addEventListener('DOMContentLoaded', initPublicVideoBinder);
