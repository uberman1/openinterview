-- ResumeGPT Import Integration
-- Tracks every import attempt for logging, debugging, and replay safety.
-- Idempotency is enforced: only one successful import per (source, external_resume_id).

CREATE TABLE IF NOT EXISTS resumegpt_imports (
  id                  VARCHAR(255) PRIMARY KEY,
  source              VARCHAR(50)  NOT NULL DEFAULT 'resumegpt',
  external_resume_id  VARCHAR(500) NOT NULL,
  profile_id          VARCHAR(255),
  user_id             VARCHAR(255),
  status              VARCHAR(50)  NOT NULL DEFAULT 'pending',
  error               TEXT,
  request_payload     JSONB,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, external_resume_id)
);

CREATE TABLE IF NOT EXISTS resumegpt_handoff_tokens (
  id          VARCHAR(255) PRIMARY KEY,
  import_id   VARCHAR(255) NOT NULL REFERENCES resumegpt_imports(id) ON DELETE CASCADE,
  profile_id  VARCHAR(255) NOT NULL,
  token       VARCHAR(500) NOT NULL UNIQUE,
  used        BOOLEAN      NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resumegpt_imports_source_external
  ON resumegpt_imports(source, external_resume_id);

CREATE INDEX IF NOT EXISTS idx_resumegpt_handoff_tokens_token
  ON resumegpt_handoff_tokens(token);
