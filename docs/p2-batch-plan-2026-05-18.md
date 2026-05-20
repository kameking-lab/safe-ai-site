# P2残26件 段階的解消計画 — 激辛UX/SEO監査 2026-05-17

- 監査スナップショット: `docs/audit-snapshot-2026-05-17-ux-seo.md`
- 監査ページ: `/audits/2026-05-17-ux-seo`
- 計画公開URL: `/audits/p2-batch-plan`
- ベースHEAD: `fdaa523` (PR #242 merged)
- 計画作成日: 2026-05-19
- 計画モデル: Opus 4.7 (依存関係+影響範囲+効率バッチ分割の統合判断)
- Pro plan期間想定: 2026-05-19 〜 2026-06-15 (28日)
- 関連先行PR: #238 (P0級5件) / #241 (P1 Batch 1) / #242 (SEO-001 hub) / #239 (AIクローラブロック)

---

## 経緯と前提

監査PR #235 で検出された 54件 (P1=12 / P2=30 / P3=12) のうち、P2=30件 を段階的に解消する計画。
PR #238 で P0級即時対応として **P2のうち4件が解消済**:

| 解消テーマ (PR #238) | 関連P2 finding |
|---|---|
| 7目玉ラベル統一 | UX-004 / UX-009 |
| BreadcrumbList修正 (中間URL /strategy) | UX-013 (※SEO-009と同根、暗黙解消) |
| description短縮 | SEO-007 |

→ **P2残=26件 / 推定合計工数=105h** を本計画で消化する。

---

## P2残26件 一覧

### UXカテゴリ (14件 / 47h)

| ID | カテゴリ | タイトル要約 | 工数 |
|---|---|---|---|
| UX-003 | UX-A | ナビ3層構造の過剰 (FlagshipNav 10 + Sidebar 9C + Footer 4C) | 12h |
| UX-006 | UX-B | Ctrl+K検索インデックス5カテゴリのみ | 8h |
| UX-007 | UX-B | モバイル『検索』とPC『Ctrl+K』が異なる機能 | 2h |
| UX-008 | UX-B | ホームトピックカードからメイン3機能への動線欠如 | 3h |
| UX-010 | UX-C | 英語版ヒーローのブランド表記 ANZEN AI Portal 残存 | 1h |
| UX-016 | UX-E | AlertGenerator エラー表示が生テキスト・再試行UI無し | 2h |
| UX-017 | UX-E | Chatbot SSR時『読み込み中』のみでFCP遅延 | 4h |
| UX-021 | UX-F | モバイルA11yトグル (ふりがな/やさしい/文字大) がメニュー奥 | 3h |
| UX-022 | UX-G | 統計バー text-[9px] で視認性低 | 1h |
| UX-024 | UX-G | ShareButtons fixed が MobileBottomNav と重なる | 2h |
| UX-025 | UX-H | 演習問題ラベル3種類 (ナビ/h1/メタ) | 2h |
| UX-026 | UX-H | NEW/AI/βバッジ過剰 (常時NEW) | 2h |
| UX-027 | UX-H | メンタル系3項目並列で差分伝わらず | 4h |
| UX-029 | UX-H | Footer Q&A投稿募集の分類不適切 | 1h |

### SEOカテゴリ (12件 / 58h)

| ID | カテゴリ | タイトル要約 | 工数 |
|---|---|---|---|
| SEO-002 | SEO-A | ロングテール『〜業 計画書 テンプレート 無料』未カバー | 16h |
| SEO-006 | SEO-B | sitemap lastmod 鮮度差極端 (古い/pricing /privacy 混在) | 4h |
| SEO-008 | SEO-B | compare sitemap にクエリパラメータURL 5件 | 3h |
| SEO-010 | SEO-C | FlagshipGrid ItemList Schema 未実装 | 4h |
| SEO-011 | SEO-C | /exam-quiz CourseList/Quiz Schema 未実装 | 6h |
| SEO-013 | SEO-D | /about → メイン3機能 直接リンク無し (E-E-A-T分散) | 3h |
| SEO-016 | SEO-E | EN_FEATURE_COPY 7件のみ・残3機能日本語fallback | 2h |
| SEO-018 | SEO-F | ホームHTML 151KB / JS chunks 24個 (TBT/INP劣化リスク) | 8h |
| SEO-020 | SEO-F | HomeThreePillars 全体 'use client' でSSR/CSR シフト | 4h |
| SEO-022 | SEO-G | sitemap-index と sitemap.xml の整合性CI検証なし | 4h |
| SEO-024 | SEO-H | 『English (Beta)』表記の判断 (撤去 or 本格対応) | 0h |
| SEO-025 | SEO-H | 言語切替時URL不変 (localStorage依存) | 4h |

---

## Phase B: 依存関係マップ

### 単独実装可能 (依存なし、即時着手可)

- UX-010 (英語ブランド表記)
- UX-022 (統計バー視認性)
- UX-025 (演習問題ラベル統一)
- UX-026 (バッジ整理 + badgeUntil)
- UX-029 (Footer Q&A整理)
- SEO-016 (EN_FEATURE_COPY 残3機能)
- UX-016 (AlertGenerator エラーUI)
- UX-024 (ShareButtons配置)
- SEO-006 (sitemap lastmod自動化)
- SEO-008 (compare sitemap除外)
- SEO-022 (sitemap CI検証)
- SEO-018 (HTML/JS bundle budget)

### バッチ実装が効率的なfinding群

- **ナビ整理セット:** UX-003 (FlagshipNav/Sidebar/Footer縮約) + UX-027 (メンタル系統合) → 同一PR推奨。サイドバーカテゴリ再編で双方カバー
- **モバイルUXセット:** UX-007 (検索統一) + UX-021 (A11yトグル露出) + UX-024 (ShareButtons配置) → MobileBottomNav/AppShell同時編集が効率的
- **内部リンク+構造化データセット:** UX-008 (ホームカード動線) + SEO-013 (/about→3機能) + SEO-010 (ItemList) + SEO-011 (Quiz Schema) → 内部リンク/Schema強化テーマでまとめる
- **i18n判断セット:** SEO-024 (Beta表記) + SEO-025 (URL言語切替) → P1のSEO-015/023と同一判断軸 (撤去推奨)
- **CWVセット:** SEO-018 (JS bundle) + SEO-020 (HomeThreePillars use client) + UX-017 (Chatbot SSR) → SSR/Client境界の再設計でまとめる
- **Sitemap/Techセット:** SEO-006 + SEO-008 + SEO-022 → sitemap.tsとCI scriptsの同時編集

### バッチ間の前提依存

- Batch 3 (ナビ整理) は Batch 1 (バッジ/ラベル) より後が安全 — バッジ整理後にナビ全体再構築
- Batch 4 (内部リンク) は Batch 3 (ナビIA確定) より後 — ナビ再編後のリンク先確定が前提
- Batch 5 (Sitemap/Long-tail) と Batch 6 (CWV/i18n) は並行可

---

## Phase C: バッチ計画 (6バッチ)

### Batch 1 — Text/Label Quick Wins (9h, 6件)

- **着手日:** 2026-05-19
- **完了目標:** 2026-05-22 (4日)
- **PR名:** `fix(ux-p2): label/copy quick wins — brand/badges/stats/labels (UX-010/022/025/026/029, SEO-016)`
- **依存:** なし (即時着手可)
- **マージ後の期待効果:** サイト内文言の小さなブランド不整合・視認性低下・分類不適切を一括解消。後続バッチで触る前に表面ノイズを除去
- **findings:**
  - UX-010 (1h) `new-home-hero.tsx` 英語ヒーロー表記を `Anzen AI Portal (Japan OSH research)` に刷新
  - UX-022 (1h) `new-home-hero.tsx` 統計バー最小フォントを `text-[11px]` に統一、375pxで2+1レイアウト
  - UX-025 (2h) `exam-quiz/page.tsx` h1/メタtitleを『演習問題（全資格対応）』に統一 (ナビは PR #234 済)
  - UX-026 (2h) `app-shell.tsx` NAV_CATEGORIES に `badgeUntil` プロパティ導入、過去30日超のNEWは表示停止。AIバッジは chatbot のみに絞る
  - UX-029 (1h) `footer.tsx` Q&A投稿募集を『プロジェクト』カラムに移し『Q&A 投稿募集 (準備中)』ラベル化
  - SEO-016 (2h) `flagship-grid.tsx` EN_FEATURE_COPY に education-certification / industries / work-environment を追加

### Batch 2 — Mobile UX & Feedback (9h, 4件)

- **着手日:** 2026-05-23
- **完了目標:** 2026-05-26 (4日)
- **PR名:** `fix(ux-p2): mobile UX + feedback — search/a11y/share/alert-error (UX-007/016/021/024)`
- **依存:** Batch 1 完了推奨 (バッジ整理後の方が AppShell 編集衝突を回避)
- **マージ後の期待効果:** モバイル利用者のタップ可達性 (検索/A11y/ナビ) を改善。失敗時の出口UIで離脱率を抑える
- **findings:**
  - UX-007 (2h) `MobileBottomNav.tsx` search を openCommandPalette に統一、`/law-search` は CommandPalette ショートカット化
  - UX-016 (2h) `home-three-pillars.tsx` AlertGenerator フォールバックに「再試行」ボタン+具体ヒント+3回連続失敗時 /contact 誘導
  - UX-021 (3h) `app-shell.tsx` モバイルヘッダーに最低限「ふりがな」「文字大」を露出、初回バナーで案内
  - UX-024 (2h) `ShareButtons` モバイル時に `bottom-16` オフセット付与し MobileBottomNav と非重畳化

### Batch 3 — Navigation Restructure + Mental Hub (16h, 2件)

- **着手日:** 2026-05-27
- **完了目標:** 2026-06-01 (6日)
- **PR名:** `refactor(ux-p2): consolidate 3-layer navigation + merge mental-health subhub (UX-003/027)`
- **依存:** Batch 1 / 2 完了 (バッジ・モバイルUI確定後)
- **マージ後の期待効果:** Hick's Law 観点の選択肢過多を解消、機能発見性向上。サイドバー/Footerの重複ラベル排除
- **findings:**
  - UX-003 (12h)
    - `flagship-nav.tsx` 7→3 (chatbot/accidents-reports/plan-generator) + 残7は副次セクション
    - `app-shell.tsx` NAV_CATEGORIES を 9→5 カテゴリに統合 (現場ツール / 学習 / 法令 / データ / プロジェクト)
    - `footer.tsx` 4→3 カラム (主要機能3 / 関連データ / 規約) 重複リンク排除
  - UX-027 (4h)
    - `/mental-health` (概念解説) を `/mental-health-management` (実務ハブ) に統合、301 リダイレクト追加
    - サイドバーを「多様な働き方」「心身の健康」の2サブカテゴリに分割 (UX-003と同PRで完結)

### Batch 4 — Internal Linking + Structured Data (16h, 4件)

- **着手日:** 2026-06-02
- **完了目標:** 2026-06-06 (5日)
- **PR名:** `feat(seo-p2): internal links + structured data — ItemList/Quiz/about-main3 (UX-008, SEO-010/011/013)`
- **依存:** Batch 3 完了 (ナビIA確定後にリンク先固定が安全)
- **マージ後の期待効果:** PageRank流通効率改善、ItemList/Quiz Schema でリッチスニペット候補化、E-E-A-T シグナル集中
- **findings:**
  - UX-008 (3h) `home-three-pillars.tsx` 事故カード CTA を `/accidents-reports` に、法改正カードに「年次計画を作る」セカンダリCTA追加
  - SEO-013 (3h) `/about` ページ末尾に「研究成果物 (メイン3機能)」カード追加 + `/chatbot` footer に「監修: 労働安全衛生コンサルタント (/about)」恒久表示
  - SEO-010 (4h) `flagship-grid.tsx` に ItemList JSON-LD を埋め込み (各ListItem に name/url/description)
  - SEO-011 (6h) `/exam-quiz` トップに ItemList of Course Schema、`/exam-quiz/[slug]` に Quiz Schema (questions/answers 一部抜粋)

### Batch 5 — Sitemap/Tech SEO (11h, 3件) ← SEO-002は前倒し完了済

- **着手日:** 2026-06-07
- **完了目標:** 2026-06-11 (5日)
- **PR名:** `feat(seo-p2): sitemap automation (SEO-006/008/022)`
- **依存:** Batch 4 と並行可
- **マージ後の期待効果:** sitemap鮮度をビルド時自動化、重複コンテンツリスク低減
- **SEO-002: 完了済 (2026-05-21前倒し実装, main HEAD fc3389d)**
  - 60KW以上を18ページのdescription/JSON-LDに自然挿入
  - webPageSchema/PageJsonLd に keywords プロパティ追加
  - 業種別 longTailKeywords 10業種に業種×実務文書KW追加
  - ビルド: 2510/2510成功、テスト: 339/339 passed
- **findings (残3件):**
  - SEO-006 (4h) `scripts/refresh-sitemap-lastmod.mjs` 新設 (git log ベース)、`web/src/app/sitemap.ts` の静的 lastmod ハードコーディング撤廃
  - SEO-008 (3h) `sitemap.ts` から `compare?industries=...` のクエリ付き5URLを除外、`/accidents-reports/compare` のみ掲載
  - SEO-022 (4h) `scripts/audit-sitemap-routes.mjs` 新設 — (a) sitemap.xml URL vs routes (b) robots Disallow vs sitemap loc (c) lastmod が1年以内 を CI で検証

### Batch 6 — CWV + Search Expansion + Chatbot SSR + i18n判断 (28h, 6件)

- **着手日:** 2026-06-12
- **完了目標:** 2026-06-15 (4日, Pro期限ぴったり)
- **PR名:** `perf(seo-p2): CWV + search-expansion + chatbot-SSR + i18n-decision (UX-006/017, SEO-018/020/024/025)`
- **依存:** Batch 5 と並行可。SEO-024/025 は P1 の SEO-015/023 と同一判断軸 (撤去推奨)
- **マージ後の期待効果:** LCP/INP 改善、Ctrl+K サイト横断検索強化、Chatbot 初期表示が SEO/A11y 両面で改善、多言語SEOの一貫したスタンス確定
- **findings:**
  - UX-006 (8h) `CommandPalette.tsx` `buildSearchIndex` を laws/industries/diversity/heat-illness/asbestos/faq/glossary/ky-examples/education-certification まで拡張、カテゴリ別フィルタ増設
  - UX-017 (4h) `chatbot-panel.tsx` の EXAMPLE_QUESTIONS / プレースホルダーを Server Component に分離、`<noscript>` 内に静的フォールバック
  - SEO-018 (8h) `scripts/lighthouse-monitor.mjs` を週次運用化 (cron)、JS chunks 20個バジェット、AlertGenerator を動的 import 化し First Load JS から除外
  - SEO-020 (4h) `home-three-pillars.tsx` の pickLatestFatalAccident / pickRecentLawRevisions / pickWarningWeather を Server Component に分離、AlertGenerator のみ Client Boundary
  - SEO-024 (0h, 判断) `LANGUAGE_LABELS.en` を `'English (limited)'` に格下げ + EnglishBetaBanner 撤去 (P1 Batch 3 で SEO-015 と同期処理する前提、ここでは確定のみ)
  - SEO-025 (4h) `language-context.tsx` の setLanguage に `?lang=en` クエリ反映、canonical で正規化。本格 /en/ 化は法人化後に繰り越し

---

## Phase D: 消化スケジュール (28日 / 105h)

| 週 | 期間 | バッチ | 件数 | 工数 | 主テーマ |
|---|---|---|---|---|---|
| W1 | 5/19〜5/22 (4日) | Batch 1 | 6 | 9h | Text/Label Quick Wins |
| W1 | 5/23〜5/26 (4日) | Batch 2 | 4 | 9h | Mobile UX & Feedback |
| W2 | 5/27〜6/01 (6日) | Batch 3 | 2 | 16h | Navigation Restructure + Mental Hub |
| W2-3 | 6/02〜6/06 (5日) | Batch 4 | 4 | 16h | Internal Links + Structured Data |
| W3 | 6/07〜6/11 (5日) | Batch 5 | 4 | 27h | Sitemap/Tech SEO + Long-tail Content |
| W4 | 6/12〜6/15 (4日) | Batch 6 | 6 | 28h | CWV + Search Expansion + Chatbot SSR + i18n |

**合計: 6バッチ / 26件 / 105h / 28日 (Pro plan期限 6/15 内に完了)**

### 工数バッファ

- Batch 5 (27h) と Batch 6 (28h) が後半に集中。Batch 1〜4 で前倒し進捗を作る (Batch 1/2は単純作業の連打)
- SEO-002 (16h) は H2追加+本文加筆が多いため、3日で消化できなければ Batch 5 内で優先順位を上げる
- SEO-024 は判断のみで実装工数ゼロ。P1 Batch 3 (SEO-015/023) と同期処理されるなら Batch 6 から外せる

---

## Phase E: オーナー判断ポイント

1. **SEO-024 / SEO-025:** P1 計画 (SEO-015/023) で「撤去案」が確定済なら、SEO-024/025 も同方針 (Beta表記撤去 + ?lang=en クエリ識別の簡易対応) で確定。本格対応は法人化後の別計画に繰り越し
2. **UX-003 (ナビ3層削減):** FlagshipNav 10→3 は副次機能 (education-certification / industries / work-environment 等) の発見性低下リスクあり。「主要3 + 副次セクション展開」の二段構造で合意できるか
3. **UX-027 (メンタル系統合):** `/mental-health` を `/mental-health-management` に 301 リダイレクト統合する判断。既存被リンクの帰属確認後に実施
4. **SEO-018 (Lighthouse CI週次):** scripts/lighthouse-monitor.mjs の cron 運用は Vercel cron 枠を消費。CRON_SECRET 経由のリモートトリガーで運用するか別途検討

---

## Phase F: 進捗マーカー

各バッチページに `data-batch-id`, `data-finding-id`, `data-status` を埋め込み、PR マージ後は `data-status="completed-pr-<n>"` または `data-status="resolved-pr-<n>"` に更新する運用とする。

これにより、AI WebFetch でクロールした際に進捗状態が機械可読となり、後続の自動レビュー Dispatch が完了/未完了を判定できる。

---

## メタデータ

- 計画作成日: 2026-05-19
- 計画モデル: Opus 4.7
- ベースHEAD: `fdaa523` (PR #242 merged)
- 監査スナップショット: `docs/audit-snapshot-2026-05-17-ux-seo.md`
- 計画ドキュメント: `docs/p2-batch-plan-2026-05-18.md`
- 公開URL: `/audits/p2-batch-plan`
- 公開設定: noindex / follow / サイトマップ非掲載 / ナビ非掲載 / 認証なし / AI WebFetch可
