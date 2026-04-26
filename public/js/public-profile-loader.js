// Public Profile Loader - Fetches and displays real profile data
// This script loads profile data from /api/public/profile/:handle

(async function initPublicProfile() {
  console.log('[public-profile] Initializing...');
  
  // Extract handle from URL path (/u/handle)
  const handle = extractHandleFromURL();
  if (!handle) {
    console.error('[public-profile] No handle found in URL');
    showError('Invalid profile URL');
    return;
  }
  
  console.log('[public-profile] Loading profile for handle:', handle);
  
  try {
    // Fetch profile data from API
    const response = await fetch(`/api/public/profile/${handle}`, { credentials: 'include' });
    
    if (!response.ok) {
      if (response.status === 404) {
        showError('Profile not found');
      } else if (response.status === 401) {
        showUnauthorized();
      } else {
        showError('Failed to load profile');
      }
      return;
    }
    
    const profileData = await response.json();
    console.log('[public-profile] Profile data loaded:', profileData);
    
    // Render profile data to page
    await renderProfile(profileData);
    
  } catch (error) {
    console.error('[public-profile] Error loading profile:', error);
    showError('Failed to load profile');
  }
})();

function extractHandleFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/u\/([^\/]+)/);
  return match ? match[1] : null;
}

async function renderProfile(profile) {
  // Basic Info
  renderBasicInfo(profile);
  
  // Video
  renderVideo(profile);
  
  // Attachments
  await renderAttachments(profile);
  
  // Social Links
  renderSocialLinks(profile);
  
  // Highlights
  renderHighlights(profile);
  
  // Resume
  await renderResume(profile);
  
  // Sidebar Profile Card
  renderSidebarCard(profile);
  
  // Update page title
  const name = profile.person?.name || profile.profileName || 'Profile';
  document.title = `${name} - OpenInterview.me`;
}

function renderBasicInfo(profile) {
  const name = profile.person?.name || profile.profileName || 'Anonymous';
  const title = profile.title || 'No title provided';
  
  // Main header name and title
  const headerName = document.querySelector('[data-profile="header-name"]');
  const headerTitle = document.querySelector('[data-profile="header-title"]');
  
  if (headerName) headerName.textContent = name;
  if (headerTitle) headerTitle.textContent = title;
}

function renderVideo(profile) {
  const videoContainer = document.querySelector('[data-profile="video-container"]');
  if (!videoContainer) return;
  
  // Check for video URL (try both camelCase and snake_case) - use default if none uploaded
  let videoUrl = profile.videoUrl || profile.video_url || '/defaults/default-video.mp4';
  
  // WP01 Fix: Handle legacy default video URL stored in database
  if (videoUrl && videoUrl.includes('/uploads/default-video.mp4')) {
    videoUrl = '/defaults/default-video.mp4';
  }
  
  if (videoUrl) {
    console.log('[public-profile] Rendering video:', videoUrl);
    
    // WP01 Enhancement: Check if this is a default video
    const isDefaultVideo = videoUrl.includes('/defaults/default-video.mp4');
    const sampleVideoLabel = isDefaultVideo ? `
      <div class="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium z-10">
        Sample Video
      </div>
    ` : '';
    
    // Determine thumbnail URL
    const thumbnailUrl = profile.thumbnail_url || profile.thumbnailUrl || '/defaults/default-video-thumbnail.jpeg';

    // Replace with actual video player with centered play button
    videoContainer.innerHTML = `
      <div class="relative w-full h-full bg-black">
        ${sampleVideoLabel}
        <video 
          id="public-profile-video"
          class="absolute inset-0 w-full h-full object-contain" 
          preload="metadata"
          controlsList="nodownload"
          playsinline>
          <source src="${videoUrl}" type="video/mp4">
          <source src="${videoUrl}" type="video/webm">
          <source src="${videoUrl}" type="video/quicktime">
          Your browser does not support the video tag.
        </video>
        
        <!-- Custom Play Button Overlay with Thumbnail -->
        <div id="video-play-overlay-public" class="absolute inset-0 flex items-center justify-center bg-black cursor-pointer transition-opacity z-20">
          <img src="${thumbnailUrl}" class="absolute inset-0 w-full h-full object-cover opacity-90" alt="Video Thumbnail" />
          <div class="absolute inset-0 bg-black/20"></div>
          <div class="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all z-30">
            <svg class="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        
        <!-- Video Controls (hidden initially) -->
        <div id="video-controls-public" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity z-10">
          <div class="flex items-center justify-between text-white">
            <button id="play-pause-btn-public" class="hover:text-primary transition-colors">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <div class="flex-1 mx-4">
              <div class="bg-white/30 h-1 rounded-full">
                <div id="progress-bar-public" class="bg-white h-1 rounded-full" style="width: 0%"></div>
              </div>
            </div>
            <span id="time-display-public" class="text-sm">0:00 / 0:00</span>
          </div>
        </div>
        
        <!-- Name and Title Overlay -->
        <div class="absolute bottom-0 left-0 p-6 text-white bg-gradient-to-t from-black/60 to-transparent w-full pointer-events-none">
          <h1 class="text-3xl font-bold">${profile.person?.name || profile.profileName || 'Anonymous'}</h1>
          <p class="text-lg text-white/80">${profile.title || ''}</p>
        </div>
      </div>
    `;
    
    // Add video player functionality
    setupPublicVideoPlayer('public-profile-video');
  } else {
    console.log('[public-profile] No video URL found, showing placeholder');
    // Keep placeholder with real data
    const headerName = videoContainer.querySelector('[data-profile="header-name"]');
    const headerTitle = videoContainer.querySelector('[data-profile="header-title"]');
    if (headerName) headerName.textContent = profile.person?.name || profile.profileName || 'Anonymous';
    if (headerTitle) headerTitle.textContent = profile.title || 'No title provided';
  }
}

