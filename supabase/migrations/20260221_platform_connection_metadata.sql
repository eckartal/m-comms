-- Migration: Platform connection metadata clarity
-- Created: 2026-02-21

ALTER TABLE IF EXISTS platform_accounts
ADD COLUMN IF NOT EXISTS connection_mode TEXT NOT NULL DEFAULT 'real_oauth',
ADD COLUMN IF NOT EXISTS connection_status TEXT NOT NULL DEFAULT 'connected',
ADD COLUMN IF NOT EXISTS account_handle TEXT,
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_platform_accounts_connection_mode ON platform_accounts(connection_mode);
CREATE INDEX IF NOT EXISTS idx_platform_accounts_connection_status ON platform_accounts(connection_status);
