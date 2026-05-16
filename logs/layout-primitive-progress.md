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

## Phase A — Layout primitive design + implementation (DONE)

Extracted patterns from 75 existing pages using `max-w-*` containers:
- max-w-7xl (most common, dashboards / panels)
- max-w-6xl (medium-wide)
- max-w-4xl (prose / articles)
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
- `page-container.tsx` — PageContainer (width: narrow / prose / wide / full, paddingX / Y tokens)
- `section.tsx` — Section (title / description / spacing, h2 / h3 heading)
- `stack.tsx` — Stack (vertical gap) + Cluster (horizontal wrap)
- `card-grid.tsx` — CardGrid (cols 2 / 3 / 4 / auto, gap tokens)
- `sidebar-layout.tsx` — SidebarLayout (md / lg breakpoint, narrow / default / wide sidebar, left / right placement)
- `split-view.tsx` — SplitView (master-detail, md / lg breakpoint, detailOpen toggle)
- `index.ts` — barrel export

Tailwind v4 caveat: arbitrary grid template values cannot contain nested commas. `grid-cols-[20rem_minmax(0,1fr)]` generates the CSS rule but the resolved value silently fails to apply. Use `1fr` with `min-w-0` on the child to prevent grid blowout instead. Fix committed.

Dev preview page: `web/src/app/(main)/dev/layout-preview/page.tsx`
- robots: noindex + nofollow in route metadata
- `/dev/` added to global robots.ts disallow list
- Not added to AppShell navigation (production-non-public)

## Phase B — Page migration

### Batch 1: high-risk components (DONE)

Audited the three components flagged for "unconditional grid-cols-2 on iPhone SE":

- `mail-delivery-panel.tsx`
  - Verified: the 4-checkbox row at line 56 has labels short enough to fit 2-col at 375 (~165px each), so visually OK today — but the unconditional `grid-cols-2` would break if labels grow. Migrated to `CardGrid cols=2` which stacks to 1-col below sm.
  - Also wrapped form section in `Stack gap=md` and replaced the save-button row with `Cluster gap=sm`. Behavior unchanged.
- `safety-diary/diary-form-detail.tsx`
  - Lines 139 (date + weather) and 338 (severity + likelihood) are intentional twin compact inputs; kept as-is (each child < 180px wide at 375px).
  - Line 228 (contractor name + work text inputs in a row) migrated to `CardGrid cols=2`. Text inputs benefit from stacking on small phones for full-width entry.
- `law-revision-list.tsx`
  - Line 541 outer filter grid already uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with `sm:col-span-2` for keyword. CardGrid does not yet support col-span so kept.
  - Line 554 year-from / year-to grid is intentional twin number input, kept.
  - Migrated the kind-filter pill row (`種別フィルタ`) to `Cluster gap=sm` to demonstrate primitive adoption without behavior change.

Build OK, lint OK (2 pre-existing unrelated warnings).

### Batch 2: PageContainer adoption — sample (DONE)

- `app/(main)/equipment-finder/page.tsx` (`max-w-4xl` prose width) migrated to
  `<PageContainer as="main" width="prose">`. Verified at 375 and 1366:
  - 375: main width 375, no horizontal scroll
  - 1366: main width 896 (= 56rem / max-w-4xl), padding 32px (lg:px-8)

Batch 2 was intentionally narrow this PR. PageContainer is now proven in one production page; the remaining ~70 pages can be migrated in subsequent batches without further design work — the primitive accepts the existing width tokens and `as="main"` to preserve the landmark on pages that currently render their own `<main>`.

### Not migrated in this PR (out of scope or risk)

- Pages that wrap a partial section (e.g. `/`, `/chemical-ra`) where the `mx-auto max-w-7xl px-4 pt-6` div is a sub-section, not the page main. Migrating requires reshaping the page tree.
- `/chatbot`, `/wizard`, `/exam-quiz/*`, `/account` etc. have specific layout needs (chat scrollers, results pages with sticky elements) that should be reviewed individually.
- AppShell mobile header overflow at 375px (the "メニュー" button extends ~70px beyond viewport when language picker is open). Pre-existing issue, not caused by primitives. Worth a dedicated PR.

## Phase C — Final verification (DONE)

- Build: `npm run build` passes (Turbopack, Next 16.2.4, React 19.2.4).
- Lint: `npm run lint` passes with 2 pre-existing unrelated warnings.
- /dev/layout-preview verified at 375 / 768 / 1024 / 1366:
  - CardGrid ramps 1 → 2 (sm) → 3 (lg) → 4 (xl) as designed
  - SidebarLayout(breakpoint=lg) stacks below 1024, 16rem sidebar at 1024+
  - SidebarLayout(breakpoint=md) stacks below 768, 14rem sidebar at 768+
  - SplitView(breakpoint=md) stacks below 768, 20rem list + 1fr detail at 768+
  - No horizontal overflow at any viewport
- /equipment-finder verified at 375 and 1366 — clean migration, no layout regression.

## Commit log (this branch)

- `450aeb3` chore(layout): add alive marker
- `e848f9a` feat(layout): add layout primitive components + dev preview page
- `8151705` fix(layout): replace minmax(0,1fr) with 1fr in arbitrary grid-cols
- `5aa844d` refactor(layout): adopt layout primitives in high-risk components
- `d81146a` refactor(layout): adopt PageContainer in equipment-finder page