// Helper to inject filename into Cloudinary URL for correct download
function getDownloadUrl(file) {
  // WP01 Fix: For raw files (like PDFs), fl_attachment doesn't work reliably.
  // We return the original URL and handle download via window.downloadRawFile
  if (file.url && file.url.includes('/raw/upload/')) {
    return file.url;
  }

  if (file.url && file.url.includes('cloudinary') && file.url.includes('/upload/')) {
    // Check if fl_attachment is already present
    if (file.url.includes('fl_attachment')) return file.url;
    
    const filename = file.name || 'download';
    // Clean filename for URL (Cloudinary safe)
    const safeName = encodeURIComponent(filename).replace(/['()]/g, '_');
    return file.url.replace(/\/upload\//, `/upload/fl_attachment:${safeName}/`);
  }
  return file.url;
}

// WP01 Fix: Helper to force download with correct filename for raw files
window.downloadRawFile = async function(e, url, filename) {
  e.preventDefault();
  const btn = e.currentTarget;
  
  // Visual feedback
  const originalCursor = document.body.style.cursor;
  document.body.style.cursor = 'wait';
  btn.style.cursor = 'wait';
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    // Attempt to fix missing extension based on Content-Type
    if (filename && !filename.includes('.')) {
      const contentType = response.headers.get('content-type');
      if (contentType) {
        const mimeMap = {
          'application/pdf': '.pdf',
          'text/plain': '.txt',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'application/zip': '.zip',
          'application/x-rar-compressed': '.rar'
        };
        
        if (mimeMap[contentType]) {
          filename += mimeMap[contentType];
        } else {
          // Fallback: try to get extension from subtype
          const subtype = contentType.split('/')[1];
          if (subtype && subtype.length <= 4 && /^[a-z0-9]+$/i.test(subtype)) {
             filename += `.${subtype}`;
          }
        }
      } else {
         // Fallback: try to get extension from URL
         try {
            const urlObj = new URL(url);
            const ext = urlObj.pathname.split('.').pop();
            if (ext && ext !== urlObj.pathname && ext.length <= 4) {
               filename += `.${ext}`;
            }
         } catch(e) {}
      }
    }
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename; // Forces the correct filename from database
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    }, 100);
  } catch (err) {
    console.error('Download failed:', err);
    // Fallback
    window.open(url, '_blank');
  } finally {
    document.body.style.cursor = originalCursor;
    btn.style.cursor = '';
  }
  return false;
};

