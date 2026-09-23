# ASTRA independent review — safety sign library PR #1001

Reviewed application commit: `3f3d967bbceae9f96aa1d049b3af7765a36ac508`.
Review date: 2026-09-24 JST. Reviewer: Astra, independently from implementation.
PR: https://github.com/kameking-lab/safe-ai-site/pull/1001

## Verdict

**Local UX: FAIL / CHANGES REQUIRED (R1, R2). Preview acceptance: HOLD. Do not merge on this review.**

The editing/export improvements work in the tested local application. The two remaining navigation problems prevent accepting the complete 100-sign discovery journey. These are observed UX gaps, not claims that both were newly introduced by the last commit.

The Vercel preview redirects anonymous Chromium to Vercel login. The deployment status being SUCCESS does not establish anonymous page acceptance. CUA returned no available browsers; the parent explicitly authorized existing Playwright for equivalent desktop/mobile inspection. No protection setting, account, application code, or external content was changed. Local testing used this exact worktree with `next dev --webpack`, Chromium 1280×900 and 320×900. This is not a production-build or authenticated-preview substitute. The installed shared Next runtime reported 16.3.5; lockfile reproducibility belongs to CI.

## R1 — Put discovery before the showcase (required)

Observed at 1280×900: search starts at **y=1704**, after the hero, ten featured signs and six category cards. At 320×900: search starts at **y=3796**, result heading at **y=4235**; the initial viewport contains neither search nor category selection. Ten featured cards plus six category cards precede the 20-card result list. The mobile initial list page is 14,876px tall. A4 orientation and language controls are appropriately absent from the list because they do not meaningfully filter this catalog.

The main cards now have one link instead of duplicate CTAs, but visitors still traverse a separate showcase before reaching the actual catalog. Desktop heading also wraps its final character awkwardly in the hero. The `FIRST REVIEW RELEASE` label is gone; `市場調査・独立QA済み100点` and `独立画像QA合格` still expose internal process language. Verified QA evidence can live in provenance/terms, without dominating discovery.

Sol implementation steps:

1. In the hub page/list composition, place the search input and category selector immediately below a compact title and single introductory sentence, before the ten-card showcase. Move the showcase below results, fold it, or reduce it to concise shortcuts. Do not add another competing full card grid.
2. Remove or move the internal QA/process badges to provenance. Retain clear user-facing facts such as 100 signs, editable text, supported formats/languages.
3. Preserve the single-link result card and folded advanced filters. Avoid adding a second CTA to each card.

Acceptance: at **1280×900 and 320×900**, both the actual search field and category selector are visible and operable in the initial viewport without scrolling, hidden content expansion, or an anchor jump. Search `保護帽` yields one sign and one card click opens it. Category browsing still reaches all 100 unique signs. `document.documentElement.scrollWidth <= innerWidth` at 320px. Check a shorter 320×640 viewport as an additional resilience check; the mandatory measured baseline is 320×900.

## R2 — Restore the discovery context on return (required)

Reproduction: expand all 100 → search `保護帽` → one result → open its card → browser Back. The query becomes empty, count becomes 20; scroll restores to y=1717 in a different list. Repeat using `現場安全看板ライブラリへ`: query empty, 20 results, scroll at y=0. A visitor comparing candidates must rebuild the search each time.

Sol implementation steps:

1. Preserve query, category and advanced filters, sort, visibleCount, and list scroll position across detail navigation. URL parameters can carry non-private list criteria; retain count/scroll in history or route-scoped session state. Do not put edited sign text in a URL.
2. Use the preserved list context for both browser Back and the explicit library-return link. A direct detail visit without saved context should fall back to the normal hub.
3. Restore state before scrolling; otherwise the restored y coordinate can land on a different 20-item list. Define a bounded/validated return path rather than accepting arbitrary external URLs.

Acceptance: search and category/advanced-filter/sort cases, plus an expanded 60/100-item list, survive both return methods with identical **query/filter/sort/visibleCount and scroll position** (within 50px after layout settles). Reopening a returned card works. A direct detail URL safely returns to the default hub. Check desktop and 320px. Edited sign content remains out of URLs/file names/analytics.

## Local acceptance results

