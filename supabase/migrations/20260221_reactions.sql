-- Migration: Reactions table for lightweight feedback
-- Created: 2026-02-21

CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(content_id, user_id, type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_content_id ON reactions(content_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view reactions" ON reactions;
CREATE POLICY "Team members can view reactions" ON reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = reactions.content_id
        AND EXISTS (
          SELECT 1
          FROM team_members
          WHERE team_members.team_id = content.team_id
            AND team_members.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Team members can create reactions" ON reactions;
CREATE POLICY "Team members can create reactions" ON reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = reactions.content_id
        AND EXISTS (
          SELECT 1
          FROM team_members
          WHERE team_members.team_id = content.team_id
            AND team_members.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Reaction owners can delete reactions" ON reactions;
CREATE POLICY "Reaction owners can delete reactions" ON reactions
  FOR DELETE
  USING (auth.uid() = user_id);
