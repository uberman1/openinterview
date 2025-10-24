import type { Express } from "express";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary (will use env vars)
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET = 'oi_signed_videos'
} = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

export function mountCloudinaryRoutes(app: Express, apiBase: string) {
  // POST /api/v1/upload/sign - Generate signed upload parameters for direct Cloudinary upload
  app.post(`${apiBase}/upload/sign`, (req, res) => {
    const { 
      folder = 'openinterview/assets', 
      public_id, 
      profileId = 'anonymous', 
      resource_type 
    } = req.body || {};

    // Validate required env vars
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        error: 'Cloudinary not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const finalFolder = `${folder}/${profileId}`;

    // Build parameters to sign
    const paramsToSign: Record<string, string | number> = {
      folder: finalFolder,
      timestamp,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
    };

    if (public_id) {
      paramsToSign.public_id = public_id;
    }

    if (resource_type) {
      paramsToSign.resource_type = resource_type;
    }

    // Generate signature according to Cloudinary spec
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map(k => `${k}=${paramsToSign[k]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(`${toSign}${CLOUDINARY_API_SECRET}`)
      .digest('hex');

    // Return all necessary data for client-side upload
    res.json({
      timestamp,
      signature,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      folder: finalFolder,
      public_id: public_id || undefined,
      resource_type: resource_type || 'auto'
    });
  });
}
