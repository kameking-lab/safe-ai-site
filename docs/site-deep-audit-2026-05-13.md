# 安全AIポータル Deep Audit 2026-05-13

**Operator:** ANZEN AI Daily Review (automation)
**Model:** Opus 4.7
**Base main HEAD:** c6e098d (`docs: deferred RAG improvements roadmap`)
**Branch:** chore/deep-audit-2026-05-13
**Date:** 2026-05-13

## Scope
- 42 pages (per task spec): home, chatbot, chemical-ra, equipment-finder, quiz, exam-quiz, accidents, laws, law-search, stats, contact, signage, signage/map, signage/display, safety-diary, ky, features, wizard, lms, about/chatbot-eval, chemical-database, circulars, laws/notices-precedents, qa-knowledge, risk, risk-prediction, e-learning, diversity, mental-health, glossary, goods, subsidies, notifications, about, pdf, account, privacy, terms, security, dpa, bcp, leaflet, auth/signin
- Read-only audit: production WebFetch + source inspection + parallel source-level audit by sub-agent
- Out of scope: rag-search.ts core, deferred RAG improvements (docs/rag-deferred-improvements-2026-05-13.md), new features

## Findings by priority

### P0 — Broken / data-wrong / blocking

**P0-01 — JSON-LD structured-data URLs hardcoded to retired vercel.app domain**
- file: [web/src/app/(main)/accidents/page.tsx:39](web/src/app/(main)/accidents/page.tsx) — `url: "https://safe-ai-site.vercel.app/accidents"` for EVERY accident NewsArticle entry
- file: [web/src/app/(main)/laws/page.tsx:33](web/src/app/(main)/laws/page.tsx) — `url: r.source_url ?? "https://safe-ai-site.vercel.app/laws"` fallback
- Issue: next.config.ts has a 301 redirect rule from `safe-ai-site.vercel.app` to anzen-ai-portal.jp (line 47-51), so all structured-data URLs are pointing to a redirect chain. Google Search Console will flag canonical/url mismatches across hundreds of NewsArticle schema records. SEO bug affecting indexing quality.
- Fix: Replace literal vercel.app strings with `https://www.anzen-ai-portal.jp/...` or use the SITE_URL env var. Two-line edit.

### P1 — High-impact bugs / UX

