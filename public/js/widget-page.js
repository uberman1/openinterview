/**
 * Embed widget: same resume upload behavior as public/home.html,
 * with widget=1 on upload and credentials for iframe cookies.
 */
(function () {
  try {
    sessionStorage.setItem('oi_widget', '1');
  } catch (_) {}

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('resume-file-input');
  const browseBtn = document.getElementById('browse-files-btn');
  const fileName = document.getElementById('file-name');
  const uploadStatus = document.getElementById('upload-status');
  const resumeUploadSection = document.getElementById('resume-upload-section');

  let isProcessing = false;

  function disableButtons() {
    if (browseBtn) browseBtn.classList.add('btn-disabled');
    if (dropZone) {
      dropZone.style.pointerEvents = 'none';
      dropZone.style.opacity = '0.6';
    }
  }

  function enableButtons() {
    if (browseBtn) browseBtn.classList.remove('btn-disabled');
    if (dropZone) {
      dropZone.style.pointerEvents = 'auto';
      dropZone.style.opacity = '1';
    }
  }

  function announceUpload(message) {
    const announcer = document.getElementById('upload-announcer');
    if (!announcer) return;
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  function scrollToTopUploader() {
    const target = resumeUploadSection || dropZone;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;
    disableButtons();
    if (fileName) {
      fileName.textContent = file.name;
      fileName.classList.remove('hidden');
    }
    uploadFile(file);
  }

  async function uploadFile(file) {
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const fileInfo = document.getElementById('file-info');
    const processingSteps = document.getElementById('processing-steps');

    progressContainer.classList.remove('hidden');
    dropZone.classList.add('upload-processing');

    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    fileInfo.textContent = `${file.name} (${fileSize} MB)`;

    uploadStatus.textContent = 'Analyzing and processing your resume with AI...';
    progressText.textContent = 'Uploading to secure cloud storage...';
    progressPercentage.textContent = '0%';

    let progress = 0;
    let currentStep = 0;
    const steps = [
      { text: 'Uploading to secure cloud storage...', duration: 2000 },
      { text: 'Scanning document structure...', duration: 1500 },
      { text: 'Extracting text and formatting...', duration: 2000 },
      { text: 'AI analyzing skills and experience...', duration: 2500 },
      { text: 'Creating your profile...', duration: 1000 },
      { text: 'Finalizing setup...', duration: 500 },
    ];

    const progressInterval = setInterval(() => {
      progress += Math.random() * 12 + 3;
      if (progress > 85) progress = 85;
      progressBar.style.width = `${progress}%`;
      progressPercentage.textContent = `${Math.round(progress)}%`;
      const stepIndex = Math.floor((progress / 85) * steps.length);
      if (stepIndex !== currentStep && stepIndex < steps.length) {
        currentStep = stepIndex;
        progressText.textContent = steps[stepIndex].text;
        processingSteps.innerHTML = `
        <div class="flex items-center gap-2 text-xs text-muted-light dark:text-muted-dark">
          <div class="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>${steps[stepIndex].text}</span>
        </div>`;
      }
    }, 200);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('widget', '1');

    const existingUserId = getCookie('anonUserId');
    if (existingUserId) {
      formData.append('anonUserId', existingUserId);
      uploadStatus.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary animate-pulse">person</span>
        <span>Welcome back! Processing your resume with AI...</span>
      </div>`;
    } else {
      uploadStatus.textContent = 'Analyzing and processing your resume with AI...';
    }

    try {
      const response = await fetch('/api/upload-resume-anon', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();

      clearInterval(progressInterval);
      progressBar.style.width = '100%';
      progressPercentage.textContent = '100%';
      progressText.textContent = 'Processing complete!';

      if (!response.ok) {
        if (response.status === 401 && data.requiresAuth) {
          dropZone.classList.remove('upload-processing');
          dropZone.classList.add('upload-error');
          uploadStatus.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-red-600">lock</span>
            <span>Authentication Required</span>
          </div>`;
          announceUpload('Authentication required. Please sign in to upload resumes.');
          progressText.textContent =
            data.message || 'This account requires sign-in to upload resumes';
          processingSteps.innerHTML = `
          <div class="flex items-center gap-2 text-xs text-red-600">
            <div class="w-2 h-2 bg-red-600 rounded-full"></div>
            <span>Please <a href="${data.loginUrl || '/login-page.html'}" class="underline font-bold">sign in</a> to continue</span>
          </div>`;
          setTimeout(() => {
            dropZone.classList.remove('upload-error');
            progressContainer.classList.add('hidden');
            if (fileName) fileName.classList.add('hidden');
            isProcessing = false;
            fileInput.value = '';
            enableButtons();
          }, 5000);
          return;
        }
        throw new Error(data.error || 'Upload failed');
      }

      dropZone.classList.remove('upload-processing');
      dropZone.classList.add('upload-success');

      let successMessage;
      let processingMessage;
      if (data.isReturningUser) {
        successMessage = 'Welcome back! Your profile has been updated';
        processingMessage = 'Profile updated successfully! Redirecting...';
      } else {
        successMessage = 'Success! Your profile is ready';
        processingMessage = 'Profile created successfully! Redirecting...';
      }

      uploadStatus.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-white animate-bounce">check_circle</span>
        <span class="text-white font-medium">${successMessage}</span>
      </div>`;

      announceUpload(successMessage + ' Redirecting to your profile.');

      processingSteps.innerHTML = `
      <div class="flex items-center gap-2 text-xs text-white">
        <div class="w-2 h-2 bg-white rounded-full"></div>
        <span class="text-white">${processingMessage}</span>
      </div>`;

      setTimeout(() => {
        window.location.href =
          data.redirectUrl ||
          `/profile_edit.html?id=${data.profileId}&guest=true&widget=1`;
      }, 2000);
    } catch (error) {
      clearInterval(progressInterval);
      dropZone.classList.remove('upload-processing');
      dropZone.classList.add('upload-error');
      uploadStatus.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-red-600">error</span>
        <span>Upload failed</span>
      </div>`;
      announceUpload('Upload failed. ' + (error.message || 'Please try again.'));
      progressText.textContent = `Error: ${error.message}`;
      progressBar.style.width = '0%';
      progressPercentage.textContent = '0%';
      processingSteps.innerHTML = `
      <div class="flex items-center gap-2 text-xs text-red-600">
        <div class="w-2 h-2 bg-red-600 rounded-full"></div>
        <span>Upload failed. Please try again.</span>
      </div>`;
      setTimeout(() => {
        dropZone.classList.remove('upload-error');
        progressContainer.classList.add('hidden');
        if (fileName) fileName.classList.add('hidden');
        isProcessing = false;
        fileInput.value = '';
        enableButtons();
      }, 4000);
    }
  }

  if (!dropZone || !fileInput || !browseBtn) return;

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isProcessing) fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (!isProcessing && fileInput.files.length > 0) {
      isProcessing = true;
      handleFileSelect();
    }
  });

  dropZone.addEventListener('click', (e) => {
    if (!isProcessing && e.target !== browseBtn && !browseBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && !isProcessing) {
      isProcessing = true;
      fileInput.files = files;
      scrollToTopUploader();
      handleFileSelect();
    }
  });
})();
