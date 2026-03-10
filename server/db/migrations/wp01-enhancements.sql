-- WP01 Enhancements Migration
-- Adds support for anonymous users and default media assets
-- Date: December 13, 2025

-- Add status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'anonymous';

-- Make email column nullable for anonymous users
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add media URL columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Update existing users to 'registered' status (they have email/auth)
UPDATE users SET status = 'registered' WHERE email IS NOT NULL OR google_id IS NOT NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Create index on email for faster lookup during profile linking
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add comments for documentation
COMMENT ON COLUMN users.status IS 'User status: anonymous (before registration) or registered (after authentication)';
COMMENT ON COLUMN profiles.avatar_url IS 'Custom avatar URL, null means use default avatar';
COMMENT ON COLUMN profiles.video_url IS 'Custom video URL, null means use default video';
