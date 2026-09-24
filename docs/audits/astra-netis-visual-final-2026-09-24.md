# Astra independent NETIS final audit — 2026-09-24

Verdict: **NOT ACCEPTED as the completed user request. Keep PR #1003 draft.**

Open implementation blockers: **1 (P1: catalogue breadth)**. The existing five-item visual browser passes the inspected interaction, source-integrity, and image-provenance checks after the corrections below. Passing those checks does not resolve the user's explicit concern that only five technologies are available. Exact-head CI is a separate release gate and was still running when this report was written.

## Scope and revision

- PR: <https://github.com/kameking-lab/safe-ai-site/pull/1003>.
- Incoming head: `db3f700d355d29078833f51ca1ff2ecaa7be8fcc`.
- Compared main: `7cca0ce12d591f1cd63931f3864fb8531c8dad99`.
- Audited runtime implementation, including this audit's minimal corrections: `a9288966bcf33d6fe93f57383a648b3f442cb807`.
- Review boundary: PR changes relative to `origin/main`; shared site-shell behavior and pre-existing assets were inspected only where this page relies on them.
- Acceptance includes the user's clarification: “今は5個しか表示されてないけど…いろいろな技術を一覧で探せたり簡単な製品解説”. A five-item filter plus an external search link is useful partial progress, not completion.
- Category illustrations are acceptable for the image-category requirement when they are clearly identified. This audit does not make unlicensed manufacturer photos a prerequisite. The earlier `netis-visual-final-review-2026-09-24.md` used a product-photograph criterion; its historical findings about missing image permissions remain relevant, but its proposed remedy must not lead to unauthorized copying.

## P1 — the catalogue still contains only the original five technologies

`FEATURED_NETIS_TECHNOLOGIES` contains five unique registration numbers, unchanged in count from main. There are three heavy-equipment entries, two restricted-zone entries, one fall-prevention entry, and zero heat/environment entries; the Panorama entry belongs to two categories. No additional technology or on-site catalogue search was added. Users seeking alternatives to the one fall-prevention product, or any heat/environment product, still have to leave the site. The official fallback does not meet the requested on-site discovery breadth.

Concrete minimum re-acceptance criteria set by this audit (the numeric threshold operationalizes the request for broader choice; it is not a number stated by the user):

1. Publish at least **10 distinct, current, source-checked technologies**, with at least **two relevant alternatives in each of the four displayed categories**. Do not count one registration twice toward the total. Do not classify unrelated products to satisfy the count.
2. Each entry must display its product/technology name, registration number including current suffix, short plain-language explanation, applicable work, material limitations and optional equipment where relevant, source-check date, official NETIS detail link, and manufacturer/provider link. The list and brief explanation must be accessible on this site after one category action.
3. Preserve honest empty/partial coverage messaging and official search for gaps. Clearly distinguish this site's selected catalogue from all NETIS registrations. Expansion must not introduce unsupported prevention guarantees, substitute statutory measures, or omit verification to reach a count.
4. Preserve the inspected 390px interaction, keyboard operation, Back/reload state, zero-result handling, and accessibility behavior with the expanded data. If content growth makes browsing difficult, add an on-site name/registration search without making it a prerequisite for category browsing.
5. Use only the existing owned category art, newly owned art clearly identified as illustration, or product images with documented permission/license. Do not copy or hotlink manufacturer images based only on their public availability.

## Interaction and accessibility

- Independent browser observation at **390×844**: all four large category buttons are visible before the technology list. Measured button geometry was approximately 170.5×164 CSS px, at y=403.5 and y=577.5; the second row ends at y=741.5. Labels and the category-diagram disclosure are legible. No manufacturer product photo is implied.
- One category click filters the on-site list and exposes each result's brief description. Opening “仕組み・適用条件を詳しく見る” takes one additional action; it expands information on the same page. Official/provider destinations are explicit links inside the details.
- Category state is recorded in `?risk=`. Reload and browser Back restore it; unrelated query parameters survive reset. Unknown values fall back to all site listings. Re-selecting a category focuses/scrolls to its result without adding duplicate history.
- Buttons support Enter and Space, have an accessible group name and pressed state, and move focus to the result heading after selection. A polite live region announces count changes. Reduced-motion preference is respected.
- Existing Playwright/axe checks passed for category/results WCAG A/AA rules in default and empty states, 320/390/1280px overflow, expandable details, and 44px minimum interactive target geometry. Axe coverage is scoped to the changed explorer, not a claim of whole-site certification.
- The 390px initial-screen test now checks **all four** button rectangles, rather than only the first row. Scope disclosure is also checked.
- A manual tab lost its connection when the first test-owned development server exited. After starting the persistent local review server, a fresh tab loaded normally; this was test-server lifecycle, not a reproduced application defect.

## Official registration and claim verification

