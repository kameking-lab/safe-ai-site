# Chrome R8 Emergency Fixes (2026-04-22)

Critical bug batch discovered during Chrome R8 review. Fixed in priority order on branch `claude/ecstatic-ptolemy-a22cf6`. All 33 vitest tests pass. Production build succeeds.

## Priority 1 — 職長教育 (Foreman Education) RAG Wrong Answer

**Symptom:** Chatbot answered "建設業のみ" when asked which industries need 職長教育. The actual legal basis is 安衛法第60条 + 施行令第19条, which enumerates 11 industries (the 2023 amendment added food manufacturing, newspapers, publishing, bookbinding, and printed-matter processing).

**Root cause:** `rodo-anzen-eisei-ho.ts` had Article 60 saying only "政令で定めるもの" without an industry list, and the施行令 was not in the law corpus at all. RAG could not return the施行令 because it did not exist.

**Fix:**
- Added new file `web/src/data/laws/rodo-anzen-eisei-ho-sikokiregu.ts` with施行令第19条 enumerating every obligated industry including令和5年追加 (食料品製造業/新聞業/出版業/製本業/印刷物加工業).
- Registered it in `web/src/data/laws/index.ts`.
- Expanded安衛法第60条 text to reference施行令第19条 explicitly.
- Added a `PINNED_TOPICS` hardcoded hook in `web/src/lib/rag-search.ts`. For triggers like 「職長教育」「職長」「60条」「第六十条」, the RAG forcibly prepends安衛法第60条 + 安衛令第19条 to the result list, and bumps the confidence score to ≥0.7 so the chatbot does not fall back to "法令上の明確な規定は見つかりませんでした".

**Test:** `rag-search.test.ts` now asserts both articles are pinned and the施行令 text contains all 11 industries.

## Priority 2 — 化学物質 RA 濃度基準値 Misclassification

