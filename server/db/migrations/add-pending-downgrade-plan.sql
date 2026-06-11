-- Migration: add pending_downgrade_plan to entitlements
-- When a user downgrades, the new plan code is stored here and applied at the next billing renewal.
-- On renewal (invoice.payment_succeeded) this value is read, applied, then cleared.
ALTER TABLE entitlements
  ADD COLUMN IF NOT EXISTS pending_downgrade_plan VARCHAR(50) DEFAULT NULL;
