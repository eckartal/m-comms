-- Migration: Content activity log
-- Created: 2026-02-21

-- 1. Create content_activity table
CREATE TABLE IF NOT EXISTS content_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  from_scheduled_at TIMESTAMPTZ,
  to_scheduled_at TIMESTAMPTZ,
  from_assigned_to UUID,
  to_assigned_to UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_content_activity_content_id ON content_activity(content_id);
CREATE INDEX IF NOT EXISTS idx_content_activity_team_id ON content_activity(team_id);
CREATE INDEX IF NOT EXISTS idx_content_activity_created_at ON content_activity(created_at);

-- 3. Enable RLS
ALTER TABLE content_activity ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Team members can view content activity" ON content_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = content_activity.team_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create content activity" ON content_activity
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = content_activity.team_id
      AND team_members.user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

