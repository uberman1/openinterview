-- Migration: Add thumbnail columns to profiles table
-- Date: 2026-01-10
-- Description: Adds thumbnail_url and thumbnail_file_id fields to allow users to store video thumbnails

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS thumbnail_file_id VARCHAR(255);
