-- Migration: Core table RLS and membership-based policies
-- Created: 2026-02-21

ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS templates ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Team members can view teammate profiles" ON users;
CREATE POLICY "Team members can view teammate profiles" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members viewer
      JOIN team_members teammate
        ON viewer.team_id = teammate.team_id
      WHERE viewer.user_id = auth.uid()
        AND teammate.user_id = users.id
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- teams
DROP POLICY IF EXISTS "Team members can view teams" ON teams;
CREATE POLICY "Team members can view teams" ON teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;
CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Team admins can update teams" ON teams;
CREATE POLICY "Team admins can update teams" ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Team owners can delete teams" ON teams;
CREATE POLICY "Team owners can delete teams" ON teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = teams.id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'OWNER'
    )
  );

-- team_members
DROP POLICY IF EXISTS "Team members can view membership roster" ON team_members;
CREATE POLICY "Team members can view membership roster" ON team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members member
      WHERE member.team_id = team_members.team_id
        AND member.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team admins can add members" ON team_members;
CREATE POLICY "Team admins can add members" ON team_members
  FOR INSERT
  WITH CHECK (
    (
      user_id = auth.uid()
      AND role = 'OWNER'
      AND NOT EXISTS (
        SELECT 1
        FROM team_members existing
        WHERE existing.team_id = team_members.team_id
      )
    )
    OR EXISTS (
      SELECT 1
      FROM team_members actor
      WHERE actor.team_id = team_members.team_id
        AND actor.user_id = auth.uid()
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Team admins can update members" ON team_members;
CREATE POLICY "Team admins can update members" ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members actor
      WHERE actor.team_id = team_members.team_id
        AND actor.user_id = auth.uid()
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members actor
      WHERE actor.team_id = team_members.team_id
        AND actor.user_id = auth.uid()
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Team admins or self can remove members" ON team_members;
CREATE POLICY "Team admins or self can remove members" ON team_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM team_members actor
      WHERE actor.team_id = team_members.team_id
        AND actor.user_id = auth.uid()
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  );

-- content
DROP POLICY IF EXISTS "Public content access with token" ON content;
CREATE POLICY "Public content access with token" ON content
  FOR SELECT
  USING (share_token IS NOT NULL);

DROP POLICY IF EXISTS "Team members can view content" ON content;
CREATE POLICY "Team members can view content" ON content
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team editors can create content" ON content;
CREATE POLICY "Team editors can create content" ON content
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

DROP POLICY IF EXISTS "Team editors can update content" ON content;
CREATE POLICY "Team editors can update content" ON content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

DROP POLICY IF EXISTS "Team editors can delete content" ON content;
CREATE POLICY "Team editors can delete content" ON content
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = content.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- content_versions
DROP POLICY IF EXISTS "Team members can view content versions" ON content_versions;
CREATE POLICY "Team members can view content versions" ON content_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = content_versions.content_id
        AND EXISTS (
          SELECT 1
          FROM team_members
          WHERE team_members.team_id = content.team_id
            AND team_members.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Team editors can create content versions" ON content_versions;
CREATE POLICY "Team editors can create content versions" ON content_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = content_versions.content_id
        AND EXISTS (
          SELECT 1
          FROM team_members
          WHERE team_members.team_id = content.team_id
            AND team_members.user_id = auth.uid()
            AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
        )
    )
  );

-- platform_accounts
DROP POLICY IF EXISTS "Team members can view platform accounts" ON platform_accounts;
CREATE POLICY "Team members can view platform accounts" ON platform_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = platform_accounts.team_id
        AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team editors can connect platform accounts" ON platform_accounts;
CREATE POLICY "Team editors can connect platform accounts" ON platform_accounts
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = platform_accounts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

DROP POLICY IF EXISTS "Team editors can update platform accounts" ON platform_accounts;
CREATE POLICY "Team editors can update platform accounts" ON platform_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = platform_accounts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = platform_accounts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

DROP POLICY IF EXISTS "Team admins can delete platform accounts" ON platform_accounts;
CREATE POLICY "Team admins can delete platform accounts" ON platform_accounts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = platform_accounts.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- templates
DROP POLICY IF EXISTS "Team members can view templates" ON templates;
CREATE POLICY "Team members can view templates" ON templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = templates.team_id
        AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team editors can manage templates" ON templates;
CREATE POLICY "Team editors can manage templates" ON templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = templates.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );
