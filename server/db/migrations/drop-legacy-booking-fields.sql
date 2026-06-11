-- Migration to drop legacy scheduled_date and scheduled_time columns
-- and enforce usage of start_time

-- 1. Backfill start_time if missing (best effort from legacy fields)
-- Assumes server timezone or inputs were effectively local time
UPDATE bookings 
SET start_time = (scheduled_date || 'T' || scheduled_time || ':00')::timestamp 
WHERE start_time IS NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL;

-- 2. Drop legacy columns
ALTER TABLE bookings DROP COLUMN IF EXISTS scheduled_date;
ALTER TABLE bookings DROP COLUMN IF EXISTS scheduled_time;
