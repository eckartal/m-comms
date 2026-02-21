-- Migration: OAuth state return context metadata for inline/popup connect UX
-- Created: 2026-02-21

ALTER TABLE oauth_states
ADD COLUMN IF NOT EXISTS team_slug TEXT,
ADD COLUMN IF NOT EXISTS return_to TEXT,
ADD COLUMN IF NOT EXISTS connect_mode TEXT DEFAULT 'redirect';

CREATE INDEX IF NOT EXISTS idx_oauth_states_connect_mode ON oauth_states(connect_mode);
