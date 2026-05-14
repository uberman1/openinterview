// patches/files/routes/upload-sign.js
import express from 'express';
import crypto from 'crypto';
import { CLOUDINARY_UPLOAD_PRESET } from '../server/cloudinary.js';

const router = express.Router();

router.post('/api/upload/sign', (req, res) => {
  const { folder = 'openinterview/assets', public_id, profileId = 'anonymous', resource_type } = req.body || {};
  const timestamp = Math.floor(Date.now() / 1000);
  const finalFolder = `${folder}/${profileId}`;

  const paramsToSign = {
    folder: finalFolder,
    timestamp,
    upload_preset: CLOUDINARY_UPLOAD_PRESET,
    ...(public_id ? { public_id } : {}),
    ...(resource_type ? { resource_type } : {})
  };

  const toSign = Object.keys(paramsToSign)
    .sort()
    .map(k => `${k}=${paramsToSign[k]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(`${toSign}${process.env.CLOUDINARY_API_SECRET}`)
    .digest('hex');

  res.json({
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: finalFolder,
    public_id: public_id || undefined,
    resource_type: resource_type || 'auto'
  });
});

export default router;
