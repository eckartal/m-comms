# Collaboration UX Audit (Step 1)

Date: 2026-02-21

## Scope
Audit current collaboration capabilities for copywriting, change visibility, and discussion UX. Identify gaps for Notion-like smoothness and set the baseline for implementation.

## Current Capabilities (What Exists)
- **Comments (threaded):** `CommentList`, `CommentItem`, `CommentInput` provide threaded comments with replies. Comments are shown in a side sheet on the content detail page.
- **Activity feed (basic):** `content_activity` table captures status/schedule/assignee changes and publish events. UI shows a timeline in content detail.
- **Ownership:** Owner assignment supported via `assigned_to` and visible in cards/list/calendar.
- **Sharing:** Share link generation and public view exist (read-only + comments).
- **Publishing:** Publish modal triggers platform posting and records schedule entries.

## Gaps vs. Collaboration Expectations

### 1) Copywriting collaboration
- **Missing inline annotations on text**: Comments are not anchored to specific words/phrases/blocks.
- **No highlight-to-comment flow**: Users must open a side sheet rather than select text and comment in place.
- **No inline resolution in context**: Resolved comments aren’t tied to specific locations in copy.

### 2) Change visibility (who/what/why)
- **No “why” notes** on status change, schedule change, or content edits.
- **No diff view** to show text changes between versions.
- **No automatic content-change activity logs** (only status/schedule/assignee + publish).

### 3) Notion-like smoothness
- **No lightweight inline notes** attached to blocks or selections.
- **Context switching** (sheet for comments) adds friction.
- **Limited keyboard flow**: no slash/command actions for comment or assignment.

### 4) Team collaboration smoothness
- **No presence indicators** (who is viewing or editing).
- **No “last updated by”** context near the content header.
- **No notifications** for mentions or status transitions.

## UX Expectations (Critical)
These are non-negotiable for a high-quality collaboration experience:
1. **Inline comments** anchored to selected text or blocks.
2. **Instant visibility of who changed what and why.**
3. **Low-friction discussion**: highlight → comment → resolve without leaving context.
4. **Clear ownership** in all views, plus explicit handoff actions (e.g., “Needs Review” with note).
5. **Fast keyboard-first flow** for comments and actions.

## Proposed Collaboration Model (Target)
- **Inline annotation**:
  - `content_id`, `block_id`, `start_offset`, `end_offset`, `text_snapshot`
  - Supports resolving, replies, and mentions.
- **Change log with reason**:
  - When status/schedule/assignee changes: prompt optional “why”.
  - For content edits: record content version + reason note.
- **Diff UI**:
  - Show side-by-side or inline diff for text blocks.
  - Link diff to activity log entries.

## Step 1 Output (Audit Results Summary)
- The current system supports basic comments and activity, but lacks inline annotation and “why” notes.
- Activity logging is partial (status/schedule/assignee/publish only).
- The UX is functional but not “Notion-smooth”: collaboration is context-switched and lacks inline discussion.

## Next Step (Design)
Define the collaboration data model and UI interaction flow:
- Inline annotations & block-level comments
- Diff + “why” logging
- Activity view upgrades

