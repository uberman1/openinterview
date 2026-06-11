-- Widget: one-time magic login tokens
-- Mirrors the resumegpt_handoff_tokens pattern already in use.
CREATE TABLE IF NOT EXISTS magic_login_tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_login_tokens_token_hash ON magic_login_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_login_tokens_user_id    ON magic_login_tokens(user_id);
