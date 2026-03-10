DROP TABLE IF EXISTS availability;

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id VARCHAR(255) NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/Los_Angeles',
  window_days INTEGER NOT NULL DEFAULT 60,
  duration_minutes INTEGER NOT NULL DEFAULT 7,
  slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_availability_user_id ON availability(user_id);