All five direct detail URLs were opened in the NETIS site using a real browser on **2026-09-24**. Its first-visit screen preceded the detail page, after which each URL resolved to the correct registration and technology. The independent research fetch could not read NETIS, so its errors were not treated as either verification or a broken link. The browser page displayed “2026.9.24 現在”. The app's check date was updated only after these five checks and the provider checks.

- [CG-200009-VE — ヒヤリハンター](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=CG-200009): registered name and magnetic-field/IC-tag approach match. [Matrix provider page](https://matrix-inc.co.jp/product/hiyarihunter/hiyari-v2.html) supports the operator buzzer/light and use under visually obstructed conditions. The app does not promise universal detection.
- [KT-180097-VE — 超音波警報センサー・パノラマOプレミアム](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-180097): the official name uses the letter **O**, not digit **0**; corrected in the data and tests. [Tsukushi provider page](https://www.tukusi.co.jp/commodity/list/631.html) supports ultrasonic people/object detection, spoken warnings, and operator sound.
- [KK-210060-VE — ドボレコJK](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-210060): registered identity, AI person detection, defined warning zone, and operator alert match. [Iwasaki provider page](https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/) supports tag-free detection and alerts; [Xacti's manufacturer description](https://xacti-co.com/service/safety_camera/) supports the two-camera description. No automatic-stop or guaranteed-detection claim was added.
- [KT-230282-A — ハーネスノーティファイ](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230282): registered identity and forgotten-hook warning match. [Ronk catalogue](https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf) supports the switch, sound/light warning, and usage logging. The warning is a support function, not a replacement for fall-protection measures.
- [QS-210006-A — 画像解析カメラ（人物検知）MICS-AI](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=QS-210006): official description supports intrusion-zone person detection and a photo-attached alert email. The previous “現地警報” assertion was not established from the inspected evidence and was removed; the current summary describes the verified email notification. [Assist You provider page](https://assistyou-m.com/mics/mics_ai/) displays QS-210006-A even though surrounding marketing mentions VE; the application retains the **A suffix confirmed directly in NETIS**.

The official [search fallback](https://www.netis.mlit.go.jp/netis/input/pubsearch/search) was opened successfully and exposes keyword/registration search. The zero state accurately says this site's category has no listed entry; it does not claim that NETIS contains no such technology. The warning that registration is not a safety guarantee and cannot replace legally required measures remains.

## Image provenance

The only category image paths are the pre-existing local `safety-images/library/previews/` assets: `collision-hazard.webp`, `equipment-swing-zone.webp`, `fall-hazard.webp`, and `wbgt-display.webp`. The PR adds no image binaries, external image sources, or manufacturer-logo/product imagery.

`web/src/data/safety-image-library/generation-ledger.json` records all four source masters as OpenAI-generated for the portal, with SHA-256 checksums and `portal-owned-commercial-editable` rights status. The rendered images were inspected in context. They are generic hazard illustrations; the text states “カテゴリ画像は危険の図解です。製品写真ではありません。” Product cards contain text and source links, not a recycled diagram presented as the named product. This establishes repository provenance for this reuse; it does not infer a reuse license for any external photo.

## Minimal corrections and validation

Corrections made in this audit:

- Explicitly disclose that the five site listings are a selected subset, not the NETIS database.
- Change “検証済み” to “出典確認済み” and label the result/reset with the site's listing scope, avoiding an implication of independent efficacy testing.
- Correct Panorama O, remove the unsupported MICS-AI local-alarm assertion, and update the actual source-check date.
- Strengthen the existing initial-screen check to include every category; adjust affected text assertions.

Validation after corrections:

- `npx vitest run src/components/netis-safety-guide.test.tsx`: **5 passed**.
- Targeted ESLint covering every changed TS/TSX file: **passed**.
- `npx tsc --noEmit`: **passed**.
- `npx playwright test e2e/netis-safety-visual.spec.ts`: **6 passed**.
- After strengthening only the initial-screen assertion, the focused 390px test and its lint were rerun: **passed**.
- `git diff --check`: **passed**.
- Independent browser visual check: 390px initial screen and fall-category result; official detail navigation for all five records plus official search.

## CI and performance gate

At report creation, incoming head `db3f700d355d29078833f51ca1ff2ecaa7be8fcc` had successful Vercel, repository hygiene, e2e (14m26s), smoke (14m12s), and safety-before-performance (14m52s) checks. The performance-budget job had just started in [run 35919587024](https://github.com/kameking-lab/safe-ai-site/actions/runs/35919587024). This is **not** an all-green result or proof that the earlier performance failure is resolved.

The incoming branch includes the main weather partial-response fix associated with the earlier transient `/api/weather-risk` failure. No performance budgets, score targets, or CI gates were changed in this audit or in the NETIS diff relative to main. Final exact-head check URLs/status must be recorded in the PR description after this report is committed, because a new commit invalidates an earlier-head completion claim. Do not mark ready or merge while the catalogue blocker or exact-head validation gate remains open.