async function renderAttachments(profile) {
  const attachmentsContainer = document.querySelector('[data-profile="attachments"]');
  if (!attachmentsContainer) return;
  
  try {
    // Get all profile files
    const res = await fetch(`/api/files?profileId=${profile.id || profile._id}`, { credentials: 'include' });
    if (!res.ok) {
      attachmentsContainer.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-sm">No attachments uploaded.</p>';
      return;
    }
    
    const files = await res.json();
    
    // Filter attachments - use 'kind' field if available, otherwise filter by mime/name
    const attachments = files.filter(f => {
      const isAvatarUrl =
        typeof f.url === 'string' &&
        (f.url.includes('/openinterview/avatars/') ||
         f.url.includes('openinterview%2Favatars%2F'));
      
      const isAvatarName =
        f.mime?.includes('image') &&
        f.name?.toLowerCase().includes('avatar');
      
      const isAvatar = isAvatarUrl || isAvatarName;

      if (f.kind) {
        if (isAvatar) return false;
        return f.kind === 'attachment';
      }

      const isResume = f.mime?.includes('pdf') || 
                      f.mime?.includes('document') ||
                      f.name?.toLowerCase().endsWith('.pdf') ||
                      f.name?.toLowerCase().endsWith('.doc') ||
                      f.name?.toLowerCase().endsWith('.docx') ||
                      f.name?.toLowerCase().endsWith('.txt') ||
                      f.name?.toLowerCase().endsWith('.rtf');
      
      const isVideo = f.mime?.includes('video') ||
                     f.name?.toLowerCase().endsWith('.mp4') ||
                     f.name?.toLowerCase().endsWith('.webm') ||
                     f.name?.toLowerCase().endsWith('.mov') ||
                     f.name?.toLowerCase().endsWith('.avi');

      return !isResume && !isVideo && !isAvatar;
    });
    
    if (attachments.length === 0) {
      attachmentsContainer.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-sm">No attachments uploaded.</p>';
      return;
    }
    
    // Calculate file sizes for display
    const formatFileSize = (bytes) => {
      if (!bytes) return '';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    attachmentsContainer.innerHTML = attachments.map(file => {
      const fileSize = file.size ? formatFileSize(file.size) : '';
      const fileExtension = file.name?.split('.').pop()?.toLowerCase() || '';
      const isRaw = file.url && file.url.includes('/raw/upload/');
      const downloadAttr = isRaw 
          ? `onclick="return downloadRawFile(event, '${file.url}', '${file.name.replace(/'/g, "\\'")}')" href="${file.url}"`
          : `href="${getDownloadUrl(file)}" download="${file.name}"`;
      
      return `
        <a 
          ${downloadAttr}
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-4 bg-background-light dark:bg-subtle-dark rounded-lg border border-subtle-light dark:border-subtle-dark hover:bg-subtle-light dark:hover:bg-primary/50 transition-colors">
          <div class="flex items-center gap-3">
            <svg class="h-6 w-6 text-muted-light dark:text-muted-dark" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" stroke-linecap="round" stroke-linejoin="round"></path>
              <polyline points="14 2 14 8 20 8" stroke-linecap="round" stroke-linejoin="round"></polyline>
            </svg>
            <div>
              <p class="font-medium text-sm">${file.name}</p>
              ${fileSize ? `<p class="text-xs text-muted-light dark:text-muted-dark">${fileSize}</p>` : ''}
            </div>
          </div>
          <svg class="h-5 w-5 text-muted-light dark:text-muted-dark" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </a>
      `;
    }).join('');
  } catch (error) {
    console.error('[public-profile] Error loading attachments:', error);
    attachmentsContainer.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-sm">No attachments uploaded.</p>';
  }
}

function renderHighlights(profile) {
  const highlightsContainer = document.querySelector('[data-profile="highlights"]');
  if (!highlightsContainer) return;
  
  const highlights = profile.highlights || [];
  
  if (highlights.length === 0) {
    highlightsContainer.innerHTML = '<p class="text-muted-light dark:text-muted-dark">No highlights available</p>';
    return;
  }
  
  highlightsContainer.innerHTML = highlights.map(highlight => `
    <li class="flex items-start">
      <span class="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 mr-4 shrink-0"></span>
      <p class="text-muted-light dark:text-muted-dark">${highlight.text || highlight.description || highlight}</p>
    </li>
  `).join('');
}

async function renderResume(profile) {
  const resumeContainer = document.querySelector('[data-profile="resume"]');
  if (!resumeContainer) return;
  
  // WP1-WP3: Load PDF resume ONLY - No HTML fallback
  const resumeFileId = profile.resume_file_id || profile.resumeFileId; // Support both formats
  
  if (resumeFileId) {
    try {
      // Get all profile files and find the resume
      const res = await fetch(`/api/files?profileId=${profile.id || profile._id}`, { credentials: 'include' });
      if (res.ok) {
        const files = await res.json();
        const file = files.find(f => f.id === resumeFileId);
        
        if (!file) {
          console.error('[public-profile] Resume file not found');
          resumeContainer.innerHTML = `
            <div class="p-8 text-center">
              <p class="text-muted-light dark:text-muted-dark">Resume not available.</p>
            </div>
          `;
          return;
        }
        
        console.log('[public-profile] Resume file loaded:', file);
        
        // Check if this is a Cloudinary raw file (PDF)
        const isCloudinaryRaw = file.url && file.url.includes('cloudinary.com') && file.url.includes('/raw/');
        const useGoogleDocsViewer = isCloudinaryRaw;
        
        if (useGoogleDocsViewer) {
          // For Cloudinary raw files, use Google Docs Viewer
          const encodedUrl = encodeURIComponent(file.url);
          resumeContainer.innerHTML = `
            <div class="relative">
              <div id="resume-loading" class="absolute inset-0 flex items-center justify-center bg-background-light dark:bg-background-dark z-10">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p class="text-muted-light dark:text-muted-dark">Loading resume...</p>
                </div>
              </div>
              <iframe 
                src="https://docs.google.com/viewer?url=${encodedUrl}&embedded=true" 
                class="w-full h-[800px]"
                title="Resume PDF"
                onload="document.getElementById('resume-loading')?.remove()">
              </iframe>
            </div>
            <div class="p-4 bg-background-light dark:bg-subtle-dark flex justify-between items-center border-t border-subtle-light dark:border-subtle-dark">
              <p class="text-sm font-medium">${file.name}</p>
              <a 
                href="${file.url}" 
                onclick="return downloadRawFile(event, '${file.url}', '${file.name}')"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                Download Resume
              </a>
            </div>
          `;
        } else {
          // For non-Cloudinary files, try direct iframe
          resumeContainer.innerHTML = `
            <iframe 
              src="${file.url}" 
              class="w-full h-[800px]"
              title="Resume PDF">
            </iframe>
            <div class="p-4 bg-background-light dark:bg-subtle-dark flex justify-between items-center border-t border-subtle-light dark:border-subtle-dark">
              <p class="text-sm font-medium">${file.name}</p>
              <a 
                href="${getDownloadUrl(file)}" 
                download="${file.name}"
                class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                Download Resume
              </a>
            </div>
          `;
        }
        return;
      }
    } catch (error) {
      console.error('[public-profile] Error loading resume file:', error);
    }
  }
  
  // No PDF available - show simple message
  resumeContainer.innerHTML = `
    <div class="p-8 text-center">
      <p class="text-muted-light dark:text-muted-dark">No resume uploaded yet.</p>
    </div>
  `;
}

function renderSidebarCard(profile) {
  const sidebarName = document.querySelector('[data-profile="sidebar-name"]');
  const sidebarTitle = document.querySelector('[data-profile="sidebar-title"]');
  const sidebarLocation = document.querySelector('[data-profile="sidebar-location"]');
  const sidebarBio = document.querySelector('[data-profile="sidebar-bio"]');
  const sidebarAvatar = document.querySelector('[data-profile="sidebar-avatar"]');
  
  const name = profile.person?.name || profile.profileName || 'Anonymous';
  const title = profile.title || '';
  const location = profile.location || profile.city || '';
  const bio = profile.about || profile.summary || '';
  // WP01 Enhancement: Use default avatar if none uploaded
  let avatarUrl = profile.avatar_url || profile.person?.avatar_url || profile.person?.avatarUrl || '/defaults/default-avatar.jpeg';
  
  // WP01 Fix: Handle legacy default avatar URL stored in database
  if (avatarUrl && avatarUrl.includes('/uploads/default-avatar.jpeg')) {
    avatarUrl = '/defaults/default-avatar.jpeg';
  }
  
  console.log("avtar url gained",avatarUrl);
  
  if (sidebarName) sidebarName.textContent = name;
  if (sidebarTitle) sidebarTitle.textContent = title;
  if (sidebarLocation) sidebarLocation.textContent = location;
  if (sidebarBio) sidebarBio.textContent = bio;
  
  if (sidebarAvatar) {
    sidebarAvatar.src = avatarUrl;
    sidebarAvatar.alt = name;
  }
}

function setupPublicVideoPlayer(videoId) {
  const video = document.getElementById(videoId);
  const playOverlay = document.getElementById('video-play-overlay-public');
  const controls = document.getElementById('video-controls-public');
  const playPauseBtn = document.getElementById('play-pause-btn-public');
  const progressBar = document.getElementById('progress-bar-public');
  const timeDisplay = document.getElementById('time-display-public');
  
  if (!video || !playOverlay) return;
  
  let isPlaying = false;
  
  // Play button click
  playOverlay.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playOverlay.style.opacity = '0';
      playOverlay.style.pointerEvents = 'none';
      if (controls) controls.style.opacity = '1';
      isPlaying = true;
    }
  });
  
  // Video click to pause/play
  video.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playOverlay.style.opacity = '0';
      playOverlay.style.pointerEvents = 'none';
      if (controls) controls.style.opacity = '1';
    } else {
      video.pause();
      playOverlay.style.opacity = '1';
      playOverlay.style.pointerEvents = 'auto';
      if (controls) controls.style.opacity = '0';
    }
  });
  
  // Play/pause button
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) {
        video.play();
        playOverlay.style.opacity = '0';
        playOverlay.style.pointerEvents = 'none';
      } else {
        video.pause();
        playOverlay.style.opacity = '1';
        playOverlay.style.pointerEvents = 'auto';
      }
    });
  }
  
  // Update progress bar
  video.addEventListener('timeupdate', () => {
    if (video.duration && progressBar) {
      const progress = (video.currentTime / video.duration) * 100;
      progressBar.style.width = progress + '%';
    }
    
    if (timeDisplay) {
      const current = formatTimePublic(video.currentTime);
      const duration = formatTimePublic(video.duration || 0);
      timeDisplay.textContent = `${current} / ${duration}`;
    }
  });
  
  // Video ended
  video.addEventListener('ended', () => {
    playOverlay.style.opacity = '1';
    playOverlay.style.pointerEvents = 'auto';
    if (controls) controls.style.opacity = '0';
    if (progressBar) progressBar.style.width = '0%';
  });
  
  // Mouse enter/leave for controls
  video.parentElement.addEventListener('mouseenter', () => {
    if (!video.paused && controls) {
      controls.style.opacity = '1';
    }
  });
  
  video.parentElement.addEventListener('mouseleave', () => {
    if (!video.paused && controls) {
      setTimeout(() => {
        if (!video.paused) controls.style.opacity = '0';
      }, 2000);
    }
  });
}

