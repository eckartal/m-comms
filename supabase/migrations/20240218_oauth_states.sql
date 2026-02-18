-- Migration: OAuth States Table for CSRF Protection
-- Created: 2024-02-18

-- Create oauth_states table for storing OAuth state tokens
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  platform TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  state_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_team_id ON oauth_states(team_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state_token ON oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable Row Level Security
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own OAuth states
CREATE POLICY "Users can view own oauth states" ON oauth_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own OAuth states
CREATE POLICY "Users can create oauth states" ON oauth_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own OAuth states
CREATE POLICY "Users can delete oauth states" ON oauth_states
  FOR DELETE
  USING (auth.uid() = user_id);
