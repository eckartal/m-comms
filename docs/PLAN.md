# Content Platform - Typefully + Notion Fusion

## Vision

Create a social media scheduling tool that combines:
- **Typefully's** scheduling power, thread optimization, and platform-specific workflows
- **Notion's** clean minimal design, block-based editing, and slash commands

**Core Promise:** "Write once, schedule anywhere — in a beautiful, distraction-free environment"

---

## Deep Analysis: What Makes Notion & Typefully Great

### Notion's Secret Sauce

| Principle | Implementation | Why It Works |
|-----------|---------------|--------------|
| **Zero UI** | No borders, shadows, or containers | Content becomes the interface |
| **Typography = UI** | Text size/weight/color = hierarchy | Faster scanning, less cognitive load |
| **Hover = Reveal** | Drag handles appear on hover | Clean until you need something |
| **Slash commands** | `/` inserts any block type | Keyboard-first, no toolbar clutter |
| **Inline everything** | No "edit mode" vs "view mode" | Fluid, natural interaction |
| **Emoji for actions** | Reactions instead of buttons | Friendly, familiar |
| **Generous padding** | Content breathes | Reduces stress, invites focus |

### Typefully's Secret Sauce

| Principle | Implementation | Why It Works |
|-----------|---------------|--------------|
| **Timeline first** | Schedule is the hero | Scheduling is the core job |
| **Magic automation** | Thread auto-split | User doesn't do busywork |
| **Visual limits** | Circle indicators for 280/3000 | Fun, game-like constraint |
| **Queue = Set & Forget** | One button to automate | Reduces decision fatigue |
| **Preview > Form** | Show the post, not fields | User sees what matters |
| **Collapse sidebar** | Focus mode available | Respects user attention |

### The Overlap (Our North Star)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  "Magic automation that respects attention"                      │
│                                                                 │
│  • User writes → system adapts for platforms                     │
│  • User schedules → timeline shows the plan                     │
│  • User hovers → controls appear only then                      │
│  • User types → nothing else on screen                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Principles (Revised)

| Principle | Meaning | Anti-Pattern |
|-----------|---------|--------------|
| **Invisible UI** | No visible borders, shadows, or containers | Card components, outlined buttons |
| **Typography speaks** | Hierarchy through font size/weight/gray | Color badges, status pills |
| **Hover reveals** | Actions appear only when needed | Permanent action buttons |
| **One context** | Never switch tabs/views while creating | Editor/Platforms/Schedule tabs |
| **Auto-adapt** | Content transforms for platforms | Manual platform text entry |
| **Keyboard-first** | `/` for everything, arrow keys | Click-heavy workflows |
| **Scannable schedule** | Timeline shows everything at once | List of items |
| **Zero setup** | Defaults work out of the box | Configuration before action |

---

## Current State Analysis

### Strengths (Keep)
- ✅ Block-based content editor foundation
- ✅ Platform configuration system
- ✅ Comments, Share, Publish modals
- ✅ Notion-style collapsible sidebar

### Weaknesses (Fix)
- ❌ Cards with shadows and borders everywhere
- ❌ Tabs that break writing flow
- ❌ Platform text hidden in separate tab
- ❌ No character limits or thread magic
- ❌ List view instead of timeline
- ❌ Colored status badges
- ❌ Button-filled action bars

---

## Detailed UI Specifications

### Color Palette (Notion-inspired)

```css
/* Backgrounds */
--bg-page: #ffffff
--bg-hover: rgba(55, 53, 47, 0.08)
--bg-selection: rgba(55, 53, 47, 0.16)
--bg-card: transparent

/* Text */
--text-primary: #37352f
--text-secondary: #6b7280
--text-tertiary: #9ca3af
--text-placeholder: #c4c4c4

/* Borders */
--border-light: transparent
--border-divider: rgba(55, 53, 47, 0.09)

/* Accent (use sparingly) */
--accent: #2383e2
--accent-hover: #1a6fb8
```

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight spacing |
| `--space-sm` | 8px | Inline elements |
| `--space-md` | 16px | Default gap |
| `--space-lg` | 24px | Section spacing |
| `--space-xl` | 48px | Page margins |

### Typography Scale

| Element | Size | Weight | Color | Usage |
|---------|------|--------|-------|-------|
| `h1` | 30px | 700 | --text-primary | Page titles |
| `h2` | 24px | 600 | --text-primary | Section headers |
| `h3` | 18px | 600 | --text-primary | Cards/sections |
| `body-lg` | 16px | 400 | --text-primary | Body text |
| `body` | 14px | 400 | --text-primary | Default |
| `body-sm` | 12px | 400 | --text-secondary | Meta info |
| `caption` | 11px | 400 | --text-tertiary | Timestamps |

### Status Indicators (Dot Style)

```
Draft         ○ Draft
In Review     ○ In Review
Approved      ○ Approved
Scheduled     ○ Scheduled for Feb 15
Published     ○ Published
```

No colors. Just subtle gray dot + text.

### Character Limits (Circle Indicators)

```
Twitter    ○ ○ ○ ○ ○  0/280
LinkedIn   ○ ○ ○ ○ ○ ○ ○  0/3,000
Instagram  ○ ○ ○ ○ ○ ○  0/2,200
TikTok     ○ ○ ○ ○ ○ ○  0/2,200
```

Filled circles = used, unfilled = remaining.

### Sidebar (Collapsed)

```
┌──┐
│ C│
├──┤
│ 📊│
├──┤
│ 📝│
├──┤
│ 📅│
├──┤
│ 📈│
├──┤
│ 👥│
├──┤
│ 🔗│
├──┤
│ ⚙️│
└──┘
```

