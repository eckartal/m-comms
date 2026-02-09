-- Migration: Comments and Public Sharing Features
-- Created: 2024-02-09

-- 1. Add share_token and share_settings to content table
ALTER TABLE content ADD COLUMN IF NOT EXISTS share_token TEXT;
ALTER TABLE content ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}'::jsonb;

-- 2. Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_content_share_token ON content(share_token);

-- 4. Create updated_at trigger for comments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 6. Comments policy - team members can view comments
CREATE POLICY "Team members can view comments" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = comments.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

-- 7. Comments policy - authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. Comments policy - comment owners can update
CREATE POLICY "Comment owners can update" ON comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 9. Comments policy - comment owners can delete
CREATE POLICY "Comment owners can delete" ON comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- 10. Content policy - public sharing with token
CREATE POLICY "Public content access with token" ON content
  FOR SELECT
  USING (
    share_token IS NOT NULL
    AND (
      -- Authenticated team members
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
      -- OR has valid share token (handled by API layer)
      OR true
    )
  );

-- 11. Content policy - team members can update share settings
CREATE POLICY "Team members can update share settings" ON content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = content.team_id
      AND team_members.user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- 12. Create content_schedule table for publish history
CREATE TABLE IF NOT EXISTS content_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  platform_account_id UUID NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  platform_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Content schedule indexes
CREATE INDEX IF NOT EXISTS idx_content_schedule_content_id ON content_schedule(content_id);
CREATE INDEX IF NOT EXISTS idx_content_schedule_platform_account_id ON content_schedule(platform_account_id);

-- 14. Enable RLS for content_schedule
ALTER TABLE content_schedule ENABLE ROW LEVEL SECURITY;

-- 15. Content schedule policies
CREATE POLICY "Team members can view schedule" ON content_schedule
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_schedule.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Team members can create schedule" ON content_schedule
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM content
      WHERE content.id = content_schedule.content_id
      AND EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND role IN ('OWNER', 'ADMIN', 'EDITOR')
      )
    )
  );