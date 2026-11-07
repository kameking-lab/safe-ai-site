# Independent ten-technology NETIS final audit — 2026-09-24

Implementation verdict after the corrections in this commit: **PASS**. The previous five-technology P1 catalogue blocker is resolved. Open implementation blockers: **0**. Release acceptance still requires successful CI for the exact pushed commit; this report does not reuse a previous commit's CI result. PR #1003 stays draft and is not merged.

## Scope and exact revision

- PR: <https://github.com/kameking-lab/safe-ai-site/pull/1003>.
- Incoming revision: `2df2255dc6f8e14461109faca29e9fd8b0d95184`.
- Reviewed implementation: that revision plus the source/interaction corrections in this commit. The resulting exact commit SHA and its live check URLs are recorded in the PR description after push.
- This report supersedes the catalogue-breadth verdict in `astra-netis-visual-final-2026-09-24.md`; the earlier report remains historical evidence.

## Independent source audit: 10/10

All ten direct NETIS detail URLs were opened again in a real browser during this audit. Each rendered page displayed **2026.9.24 現在**. Registration suffix, registered name, abstract/operation, applicable work, exclusions and cautions were compared with the on-site entry. Full-width Latin characters and parentheses may be typographically normalized; technology identity is preserved.

- [CG-200009-VE — ヒヤリハンター（接近検知警報システム）](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=CG-200009): magnetic-field/IC-tag detection matches. Clarified tag carriage, separation from metal/electronics, environmental noise, device operating temperatures, battery management and pre-use checks.
- [KT-180097-VE — 超音波警報センサー・パノラマOプレミアム](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-180097): ultrasonic people/object detection and surrounding/operator warning match. Added exclusions for heavy rain, snowfall and strong wind, operating temperature, power and rear clearance.
- [KK-210060-VE — 重機取付型セーフティカメラシステム「ドボレコJK」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-210060): AI person detection and operator alerts match. Added the 8 m detection limit, LTE/Wi-Fi and installation checks. The [manufacturer's system description](https://xacti-co.com/service/safety_camera/) independently supports the two-camera explanation.
- [KT-230282-A — 安全帯フックかけ忘れ防止装置「ハーネスノーティファイ」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230282): the area-conditioned warning matches. The [provider catalogue](https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf) confirms retrofit switches, sound/light and history. Clarified that history management is optional, and added operating checks, temperature and battery management.
- [QS-210006-A — 画像解析カメラ（人物検知）MICS-AI](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=QS-210006): corrected the previous descriptive product name to the registered name. Photo-attached alert email matches. Added stable docomo communication, AC100V, installation space, minimum illumination and obstruction limitations. Provider marketing mentions VE, but the current official record remains A and is authoritative here.
- [QS-240022-A — 安全帯フック着脱確認システム「ハーネスアラート」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=QS-240022): holder-state detection and optional beacon match. Added underwater/electrical-service-wire exclusions, the 2–3 s alert delay and 20-tag limit. The text explicitly states that proper attachment to a lifeline is not detected.
- [KT-230099-VE — 熱中対策バンド](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-230099): ambient/skin sensing and core-temperature-change estimation match. Skin contact, resting when unwell regardless of alerts, and non-medical status remain explicit.
- [KT-260019-A — 現場作業員健康管理システム「TECHNO BAND」](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KT-260019): WBGT/age-specific heart-rate risk analysis and four levels match. Corrected **Bluetooth or LTE** to the official **Bluetooth and LTE** condition. Direct-sun shutdown and non-medical status remain explicit.
- [KK-210002-VE — 重機接触防止装置、ハッとセンサー](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-210002): ultrasonic detection up to 5 m and warnings match. Heavy-rain/snow exclusions, installation, wiring, orientation and pre-work/battery checks are present.
- [KK-200054-A — カメラ式人検知システム](https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=KK-200054): up to four AI cameras, warning/control signals and wall-mounted intrusion use match. Two-metre visibility and machine-dependent stopping are explicit; ordinary safety measures remain required.

All **10 displayed provider links** were also opened independently (nine HTML pages and the Ronk PDF). Each reaches the corresponding provider/product material. TECHNO BAND's provider announcement confirms the product and registration announcement but does not display the number in rendered text; its number was verified directly in NETIS. One additional manufacturer page was checked for the two-camera claim.

There are **10 distinct registration numbers**, with no duplicate entries. Relevant category memberships are **heavy equipment 5 / restricted zone 3 / falls 2 / heat 2**. Cross-category registrations count once toward the ten. Descriptions do not promise guaranteed prevention, certify site suitability, or replace statutory/site controls.

## Interaction defects corrected

The incoming implementation could retain `q=missing` after the user pressed **掲載全10件を見る**, leaving zero results. This was reproduced in the browser. The action now clears both `risk` and `q`, retains unrelated parameters, restores all ten cards and clears the input. Browser Back restores both prior filters. A regression test covers this exact sequence.

Submitting the current query again now focuses the results immediately rather than leaving a pending focus flag. The regression test also covers repeated-query submission.

## Visual, accessibility and image audit

- Real-browser visual inspection at **320×800, 390×844 and 1440×900**: readable category/list/details layouts, no horizontal overflow, four category buttons visible in the 390 px initial view, and readable source/limitation links at 320 px.
- Category selection gives on-site summaries in one action. Each native disclosure expands the mechanism, use case, comparison checks, limitations and source links in one further action. Text search, category counts, reload, Back/Forward, empty results and unknown-category fallback work.
- Keyboard Enter/Space, pressed state, result focus/live announcements, reduced-motion handling and 44 px target checks pass. Scoped axe WCAG A/AA checks pass for default and empty states; this is not a claim of whole-site certification.
- Four illustrations load and are explicitly labelled hazard diagrams rather than product photographs. No manufacturer images or logos were introduced or hotlinked.
- Generation-ledger entries **S040, S042, S031 and S092** identify OpenAI generation and `portal-owned-commercial-editable` rights. All **four original-file SHA-256 values match** their ledger records. The UI exposes source/rights/ledger identifiers.

## Validation of the corrected implementation

- Targeted Vitest: **5/5 passed** after the final copy corrections.
- Targeted ESLint: passed, zero errors.
- Production build: passed, including TypeScript, **3,450 static pages**, public-identity/storage guards, and the production guard (**679 source files / 728 built routes**).
- NETIS Playwright on the production build: **7/7 passed**. The same seven checks also passed on the development server before the final optional-history copy clarification.
- `git diff --check`: passed.
- Local build attempts initially stopped on this audit's generated development cache; those temporary files were moved out of the source workspace and the complete guarded build then passed. No guard or threshold was weakened.

The NETIS route is not a dedicated route in the existing CI performance matrix. It therefore also received **three sequential Lighthouse 12.8.2 mobile measurements** against the corrected local production build. Performance scores: **98 / 95 / 98**, accessibility **100 / 100 / 100**. Medians: **LCP 2,411 ms, CLS 0, TBT 8.5 ms**. This local diagnostic supplements, rather than replaces, the exact-head CI gate.

Incoming revision `2df2255...` completed all applicable CI checks, including performance-budget, successfully. The corrected commit needs its own runs. No performance budgets, score targets, workflow gates, dependencies or image assets were changed in this audit. Do not merge until that exact-head gate is green.