**P1-01 — Signin description references removed "法人プラン機能"**
- file: [web/src/app/(main)/auth/signin/page.tsx:8,12,25](web/src/app/(main)/auth/signin/page.tsx)
- Issue: After Enterprise/法人プラン removal (PR #75), the signin page still markets "KY用紙・チャット履歴・法人プラン機能をご利用ください". Inconsistent with /pricing (now "準備中") and creates user confusion about whether paid features exist.
- Fix: Replace 法人プラン文言 with "ログイン後に利用できる機能（KY履歴・お気に入り条文）". Update title.description, openGraph.description, and the in-page paragraph (3 spots).
- Also: missing `robots: { index: false, follow: false }` on signin metadata. Search engines are currently allowed to index the login page.

**P1-02 — signage/map title leaks "安全AIサイト" (old brand)**
- file: [web/src/app/signage/map/page.tsx:5](web/src/app/signage/map/page.tsx) — `title: "サイネージ地図 | 安全AIサイト"`
- file: [web/src/app/(main)/about/data-sources/page.tsx:6](web/src/app/(main)/about/data-sources/page.tsx) — `title: "データソース一覧 | 安全AIサイト"`
- Issue: Both old brand "安全AIサイト". Should be "安全AIポータル".
- Fix: Rename to "安全AIポータル" on both files. Two-line edit.

**P1-03 — Enterprise / エンタープライズ leaks in active routes**
- files:
  - [web/src/app/(main)/organization/page.tsx:63,64,204](web/src/app/(main)/organization/page.tsx) — user-visible "Enterpriseプラン" banner + "Enterpriseプラン契約後に連携" footer
  - [web/src/app/(main)/api-docs/page.tsx:109](web/src/app/(main)/api-docs/page.tsx) — "エンタープライズ連携（独立後12ヶ月）"
  - [web/src/app/(main)/pricing/PricingContent.tsx:601](web/src/app/(main)/pricing/PricingContent.tsx) — `href="/contact?category=enterprise"` (CTA still uses enterprise category)
- Issue: PR #75 removed Enterprise tier UI from /pricing and main navigation, but /organization, /api-docs, and PricingContent CTA still reference Enterprise. /organization is reachable via direct URL and shows "Enterpriseプラン向けプレビュー".
- Fix:
  - Replace "Enterpriseプラン" wording with "正式リリース（2026年秋予定）" or "拡張機能（リリース予定）".
  - PricingContent.tsx:601 — change `?category=enterprise` to `?category=demo` (consistent with /feedback redirect).
- Dead-code Enterprise leak in [web/src/components/PersonaEntry.tsx:56-67](web/src/components/PersonaEntry.tsx) (uppercase) — that component is no longer rendered (no `variant="portal"` consumer); deferred as P2 cleanup.

**P1-04 — Sales-y "お見積り" / "見積り" copy on 12+ education sub-pages**
- files (12 pages):
  - [web/src/app/(main)/education/EducationContent.tsx:279,284](web/src/app/(main)/education/EducationContent.tsx)
  - [web/src/app/(main)/education/hoteikyoiku/chemical-ra/page.tsx:402](web/src/app/(main)/education/hoteikyoiku/chemical-ra/page.tsx)
  - [web/src/app/(main)/education/roudoueisei/youtsu-yobou/page.tsx:394](web/src/app/(main)/education/roudoueisei/youtsu-yobou/page.tsx)
  - [web/src/app/(main)/education/roudoueisei/shindou/page.tsx:380](web/src/app/(main)/education/roudoueisei/shindou/page.tsx)
  - [web/src/app/(main)/education/hoteikyoiku/shokucho/page.tsx:372](web/src/app/(main)/education/hoteikyoiku/shokucho/page.tsx)
  - [web/src/app/(main)/education/roudoueisei/souon/page.tsx:380](web/src/app/(main)/education/roudoueisei/souon/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/teiatsu-denki/page.tsx:372](web/src/app/(main)/education/tokubetsu/teiatsu-denki/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/kensaku-toishi/page.tsx:371](web/src/app/(main)/education/tokubetsu/kensaku-toishi/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/ashiba/page.tsx:369](web/src/app/(main)/education/tokubetsu/ashiba/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/tamakake/page.tsx:372](web/src/app/(main)/education/tokubetsu/tamakake/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/fullharness/page.tsx:371](web/src/app/(main)/education/tokubetsu/fullharness/page.tsx)
  - [web/src/app/(main)/education/roudoueisei/necchu/page.tsx:390](web/src/app/(main)/education/roudoueisei/necchu/page.tsx)
  - [web/src/app/(main)/education/tokubetsu/sankesu/page.tsx:371](web/src/app/(main)/education/tokubetsu/sankesu/page.tsx)
- Issue: Recent UX cleanup explicitly removed "営業文言" from the main site, but these education subpages all still say "教育プログラムのご相談・お見積り". This contradicts the operator's "研究プロジェクト・無料" positioning per `data/strategy/monetization-v3-2026-04-26.ts`.
- Fix: Replace "ご相談・お見積り" with "教育プログラムについてのご意見・改善提案" → linking to /contact. Bulk-rewrite via single search-replace.

**P1-05 — /signage* mascot "読み込み中…" + "—" timestamps on initial paint**
- files: [web/src/app/(main)/signage/page.tsx](web/src/app/(main)/signage/page.tsx) and [web/src/app/signage/map/page.tsx](web/src/app/signage/map/page.tsx)
- Issue: SSR fallback shows "Current time: —" / "Last update: —". On TVs/サイネージ first-paint, looks "broken". On an actual browser the JS resolves quickly, but FCP-to-content gap is large for screens supposed to feel always-on.
- Fix: Pre-render last-known timestamps server-side OR display "起動中…" with the mascot animation rather than literal dashes. Minimally, replace "—" with "--:--" / "読込中" so dashes aren't mistaken for missing data.

**P1-06 — /notifications mentions "Standard plan+" geo-targeting in body**
- file: [web/src/app/(main)/notifications/subscribe-form.tsx:77](web/src/app/(main)/notifications/subscribe-form.tsx)
- Issue: Body text reads "登録は無料です（地域指定・拠点別通知は Standard プラン以上で利用可能）". But /pricing now says "準備中" — there's no Standard plan to subscribe to. Misleads users.
- Fix: Either remove the "Standard plan以上" qualifier entirely (treat as upcoming), or wrap behind "（将来のスタンダードプランで提供予定）".

**P1-07 — Loading state without timeout/error path in mhlw-deaths-panel**
- file: [web/src/components/mhlw-deaths-panel.tsx:54-65](web/src/components/mhlw-deaths-panel.tsx)
- Issue: Uses `await import("@/data/deaths-mhlw/compact.json")` inside try; if dynamic import never resolves or returns malformed data, spinner sticks forever. No timeout / no abort.
- Fix: Add finally clause that ensures loading state clears, OR add 10s timeout that surfaces "データ取得に失敗しました". Low probability bug but unrecoverable for affected users.

### P2 — Medium / cleanup

**P2-01 — "Claude Code" branding leak in user-visible copy**
- files:
  - [web/src/app/(main)/about/page.tsx:333](web/src/app/(main)/about/page.tsx) — "Claude Code を用いた高速 Web 開発"
  - [web/src/app/(main)/contact/ContactForm.tsx:81,248](web/src/app/(main)/contact/ContactForm.tsx) — "Claude Code 活用自動化" / "Claude Code による高速開発"
  - [web/src/app/(main)/pricing/PricingContent.tsx:144](web/src/app/(main)/pricing/PricingContent.tsx) — "Claude Code による受託開発"
- Dead-code leak in home-value-hero.tsx (not rendered by any active page).
- Issue: User-visible "Claude Code" mentions. CLAUDE.md positions the operator as a安全コンサルタント with "システム受注ポートフォリオ" angle — mentioning "Claude Code" as toolset is consistent with that positioning but exposes the AI tool used. Owner judgment required.
- Recommendation: **Owner confirmation needed before mass-edit.** If keeping, leave as-is (selling point). If removing, replace with "AI支援による高速開発".

**P2-02 — Dead-code Enterprise references**
- file: [web/src/components/PersonaEntry.tsx](web/src/components/PersonaEntry.tsx) (uppercase) — no longer rendered (no `variant="portal"` consumer)
- file: [web/src/lib/i18n/en.json:199](web/src/lib/i18n/en.json), [web/src/lib/i18n/tl.json:199](web/src/lib/i18n/tl.json) — `"enterprise": "Enterprise"` keys
- Recommendation: Delete PersonaEntry.tsx OR remove the enterprise-safety persona inside it. Prune i18n enterprise keys.

**P2-03 — /accidents displays "276件" but underlying stats claim "504,415"/"4,257"/"4,043"**
- file: [web/src/data/site-stats.ts:30](web/src/data/site-stats.ts) (`accidents10yCount: "4,257"`)
- Issue: User sees "504,415" on /leaflet (claim) but only 276 records on /accidents (actual UI). The gap is legitimate (MHLW DB count vs site-curated) but no inline explanation. Confusing. Also note: 4,257 references `data/accidents-10years.jsonl` which does not exist in the repo — count is unverifiable in-tree.
- Fix:
  - On /accidents header, add: "厚労省事故DB全数 504,415件のうち、自社編集 276件を表示中".
  - In site-stats.ts comments for `accidents10yCount`, change "data/accidents-10years.jsonl 統合件数" to "(ETL output, generated externally — verify offline)".

**P2-04 — Pricing copy mismatch ("プラン管理" vs "/pricing 準備中")**
- Issue: /account links to /pricing for upgrades. /auth/signin says "法人プラン機能". /pricing says "準備中". Three sources, three messages.
- Fix: Single source of truth — declare paid features as "現在無料公開中。将来有料化予定" (consistent) and remove all "プラン管理"/"アップグレード" CTAs that point to dead /pricing. Could be merged into P1-06 fix.

**P2-05 — PII risk: console.log of email/PII in API routes**
- files:
  - [web/src/lib/newsletter.ts:66,110](web/src/lib/newsletter.ts) — logs `[newsletter:subscribe]` and unsubscribe with full payload
  - [web/src/app/api/feedback/route.ts:82-83,134](web/src/app/api/feedback/route.ts) — logs `subject`, `to`, `payload`
  - [web/src/app/api/inquiry/route.ts:130](web/src/app/api/inquiry/route.ts) — payload log
  - [web/src/app/api/newsletter/send/route.ts:141](web/src/app/api/newsletter/send/route.ts) — payload log
- Issue: Server-side console.log of user PII (email addresses). Logs persist in Vercel platform logs (30-day retention per privacy.md).
- Fix: Replace with hashed/redacted log strings (`hash(email)` or just count). next.config.ts compiler.removeConsole only strips client console — server logs are kept.

**P2-06 — /handover route reachable in production via gate-key**
- file: [web/src/app/(main)/handover/page.tsx](web/src/app/(main)/handover/page.tsx)
- Issue: Gated by `?key=handover2026` but reachable. Contains internal-table copy ("Claude Code 活用支援  個別見積") and "事故データベース（Vercel Blob） 504,415 件" — internal info. Not P0 (404s without key).
- Recommendation: Already has `robots: { index: false }` per agent finding — acceptable. Leave but track.

**P2-07 — partnership page sales-flow language**
- file: [web/src/app/(main)/partnership/page.tsx:225](web/src/app/(main)/partnership/page.tsx)
- Issue: "1〜3営業日以内に返信" — uses "営業日" (calendar-business-day) which is standard, OK. The page itself is sales-oriented; verify whether /partnership is supposed to exist per monetization v3 strategy.
- Recommendation: Owner confirmation. Either keep (it's standard biz copy) or rephrase "営業日" → "平日" if there's any sales-language allergy.

### P3 — Polish / UX optimization

**P3-01 — Click-count audit on key flows**
- Home → /chatbot: 1 click (CTA in hero). ✅
- Home → /accidents: 2 clicks (FlagshipGrid → /accidents).
- Home → /equipment-finder: 2-3 clicks.
- Home → /chemical-ra: 2 clicks. ✅
- Improvement candidate: home hero has 3 CTAs. Could expose `KY` and `事故DB` as quick chips for 1-click access, but task forbids home structural change.

**P3-02 — Global Suspense loader is visually heavy**
- file: [web/src/app/loading.tsx](web/src/app/loading.tsx)
- Issue: Large mascot + "読み込み中…" text fills 40vh on every SSR boundary. Aesthetic, not functional.
- Suggestion: Shrink mascot to `size="xs"` and remove the literal text — animate-pulse is enough indicator.

**P3-03 — Mobile responsiveness of header (375x812)**
- file: [web/src/components/header.tsx](web/src/components/header.tsx)
- Issue: Mascot + helmet icon + title + refresh button may overflow on <360px. Not blocking; visually tight.
- Recommendation: Test on 320px first; only fix if titles wrap badly.

**P3-04 — Affiliate link generation defaults**
- file: [web/src/lib/affiliate-url.ts](web/src/lib/affiliate-url.ts)
- Logic is correct (returns base URL when AFFILIATE_ID is missing). Suggestion: add a one-time `console.warn` (dev only) when AMAZON_TAG/RAKUTEN_AFFID is empty — surfaces missing env var earlier in CI.

**P3-05 — i18n translations contain sales-y "顧問契約" and similar**
- files: [web/src/data/translations/ja.json:25,28](web/src/data/translations/ja.json)
- Issue: "顧問契約", "強引な営業" (negation context); also [web/src/app/(main)/privacy/page.tsx:68](web/src/app/(main)/privacy/page.tsx) lists "見積り、打合せ調整" in personal-data uses.
- Recommendation: Owner judgment — keep or sanitize.

**P3-06 — `/auth/error` page missing `robots: noindex`**
- file: [web/src/app/(main)/auth/error/page.tsx](web/src/app/(main)/auth/error/page.tsx)
- Recommendation: add `metadata.robots = { index: false }`.

**P3-07 — duplicate `lawArticleCount` == `ragArticleCount` in site-stats**
- file: [web/src/data/site-stats.ts:40-42](web/src/data/site-stats.ts)
- Issue: Both use `allLawArticles.length`. They're labeled differently in comments but render same number. Either intentional (and rename one) or bug (RAG should have a different count after PDF filter).
- Recommendation: Verify intent.

## Click-count audit summary (X-G)
- Trip home→chatbot→ask question: 2 taps. Fine.
- Trip home→chemical-ra→add chemical: 2 taps. Fine.
- Trip home→/accidents→filter by industry: 2-3 taps. Fine.
- Trip /goods→Amazon link: 3 taps from home. Defer click reduction.

## UI consistency notes (X-H)
- Primary color #1a7a4c (emerald-600/700 in Tailwind) used consistently across CTAs.
- Mascot present in header AND loading fallback — sometimes duplicative on slow pages.
- Buttons have consistent rounded-xl / shadow-sm style.
- Headers/footers consistent.

## Affiliate monetization status (X-I)
- /goods uses Amazon/Rakuten via @/lib/affiliate-url.
- Logic is sound (tag injection works only on valid Amazon/Rakuten URLs, otherwise pass-through).
- Need: ensure NEXT_PUBLIC_AMAZON_AFFILIATE_ID and NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID are set in Vercel — cannot verify from audit.

## Recurring-pattern check (X-J)
- Prompt-injection marker leak: **none found** in web/src.
- "ANZEN AI" leak in user-visible Japanese copy: **none found** (only allowed SEO redirect/alt usage).
- "安全AIサイト" old-brand leak: **2 active page titles** (P1-02).
- "お見積り" / "営業" sales-y wording: **12 education sub-pages** (P1-04).
- "Claude Code" leak: **3 active routes** (P2-01, needs owner confirmation).
- localStorage banner / initial-modal regression: not investigated (Playwright needed); flag for future.

## Data integrity (X-C)
- 504,415 accidents (per `data/aggregates-mhlw/meta.json`): **matches** site-stats.ts claim.
- 4,043 deaths (per `data/deaths-mhlw/compact.json`): **matches**.
- 4,257 10-year accidents: **unverifiable in-repo** — no `data/accidents-10years.jsonl` file present (ETL artifact only).
- 276 displayed on /accidents: actual curated cases. UI lacks bridge to the 504,415 wider claim — see P2-03.

## SEO / structured data (X-A)
- Two JSON-LD pages (/accidents, /laws) emit retired vercel.app URLs into structured data — P0-01.
- Canonical metadata consistently uses `withSiteOpenGraph` helper (PR #86) for new pages.

## Performance / Lighthouse (X-D)
- Not measured (would require running a local dev server + Lighthouse run). Out of audit budget.
- Global loading.tsx fallback (P3-02) adds visual weight but doesn't block LCP.

## Accessibility / mobile (X-E, X-F)
- Mascot has explicit alt text.
- Header has `aria-label="ページを更新"` on refresh button.
- Buttons have `focus-visible:ring-2 ring-emerald-500` consistent.
- Mobile viewport responsiveness not browser-tested (P3-03 flagged for future).

## Recommended Phase Y order (P0/P1 first, ROI-sorted)
1. **P0-01** — JSON-LD URL hardcode (2 files, fixes SEO across all accident/law schemas).
2. **P1-01** — Signin description + noindex (1 file).
3. **P1-02** — signage/map + about/data-sources title brand (2 files).
4. **P1-04** — お見積り bulk replace on 12+ education pages (mechanical edit).
5. **P1-03** — Enterprise references in /organization, /api-docs, PricingContent.tsx (3 files).
6. **P1-06** — notifications Standard-plan+ wording (1 file).
7. **P1-07** — mhlw-deaths-panel timeout (1 file).
8. **P1-05** — signage "—" timestamp placeholder (2 files).
9. **P2-03, P2-04, P2-05** — bundled cleanup if budget remains.

## Out of scope (deferred / not touched)
- rag-search.ts core — per task spec.
- docs/rag-deferred-improvements-2026-05-13.md items — per task spec.
- New features / new pages / new menu entries — per task spec.
- Stripe / paid plan implementation — pricing is "準備中", no code change required.
- Lighthouse performance numbers — not measured.
- Playwright interaction tests — deferred unless P0 emerges.

## Audit completion stamps
- Production fetched: 32 of 42 listed pages (others are static legal/policy pages confirmed via source).
- Source-level grep: branding (ANZEN AI / 安全AIサイト / Claude Code), Enterprise/法人/お見積, console.* leaks, prompt-injection markers, broken hrefs, JSON-LD URLs, PII logging — all completed.
- Sub-agent (a2300235563aaf4c0) integrated into findings above.

---

## Phase Y — Fixes shipped (2026-05-13)

| # | Category | Branch | PR | Merge SHA | Items fixed |
|---|---|---|---|---|---|
| α | BROKEN/SEO | fix/seo-jsonld-canonical-2026-05-13 | [#90](https://github.com/kameking-lab/safe-ai-site/pull/90) | be28b47 | P0-01 |
| θ | UI consistency (copy) | fix/copy-cleanup-2026-05-13 | [#91](https://github.com/kameking-lab/safe-ai-site/pull/91) | 5282a9d | P1-01, P1-02, P1-03, P1-04, P1-06 |
| β | Interaction robustness | improve/loading-states-2026-05-13 | [#92](https://github.com/kameking-lab/safe-ai-site/pull/92) | 0c38714 | P1-05, P1-07 |
| α (lint follow-up) | Lint | fix/organization-link-lint | [#93](https://github.com/kameking-lab/safe-ai-site/pull/93) | 2d14a25 | (lint regression in #91) |

**Main HEAD after Phase Y:** `2d14a25`
**CI on main:** green (run 25802741559 — lint, build, unit, smoke-E2E all passed).

### What changed
- **P0-01** — both `/accidents` and `/laws` JSON-LD now emit `https://www.anzen-ai-portal.jp/...` URLs (canonical host) instead of the retired `safe-ai-site.vercel.app` literal. SEO canonical mismatch resolved across every NewsArticle/Article schema entry.
- **P1-01** — `/auth/signin` description/body no longer markets the removed 法人プラン; new copy mentions KY/chat history/お気に入り条文. Page also gained `robots: { index: false, follow: false }` to keep the login page out of search indices.
- **P1-02** — Page-title brand alignment: `/signage/map` and `/about/data-sources` now say "安全AIポータル" (was "安全AIサイト").
- **P1-03** — Enterprise references removed/softened: `/organization` banner, `/api-docs` Phase 3 row, and `/pricing` Custom plan CTA all updated.
- **P1-04** — 13 education pages bulk-rewritten: 「XX教育のご相談・お見積り」 → 「XX教育のお問い合わせ・改善提案」. English variant also updated.
- **P1-05** — Signage SSR placeholders ("—") replaced with "起動中…" / "--:--" / "取得中…" so first-paint reads as "loading" not "broken".
- **P1-06** — `/notifications` dropped the "Standard プラン以上" qualifier; copy now reads "今後追加予定".
- **P1-07** — `MhlwDeathsPanel` got a 15s safety timeout + finally-clause that prevents the spinner from hanging forever if dynamic JSON import never resolves.

### What was NOT shipped (and why)
- **P2-01 — "Claude Code" leak** on /about, /contact, /pricing: requires **owner decision** before mass edit (could be intentional portfolio signaling).
- **P2-02 — Dead-code PersonaEntry.tsx**: not user-visible (no `variant="portal"` consumer); demoted to backlog.
- **P2-03 — `/accidents` 276 vs 504,415 reconciliation**: small UX improvement, defer if owner OK with current copy.
- **P2-04 — /pricing 準備中 vs CTA mismatch**: partially addressed by P1-01/P1-03/P1-06; remaining items are documentation, not code.
- **P2-05 — PII in API console logs**: real concern but requires a separate logging-policy decision (use `redact()` helper or remove logs?). Backlog.
- **P2-06 — /handover noindex robots flag**: already noindexed per agent's secondary scan; no action.
- **P2-07 — /partnership 営業日 wording**: standard biz copy; defer.
- All **P3** items: stylistic; not Y-budget.

### Verification (Phase Z)
- Main HEAD: `2d14a25`. All 4 PRs (#90/#91/#92/#93) merged.
- CI: `gh run view 25802741559` — `success` (web-ci, all jobs green).
- Production fetch (cache-busted):
  - `/auth/signin` — copy reads "お気に入り条文" ✅
  - `/notifications` — copy reads "今後追加予定" ✅
  - `/organization` — banner says "多拠点向け管理ダッシュボード", link to /features ✅
  - `/education/tokubetsu/ashiba` — header reads "足場特別教育のお問い合わせ・改善提案" ✅
  - `/signage` — timestamp area shows "--:--" / "起動中…" ✅
- P0-01 (JSON-LD) is a source-only SEO fix; manual production verification is not informative for it (would need view-source on a freshly-deployed page).
- Lighthouse / mobile responsiveness / chatbot 10-query re-run: deferred (not modified by Phase Y; out of audit budget).

### Residual items / backlog
- P2-01 (Claude Code wording) — needs owner go/no-go.
- P2-05 (PII in server console logs) — logging policy decision required.
- P3-02 (loading.tsx visual heaviness) — polish, optional.
- P3-03 (header overflow on <360px) — verify in browser first.
- All P3-04..P3-07.
- Stripe paid-plan implementation when monetization restarts.

### Risk / rollback
- Each PR is independent; revert SHA list: 2d14a25 → 0c38714 → 5282a9d → be28b47 (newest first).
- No data-model changes, no migrations, no env-var changes — pure code/copy diffs.
- E2E live-mode tests on main still in progress at sign-off time; smoke E2E + lint + build + unit confirmed green.