**Symptom:** Benzene/Toluene cards displayed the number without distinguishing 管理濃度 (Working Environment Evaluation Standard) from 濃度基準値 (Article 577-2 / Notice #177). Users were misquoting values in their reports.

**Fix:**
- `web/src/data/mock/chemical-substances-db.ts`: relabeled Benzene (`1 ppm`→`濃度基準値: 8時間値 1 ppm / 短時間値 0.5 ppm (告示第177号)`) and Toluene (`20 ppm`→`濃度基準値: 8時間値 20 ppm (告示第177号)`).
- `web/src/lib/mhlw-chemicals.ts`: introduced `CONCENTRATION_OVERRIDES_BY_CAS`, a CAS-keyed authoritative source for Notice #177 values. `getAllMergedChemicals()` applies this override, flipping `flags.concentration=true` and populating `details.limit8h` / `details.limitShort` for Benzene/Toluene so the UI card shows both 8時間値 and 短時間値.
- Exported `MANAGEMENT_VS_LIMIT_DISCLAIMER` for future UI use (両者は別の指標である旨の明示).

**Note:** Did not re-parse `1113_noudokijyun_all.xlsx` — the source xlsx is not in-repo and the override layer is the cleaner in-app fix. When the next MHLW ETL run lands, it can replace the override table.

## Priority 3 — 熱中症 RAG (令和7年6月1日施行 安衛則第612条の2)

**Symptom:** Chatbot had no article for heat illness even though 安衛則第612条の2 became effective 2025-06-01.

**Fix:**
- Added 安衛則第612条の2 to `web/src/data/laws/anzen-eisei-kisoku.ts` with full WBGT-based義務 text, 事業者義務3点 (体制整備/連絡報告/冷却搬送), and施行日明記.
- Added pin entry in `rag-search.ts` so queries containing 「熱中症」「WBGT」「暑熱」 always return第612条の2.

**Test:** `rag-search.test.ts::pins 安衛則第612条の2 for 熱中症 / WBGT questions`.

## Priority 4 — 事故DBカテゴリ正規化

**Symptom:** Users searching industry "医療保険業" (typo) got 0 hits even though the real category is "保健衛生業". Similarly「建設業、」(trailing comma) vs「建設業」, full-width vs half-width brackets, and 全角空白 produced false negatives.

**Fix:** Extracted a `normalizeCategory()` helper in `web/src/app/api/mhlw/search/route.ts` that:
- 全角英数 → 半角
- 全角/半角/角括弧 `（[【)]】` → 半角 `()`.
- 読点「、」and カンマ「,，」→ 中黒「・」
- 「保険」→「保健」 (common misspelling of 医療保健業)
- Removes all whitespace (半角 / 全角 / タブ)
- Lowercase

`matches()` now normalizes both the user filter and the stored record's major/medium/minor industry names and accident type before comparing. Exported for unit testing.

## Priority 5 — /contact レート制限

**Symptom:** The contact form endpoint accepted unlimited POSTs per IP — spam / accidental double-submit risk.

**Fix:** `web/src/app/api/contact/route.ts`
- Added in-memory sliding window: 5 requests per 60 seconds per IP.
- IP resolution via `x-forwarded-for` → `x-real-ip` → `"unknown"`.
- Returns `429 Too Many Requests` with `Retry-After: 60` header and a Japanese error message.
- Simple GC caps bucket count at 2048 keys.

**Verified live:** 7 rapid POSTs from the same IP returned `[200, 200, 200, 200, 200, 429, 429]` ✓.

## Priority 6 — 数値整合性統一

**Symptom:** `1,389 物質` was hardcoded in 7 places, yet the actual merged count from the 2026-04 ETL is different. About/metadata/UI labels drifted from the live dataset.

**Fix:**
- Added `MHLW_MERGED_CHEMICAL_COUNT` exported constant in `web/src/lib/mhlw-chemicals.ts`, computed from `getAllMergedChemicals().length` (single source of truth).
- Replaced hardcoded "1,389" in:
  - `web/src/components/chemical-ra-panel.tsx`
  - `web/src/components/chemical-database-client.tsx`
  - `web/src/components/mhlw-chemical-info-card.tsx`
  - `web/src/components/mhlw-chemical-selector.tsx`
  - `web/src/app/(main)/about/page.tsx` (STATS)
  - `web/src/app/(main)/chemical-database/page.tsx` (metadata description)

After the override is applied, the number is now derived rather than typed.

## Priority 7 — /education カードクリッカブル化

**Symptom:** Each of the 21 special-education program cards was an inert `<article>` — to inquire about a specific course the user had to scroll to the bottom and write the name into the contact form manually.

**Fix:** `web/src/app/(main)/education/page.tsx`
- Wrapped each card in `<Link href="/contact?category=education&course={name}">`.
- Added hover/focus styles + "この教育を相談する →" footer CTA.

`web/src/app/(main)/contact/ContactForm.tsx` now reads `category` and `course` from `useSearchParams()`:
- If `category=education`, the inquiry category is pre-selected.
- If `course=...`, the message textarea is pre-populated with a course-specific template.

**Verified live:** GET `/education` returns 21 `href="/contact?category=education&course=..."` anchors.

## Priority 8 — Hydration #418 再発

**Symptom:** `/safety-diary` flashed React error #418 (hydration mismatch) on initial load.

**Root cause:** `web/src/components/safety-diary-panel.tsx` line 286 used `useState<DiaryEntry[]>(loadEntries)`. The `loadEntries` initializer returns `[]` on the server and the saved localStorage content on the client, causing divergent initial renders.

**Fix:** Changed to `useState<DiaryEntry[]>([])` and hydrated from localStorage inside the existing `useEffect(() => { ... }, [])` via `setEntries(loadEntries())`.

**Verified live:** `/safety-diary` loads with no console errors.

---

## Verification checklist

- `npm run test` — 33/33 passing (new tests: foreman pin, industries list, heat illness pin).
- `npm run build` — ✓ all 80+ routes built.
- `npm run lint` — 9 pre-existing errors unchanged, 0 new errors introduced.
- Dev server smoke-tested: education page, contact rate limit (5→429), no hydration errors.

## Files touched

```
web/src/app/api/contact/route.ts
web/src/app/api/mhlw/search/route.ts
web/src/app/(main)/about/page.tsx
web/src/app/(main)/chemical-database/page.tsx
web/src/app/(main)/contact/ContactForm.tsx
web/src/app/(main)/education/page.tsx
web/src/components/chemical-database-client.tsx
web/src/components/chemical-ra-panel.tsx
web/src/components/mhlw-chemical-info-card.tsx
web/src/components/mhlw-chemical-selector.tsx
web/src/components/safety-diary-panel.tsx
web/src/data/laws/anzen-eisei-kisoku.ts
web/src/data/laws/index.ts
web/src/data/laws/rodo-anzen-eisei-ho.ts
web/src/data/laws/rodo-anzen-eisei-ho-sikokiregu.ts  (new)
web/src/data/mock/chemical-substances-db.ts
web/src/lib/mhlw-chemicals.ts
web/src/lib/rag-search.test.ts
web/src/lib/rag-search.ts
docs/chrome-r8-emergency-fixes.md  (this file)
```
