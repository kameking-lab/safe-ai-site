# Layout Primitive Redesign — Progress Log

Task: Redesign layout primitives for PC/iPad/smartphone optimization. Migrate existing pages to new primitives in phases. Tailwind v4 base maintained. No new features — layout improvements only.

Model: Opus 4.7
Worktree: `.claude/worktrees/vibrant-dirac-d386d5`
Branch: `claude/vibrant-dirac-d386d5`
Started from origin/main: `83d5391`

## Phase 0 — Worktree hygiene + alive marker

- `git worktree list` registered: 42 entries (excluding main repo root)
- Physical dirs under `.claude/worktrees/`: 44
- Orphan dir (in physical, not in `git worktree list`): `wizardly-mendel-a63045`
- `git worktree prune` reported permission-denied on 31 stale `.git/worktrees/*` entries (Windows OneDrive lock). Non-blocking for this task.

## Phase A — Layout primitive design + implementation

Done.

Extracted patterns from 75 existing pages using `max-w-*` containers:
- max-w-7xl (most common, dashboards/panels)
- max-w-6xl (medium-wide)
- max-w-4xl (prose/articles)
- max-w-3xl (article detail)
- max-w-2xl (forms)
- max-w-sm (auth)
- Horizontal padding pattern: `px-4 sm:px-6 lg:px-8` (or `px-4` only)
- Vertical: `py-6 sm:py-8`

Tailwind v4 globals (CSS-only):
- `@theme inline` in `web/src/app/globals.css` — colors, fonts
- Default Tailwind breakpoints (sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536)
- iPad portrait (1024) lands on lg; iPad mini portrait (768) on md
- Existing minimum tap target rule already in CSS (`min-h: 48px` for primary CTAs at <=1023px)

Implemented primitives at `web/src/components/layout/`:
- `page-container.tsx` — PageContainer (width: narrow/prose/wide/full, paddingX/Y tokens)
- `section.tsx` — Section (title/description/spacing, h2/h3 heading)
- `stack.tsx` — Stack (vertical gap) + Cluster (horizontal wrap)
- `card-grid.tsx` — CardGrid (cols 2/3/4/auto, gap tokens)
- `sidebar-layout.tsx` — SidebarLayout (md/lg breakpoint, narrow/default/wide sidebar, left/right placement)
- `split-view.tsx` — SplitView (master-detail, md/lg breakpoint, detailOpen toggle)
- `index.ts` — barrel export

Tailwind v4 grid uses arbitrary-value classes that are fully present at build time (no template strings) so JIT picks them up.

Dev preview page: `web/src/app/(main)/dev/layout-preview/page.tsx`
- robots: noindex+nofollow in route metadata
- `/dev/` added to global robots.ts disallow list
- Not added to AppShell navigation (production-non-public)

Build: passes. Lint: passes (2 unrelated pre-existing warnings).

## Phase B — Page migration

Pending.

## Phase C — Final verification

Pending.

## Phase B — Page migration

Pending.

## Phase C — Final verification

Pending.
