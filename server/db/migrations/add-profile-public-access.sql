-- One shareable access token per public profile (recruiter link exchange).
CREATE TABLE IF NOT EXISTS profile_public_access (
  profile_id VARCHAR(255) PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  token_secret VARCHAR(128) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_public_access_token
  ON profile_public_access (token_secret)
  WHERE revoked_at IS NULL;
