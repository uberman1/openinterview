-- Migration: Add profile_name column to profiles table
-- Date: 2025-12-04
-- Description: Adds profile_name field to allow users to name their profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_name VARCHAR(255);
