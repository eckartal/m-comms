-- Migration: Team invite tokens for secure join links
-- Created: 2026-02-21

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT,
  invite_role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (invite_role IN ('ADMIN', 'EDITOR', 'VIEWER')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_expires_at ON team_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_team_invites_invited_email ON team_invites(invited_email);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team admins can create invites" ON team_invites;
CREATE POLICY "Team admins can create invites" ON team_invites
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Team admins can view invites" ON team_invites;
CREATE POLICY "Team admins can view invites" ON team_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Team admins can revoke invites" ON team_invites;
CREATE POLICY "Team admins can revoke invites" ON team_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Invites can be marked used by recipient" ON team_invites;
CREATE POLICY "Invites can be marked used by recipient" ON team_invites
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (used_by = auth.uid());