function formatTimePublic(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSocialIcon(iconType) {
  const icons = {
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" stroke-linecap="round" stroke-linejoin="round"></path><rect width="4" height="12" x="2" y="9" stroke-linecap="round" stroke-linejoin="round"></rect><circle cx="4" cy="4" r="2" stroke-linecap="round" stroke-linejoin="round"></circle>',
    globe: '<circle cx="12" cy="12" r="10" stroke-linecap="round" stroke-linejoin="round"></circle><line x1="2" x2="22" y1="12" y2="12" stroke-linecap="round" stroke-linejoin="round"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke-linecap="round" stroke-linejoin="round"></path>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 18c-4.51 2-5-2-7-2" stroke-linecap="round" stroke-linejoin="round"></path>',
    twitter: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" stroke-linecap="round" stroke-linejoin="round"></path>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke-linecap="round" stroke-linejoin="round"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke-linecap="round" stroke-linejoin="round"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke-linecap="round" stroke-linejoin="round"></line>',
    youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" stroke-linecap="round" stroke-linejoin="round"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" stroke-linecap="round" stroke-linejoin="round"></polygon>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke-linecap="round" stroke-linejoin="round"></path>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" stroke-linecap="round" stroke-linejoin="round"></path>'
  };
  return icons[iconType] || icons.globe;
}

function renderSocialLinks(profile) {
  const socialLinksContainer = document.getElementById('social-links-container');
  if (!socialLinksContainer) return;
  
  // Extract social links from profile
  let socialLinks = [];

  // Check if profile.social is an array (New Format)
  if (Array.isArray(profile.social)) {
    socialLinks = profile.social;
  } 
  // Handle Legacy Format (Object)
  else {
    // LinkedIn
    if (profile.social?.linkedin || profile.linkedin) {
      socialLinks.push({
        name: 'LinkedIn',
        url: profile.social?.linkedin || profile.linkedin,
        icon: 'linkedin'
      });
    }
    
    // Portfolio/Website
    if (profile.social?.website || profile.social?.portfolio || profile.website || profile.portfolio) {
      socialLinks.push({
        name: 'Portfolio',
        url: profile.social?.website || profile.social?.portfolio || profile.website || profile.portfolio,
        icon: 'globe'
      });
    }
    
    // GitHub
    if (profile.social?.github || profile.github) {
      socialLinks.push({
        name: 'GitHub',
        url: profile.social?.github || profile.github,
        icon: 'github'
      });
    }
  }
  
  // If no social links, hide the section
  if (socialLinks.length === 0) {
    const socialSection = document.querySelector('[data-profile="social-links"]');
    if (socialSection) {
      socialSection.style.display = 'none';
    }
    return;
  }
  
  // Render social links using project theme (matches attachments styling)
  socialLinksContainer.innerHTML = socialLinks.map(link => {
    // Ensure URL has protocol
    let url = link.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    return `
        <a 
          href="${url}" 
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center justify-between p-4 bg-background-light dark:bg-subtle-dark rounded-lg border border-subtle-light dark:border-subtle-dark hover:bg-subtle-light dark:hover:bg-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/50 group">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <svg class="h-6 w-6 text-muted-light dark:text-muted-dark group-hover:text-primary transition-all duration-300 group-hover:scale-110 animate-float shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              ${getSocialIcon(link.icon)}
            </svg>
            <div class="min-w-0">
              <p class="font-medium text-sm group-hover:text-primary transition-colors duration-300">${link.name}</p>
              <p class="text-xs text-muted-light dark:text-muted-dark break-all">${link.url}</p>
            </div>
          </div>
          <svg class="h-5 w-5 text-muted-light dark:text-muted-dark group-hover:text-primary transition-all duration-300 group-hover:translate-x-1 shrink-0 ml-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke-linecap="round" stroke-linejoin="round"></path>
            <polyline points="15 3 21 3 21 9" stroke-linecap="round" stroke-linejoin="round"></polyline>
            <line x1="10" x2="21" y1="14" y2="3" stroke-linecap="round" stroke-linejoin="round"></line>
          </svg>
        </a>
      `;
  }).join('');
  
  console.log(`[public-profile] Loaded ${socialLinks.length} social link(s)`);
}

function showError(message) {
  document.body.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div class="text-center p-8">
        <h1 class="text-3xl font-bold text-foreground-light dark:text-foreground-dark mb-4">
          ${message}
        </h1>
        <p class="text-muted-light dark:text-muted-dark mb-6">
          The profile you're looking for doesn't exist or isn't public.
        </p>
        <a href="/" class="inline-block bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
          Go to Home
        </a>
      </div>
    </div>
  `;
}

function showUnauthorized() {
  document.body.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div class="text-center p-8 max-w-md">
        <h1 class="text-3xl font-bold text-foreground-light dark:text-foreground-dark mb-4">
          Access required
        </h1>
        <p class="text-muted-light dark:text-muted-dark mb-6">
          Open this profile using the secure link you were sent. If you need a new link, ask the profile owner to share again.
        </p>
        <a href="/" class="inline-block bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
          Go to Home
        </a>
      </div>
    </div>
  `;
}
