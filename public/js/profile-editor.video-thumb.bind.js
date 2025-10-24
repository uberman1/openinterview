// Profile editor video and thumbnail upload binder
import { uploadVideoToCloudinary, uploadImageToCloudinary } from './uploader.js';
import { store } from './data-store.js';
import { toast } from './app.js';

export function initVideoThumbBindings() {
  const videoInput = document.getElementById('btnUploadVideo');
  const thumbInput = document.getElementById('btnUploadThumb');
  
  if (!videoInput && !thumbInput) return;

  // Get profile ID from URL
  function getProfileId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'unknown';
  }

  videoInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const profileId = getProfileId();
    const profile = store.getProfile({ id: profileId });
    if (!profile) {
      toast('Profile not found', 'error');
      return;
    }

    toast('Uploading video...', 'info');
    
    try {
      const vAsset = await uploadVideoToCloudinary(file, profileId);
      
      // Merge video data into profile, preserving custom poster if set
      const next = {
        ...profile,
        display: {
          ...profile.display,
          video: {
            ...(profile.display?.video || {}),
            ...vAsset,
            ...(profile.display?.video?.posterMode === 'custom'
              ? { posterMode: 'custom', posterUrl: profile.display.video.posterUrl }
              : { posterMode: 'auto', posterUrl: vAsset.posterUrl })
          }
        }
      };
      
      store.updateProfile(profileId, next);
      toast('Video uploaded successfully!', 'success');
      
      // Update video preview if it exists
      const videoPreview = document.querySelector('#video-section video');
      const videoPlaceholder = document.getElementById('videoPlaceholder');
      if (videoPreview && vAsset.mp4Url) {
        videoPreview.src = vAsset.mp4Url;
        videoPreview.poster = vAsset.posterUrl;
        videoPreview.load();
        videoPreview.classList.remove('hidden');
        if (videoPlaceholder) {
          videoPlaceholder.classList.add('hidden');
        }
      }
    } catch (err) {
      console.error('Video upload error:', err);
      toast('Failed to upload video', 'error');
    } finally {
      e.target.value = '';
    }
  });

  thumbInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const profileId = getProfileId();
    const profile = store.getProfile({ id: profileId });
    if (!profile) {
      toast('Profile not found', 'error');
      return;
    }

    toast('Uploading thumbnail...', 'info');
    
    try {
      const thumb = await uploadImageToCloudinary(file, profileId);
      
      const next = {
        ...profile,
        display: {
          ...profile.display,
          video: {
            ...(profile.display?.video || {}),
            posterMode: 'custom',
            posterUrl: thumb.posterUrl
          }
        }
      };
      
      store.updateProfile(profileId, next);
      toast('Thumbnail uploaded successfully!', 'success');
      
      // Update video poster if video element exists
      const videoPreview = document.querySelector('#video-section video');
      if (videoPreview) {
        videoPreview.poster = thumb.posterUrl;
      }
    } catch (err) {
      console.error('Thumbnail upload error:', err);
      toast('Failed to upload thumbnail', 'error');
    } finally {
      e.target.value = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', initVideoThumbBindings);
