# Astra final review — accident analytics

Reviewed 2026-09-24 JST. Incoming PR #1002 head: `bf1eb01cbbfe8457b04de3496aebc8aafdbe34e9`.

## Decision

PASS for the reviewed dashboard scope after the corrections in this commit. Release still requires the final-head GitHub checks and production verification. This is not an all-site legal or data audit.

## Findings corrected

- The cases view incorrectly called its upper area the current national flash report. Removed that misleading sentence.
- Switching cases → national flash → cases discarded filters. Both tab URLs now preserve validated filters; reload and browser Back restore them.
- The general denominator note contradicted the new type-composition meter. It now distinguishes the comparison population (all conditions except accident type) from individual chart fields with missing data excluded.
- Detailed KPI/charts remained expanded, and field-coverage information had been removed. Detailed analysis is collapsed; official source, known/missing counts, and limitations are available in a keyboard-operable disclosure.
- Monthly heatmap text had insufficient contrast at some interpolated orange intensities. Three explicit contrast-safe levels retain numeric labels; the visual-summary Axe scan reports no violations.

## Independent verification

- `npx tsc --noEmit`: PASS.
- Targeted ESLint for both changed page components and the Playwright spec: PASS, no output.
- Analytics aggregate/publication tests: 6 files, 22 tests PASS.
- Existing serious-case/home-news/news-hub tests: 3 files, 23 tests PASS. Home-news tests explicitly reject Haiphong, foreign incidents, and nonfatal injuries.
- Playwright `accident-dashboard-visual-first.spec.ts`: 4/4 PASS after corrections.
- 390×844: title, 2019–2024 / 4,782 case population, 26.1% and meter are in the first viewport; annual trend starts before 1,688px; page overflow 0. Screenshot visually inspected.
- 1440×900: type meter, monthly heatmap and annual trend are in the initial viewport; screenshot visually inspected. Year-line animation can be mid-transition at screenshot time; its data points and numeric alternative table are present.
- Construction → 2024 → falls: meter remains below 100%; download CSV contains the same selected filters and target count as the headline.
- Tab round-trip, reload, and three Back steps restore the previous year/industry/type states correctly. Empty combination has no meter/NaN; reset restores 26.1%.
- Numeric table and source/coverage disclosure open with keyboard Enter. Detailed KPI is initially hidden. Focused Axe scan of the new visual summary: 0 violations.
- Screenshot evidence is generated locally under `web/test-results/accident-dashboard-visual-*/{mobile,desktop}-initial.png`, not committed.

## Scope and remaining limits

- Default cases are Japan's official fatal-case records. National statistical flash is a separately labeled existing aggregate view, intentionally retaining both fatal and lost-time totals per the prior Astra plan. It is not the domestic fatal-news list; that list's foreign/nonfatal exclusion is unchanged and tested.
- News filtering depends on available title/location evidence; these tests do not assert every external publisher's report has been independently verified.
- Existing alternate curated/all data sources remain explicit opt-ins. No source data, severity logic, or official counts were edited.
- Recharts emits nonfatal initial width/height warnings around lazy/hidden charts in dev mode. No assertion failure or page error was observed; production expansion remains part of release acceptance.
- No merge or Draft-state change was performed by this reviewer.
