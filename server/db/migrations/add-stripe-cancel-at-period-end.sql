-- Migration: when user schedules cancel at period end in Stripe portal
ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end TIMESTAMP DEFAULT NULL;
