// patches/files/js/profile-editor.video-thumb.bind.js
import { uploadVideoToCloudinary, uploadImageToCloudinary } from './uploader.js';

function getProfile() {
  return window.oi && window.oi.getProfile ? window.oi.getProfile() : (window.getProfile && window.getProfile()) ;
}
function updateProfile(next) {
  return window.oi && window.oi.updateProfile ? window.oi.updateProfile(next) : (window.updateProfile && window.updateProfile(next));
}

export function initVideoThumbBindings() {
  const videoInput = document.getElementById('btnUploadVideo');
  const thumbInput = document.getElementById('btnUploadThumb');
  if (!videoInput && !thumbInput) return;

  videoInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const profile = getProfile();
    try {
      const vAsset = await uploadVideoToCloudinary(file, profile.id);
      const next = {
        ...profile,
        video: {
          ...(profile.video || { posterMode: 'default', posterUrl: null }),
          ...vAsset,
          ...(profile.video?.posterMode === 'custom'
            ? { posterMode: 'custom', posterUrl: profile.video.posterUrl }
            : { posterMode: 'auto',   posterUrl: vAsset.posterUrl })
        }
      };
      updateProfile(next);
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = '';
    }
  });

  thumbInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const profile = getProfile();
    try {
      const thumb = await uploadImageToCloudinary(file, profile.id);
      const next = {
        ...profile,
        video: {
          ...(profile.video || { posterMode: 'default', posterUrl: null }),
          posterMode: 'custom',
          posterUrl: thumb.posterUrl
        }
      };
      updateProfile(next);
    } catch (err) {
      console.error(err);
    } finally {
      e.target.value = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', initVideoThumbBindings);
