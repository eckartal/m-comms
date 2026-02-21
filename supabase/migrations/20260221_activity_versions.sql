-- Migration: Add version links to content_activity
-- Created: 2026-02-21

ALTER TABLE content_activity
  ADD COLUMN IF NOT EXISTS from_version_id UUID,
  ADD COLUMN IF NOT EXISTS to_version_id UUID;

