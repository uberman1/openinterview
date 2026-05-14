-- OpenInterview.me Database Schema
-- All tables for WP1-WP5

-- Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar TEXT,
  timezone VARCHAR(100) DEFAULT 'America/Los_Angeles',
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_name VARCHAR(255),
  title VARCHAR(255) DEFAULT '',
  city VARCHAR(255) DEFAULT '',
  location VARCHAR(255) DEFAULT '',
  about TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  video_url TEXT,
  video_file_id VARCHAR(255),
  resume_file_id VARCHAR(255),
  public_handle VARCHAR(255) UNIQUE,
  visibility VARCHAR(50) DEFAULT 'private',
  is_default BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  person JSONB DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  skills JSONB DEFAULT '[]',
  social JSONB DEFAULT '{}',
  contact JSONB DEFAULT '{}',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Entitlements (usage limits)
CREATE TABLE IF NOT EXISTS entitlements (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free',
  shares_used INTEGER DEFAULT 0,
  shares_limit INTEGER DEFAULT 1,
  bookings_used INTEGER DEFAULT 0,
  bookings_limit INTEGER DEFAULT 0,
  credits_reset_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_subscription_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Files (resumes, videos)
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  mime VARCHAR(255),
  size_label VARCHAR(50),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(255) PRIMARY KEY,
  profile_id VARCHAR(255) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booker_name VARCHAR(255),
  booker_email VARCHAR(255),
  message TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  duration INTEGER DEFAULT 30,
  start_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'confirmed',
  ics_content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Note: Share links are managed via profiles.public_handle field
-- No separate share_links table needed per WP8 specification

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(public_handle);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_profile ON bookings(profile_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS users_timestamp ON users;
CREATE TRIGGER users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS profiles_timestamp ON profiles;
CREATE TRIGGER profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS entitlements_timestamp ON entitlements;
CREATE TRIGGER entitlements_timestamp BEFORE UPDATE ON entitlements FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS bookings_timestamp ON bookings;
CREATE TRIGGER bookings_timestamp BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Done
DO $$ BEGIN RAISE NOTICE 'OpenInterview database ready!'; END $$;
