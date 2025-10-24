// Cloudinary direct upload helpers
import { cldUploadEndpoint, cldMp4, cldHls, cldPosterFromVideo } from './cloudinary-helpers.js';

async function getSignature(body) {
  return fetch('/api/v1/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  }).then(r => r.json());
}

export async function uploadVideoToCloudinary(file, profileId) {
  const sig = await getSignature({ 
    profileId, 
    folder: 'openinterview/videos', 
    resource_type: 'auto' 
  });
  
  const { cloudName, apiKey, timestamp, signature, uploadPreset, folder } = sig;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', apiKey);
  fd.append('timestamp', timestamp);
  fd.append('signature', signature);
  fd.append('upload_preset', uploadPreset);
  fd.append('folder', folder);
  fd.append('resource_type', 'auto');

  const res = await fetch(cldUploadEndpoint(cloudName, 'auto'), { 
    method: 'POST', 
    body: fd 
  }).then(r => r.json());
  
  if (res.error) throw new Error(res.error.message);

  const publicId = res.public_id; // includes folder path
  return {
    provider: 'cloudinary',
    publicId,
    mp4Url: cldMp4(cloudName, publicId),
    hlsUrl: cldHls(cloudName, publicId),
    width: res.width,
    height: res.height,
    duration: res.duration,
    posterMode: 'auto',
    posterUrl: cldPosterFromVideo(cloudName, publicId),
    createdAt: Date.now()
  };
}

export async function uploadImageToCloudinary(file, profileId) {
  const sig = await getSignature({ 
    profileId, 
    folder: 'openinterview/thumbnails', 
    resource_type: 'image' 
  });
  
  const { cloudName, apiKey, timestamp, signature, uploadPreset, folder } = sig;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', apiKey);
  fd.append('timestamp', timestamp);
  fd.append('signature', signature);
  fd.append('upload_preset', uploadPreset);
  fd.append('folder', folder);
  fd.append('resource_type', 'image');

  const res = await fetch(cldUploadEndpoint(cloudName, 'image'), { 
    method: 'POST', 
    body: fd 
  }).then(r => r.json());
  
  if (res.error) throw new Error(res.error.message);

  return {
    posterMode: 'custom',
    posterUrl: res.secure_url
  };
}
