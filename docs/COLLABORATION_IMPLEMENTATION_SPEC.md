# Collaboration UX Implementation Spec

Date: 2026-02-21  
Owner: Product + Engineering

## 1. Objective
Build a Notion-like collaboration experience in the `Collaboration` workspace that enables fast team handoff, contextual discussion, and clear change visibility.

Success criteria:
- Users can move content through workflow with minimal context switching.
- Users can discuss at text-level context and resolve threads.
- Users can always see who changed what and why.

## 2. Scope
In scope:
- Collaboration page UX/state improvements.
- Inline annotation and discussion flows.
- Activity + reason + diff visibility.
- Empty, loading, and error states.
- Keyboard shortcuts and optimistic interactions.

Out of scope (Phase 1-2):
- Full multiplayer co-editing (cursor-level CRDT).
- External notifications (email/Slack).
- Mobile-native app behavior beyond responsive web.

## 3. Personas and Jobs-to-be-Done
- Writer: create and handoff drafts quickly.
- Reviewer/Editor: leave precise feedback in context and approve/reject efficiently.
- Team lead: understand pipeline health (blocked/unassigned/overdue) at a glance.

Primary JTBD:
- "I need to see what requires my action now."
- "I need to comment exactly where copy should change."
- "I need to understand why status changed without asking in chat."

## 4. Current Baseline (Code)
Primary page:
- `src/app/(dashboard)/[teamSlug]/collaboration/page.tsx`

API dependencies:
- `GET /api/content` in `src/app/api/content/route.ts`
- `GET /api/teams/[id]/members` in `src/app/api/teams/[id]/members/route.ts`

Data primitives already present:
- `content_activity`, `content_annotations`, `annotation_comments`, `content_change_notes`
- migrations under `supabase/migrations/20260221_*`

## 5. Product Requirements
### 5.1 Core user outcomes
1. User can identify high-priority work in less than 5 seconds.
2. User can add feedback from text selection in less than 2 clicks.
3. User can inspect any status change with actor + timestamp + reason.

### 5.2 Must-have UX principles
- Context-first: discussion anchored to selected text/block.
- Actionable system states: every error/empty state gives next action.
- Minimal mode switching: keep actions on board/card where possible.
- Fast feedback: optimistic updates with recoverable undo where feasible.

## 6. Information Architecture
Top bar modules:
- Search input
- Filter chips: `Mine`, `Unassigned`, `Needs review`, `Blocked`, `Overdue`
- View switch: `Kanban`, `List`, `Calendar`
- CTA: `New Post`

Pipeline summary strip (new):
- `Needs Review` count
- `Unassigned` count
- `Overdue` count
- `Awaiting Approval` count

Main content:
- Board/List/Calendar view (existing, improved states)
- Optional right rail (toggle): `Activity`, `Open Threads`

## 7. State Design (Required)
### 7.1 Loading
- Replace full-page spinner with skeletons:
  - Kanban: 3 columns x 3 card skeletons
  - List: 8 row skeletons
  - Calendar: month grid placeholders

Acceptance:
- No blank page while loading.
- First paint includes visual structure within 300ms of route load.

### 7.2 Error
- Show structured error block:
  - Title: `Couldn't load collaboration data`
  - Body: API error message or mapped friendly message
  - Actions: `Retry` (primary), `Go to Teams` (secondary)

Acceptance:
- Error UI never shows raw stack traces.
- Retry re-runs both content and team-member fetch.

### 7.3 Empty states
1. First-use (no content in team)
- Title: `Start your first collaborative draft`
- CTA: `Create First Post`
- Secondary: `Use Template`

2. Filter empty
- Title: `No posts match this filter`
- CTA: `Clear Filters`

3. Column empty
- In-column microcopy: `Nothing in review yet`

4. Permission empty (403/401)
- Title: `You don't have access to this team's content`
- CTA: `Go to Teams`

Acceptance:
- Empty state variant chosen via deterministic conditions.

## 8. Collaboration Flows
### 8.1 Inline annotation flow
1. User highlights text in editor block.
2. Floating action appears: `Comment`.
3. User enters comment; creates annotation + first comment.
4. Thread appears in context and in right-rail `Open Threads`.
5. Thread can be resolved/reopened.

APIs:
- `POST /api/content/[contentId]/annotations`
- `GET /api/content/[contentId]/annotations`
- `POST /api/annotations/[annotationId]/comments`
- `PATCH /api/annotations/[annotationId]` (resolve/reopen)

Acceptance:
- Annotation remains attached when reopening content later.
- Resolve state reflected in both inline marker and thread list.

### 8.2 Status/schedule/assignee reason flow
1. User changes status/schedule/assignee.
2. Optional reason prompt appears inline.
3. If provided, reason linked to activity entry.

APIs:
- Existing update endpoint for content changes.
- `POST /api/content/[contentId]/change-notes`

