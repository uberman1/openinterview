// public/js/owner-preview-loader.js
// Loads profile data for owner_preview.html (Template View)
// WP1-WP3: Shows video thumbnail, PDF resume, profile fields, Edit/Share buttons

import { initCalendarPreview } from './owner_preview.calendar.js';

(async function initOwnerPreview() {
  // Use existing static loader from HTML
  const loaderOverlay = document.getElementById('page-loader');

  const cleanupLoader = () => {
      if (loaderOverlay) {
          loaderOverlay.style.opacity = '0';
          setTimeout(() => {
              if (loaderOverlay.parentNode) {
                  loaderOverlay.parentNode.removeChild(loaderOverlay);
              }
          }, 500); // Fade out duration
      }
  };

  // Get profile ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('id');
  
  if (!profileId) {
    console.error('[owner-preview] No profile ID provided');
    window.location.href = '/dashboard.html';
    return;
  }
  
  console.log('[owner-preview] Loading profile:', profileId);
  
  // Disable all buttons initially while loading
  disableAllButtons();
  
  // Load profile data
  try {
    const res = await fetch(`/api/profiles/${profileId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login-page.html?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }
      console.error('[owner-preview] Failed to load profile:', res.status);
      alert('Failed to load profile');
      window.location.href = '/dashboard.html';
      return;
    }
    
    const profile = await res.json();
    console.log('[owner-preview] Profile loaded:', profile);
    
    // Populate profile fields
    populateProfileFields(profile);
    
    // Load video - WP01 Enhancement: Handle default videos
    let videoUrl = profile.video_url || profile.videoUrl || '/defaults/default-video.mp4';
    
    // WP01 Fix: Handle legacy default video URL stored in database
    if (videoUrl && videoUrl.includes('/uploads/default-video.mp4')) {
      videoUrl = '/defaults/default-video.mp4';
    }

    const isDefaultVideo = videoUrl.includes('/defaults/default-video.mp4');
    displayVideo(videoUrl, profile, isDefaultVideo);
    
    // Load PDF resume
    const resumeFileId = profile.resume_file_id || profile.resumeFileId; // Support both formats
    const userId = profile.userId || profile.user_id; // Support both formats
    
    console.log('[owner-preview] Resume check - resumeFileId:', resumeFileId);
    
    if (resumeFileId) {
      await loadPDFResume(resumeFileId, profileId);
    } else {
      // No resume - show message
      console.log('[owner-preview] No resume to load - resumeFileId:', resumeFileId);
      showNoResumeMessage();
    }
    
    // Load attachments
    await loadAttachments(profileId);
    
    // Load social links
    loadSocialLinks(profile);
    
    // Wire buttons and enable them
    wireButtons(profile);
    enableAllButtons();

    // Enable My Profile link in navbar
    const myProfileLink = document.getElementById('my-profile-link');
    if (myProfileLink) {
        myProfileLink.href = `/owner_preview.html?id=${profileId}`;
        myProfileLink.classList.remove('text-primary/50', 'dark:text-white/50', 'cursor-not-allowed', 'pointer-events-none');
        myProfileLink.classList.add('text-primary', 'dark:text-white', 'cursor-pointer');
    }
    
    // Initialize Calendar Preview
    try {
        await initCalendarPreview(profile);
    } catch (e) {
        console.error('[owner-preview] Calendar init failed:', e);
    } finally {
        // Cleanup Loader
        cleanupLoader();
    }
    
  } catch (error) {
    console.error('[owner-preview] Error:', error);
    alert('Error loading profile');
    // window.location.href = '/dashboard.html';
    cleanupLoader();
  }
})();

function populateProfileFields(profile) {
  // Helper to set text content for ALL matching elements
  const setText = (selector, value) => {
    const elements = document.querySelectorAll(selector);
    if (value) {
      elements.forEach(el => {
        if (el) el.textContent = value;
      });
    }
  };
  
  // Helper to set attribute
  const setAttr = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  };
  
  // Name and title
  const name = profile.person?.name || profile.profileName || 'Your Name';
  const title = profile.title || 'Your Title';
  const location = profile.location || profile.city || '';
  
  setText('[data-field="person.name"]', name);
  setText('[data-field="title"]', title);
  setText('[data-field="location"]', location);
  setText('[data-field="about"]', profile.about || profile.summary || '');
  
  // Avatar - WP01 Enhancement: Use default avatar if none uploaded
  let avatarUrl = profile.avatar_url || profile.person?.avatarUrl || profile.person?.avatar_url || '/defaults/default-avatar.jpeg';
  
  // WP01 Fix: Handle legacy default avatar URL stored in database
  if (avatarUrl && avatarUrl.includes('/uploads/default-avatar.jpeg')) {
    avatarUrl = '/defaults/default-avatar.jpeg';
  }

    console.log("avatar url gained", avatarUrl);
  setAttr('img[alt="Profile"]', 'src', avatarUrl);
  setAttr('img[alt="' + name + '"]', 'src', avatarUrl);
  
  // Highlights
  const highlightsContainer = document.querySelector('[data-field="highlights"]');
  if (highlightsContainer && profile.highlights && profile.highlights.length > 0) {
    highlightsContainer.innerHTML = profile.highlights.map(h => {
      const text = typeof h === 'string' ? h : h.text;
      return `
        <li class="flex items-start">
          <span class="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 mr-4 shrink-0"></span>
          <p class="text-muted-light dark:text-muted-dark">${text}</p>
        </li>
      `;
    }).join('');
  }
  
  console.log('[owner-preview] Profile fields populated');
}

function displayVideo(videoUrl, profile, isDefaultVideo = false) {
  const videoContainer = document.querySelector('[data-profile="video-container"]');
  if (!videoContainer || !videoUrl) return;
  
  const name = profile.person?.name || profile.profileName || 'Your Name';
  const title = profile.title || 'Your Title';
  
  // WP01 Enhancement: Add "Sample Video" label for default videos
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
        id="owner-preview-video"
        class="absolute inset-0 w-full h-full object-contain" 
        preload="metadata"
        poster="">
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      
      <!-- Custom Play Button Overlay with Thumbnail -->
      <div id="video-play-overlay" class="absolute inset-0 flex items-center justify-center bg-black cursor-pointer transition-opacity z-20">
        <img src="${thumbnailUrl}" class="absolute inset-0 w-full h-full object-cover opacity-90" alt="Video Thumbnail" />
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:scale-110 transition-all z-30">
          <svg class="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      
      <!-- Video Controls (hidden initially) -->
      <div id="video-controls" class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity z-10">
        <div class="flex items-center justify-between text-white">
          <button id="play-pause-btn" class="hover:text-primary transition-colors">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div class="flex-1 mx-4">
            <div class="bg-white/30 h-1 rounded-full">
              <div id="progress-bar" class="bg-white h-1 rounded-full" style="width: 0%"></div>
            </div>
          </div>
          <span id="time-display" class="text-sm">0:00 / 0:00</span>
        </div>
      </div>
      
      <!-- Name and Title Overlay -->
      <div class="absolute bottom-0 left-0 p-6 text-white bg-gradient-to-t from-black/60 to-transparent w-full pointer-events-none">
        <h1 class="text-3xl font-bold">${name}</h1>
        <p class="text-lg text-white/80">${title}</p>
      </div>
    </div>
  `;
  
  // Add video player functionality
  setupVideoPlayer('owner-preview-video');
  
  console.log('[owner-preview] Video displayed');
}

function setupVideoPlayer(videoId) {
  const video = document.getElementById(videoId);
  const playOverlay = document.getElementById('video-play-overlay');
  const controls = document.getElementById('video-controls');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const progressBar = document.getElementById('progress-bar');
  const timeDisplay = document.getElementById('time-display');
  
  if (!video || !playOverlay) return;
  

  
  // Play button click
  playOverlay.addEventListener('click', () => {
    if (video.paused) {
      video.play();
      playOverlay.style.opacity = '0';
      playOverlay.style.pointerEvents = 'none';
      if (controls) controls.style.opacity = '1';
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
      const current = formatTime(video.currentTime);
      const duration = formatTime(video.duration || 0);
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

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

async function loadPDFResume(resumeFileId, profileId) {
  try {
    console.log('[owner-preview] Loading PDF resume - resumeFileId:', resumeFileId, 'profileId:', profileId);
    
    // Get all profile files and find the resume
    const res = await fetch(`/api/files?profileId=${profileId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      console.error('[owner-preview] Failed to load files:', res.status, res.statusText);
      showNoResumeMessage();
      return;
    }
    
    const files = await res.json();
    console.log('[owner-preview] All files loaded:', files.length, files);
    
    const file = files.find(f => f.id === resumeFileId);
    
    if (!file) {
      console.error('[owner-preview] Resume file not found in files list. Looking for ID:', resumeFileId);
      console.error('[owner-preview] Available file IDs:', files.map(f => f.id));
      showNoResumeMessage();
      return;
    }
    
    console.log('[owner-preview] Resume file found:', file);
    
    // Find resume section
    const resumeSection = document.querySelector('section.space-y-6');
    if (!resumeSection) return;
    
    // For Cloudinary raw files (PDFs), we need a different approach
    // Raw files don't support fl_attachment transformations, so we'll use Google Docs Viewer primarily
    let displayUrl = file.url;
    let useGoogleDocsViewer = false;
    
    console.log('[owner-preview] File URL:', file.url);
    console.log('[owner-preview] File MIME:', file.mime);
    
    if (file.url && file.url.includes('cloudinary.com')) {
      // Check if this is a raw file (PDFs are uploaded as raw)
      if (file.url.includes('/raw/upload/') || file.mime === 'application/pdf') {
        // Proxy through /api/proxy/pdf so server sets Content-Disposition: inline.
        // fl_inline doesn't work on /raw/upload/ Cloudinary URLs (raw bypasses transformations).
        console.log('[owner-preview] Detected Cloudinary raw file (PDF), using server-side proxy');
        displayUrl = `/api/proxy/pdf?url=${encodeURIComponent(file.url)}`;
      } else {
        // For non-raw files, try the attachment transformation
        console.log('[owner-preview] Non-raw Cloudinary file, trying fl_attachment:false transformation');
        displayUrl = file.url.replace('/upload/', '/upload/fl_attachment:false/');
      }
    } else {
      console.log('[owner-preview] Non-Cloudinary file, using direct URL');
    }
    
    // For PDFs, use native browser iframe with Google Docs Viewer as timed fallback
    const isPDF = file.name?.toLowerCase().endsWith('.pdf') || file.mime?.includes('pdf');
    const isCloudinaryRaw = file.url && file.url.includes('cloudinary.com') && file.url.includes('/raw/');
    
    if (isPDF) {
      if (isCloudinaryRaw) {
        // Native embed via fl_inline with 8s fallback to Google Docs Viewer
        const encodedUrl = encodeURIComponent(file.url);
        resumeSection.innerHTML = `
          <h2 class="text-2xl font-bold text-foreground-light dark:text-foreground-dark">Resume</h2>
          <div class="border border-subtle-light dark:border-subtle-dark rounded-lg overflow-hidden">
            <div class="relative bg-white">
              <!-- Loading state -->
              <div id="resume-loading" class="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div class="text-center space-y-4">
                  <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                  <p class="text-lg font-medium text-foreground-light dark:text-foreground-dark">Loading Resume...</p>
                  <p class="text-sm text-muted-light dark:text-muted-dark">Please wait while we load your PDF</p>
                </div>
              </div>
              <iframe
                id="resume-iframe"
                src="${displayUrl}"
                class="w-full h-[800px] bg-white"
                title="Resume PDF"
                onload="document.getElementById('resume-loading')?.remove()">
              </iframe>
            </div>
            <div class="p-4 bg-background-light dark:bg-subtle-dark flex justify-between items-center border-t border-subtle-light dark:border-subtle-dark">
              <p class="text-sm font-medium text-foreground-light dark:text-foreground-dark">${file.name || 'Resume'}</p>
              <a 
                href="${file.url}" 
                onclick="return downloadRawFile(event, '${file.url}', '${file.name || 'resume.pdf'}')"
                class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <span class="material-symbols-outlined text-lg">download</span>
                Download Resume
              </a>
            </div>
          </div>
        `;
        // Fallback: if native embed didn't clear the spinner after 8s, switch to Google Docs Viewer
        setTimeout(() => {
          const spinner = document.getElementById('resume-loading');
          const iframe = document.getElementById('resume-iframe');
          if (spinner && iframe) {
            console.log('[owner-preview] Native PDF embed timed out, falling back to Google Docs Viewer');
            iframe.src = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
          }
        }, 8000);
      } else {
        // For non-Cloudinary or non-raw files, try direct iframe first with Google Docs Viewer as fallback
        resumeSection.innerHTML = `
          <h2 class="text-2xl font-bold text-foreground-light dark:text-foreground-dark">Resume</h2>
          <div class="border border-subtle-light dark:border-subtle-dark rounded-lg overflow-hidden">
            <div class="relative bg-white">
              <iframe 
                id="resume-iframe"
                src="${displayUrl}" 
                class="w-full h-[800px] bg-white"
                title="Resume PDF"
                onload="console.log('[owner-preview] PDF loaded successfully')"
                onerror="console.log('[owner-preview] PDF load failed, trying fallback')">
              </iframe>
              <div id="pdf-fallback" class="hidden w-full h-[800px] bg-white">
                <iframe 
                  src="https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true" 
                  class="w-full h-full bg-white"
                  title="Resume PDF (Google Docs Viewer)">
                </iframe>
              </div>
            </div>
            <div class="p-4 bg-background-light dark:bg-subtle-dark flex justify-between items-center border-t border-subtle-light dark:border-subtle-dark">
              <p class="text-sm font-medium text-foreground-light dark:text-foreground-dark">${file.name || 'Resume'}</p>
              <a 
                href="${getDownloadUrl(file)}" 
                download="${file.name || 'resume.pdf'}"
                class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <span class="material-symbols-outlined text-lg">download</span>
                Download Resume
              </a>
            </div>
          </div>
        `;
        
        // Add fallback logic for PDF loading
        setTimeout(() => {
          const iframe = document.getElementById('resume-iframe');
          const fallback = document.getElementById('pdf-fallback');
          
          if (iframe && fallback) {
            // Check if iframe loaded successfully by trying to access its content
            try {
              // If the iframe is causing downloads, switch to Google Docs Viewer
              iframe.addEventListener('load', () => {
                // Check if the iframe is actually displaying content
                setTimeout(() => {
                  try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (!iframeDoc || iframeDoc.body.innerHTML.trim() === '') {
                      console.log('[owner-preview] Direct PDF failed, using Google Docs Viewer');
                      iframe.style.display = 'none';
                      fallback.classList.remove('hidden');
                    }
                  } catch (e) {
                    // Cross-origin error means PDF is loading, which is good
                    console.log('[owner-preview] PDF loading in iframe (cross-origin)');
                  }
                }, 1000);
              });
            } catch (e) {
              console.log('[owner-preview] Using Google Docs Viewer fallback');
              iframe.style.display = 'none';
              fallback.classList.remove('hidden');
            }
          }
        }, 500);
      }
    } else {
      // For non-PDF files, show file info and download link
      resumeSection.innerHTML = `
        <h2 class="text-2xl font-bold text-foreground-light dark:text-foreground-dark">Resume</h2>
        <div class="border border-subtle-light dark:border-subtle-dark rounded-lg overflow-hidden">
          <div class="p-8 text-center bg-background-light dark:bg-subtle-dark">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-symbols-outlined text-2xl text-primary">description</span>
            </div>
            <p class="text-lg font-medium text-foreground-light dark:text-foreground-dark mb-2">${file.name || 'Resume'}</p>
            <p class="text-sm text-muted-light dark:text-muted-dark mb-4">Click download to view this resume</p>
            <a 
              href="${getDownloadUrl(file)}" 
              download="${file.name || 'resume'}"
              class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium">
              <span class="material-symbols-outlined">download</span>
              Download
            </a>
          </div>
        </div>
      `;
    }
    
    console.log('[owner-preview] Resume loaded');
  } catch (error) {
    console.error('[owner-preview] Error loading resume:', error);
    showNoResumeMessage();
  }
}



async function loadAttachments(profileId) {
  try {
    // Fetch all files to filter client-side like public profile
    const res = await fetch(`/api/files?profileId=${profileId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      console.log('[owner-preview] No attachments found or failed to load');
      const container = document.querySelector('[data-field="attachments"]');
      if (container) container.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-sm">No attachments uploaded.</p>';
      return;
    }
    
    const files = await res.json();
    const container = document.querySelector('[data-field="attachments"]');
    
    if (!container) return;

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
      container.innerHTML = '<p class="text-muted-light dark:text-muted-dark text-sm">No attachments uploaded.</p>';
      return;
    }
    
    container.innerHTML = attachments.map(file => {
      const fileSize = file.size ? formatFileSize(file.size) : '';
      
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
              <p class="font-medium text-sm text-foreground-light dark:text-foreground-dark">${file.name}</p>
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
    console.error('[owner-preview] Error loading attachments:', error);
  }
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

function loadSocialLinks(profile) {
  const container = document.getElementById('social-links-container');
  if (!container) return;
  
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
  
  if (socialLinks.length === 0) {
    container.innerHTML = '<p class="text-muted-light dark:text-muted-dark">No social links connected.</p>';
    return;
  }
  
  container.innerHTML = socialLinks.map(link => {
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
          <p class="font-medium text-sm text-foreground-light dark:text-foreground-dark group-hover:text-primary transition-colors duration-300">${link.name}</p>
          <p class="text-xs text-muted-light dark:text-muted-dark break-all">${link.url}</p>
        </div>
      </div>
      <svg class="h-5 w-5 text-muted-light dark:text-muted-dark group-hover:text-primary transition-all duration-300 group-hover:translate-x-1 shrink-0 ml-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke-linecap="round" stroke-linejoin="round"></path>
        <polyline points="15 3 21 3 21 9" stroke-linecap="round" stroke-linejoin="round"></polyline>
        <line x1="10" x2="21" y1="14" y2="3" stroke-linecap="round" stroke-linejoin="round"></line>
      </svg>
    </a>
  `}).join('');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNoResumeMessage() {
  const resumeSection = document.querySelector('section.space-y-6');
  if (resumeSection) {
    resumeSection.innerHTML = `
      <h2 class="text-2xl font-bold text-foreground-light dark:text-foreground-dark">Resume</h2>
      <div class="border border-subtle-light dark:border-subtle-dark rounded-lg overflow-hidden">
        <div class="p-8 text-center bg-background-light dark:bg-subtle-dark">
          <p class="text-muted-light dark:text-muted-dark">No resume uploaded yet.</p>
        </div>
      </div>
    `;
  }
}

// Button Handling
function disableAllButtons() {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = true);
}

function enableAllButtons() {
  const buttons = document.querySelectorAll('button');
  buttons.forEach(btn => btn.disabled = false);
}

// ── Widget mode helpers ──────────────────────────────────────────────────────
function isWidgetMode() {
  return (
    new URLSearchParams(window.location.search).get('widget') === '1' ||
    sessionStorage.getItem('oi_widget') === '1'
  );
}

function wireWidgetSubmitModal(profile) {
  const modal      = document.getElementById('widget-submit-modal');
  const submitBtn  = document.querySelector('[data-action="widget-submit"]');
  const closeBtn   = document.querySelector('[data-action="close-widget-submit-modal"]');
  const emailInput = document.getElementById('wsm-email-input');
  const emailError = document.getElementById('wsm-email-error');
  const confirmBtn = document.getElementById('wsm-confirm-btn');
  const confirmLbl = document.getElementById('wsm-confirm-label');
  const formState  = document.getElementById('wsm-form-state');
  const successState = document.getElementById('wsm-success-state');

  if (!modal || !submitBtn) return;

  function openModal() {
    // Reset to input state each time
    formState.classList.remove('hidden');
    successState.classList.add('hidden');
    emailInput.value = '';
    emailError.classList.add('hidden');
    confirmBtn.disabled = false;
    confirmLbl.textContent = 'Confirm & Save Profile';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => emailInput.focus(), 100);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  submitBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  confirmBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    // Client-side validation
    if (!email || !email.includes('@')) {
      emailError.textContent = 'Please enter a valid email address.';
      emailError.classList.remove('hidden');
      emailInput.focus();
      return;
    }

    emailError.classList.add('hidden');
    confirmBtn.disabled = true;
    confirmLbl.innerHTML = `
      <div class="flex items-center justify-center gap-2">
        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span>Saving...</span>
      </div>`;

    try {
      const res = await fetch('/auth/convert-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, profileId: profile.id || profile._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        emailError.textContent = data.error || 'Something went wrong. Please try again.';
        emailError.classList.remove('hidden');
        confirmBtn.disabled = false;
        confirmLbl.textContent = 'Confirm & Save Profile';
        return;
      }

      // Success — show confirmation state, hide form
      formState.classList.add('hidden');
      successState.classList.remove('hidden');

      if (isWidgetMode()) {
        // Fresh upload session inside embed: leave preview and return to widget entry
        setTimeout(() => {
          closeModal();
          window.location.replace('/widget.html');
        }, 1600);
        return;
      }

      // After 3 s close modal and swap Submit → Share (account now registered)
      setTimeout(() => {
        closeModal();
        submitBtn.classList.add('hidden');
        const shareBtn = document.querySelector('[data-action="share-profile"]');
        if (shareBtn) shareBtn.classList.remove('hidden');
      }, 3000);

    } catch (err) {
      emailError.textContent = 'Network error. Please try again.';
      emailError.classList.remove('hidden');
      confirmBtn.disabled = false;
      confirmLbl.textContent = 'Confirm & Save Profile';
    }
  });
}
// ────────────────────────────────────────────────────────────────────────────

function wireButtons(profile) {
  const profileId = profile.id || profile._id;
  const widgetMode = isWidgetMode();

  const editBtn = document.querySelector('[data-action="edit-profile"]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
      const originalText = btn.textContent;
      btn.textContent = 'Loading...';

      // Preserve widget flag so profile_edit → owner_preview keeps the chain
      const widgetParam = widgetMode ? '&widget=1' : '';
      window.location.href = `/profile_edit.html?id=${profileId}${widgetParam}`;

      setTimeout(() => {
         btn.disabled = false;
         btn.classList.remove('opacity-50', 'cursor-not-allowed');
         btn.textContent = originalText;
      }, 5000);
    });
  }

  const shareBtn = document.querySelector('[data-action="share-profile"]');
  const submitBtn = document.querySelector('[data-action="widget-submit"]');

  if (widgetMode && profile.ownerAccountStatus === 'anonymous') {
    // Widget mode + still anonymous: show Submit, hide Share
    shareBtn?.classList.add('hidden');
    submitBtn?.classList.remove('hidden');
    wireWidgetSubmitModal(profile);
  } else {
    // Normal site OR already registered: show Share as usual
    submitBtn?.classList.add('hidden');
    if (shareBtn && window.ShareModalController) {
      window.ShareModalController.init();
      shareBtn.addEventListener('click', () => {
        console.log('[owner-preview] Opening share modal for profile:', profileId);
        window.ShareModalController.open(profile);
      });
    }
  }
}

// Global helper for resume loading
window.handleResumeLoad = function() {
  const loading = document.getElementById('resume-loading');
  const iframe = document.getElementById('resume-iframe');
  
  if (loading && iframe) {
    loading.style.display = 'none';
    iframe.classList.remove('hidden');
  }
};

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

// Handle bfcache restore
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
      const editBtn = document.querySelector('[data-action="edit-profile"]');
      if (editBtn) {
          editBtn.disabled = false;
          editBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          editBtn.textContent = 'Edit Profile';
      }
  }
});
