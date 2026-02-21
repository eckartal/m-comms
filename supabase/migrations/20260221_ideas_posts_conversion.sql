-- Migration: Idea/Post item typing and conversion links
-- Created: 2026-02-21

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'POST',
  ADD COLUMN IF NOT EXISTS idea_state TEXT,
  ADD COLUMN IF NOT EXISTS source_idea_id UUID REFERENCES content(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_post_id UUID REFERENCES content(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE content
SET item_type = 'POST'
WHERE item_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_team_item_type ON content(team_id, item_type);
CREATE INDEX IF NOT EXISTS idx_content_item_type_idea_state ON content(item_type, idea_state);
CREATE INDEX IF NOT EXISTS idx_content_source_idea_id ON content(source_idea_id);
CREATE INDEX IF NOT EXISTS idx_content_converted_post_id ON content(converted_post_id);

ALTER TABLE content
  DROP CONSTRAINT IF EXISTS content_item_type_check;

ALTER TABLE content
  ADD CONSTRAINT content_item_type_check CHECK (item_type IN ('IDEA', 'POST'));

ALTER TABLE content
  DROP CONSTRAINT IF EXISTS content_idea_state_check;

ALTER TABLE content
  ADD CONSTRAINT content_idea_state_check CHECK (
    idea_state IS NULL OR idea_state IN ('INBOX', 'SHAPING', 'READY', 'CONVERTED', 'ARCHIVED')
  );
