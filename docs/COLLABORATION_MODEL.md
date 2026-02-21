# Collaboration Model (Step 2)

Date: 2026-02-21

## Goal
Define the collaboration data model and interaction flow for:
- Inline annotations on copy
- “Why” notes on changes
- Diff visibility for edits
- Notion-like discussion UX

## Data Model

### 1) Inline Annotations
**Table: `content_annotations`**
- `id` (UUID)
- `content_id` (UUID, FK content)
- `block_id` (TEXT) — block identifier in the editor
- `start_offset` (INT) — text start
- `end_offset` (INT) — text end
- `text_snapshot` (TEXT) — copy excerpt at time of comment
- `status` (TEXT) — `OPEN` | `RESOLVED`
- `created_by` (UUID, FK users)
- `created_at` (TIMESTAMPTZ)
- `resolved_by` (UUID, FK users, nullable)
- `resolved_at` (TIMESTAMPTZ, nullable)

**Table: `annotation_comments`**
- `id` (UUID)
- `annotation_id` (UUID, FK content_annotations)
- `content_id` (UUID, FK content)
- `user_id` (UUID, FK users)
- `text` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### 2) Change Reasons (“Why”)
**Table: `content_change_notes`**
- `id` (UUID)
- `content_id` (UUID, FK content)
- `activity_id` (UUID, FK content_activity)
- `user_id` (UUID, FK users)
- `reason` (TEXT)
- `created_at` (TIMESTAMPTZ)

### 3) Content Versions (for diffs)
Reuse existing `content_versions`:
- Store the block state on every meaningful save (manual or autosave threshold).
- Link version IDs to `content_activity` entries.

Add to `content_activity`:
- `from_version_id` (UUID, nullable)
- `to_version_id` (UUID, nullable)

## API Surface

### Inline Annotation APIs
- `POST /api/content/[id]/annotations`  
  Create annotation + first comment.
- `GET /api/content/[id]/annotations`  
  List annotations with comments.
- `POST /api/annotations/[id]/comments`  
  Add comment to annotation.
- `PATCH /api/annotations/[id]`  
  Resolve/reopen.

### Change Notes APIs
- `POST /api/content/[id]/change-notes`  
  Attach “why” note to a recent activity.

### Diff APIs
- `GET /api/content/[id]/diff?from=...&to=...`  
  Returns block-level diff (computed server-side).

## UX Flow (Notion-like)

### Inline Comment Flow
1. Highlight text in a block.
2. Floating action bubble appears → “Comment”.
3. Comment panel opens inline (right side or popover).
4. Threaded replies, resolve/reopen.

### Change “Why” Flow
1. User changes status or schedule.
2. Small prompt: “Reason (optional)” with quick text input.
3. Stored in `content_change_notes` and surfaced in activity timeline.

### Diff Flow
1. Activity entry shows “View diff”.
2. Clicking opens side-by-side or inline diff per block.
3. Diff highlights changes in the exact block text.

## UX Principles (Must-Haves)
- Inline, context-bound comments (no modal friction).
- Auto-save with visible “Saved just now by X”.
- Timeline that tells a story: who changed what + why.
- No clutter — actions appear on hover or selection.

## Implementation Order
1. Add DB tables for annotations + change notes.
2. Add API endpoints and wire UI to fetch/render.
3. Add “why” prompt on status/schedule/assignee changes.
4. Add diff rendering for versions.

