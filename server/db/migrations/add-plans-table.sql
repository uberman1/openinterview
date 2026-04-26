-- Migration: Add plans table as single source of truth for plan definitions
-- This introduces the plans catalog while keeping entitlements as enforcement layer

-- Add plans table
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

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed plans with NULL stripe_price_id (intentional and valid)
-- INSERT INTO plans (code, name, price_cents, currency, interval, shares_limit, bookings_limit, stripe_price_id) VALUES
--   ('free', 'Free', 0, 'USD', 'month', 1, 0, NULL),
--   ('starter', 'Starter', 0, 'USD', 'month', 0, 15, NULL),
--   ('pro', 'Pro', 0, 'USD', 'month', 0, 50, NULL),
--   ('premium', 'Premium', 0, 'USD', 'month', 0, 500, NULL)
-- ON CONFLICT (code) DO NOTHING;

-- Schema improvement: Remove ad-hoc entitlement ID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE entitlements 
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;


 
