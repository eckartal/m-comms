-- Migration: Guest threaded annotations for shared links
-- Created: 2026-02-23

CREATE TABLE IF NOT EXISTS share_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  text_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_by_name TEXT NOT NULL,
  created_by_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS share_annotation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID NOT NULL REFERENCES share_annotations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_annotations_status_check'
  ) THEN
    ALTER TABLE share_annotations
      ADD CONSTRAINT share_annotations_status_check
      CHECK (status IN ('OPEN', 'RESOLVED'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_annotations_offsets_check'
  ) THEN
    ALTER TABLE share_annotations
      ADD CONSTRAINT share_annotations_offsets_check
      CHECK (start_offset >= 0 AND end_offset > start_offset);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_annotations_creator_name_length_check'
  ) THEN
    ALTER TABLE share_annotations
      ADD CONSTRAINT share_annotations_creator_name_length_check
      CHECK (char_length(created_by_name) <= 80);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_annotation_comments_author_name_length_check'
  ) THEN
    ALTER TABLE share_annotation_comments
      ADD CONSTRAINT share_annotation_comments_author_name_length_check
      CHECK (char_length(author_name) <= 80);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_annotation_comments_text_length_check'
  ) THEN
    ALTER TABLE share_annotation_comments
      ADD CONSTRAINT share_annotation_comments_text_length_check
      CHECK (char_length(text) <= 4000);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_share_annotations_content_id ON share_annotations(content_id);
CREATE INDEX IF NOT EXISTS idx_share_annotations_status ON share_annotations(status);
CREATE INDEX IF NOT EXISTS idx_share_annotations_created_at ON share_annotations(created_at);

CREATE INDEX IF NOT EXISTS idx_share_annotation_comments_annotation_id ON share_annotation_comments(annotation_id);
CREATE INDEX IF NOT EXISTS idx_share_annotation_comments_content_id ON share_annotation_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_share_annotation_comments_created_at ON share_annotation_comments(created_at);

ALTER TABLE share_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_annotation_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read share annotations for shared content" ON share_annotations;
CREATE POLICY "Public can read share annotations for shared content" ON share_annotations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotations.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can create share annotations for shared content" ON share_annotations;
CREATE POLICY "Public can create share annotations for shared content" ON share_annotations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotations.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can update share annotations for shared content" ON share_annotations;
CREATE POLICY "Public can update share annotations for shared content" ON share_annotations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotations.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can read share annotation comments for shared content" ON share_annotation_comments;
CREATE POLICY "Public can read share annotation comments for shared content" ON share_annotation_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotation_comments.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can create share annotation comments for shared content" ON share_annotation_comments;
CREATE POLICY "Public can create share annotation comments for shared content" ON share_annotation_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotation_comments.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can update share annotation comments for shared content" ON share_annotation_comments;
CREATE POLICY "Public can update share annotation comments for shared content" ON share_annotation_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotation_comments.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public can delete share annotation comments for shared content" ON share_annotation_comments;
CREATE POLICY "Public can delete share annotation comments for shared content" ON share_annotation_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM content
      WHERE content.id = share_annotation_comments.content_id
        AND content.share_token IS NOT NULL
    )
  );

DROP TRIGGER IF EXISTS set_share_annotation_comments_updated_at ON share_annotation_comments;
CREATE TRIGGER set_share_annotation_comments_updated_at
  BEFORE UPDATE ON share_annotation_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
