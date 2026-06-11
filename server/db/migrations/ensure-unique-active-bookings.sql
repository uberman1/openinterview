-- Migration: Ensure booking slot uniqueness for active bookings
-- Replaces old index if exists and creates new one covering pending+confirmed

-- Drop old confirmed-only index if it exists (legacy)
DROP INDEX IF EXISTS uniq_booking_profile_start_confirmed;

-- Create new active (pending + confirmed) unique index
-- Note: This will fail if duplicates already exist. 
-- Manual cleanup of duplicates is required if this fails.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_profile_start_active 
  ON bookings(profile_id, start_time) 
  WHERE status IN ('pending', 'confirmed');
