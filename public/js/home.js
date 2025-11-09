// public/js/home.js
import { store } from './data-store.js';

function handleResumeUpload(file) {
    console.log("handleResumeUpload called");
    if (!file) {
        return;
    }

    const profile = store.createDraftProfile();
    store.uploadResume(profile.id, file)
        .then(() => store.ingestResume(profile.id))
        .then(() => {
            window.location.href = `/owner_preview.html?profileId=${profile.id}&ownerPreview=1`;
        })
        .catch(error => {
            console.error("Error during resume upload and ingestion:", error);
            // still redirect, but with an error message
            window.location.href = `/owner_preview.html?profileId=${profile.id}&ownerPreview=1&error=ingestion-failed`;
        });
}

function init() {
    console.log("home.js loaded");
    const dropZone = document.querySelector('[data-action="drag-drop-zone"]');
    const browseButton = document.querySelector('#browse-files-btn');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.style.display = 'none';

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-primary');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-primary');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-primary');
            const file = e.dataTransfer.files[0];
            handleResumeUpload(file);
        });
    }

    if (browseButton) {
        browseButton.addEventListener('click', () => {
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleResumeUpload(file);
    });
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
