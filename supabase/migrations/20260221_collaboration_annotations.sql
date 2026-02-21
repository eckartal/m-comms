-- Migration: Collaboration annotations + change notes
-- Created: 2026-02-21

-- 1. Content annotations (inline comments)
CREATE TABLE IF NOT EXISTS content_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  start_offset INT NOT NULL,
  end_offset INT NOT NULL,
  text_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_annotations_content_id ON content_annotations(content_id);
CREATE INDEX IF NOT EXISTS idx_content_annotations_block_id ON content_annotations(block_id);
CREATE INDEX IF NOT EXISTS idx_content_annotations_status ON content_annotations(status);

ALTER TABLE content_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view annotations" ON content_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_annotations.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create annotations" ON content_annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_annotations.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

CREATE POLICY "Team members can update annotations" ON content_annotations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_annotations.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

-- 2. Annotation comments (threaded discussion)
CREATE TABLE IF NOT EXISTS annotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES content_annotations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_annotation_comments_annotation_id ON annotation_comments(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_comments_content_id ON annotation_comments(content_id);

ALTER TABLE annotation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view annotation comments" ON annotation_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = annotation_comments.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create annotation comments" ON annotation_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = annotation_comments.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

CREATE POLICY "Team members can update annotation comments" ON annotation_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = annotation_comments.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

CREATE POLICY "Team members can delete annotation comments" ON annotation_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = annotation_comments.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

-- 3. Change notes (why)
CREATE TABLE IF NOT EXISTS content_change_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES content_activity(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_notes_content_id ON content_change_notes(content_id);
CREATE INDEX IF NOT EXISTS idx_change_notes_activity_id ON content_change_notes(activity_id);

ALTER TABLE content_change_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view change notes" ON content_change_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_change_notes.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create change notes" ON content_change_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_change_notes.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );

