-- Migration 045: Allow services to use negotiated/variable pricing.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE services
  ALTER COLUMN price DROP NOT NULL;

COMMIT;
