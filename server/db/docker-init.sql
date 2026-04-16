-- OpenInterview.me Database Schema
-- This file runs automatically when Postgres container starts

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar TEXT,
  status VARCHAR(20) DEFAULT 'anonymous',
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table (linked to users)
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name VARCHAR(255),
  title VARCHAR(255),
  city VARCHAR(255),
  location VARCHAR(255),
  about TEXT,
  summary TEXT,
  avatar_url TEXT,
  video_url TEXT,
  video_file_id VARCHAR(255),
  resume_file_id VARCHAR(255),
  public_handle VARCHAR(255) UNIQUE,
  visibility VARCHAR(50) DEFAULT 'private',
  is_default BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  person JSONB DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  social JSONB DEFAULT '{}',
  contact JSONB DEFAULT '{}',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  thumbnail_url TEXT,
  thumbnail_file_id TEXT
);

-- Entitlements table (usage limits per user)
-- CREATE TABLE IF NOT EXISTS entitlements (
--   id VARCHAR(255) PRIMARY KEY,
--   user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--   plan VARCHAR(50) DEFAULT 'free',
--   shares_used INTEGER DEFAULT 0,
--   shares_limit INTEGER DEFAULT 1,
--   bookings_used INTEGER DEFAULT 0,
--   bookings_limit INTEGER DEFAULT 0,
--   credits_reset_at TIMESTAMP,
--   stripe_customer_id VARCHAR(255),
--   stripe_subscription_id VARCHAR(255),
--   stripe_subscription_status VARCHAR(50),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
CREATE TABLE IF NOT EXISTS entitlements (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free',

  shares_used INTEGER DEFAULT 0,
  shares_limit INTEGER DEFAULT 1,

  bookings_used INTEGER DEFAULT 0,
  bookings_limit INTEGER DEFAULT 0,

  views_used BIGINT NOT NULL DEFAULT 0,
  video_storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  doc_storage_used_bytes BIGINT NOT NULL DEFAULT 0,

  credits_reset_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_subscription_status VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stripe Webhook Events (Idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(255) PRIMARY KEY,
  public_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mime VARCHAR(255),
  size_label VARCHAR(50),
  size_bytes BIGINT DEFAULT 0,
  url TEXT,
  kind VARCHAR(32) NOT NULL DEFAULT 'attachment',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(255) PRIMARY KEY,
  profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booker_name VARCHAR(255),
  booker_email VARCHAR(255),
  message TEXT,
  duration INTEGER DEFAULT 30,
  start_time timestamptz,
  recruiter_timezone VARCHAR(50),
  status VARCHAR(50) DEFAULT 'confirmed',
  ics_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Availability table
CREATE TABLE IF NOT EXISTS availability (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  slots JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  profile_id VARCHAR(255),
  user_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plans table (single source of truth for plan definitions)
-- CREATE TABLE IF NOT EXISTS plans (
--   code VARCHAR(50) PRIMARY KEY,          -- free, starter, pro, premium
--   name VARCHAR(100) NOT NULL,
--   price_cents INTEGER NOT NULL DEFAULT 0,
--   currency VARCHAR(10) NOT NULL DEFAULT 'USD',
--   interval VARCHAR(20) NOT NULL DEFAULT 'month',
--   shares_limit INTEGER NOT NULL,
--   bookings_limit INTEGER NOT NULL,
--   stripe_price_id VARCHAR(255) UNIQUE,   -- MAY BE NULL
--   is_active BOOLEAN NOT NULL DEFAULT true,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
CREATE TABLE IF NOT EXISTS plans (
  code VARCHAR(50) PRIMARY KEY,          -- free, core, pro, elite (or your codes)
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  interval VARCHAR(20) NOT NULL DEFAULT 'month',

  -- Allow NULL for unlimited, 0 for disabled, N for capped
  shares_limit INTEGER,
  bookings_limit INTEGER,

  max_interview_length_seconds INTEGER NOT NULL DEFAULT 420,
  views_limit BIGINT,
  video_storage_limit_bytes BIGINT,
  doc_storage_limit_bytes BIGINT,
  max_resume_file_size_bytes BIGINT NOT NULL DEFAULT 5242880,

  stripe_price_id VARCHAR(255) UNIQUE,   -- MAY BE NULL
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_public_handle ON profiles(public_handle);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_profile_id ON bookings(profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_profile_id ON analytics_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Ensure slot uniqueness for active bookings (pending + confirmed)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_booking_profile_start_active 
  ON bookings(profile_id, start_time) 
  WHERE status IN ('pending', 'confirmed');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entitlements_updated_at ON entitlements;
CREATE TRIGGER update_entitlements_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed plans with NULL stripe_price_id (intentional and valid)
INSERT INTO plans (code, name, price_cents, currency, interval, shares_limit, bookings_limit, stripe_price_id) VALUES
  ('free', 'Free', 0, 'USD', 'month', 1, 0, NULL),
  ('starter', 'Starter', 0, 'USD', 'month', 0, 15, NULL),
  ('pro', 'Pro', 0, 'USD', 'month', 0, 50, NULL),
  ('premium', 'Premium', 0, 'USD', 'month', 0, 500, NULL)
ON CONFLICT (code) DO NOTHING;

-- Schema improvement: Remove ad-hoc entitlement ID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ✅ Ensure entitlements.id is DB-generated (removes Date.now() / ad-hoc IDs)
ALTER TABLE entitlements
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;



CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON stripe_webhook_events(event_type);


-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO openinterview;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO openinterview;



