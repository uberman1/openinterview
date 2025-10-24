// Cloudinary URL helpers for video and image delivery
export const cldBase = (cloud) => `https://res.cloudinary.com/${cloud}`;
export const cldUploadEndpoint = (cloud, rt='auto') => `https://api.cloudinary.com/v1_1/${cloud}/${rt}/upload`;

// Video delivery URLs
export const cldMp4 = (cloud, publicId) => `${cldBase(cloud)}/video/upload/q_auto,f_mp4/${publicId}.mp4`;
export const cldHls = (cloud, publicId) => `${cldBase(cloud)}/video/upload/sp_auto/vc_auto/${publicId}.m3u8`;

// Extract first frame from video as poster image
export const cldPosterFromVideo = (cloud, publicId) =>
  `${cldBase(cloud)}/video/upload/so_0/q_auto,f_jpg/${publicId}.jpg`;
