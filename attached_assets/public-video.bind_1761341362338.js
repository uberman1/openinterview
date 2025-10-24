// patches/files/js/public-video.bind.js
// Lightweight public video binder; expects a global profile object.
export async function initPublicVideoBinder() {
  const el = document.getElementById('headerVideo');
  if (!el || !window.profile) return;

  const v = window.profile.video;
  if (!v) return;

  // set sources
  if (v.hlsUrl && window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls();
    hls.loadSource(v.hlsUrl);
    hls.attachMedia(el);
  } else if (v.hlsUrl && el.canPlayType && el.canPlayType('application/vnd.apple.mpegURL')) {
    el.src = v.hlsUrl;
  } else if (v.mp4Url) {
    el.src = v.mp4Url;
  }

  // poster selection
  if ((v.posterMode === 'custom' || v.posterMode === 'auto') && v.posterUrl) {
    el.setAttribute('poster', v.posterUrl);
  }
}

document.addEventListener('DOMContentLoaded', initPublicVideoBinder);
