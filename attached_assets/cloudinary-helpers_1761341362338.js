// patches/files/js/cloudinary-helpers.js
export const cldBase = (cloud) => `https://res.cloudinary.com/${cloud}`;
export const cldUploadEndpoint = (cloud, rt='auto') => `https://api.cloudinary.com/v1_1/${cloud}/${rt}/upload`;

export const cldMp4 = (cloud, publicId) => `${cldBase(cloud)}/video/upload/q_auto,f_mp4/${publicId}.mp4`;
export const cldHls = (cloud, publicId) => `${cldBase(cloud)}/video/upload/sp_auto/vc_auto/${publicId}.m3u8`;

// first-frame poster from video
export const cldPosterFromVideo = (cloud, publicId) =>
  `${cldBase(cloud)}/video/upload/so_0/q_auto,f_jpg/${publicId}.jpg`;
