# Safety sign library: response to independent UX review

This is the implementation follow-up to [the Astra review](safety-sign-library-astra-review-2026-09-24.md). PR #1001 remains unmerged pending independent acceptance.

## Changes

- Moved the actual catalog search and category selector directly below a compact heading; featured examples now follow the result list. Removed the public-facing internal QA badges.
- Saved query, category, use, sign format, numeric/document filters, quick filter, sort, visible count, and scroll position per library route in same-tab session storage. Card links carry only a non-sensitive return marker; edited sign wording never enters a URL. The detail return link accepts only the known library path family.
- Restored list state before returning to a deep scroll position. Direct detail visits retain the normal library link.

## Local browser acceptance

- At 1280×900, search starts at y=222 and category at y=242. At 320×900, search starts at y=293 and category at y=378. Both controls fit within the initial viewport; 320×640 also passes. Horizontal overflow at 320px: 0px.
- Desktop 40-item list → detail → browser Back restored the result count and position within 50px. Query `保護帽`, `保護具` quick filter, and `新着順` survived the explicit return link.
- Mobile 60-item list → detail → browser Back restored all 60 cards and the saved scroll position exactly in the measured run (saved y=24984, returned y=24984). The test waits for settled layout; it does not compare against the pre-click position because the browser can scroll the large mobile card while clicking it.
- Five-language editing and the existing JPEG/PNG/PDF download test passed. Targeted library Vitest and ESLint passed. A source-only TypeScript check passed; generated `.next/types` from the shared installed Next 16.3.5 are incompatible with this repository's locked Next 16.2.11, so full build/typecheck validation belongs to clean CI.

Screenshots and downloaded files were intentionally kept out of Git history to meet the repository's non-runtime media history budget. The original review's measured findings remain in its Markdown record.
