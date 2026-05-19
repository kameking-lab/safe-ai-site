# 過去2週間 PR横断 回帰監査 (2026-05-19)

- 監査対象: main にマージ済み PR 173件 (PR #69 → #247, 2026-05-05 〜 2026-05-19)
- 監査実行モデル: Claude Opus 4.7 (claude-opus-4-7)
- 監査開始 main HEAD: `79ca42c` (PR #247 マージ後 + JMA scheduled update)
- 監査範囲: 機能・データ・SEO/構造化データ・UX・インフラ・セキュリティ・リソース横断
- 監査トリガ: Pro plan 期間中の品質担保 — Hobby plan 復帰前の最終チェック
- 関連先行監査:
  - PR #235 激辛UX/SEO監査 (54件, 16軸)
  - PR #238 P0級5件解消 (api-docs削除[正確には noindex化]・hreflang除去・BreadcrumbList修正・7目玉統一・description短縮)
  - PR #244 P1最終クローズ (SEO-012/015/023)
  - PR #246 P2 Batch 1 (UX-010/022/025/026/029, SEO-016)

---

## 0. 監査結果サマリ

| 優先度 | 件数 | 説明 |
|---|---|---|
| P0 (致命的) | 0 | npm run lint / typecheck がクリーン通過、機能停止・データ破損なし |
| P1 (重大) | 2 | 未来日付の事故レコード / ハードコード認証鍵 |
| P2 (中) | 3 | ブランド表記漏れ / Gemini Circuit Breaker未適用 / 動的ルートCDNキャッシュなし |
| P3 (軽微) | 6 | preliminary ファイル命名不整合 / /admin/ugc/review ゲート差 / /quiz 表記混在 / /api-docs commit message誤記 / curated-2026-002 confidence / /admin/newsletter 確認 |
| 計 | 11 | |

**本タスク内修正**: P3 系 F-003 (ANZEN AI ブランド表記の漏れ7ファイル) を完了。`new-home-hero.tsx` は PR #246 で修正済みだったが、英語UI・印刷PDF・OG画像・JSON-LD で残存していた。

**別タスク化推奨**: P0/P1/P2 (5件) はオーナー判断と影響範囲確認が必要なため、本監査では報告のみ。各 finding に `data-finding-id` / `data-priority` / `data-pr-source` 構造化マーカーを付与し、後続タスクで参照可能とする。

---

## 1. Phase A — PR分類 (173件)

| カテゴリ | 件数 | 主要PR |
|---|---|---|
| データ拡充 (法令/通達/事故/化学/用語) | 30 | #88, #102, #104, #105, #108, #143, #159, #161, #162, #164, #170, #175, #178, #207, #208, #209, #213, #215, #227 |
| 機能追加 (新ページ・新ジャーナル) | 28 | #157, #158, #160, #163, #167, #168, #169, #170, #171, #172, #175, #178, #179, #204, #210, #214, #226, #245, #247 |
| SEO/構造化データ/canonical | 22 | #77, #78, #85, #86, #90, #117, #120, #122, #123, #125, #129, #136, #211, #217, #220, #225, #232, #242, #244 |
| UX/A11y/モバイル/印刷 | 21 | #91, #92, #103, #106, #110, #127, #128, #137, #138, #139, #140, #142, #145, #151, #152, #166, #216, #234, #241, #246 |
| リファクタ/レイアウト統一 | 14 | #103, #106, #110, #139, #140, #149, #150, #198, #221, #222 |
| 監査/レビュー/ドキュメント | 18 | #87, #89, #94, #98, #99, #116, #181, #183, #187, #189, #190, #192, #197, #224, #229, #235, #236, #240, #243 |
| インフラ/セキュリティ/リソース | 14 | #97, #122, #129, #144, #146, #150, #153, #154, #155, #206, #219, #223, #228, #239, #247 |
| RAG/AI品質 | 11 | #79, #80, #81, #83, #84, #88, #108, #112, #181, #183, #212, #213 |
| 修正/再発・ホットフィックス | 10 | #74, #93, #112, #114, #129, #137, #181, #186, #195, #230, #233 |
| Revert | 1 | #186 (revert #185) |
| chore/jma scheduled | 30+ | (自動デプロイ。コード変更なし) |

---

## 2. Phase B/C — 検出された回帰・副作用

### P1-001: 未来日付の事故レコード (mhlw-2026-001)

- **finding-id**: F-001
- **priority**: P1
- **file**: `web/src/data/mock/real-accident-cases-2024-2026.ts:143-162`
- **pr-source**: #102 (refresh 4,257→5,010), #104 (preliminary 2025-2026), #207 (full-corpus quality audit)
- **detail**:
  - レコード `mhlw-2026-001` は `occurredOn: "2026-07-08"` を保持。本日 2026-05-19 から 1ヶ月20日先の **未来日付**。
  - `provenance: "mhlw"` (厚労省公式扱い) を付与しているが、未公開・未発生の事象を公式情報として表示している。
  - タイトルは「令和7年6月施行の熱中症対策直後の死亡災害」だが、`occurredOn` は 令和8年7月 (2026-07) で、「直後」概念と一年以上ずれる。
- **risk**: ユーザが事故DBを閲覧した際、未来の確定事故として表示される → ブランド毀損・データ信頼性低下。AI WebFetch がこれを引用すると拡散リスク。
- **memory文脈**: `project_accident_data_2025_2026.md` メモリで「R07確定個票未公開。速報集計値ベース16件(PR#104)。確定値公開後にpreliminary→mhlw置換が必要」と記録。`mhlw-2026-001` (令和8年) はそもそも該当範囲外。
- **推奨対応**:
  1. `occurredOn` を `2025-07-08` (令和7年7月) に修正してタイトル「令和7年6月施行直後」と整合させる、または
  2. レコード自体を削除し、確定情報公開後に再追加、または
  3. `provenance: "scenario"` (架空想定事例) に変更し、`disclaimer` フィールドを追加。
- **本タスク非修正理由**: オーナー判断が必要 (架空想定事例として残すか、削除するか)。

### P1-002: ハードコード認証鍵 (/api/admin/health)

- **finding-id**: F-002
- **priority**: P1
- **file**: `web/src/app/api/admin/health/route.ts:6`
- **pr-source**: #247 (Vercel usage monitoring dashboard) または旧PR
- **detail**:
  - `const VALID_KEY = "anzenai2026"` をコード内ハードコード。
  - 比較対照: `/admin/env-audit`, `/admin/health-check`, `/strategy/page.tsx`, `auth.ts`, `proxy.ts` はすべて `process.env.STRATEGY_AUTH_PASSWORD` 経由でゲート。
  - PR #193 (security: remove hardcoded credential from /strategy client bundle) で同種の修正を実施済みなのに、新規API route で再発。
- **risk**: client bundleには含まれないが、ソースコード履歴(GitHub public)に残るため、攻撃者が `?key=anzenai2026` で `/api/admin/health` を叩ける。返却内容は service status のみだが、内部URL/環境を公開する情報源となる。
- **推奨対応**:
  1. `const VALID_KEY = process.env.STRATEGY_AUTH_PASSWORD ?? "";` に変更し、空文字なら 503 を返す。
  2. ヒストリーから値そのものを消去 (BFG / filter-branch) または `STRATEGY_AUTH_PASSWORD` を新値にローテーション。
- **本タスク非修正理由**: クレデンシャルローテーションを伴うため、オーナー作業を待つ。

### P2-003: ブランド表記漏れ (PR #246 UX-010 部分対応)

- **finding-id**: F-003
- **priority**: P2 → **本タスクで修正済 (P3扱い)**
- **pr-source**: #246 (label/copy quick wins claimed UX-010 closed)
- **detail**:
  - PR #246 commit message: `fix(ux-p2): Batch 1 label/copy quick wins — UX-010/022/025/026/029, SEO-016`
  - UX-010 は「英語版ヒーローのブランド表記 ANZEN AI Portal 残存」。
  - PR #246 は `web/src/components/new-home-hero.tsx:57` を `Anzen AI Portal (Japan OSH research)` に修正したが、以下6箇所は未追随:
    1. `web/src/components/accidents-reports/report-print-meta.tsx:8,40` (印刷PDF 発行元)
    2. `web/src/app/api/og/route.tsx:13` (OG画像 英語tagline)
    3. `web/src/app/(main)/about/AboutBody.tsx:21` (English about heading)
    4. `web/src/app/(main)/features/features-index-client.tsx:45` (English features hero)
    5. `web/src/app/(main)/circulars/CircularsI18n.tsx:36` (English source footer)
    6. `web/src/app/(main)/ky-examples/page.tsx:53` (Dataset JSON-LD creator name)
- **本タスクで修正済**: 上記6箇所をすべて `ANZEN AI Portal` → `Anzen AI Portal` または `安全AIポータル` (印刷PDF) に統一。
- **resolution-commit**: 本PRに含む

### P2-004: Gemini API に Circuit Breaker 未適用

- **finding-id**: F-004
- **priority**: P2
- **file**: `web/src/lib/external/circuit-breaker.ts` (existence確認済) / 未wrapの呼び出し元:
  - `web/src/app/api/chat/route.ts`
  - `web/src/app/api/law-summary/route.ts`
  - `web/src/app/api/quiz-explain/route.ts`
  - `web/src/app/api/ky-assist/route.ts`
  - `web/src/app/api/chatbot/route.ts`
  - `web/src/app/api/translate/article/route.ts`
- **pr-source**: #223, #228 (resilience fallbacks + circuit breakers)
- **detail**:
  - Circuit breaker 実装は存在し、Resend (`/api/chat` のメール送信部分, `/api/newsletter/send/route.ts`) のみで使用。
  - Gemini API 呼び出し本体 (`GoogleGenerativeAI`) は raw fetch ベースで保護なし。Gemini の quota / 5xx スパイク時に retry loop に陥る可能性。
- **risk**: Gemini quota枯渇 (高トラフィック日) で chatbot / law-summary が全件失敗 → ユーザ体験崩壊。
- **推奨対応**:
  1. `withCircuitBreaker("gemini", ...)` で 6エンドポイントの Gemini 呼び出しを包む。
  2. しきい値: 5連続失敗で 60秒 OPEN (既存パターン踏襲)。
  3. OPEN 時のフォールバック応答 (テンプレ回答 + 「現在AI応答が混雑しています」表示)。
- **本タスク非修正理由**: 6ルートの API 動作確認が必要 + フォールバック応答文言にオーナー判断が必要。

### P2-005: 動的 AI ルート キャッシュなし → Vercel quota burn

- **finding-id**: F-005
- **priority**: P2
- **file**: 34 API ルート (`web/src/app/api/**/route.ts` のうち Cache-Control 未設定)
- **pr-source**: #239 (block AI crawlers + CDN cache headers) の対象外領域
- **detail**:
  - PR #239 は AI クローラブロックと一部静的ルート (signage-data, weather-forecast, robots.txt, audits) のキャッシュは追加したが、最頻度の AI 推論ルートは未対応。
  - `/api/chat`, `/api/chatbot`, `/api/law-summary`, `/api/quiz-explain`, `/api/ky-assist`, `/api/summaries`, `/api/translate/article`, `/api/safety-alert`, `/api/sds/search`, `/api/goods-chat` がすべて未キャッシュ。
- **risk**: 同一クエリでも毎回 Function invocation が発生 → Vercel Pro plan quota消費が高速化 → Hobby復帰時のDEPLOYMENT_DISABLED再発リスク。
- **推奨対応**:
  1. RAG/AI推論ルートは入力ハッシュキーで s-maxage=300 (5min) を付与。
  2. Edge Cache がレスポンス本体ではなく `Cache-Control: private, max-age=0, s-maxage=300, stale-while-revalidate=86400` で対応。
  3. クエリパラメータが多い場合は SWR 派生キャッシュとして実装、または KV store による応答キャッシュ。
- **本タスク非修正理由**: AI 応答の鮮度要件 (法改正情報等) が含まれるため、ルート毎に TTL 判断が必要。

### P3-006: real-accident-cases-2025-preliminary.ts 命名と内容の不整合

- **finding-id**: F-006
- **priority**: P3
- **file**: `web/src/data/mock/real-accident-cases-2025-preliminary.ts:303-371`
- **pr-source**: #104 (2025-2026 preliminary data)
- **detail**:
  - ファイル名は `2025-preliminary` だが、4件のレコード `preliminary-2026-003` 〜 `preliminary-2026-006` は 2026-01〜2026-04 発生日。
  - 2026 records が `2024-2026.ts` にも `2025-preliminary.ts` にも分散しており、メンテ時に検索漏れリスク。
- **推奨対応**:
  1. ファイル名を `real-accident-cases-preliminary.ts` (年度非依存) にリネーム、または
  2. 2026分を `real-accident-cases-2024-2026.ts` に集約。
- **本タスク非修正理由**: import パス変更を伴うため別タスク化。

### P3-007: /admin/ugc/review に認証ゲート無し

- **finding-id**: F-007
- **priority**: P3
- **file**: `web/src/app/(main)/admin/ugc/review/page.tsx` (and `ReviewClient.tsx`)
- **pr-source**: 旧PR (UGC機能)
- **detail**:
  - `/admin/ugc/review` は `robots: { index: false, follow: false }` で noindex のみ。
  - 比較: `/admin/env-audit`, `/admin/health-check` は `?key=STRATEGY_AUTH_PASSWORD` でURLゲート。
  - 実害は限定的: 表示データは `COMMUNITY_CASES_SEED` (mock) + ブラウザ localStorage のみ。サーバー mutation は無い。
  - しかし「管理画面」UIヘッダで承認/差戻しUIを公開しているため、ユーザ混乱を招く可能性。
- **推奨対応**: `/admin/env-audit` パターンに合わせて `?key=STRATEGY_AUTH_PASSWORD` ゲートを追加。
- **本タスク非修正理由**: SSR層への env 参照追加が必要、ゲート方針 (NextAuth role vs ?key) をオーナー判断したい。

### P3-008: /quiz route の metadata title 表記混在

- **finding-id**: F-008
- **priority**: P3
- **file**: `web/src/app/(main)/quiz/page.tsx`
- **pr-source**: #234 (演習問題ラベル統一), #145 (/quiz redirect 統合)
- **detail**:
  - `/quiz` は `/exam-quiz` への canonical保持用 re-export だが、metadata.title が「安全衛生 資格試験 演習問題クイズ」と「演習問題」「クイズ」混在表記。
  - PR #234 で「演習問題」統一が宣言されている。
- **推奨対応**: title から「クイズ」を削除し「演習問題（全資格対応）」に統一。
- **本タスク非修正理由**: /quiz canonical挙動の確認・テスト整合が必要 (PR #145 のE2E依存)。

### P3-009: PR #238 commit message 誤記 (/api-docs削除)

- **finding-id**: F-009
- **priority**: P3
- **file**: `web/src/app/(main)/api-docs/page.tsx` (現存)
- **pr-source**: #238 (P0級5件解消)
- **detail**:
  - PR #238 commit message: "/api-docs削除". 実態は `robots: { index: false, follow: false, nocache: true }` + `alternates: { canonical: null }` で **noindex 化**であり削除ではない。
  - 検索エンジン側からは見えなくなったので SEO的には削除と同等の効果だが、リポジトリ言語表記の正確性に欠ける。
- **推奨対応**: コミットメッセージ訂正は不可。CHANGELOG または audit page 上で「削除 = noindex化」と明示注記。本audit reportで記録するだけで十分。

### P3-010: curated-2026-002 の confidence

- **finding-id**: F-010
- **priority**: P3
- **file**: `web/src/data/mock/real-accident-cases-2024-2026.ts:164-181`
- **pr-source**: #102 (refresh 4,257→5,010)
- **detail**:
  - `curated-2026-002` (`occurredOn: 2026-03-15`) は本日から2ヶ月前で発生可能だが、`provenance: "curated"` (編集部選定) を付与。
  - メモリ `project_accident_data_2025_2026.md` の方針では「R08確定値公開後に curated → mhlw 置換」とすべきだが、未確定段階の事例を curated として混入させる運用判断は本記録に明記されていない。
- **推奨対応**: provenance 値の意味論を `docs/` に明文化、または 2026年Q1 事例の編集方針をオーナーが定める。
- **本タスク非修正理由**: 編集方針定義はオーナー責務。

### P3-011: /admin/newsletter ガード方式の確認

- **finding-id**: F-011
- **priority**: P3
- **file**: `web/src/app/(main)/admin/newsletter/page.tsx` および `web/src/app/api/newsletter/subscribers/route.ts`
- **pr-source**: 旧PR (newsletter feature)
- **detail**:
  - API route は Bearer token を要求している (確認済)。
  - page 側のサーバーガード (リクエスト時の認証) は未確認。クライアント側から API を叩く時のみガードが発火。
- **推奨対応**: page.tsx でSSR時に Authorization ヘッダー or env var check を加え、未認証時 redirect する。
- **本タスク非修正理由**: 別タスクで /admin/* 全体のガード方針を統一すべき。

---

## 3. Phase D — 優先度別件数

| 優先度 | 件数 | finding-id |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | F-001, F-002 |
| P2 | 3 | F-003 (本タスク内修正済), F-004, F-005 |
| P3 | 6 | F-006, F-007, F-008, F-009, F-010, F-011 |
| 計 | 11 | |

---

## 4. Phase E — 本タスク内修正

| finding-id | 修正内容 | 影響ファイル |
|---|---|---|
| F-003 | `ANZEN AI Portal` → `Anzen AI Portal` / `安全AIポータル` 7置換 | report-print-meta.tsx (×2), api/og/route.tsx, about/AboutBody.tsx, features-index-client.tsx, circulars/CircularsI18n.tsx, ky-examples/page.tsx |

PR #246 UX-010 の宣言した修正範囲 (= hero のみ) を実機運用全範囲 (印刷PDF / OG画像 / 英語UI / JSON-LD) に拡張。

---

## 5. Phase F — 公開URL

- 監査ドキュメント (リポジトリ内): `docs/post-2week-regression-audit-2026-05-18.md` (本ファイル)
- 公開ページ: `/audits/post-2week-regression`
- 公開ページ metadata: `robots: { index: false, follow: true }` (P2/P3監査と整合)
- 構造化マーカー: 各 finding に `data-finding-id` / `data-priority` / `data-pr-source` 属性を付与しAI WebFetch / 後続自動化フローで参照可能とする。

---

## 6. 注意事項

- 既存PRのrevertは本監査では実行しない (推奨レポートのみ)。
- 軽微修正(P3)は本タスクで実装可だが、コード変更を伴うF-006/007/008/011は影響範囲確認のため別タスク化。F-003のみ実施。
- P0/P1/P2 (F-001, F-002, F-004, F-005) は別タスクでの計画的修正を強く推奨。
- 環境変数の実値取得は本監査では行わない。F-002 のローテーションはオーナー作業。

---

## 7. 自動更新ヘッダー

- 監査作成 commit: 本PRのhead commitを参照
- 次回再監査推奨タイミング: Pro plan 期間終了 (2026-06-15 想定) 直前、または PR #258 以降10件以上が main にマージされた時点
