// server/config/defaults.js
// Default media assets configuration for WP01 enhancements

/**
 * Default avatar URL for users without custom avatar
 * Can be overridden via DEFAULT_AVATAR_URL environment variable
 */
export const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL || '/defaults/default-avatar.jpeg';

/**
 * Default video URL for users without custom video
 * Can be overridden via DEFAULT_VIDEO_URL environment variable
 */
export const DEFAULT_VIDEO_URL = process.env.DEFAULT_VIDEO_URL || '/defaults/default-video.mp4';

export default {
  DEFAULT_AVATAR_URL,
  DEFAULT_VIDEO_URL
};
