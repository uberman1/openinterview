-- Migration: Add kind column to files table
-- Date: 2024
-- Description: Adds kind column to categorize files as 'resume', 'video', or 'attachment'

-- Add the kind column with default value 'attachment' for existing records
ALTER TABLE files ADD COLUMN IF NOT EXISTS kind VARCHAR(32) NOT NULL DEFAULT 'attachment';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind);

-- Optional: Update existing records based on profile references
-- This attempts to mark files that are referenced as resumes or videos
UPDATE files f
SET kind = 'resume'
FROM profiles p
WHERE f.id = p.resume_file_id
  AND f.kind = 'attachment';

UPDATE files f
SET kind = 'video'
FROM profiles p
WHERE f.id = p.video_file_id
  AND f.kind = 'attachment';

-- Verify the migration
SELECT 
  kind, 
  COUNT(*) as count 
FROM files 
GROUP BY kind;
