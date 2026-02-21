-- Migration: OAuth token metadata columns for platform accounts
-- Created: 2026-02-21

ALTER TABLE IF EXISTS platform_accounts
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scope TEXT;