Acceptance:
- Activity timeline renders `why` when provided.
- Missing reason does not block transition.

### 8.3 Diff flow
1. User opens activity item: `View Diff`.
2. Side panel displays block-level diff between versions.

API:
- `GET /api/content/[contentId]/diff?from=<versionId>&to=<versionId>`

Acceptance:
- Added/removed/edited text visually distinguishable.
- Empty/invalid version ids handled with clear message.

## 9. Data + API Contract Alignment
Known schema risk to resolve first:
- User fields differ (`name` vs `full_name`) across endpoints.

Required action:
- Standardize API response shape to:
  - `id`, `email`, `name`, `avatar_url`
- If DB uses `full_name`, map server-side to `name` before returning.

Acceptance:
- `/api/content` and `/api/teams/[id]/members` return consistent user objects.
- Collaboration page renders without field fallback hacks.

## 10. Frontend Implementation Plan
### 10.1 Page shell upgrades
File: `src/app/(dashboard)/[teamSlug]/collaboration/page.tsx`
- Add derived state model: `loading | ready | error | empty_first_use | empty_filtered | empty_permission`
- Add retry handler calling both fetchers
- Add filter chip bar and summary metrics strip

### 10.2 Reusable state components (new)
Suggested paths:
- `src/components/collaboration/CollabEmptyState.tsx`
- `src/components/collaboration/CollabErrorState.tsx`
- `src/components/collaboration/CollabSkeleton.tsx`
- `src/components/collaboration/PipelineSummary.tsx`

### 10.3 Right rail (new)
Suggested path:
- `src/components/collaboration/CollabRightRail.tsx`
Tabs:
- `Activity`
- `Open Threads`

### 10.4 Keyboard shortcuts
- `c`: add comment (when text selected)
- `a`: assign owner on focused card
- `r`: move to `IN_REVIEW`
- `/`: command palette entry point (future-ready)

Acceptance:
- Shortcuts disabled when typing in input/textarea.

## 11. Backend Implementation Plan
### 11.1 Stabilize content fetch
File: `src/app/api/content/route.ts`
- Ensure select clauses use valid user fields.
- Return typed error payload `{ error, code?, retryable? }`.

### 11.2 Annotations and notes endpoints
Validate existing routes:
- `src/app/api/content/[contentId]/annotations/route.ts`
- `src/app/api/annotations/[annotationId]/route.ts`
- `src/app/api/annotations/[annotationId]/comments/route.ts`
- `src/app/api/content/[contentId]/change-notes/route.ts`

Required behavior:
- Permission checks based on team membership + role.
- Consistent response envelope `{ data, error }`.

### 11.3 Diff endpoint
File:
- `src/app/api/content/[contentId]/diff/route.ts`

Required behavior:
- Validate `from`/`to` ids belong to content.
- Return structured diff by block id.

## 12. Instrumentation and Metrics
Add client events:
- `collab_view_loaded`
- `collab_empty_state_seen` (variant)
- `collab_retry_clicked`
- `annotation_created`
- `annotation_resolved`
- `change_reason_submitted`
- `diff_view_opened`

Add server metrics:
- `/api/content` error rate + status code distribution
- Median response time for collaboration APIs

## 13. Rollout Plan
### Phase 1 (Stability + UX states) [1 sprint]
- API field alignment and error payloads
- Loading/error/empty variants
- Retry and summary strip

Exit criteria:
- Collaboration fetch error < 2% over 7 days
- Empty/error states fully covered by tests

### Phase 2 (Inline collaboration) [1-2 sprints]
- Inline annotations + threads + resolve/reopen
- Right rail for open threads/activity

Exit criteria:
- >= 30% reviewed posts include at least one inline thread

### Phase 3 (Visibility + speed) [1 sprint]
- Diff integration from activity entries
- Keyboard shortcuts + optimistic undo

Exit criteria:
- Median time Draft -> In Review reduced by 20%

## 14. QA and Test Plan
### Unit
- State resolver chooses correct empty/error variant.
- User-field mapping layer returns normalized user shape.

### Integration
- Collaboration page load success/failure paths.
- Reason prompt persistence and activity linkage.
- Annotation thread lifecycle.

### E2E
- First-use team sees onboarding empty state.
- Filtered search shows filtered empty state.
- Comment -> resolve -> reopen flow persists.

## 15. Open Decisions
1. Should reason prompt be inline persistent field or post-action toast input?
2. Should `Needs Review` status be separate from `IN_REVIEW` for SLA tracking?
3. Should resolved threads be hidden by default or collapsed inline?

## 16. Definition of Done
- All required states implemented and QA-approved.
- API contracts normalized and documented.
- Keyboard and mouse flows both supported.
- Event instrumentation live for core collaboration actions.
- No generic `Failed to fetch content` surfaced to end users.