- **PASS — inventory and card action:** default 20 results; four `次の20点を表示` clicks produce 100 articles and 100 unique detail URLs. `保護帽` gives one result. One main-card link opens its detail.
- **FAIL — discoverability and return:** R1/R2 above. A functioning search hidden 3,796px down the mobile page does not pass discovery acceptance.
- **PASS — default and simultaneous languages:** only Japanese is initially selected; mode is `edited`/`プレビューどおり`. Four additional checks yield five languages. Clicking foreign languages in reverse priority order still produces Japanese → Vietnamese → simplified Chinese → English → Indonesian in text fields, preview, POST payload, and exported image.
- **PASS — orientation:** one click on A4横 sets `a4-landscape`; A4縦 sets `a4-portrait`. Preview aspect ratios change accordingly. Default detail size remains its recommended market format (helmet: 450×600mm), so neither A4 choice is initially active; label and size selector make this explicit.
- **PASS — real edited downloads:** replaced Japanese with synthetic `監査用の保護帽を着用`, retained five languages, chose A4横, and downloaded JPEG, PNG and PDF through the visible download button. Both rasters are 3508×2480 at 300dpi. Visual inspection confirms text/order/wrapping/orientation match the preview. PDF MediaBox is 841.890×595.276pt, and it contains the exact downloaded JPEG bytes. This verifies the selected sign/sample, not all 100×formats as visual exports.
- **PASS — mobile operation/layout:** 320px hub, detail, five-language selection, A4横 and reset all operate; scrollWidth is 320. Reset restores Japanese only, original Japanese text and preview-matching mode. Mobile five-language preview has no clipped lines. The preview is small because the viewport is small; no claim of native-speaker validation follows from readable glyphs.
- **PASS — related-image loading:** after scrolling each related image into view, all four complete with naturalWidth=294, including earplugs and dust mask. No missing image reproduced; lazy-load timing must not be reported as a broken asset.
- **PASS with scope — explanation/buttons:** advanced styles/reset folded; one result link; download mode consolidated into one selector. The detailed page still has two top actions and three fallback-format links under `JavaScriptなしで利用する`, but these are grouped, subordinate to editing, and did not block operation. The top `そのままダウンロード` deliberately downloads the recommended original; the bottom `プレビューどおり` action is the edited-file path tested. The remaining excessive pre-search showcase is covered by R1.
- **PASS with remaining wording task — private material:** no `drive.google.com` anchors on sampled hub/detail DOM, and relevant source no longer exposes the personal reference folder. `FIRST REVIEW RELEASE` is gone. Remaining QA badges are covered by R1; this audit does not make that private Drive public or assert its sharing ACL was changed.

Regression acceptance after R1/R2: keep Japanese default, fixed five-language order, A4 portrait/landscape switching, all **three real edited downloads** with no format/content regression, 320px without horizontal overflow, and related images loaded after scrolling. Local successful full browser pass recorded **zero console errors, page errors or HTTP >=400 responses**.

## Claims and source limits

Read the implementation audit, PR diff, catalog/translation registries, terms and renderer/editor source. The [MHLW release](https://www.mhlw.go.jp/stf/newpage_68794.html), published 2026-01-30 for October 2025, reports nationwide foreign workers led by Vietnam (605,906; 23.6%), China (431,949; 16.8%), and Philippines (260,869; 10.1%). This supports prioritizing the first two available foreign languages; it does not rank construction-site language needs and does not establish English as Filipino translation. The implementation audit already states this caveat. Do not describe the complete five-language order as directly mandated by MHLW.

The registry says `nativeReviewClaimed: false`; its 100 themes × four foreign translations have model back-translation checks, not universal native review. Official phrase confirmations cover a subset (24 of 500 phrases, including Japanese). Terms distinguish these checks. No all-language native-verification claim should be added. Existing originality/market/independent-image-QA records are provenance; this UX review has not independently repeated all market/IP/translation checks. The public legal/JIS replacement limitation remains visible on detail pages.

## Checks and limitations

Targeted Vitest: **3 files, 22 tests passed** (`safety-image-editor.test.tsx`, catalog `index.test.ts`, `renderer.test.ts`). The renderer test includes 100×A4 orientations as text-layer checks; it is not a visual inspection of 200 exports. Vitest emitted a jsdom navigation-not-implemented message without failure.

At the saved CI snapshot, head is still `3f3d967b`; e2e, safety-before-performance, repository-hygiene and Vercel are SUCCESS; smoke and performance-budget are IN_PROGRESS; full is SKIPPED. Do not convert pending checks to a pass. Preview SSO and pending CI are separate release HOLDs from local UX FAIL.

An initial local attempt using `127.0.0.1:3327` received a POST 403 from the same-origin check because the development request URL uses localhost. The final full run uses `localhost:3327`, unchanged app/security code, and all three POSTs return 200. Early harness attempts also needed the correct select accessible-name locator and a longer cold-compilation wait. These harness/local-host failures are not treated as product failures. No claim about Vercel POST origin behavior is made while Preview is blocked.

## Evidence retention

The measurements and outcomes above are retained as the review record. Raw screenshots, downloads, and local browser harness output remain outside the repository because the repository's non-runtime media history budget would otherwise reject the PR. No code fix, merge, production publication, Drive sharing change or bypass was performed by this review.