Icon-only when collapsed. Shows labels on hover.

### Content List (Before → After)

**BEFORE (Cluttered):**
```
┌─────────────────────────────────────────────────────┐
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│ │ 24  │ │ 18  │ │ 4   │ │ 4.2%│                   │
│ │Content│ │Published│ │Scheduled│ │Engagement│   │
│ └─────┘ └─────┘ └─────┘ └─────┘                   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Recent Content                                  │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ ┌──────┐  Product Launch...  [DRAFT]  🐦 📘    │ │
│ │ │ 📄   │                                         │ │
│ │ └──────┘                                         │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**AFTER (Clean):**
```
─────────────────────────────
24 content   18 published   4 scheduled

Recent Content
─────────────────────────────
→ Product Launch...      ○ Draft     🐦 📘
→ Weekly Newsletter #45  ○ In Review 🐦
→ Customer Success Story ○ Draft     📘 🐦
→ Behind the Scenes      ○ Published 🐣

→ View all →
```

No borders, just whitespace and text.

### Editor (Before → After)

**BEFORE (Tab-based):**
```
┌─────────┬──────────┬──────────┐
│ Editor  │ Platforms│ Schedule │
├─────────────────────────────────┤
│ [Title Input]                   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Block editor with toolbar   │ │
│ │ [B] [I] [U] [H1] [H2] [...] │ │
│ │ ─────────────────────────── │ │
│ │                             │ │
│ │                             │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**AFTER (Notion-style):**
```
Untitled                                   ─ ⋮
─────────────────────────────────────────────────

What's on your mind?
Type '/' for commands...

─────────────────────────────────────────────────
Platforms

🐦 Twitter   ○ ○ ○ ○ ○  0/280
   Preview:
   ┌─────────────────────────────────────────┐
   │ What's on your mind?                    │
   │                                         │
   └─────────────────────────────────────────┘

─────────────────────────────────────────────────

[Save Draft]    [Schedule]    [Publish]
```

---

## Feature Roadmap

### Phase 1: Foundation (Current Sprint)

| # | Task | File | Description |
|---|------|------|-------------|
| 1.1 | Dashboard cleanup | `page.tsx` | Remove cards, use plain sections |
| 1.2 | Content page redesign | `content/page.tsx` | List → minimal text list |
| 1.3 | Platform dropdown | `content/page.tsx` | New Content button + dropdown |
| 1.4 | Editor inline panel | `new/page.tsx` | Remove tabs, inline platforms |
| 1.5 | Status dots | All pages | Replace badges with dot+text |
| 1.6 | Clean up globals.css | `globals.css` | Add Notion variables |

### Phase 2: Typefully DNA (Week 1)

| # | Task | File | Description |
|---|------|------|-------------|
| 2.1 | Calendar page | `calendar/page.tsx` | Horizontal timeline view |
| 2.2 | Character counters | `editor/` | Circle indicators per platform |
| 2.3 | Thread optimizer | `editor/` | Auto-split for Twitter |
| 2.4 | Queue management | `queue/page.tsx` | Evergreen content flow |

### Phase 3: Notion Editor (Week 2)

| # | Task | File | Description |
|---|------|------|-------------|
| 3.1 | Slash commands | `editor/` | `/` menu on typing |
| 3.2 | Floating menu | `editor/` | Bold/italic on selection |
| 3.3 | Block reordering | `editor/` | Drag handles on hover |
| 3.4 | Image uploads | `editor/` | Drag-and-drop images |

### Phase 4: Polish (Week 3)

| # | Task | File | Description |
|---|------|------|-------------|
| 4.1 | Platform templates | `editor/` | Quick-start templates |
| 4.2 | Media optimizer | `components/media/` | Aspect ratio helper |
| 4.3 | Hashtag helper | `components/hashtags/` | Auto-suggest tags |
| 4.4 | Mobile responsive | All pages | Touch-friendly adjustments |

---

## File Structure

```
src/
├── app/
│   └── (dashboard)/
│       └── [teamSlug]/
│           ├── content/
│           │   ├── page.tsx              # List → minimal list
│           │   ├── new/
│           │   │   └── page.tsx          # Inline platform panel
│           │   └── [contentId]/
│           │       └── page.tsx          # Full editor
│           └── calendar/
│               └── page.tsx              # Timeline view (new)
├── components/
│   ├── editor/
│   │   ├── BlockEditor.tsx               # Core editor
│   │   ├── SlashCommand.tsx              # / menu
│   │   ├── FloatingMenu.tsx              # Selection menu
│   │   ├── BlockHandle.tsx               # Drag handle
│   │   └── CharacterCount.tsx            # Circle indicators
│   ├── calendar/
│   │   └── TimelineView.tsx              # Typefully-style
│   ├── platform/
│   │   ├── PlatformSelector.tsx          # Dropdown
│   │   └── ThreadOptimizer.tsx           # Thread tools
│   └── ui/                               # Clean components
└── styles/
    └── globals.css                       # Notion variables
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to create content | ~30s | 10s |
| Clicks to schedule | 5+ | 2 |
| Visible UI elements | 20+ | 5 |
| Character limit accuracy | N/A | 100% |
| Sidebar state | Fixed | Collapsible |

---

## Immediate Action Items

1. **Today**: Clean up dashboard (remove cards/borders)
2. **Today**: Add platform dropdown to content page
3. **Tomorrow**: Inline platform panel (remove tabs)
4. **This week**: Character counters + thread optimizer
5. **Next week**: Calendar view + slash commands

---

*Last Updated: 2025-02-09*
*Owner: Engineering*