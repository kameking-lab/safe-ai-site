# リポジトリ クリーンアップ監査レポート

**監査日:** 2026-04-26  
**対象:** safe-ai-site リポジトリ全体  
**方針:** 削除なし。リストアップのみ。

---

## セクション1: 即削除可（影響なし）

### 1-A: 未使用のパブリックアセット（Next.js デフォルト残骸）

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `web/public/file.svg` | 391 B | Next.js create-app デフォルト。コード内に参照なし |
| `web/public/globe.svg` | 1.1 KB | Next.js create-app デフォルト。コード内に参照なし |
| `web/public/next.svg` | 1.4 KB | Next.js create-app デフォルト。コード内に参照なし |
| `web/public/vercel.svg` | 128 B | Next.js create-app デフォルト。コード内に参照なし |
| `web/public/window.svg` | 385 B | Next.js create-app デフォルト。コード内に参照なし |
| `web/public/favicon.svg` | 468 B | `favicon.ico` が使われており、SVG版は未参照 |
| `web/public/icons/icon-192.svg` | 495 B | PWA マニフェストは PNG版（icon-192x192.png）を参照。SVG版は未使用 |
| `web/public/icons/icon-512.svg` | 514 B | PWA マニフェストは PNG版（icon-512x512.png）を参照。SVG版は未使用 |

**小計: 8ファイル / 約4.9 KB**

### 1-B: 旧 OGP 画像

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `web/public/og-image.png` | 266 KB | `layout.tsx` の openGraph 設定に参照なし。OGP画像として設定されていない |
| `web/public/logo.svg` | 986 B | コード全体に参照なし。og-imageと同様に旧素材と推定 |

**小計: 2ファイル / 約267 KB**

### 1-C: 完了済みレビューループドキュメント

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `docs/review-loop-1-report.md` | 5.3 KB | レビューループ第1回の完了レポート。履歴はgitにあり |
| `docs/review-loop-2-pending.md` | 3.7 KB | レビューループ第2回の保留リスト。内容はreport/findingsに統合済みと推定 |
| `docs/review-loop-2-report.md` | 4.4 KB | レビューループ第2回の完了レポート |
| `docs/review-loop-3-report.md` | 4.2 KB | レビューループ第3回の完了レポート |

**小計: 4ファイル / 約17.6 KB**

---

**セクション1 合計: 14ファイル / 約289 KB**

---

## セクション2: 確認後削除可（最終確認待ち）

### 2-A: 未インポートのコンポーネント（デッドコード疑い）

grep で全ソースを検索した結果、import が見当たらないコンポーネント群。ただし将来実装予定の可能性もあるため要確認。

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `web/src/components/bear-map-leaflet.tsx` | 4.6 KB | `bear-map-panel.tsx` に置き換えられた旧マップコンポーネントと推定 |
| `web/src/components/ky-paper-form.tsx` | 17 KB | インポートなし。KY用紙フォームは別コンポーネントで実装済みか未着手か確認が必要 |
| `web/src/components/mhlw-accident-search-panel.tsx` | 24 KB | インポートなし。`mhlw-accident-analysis-panel.tsx`（動的インポートあり）に統合済みと推定 |
| `web/src/components/mhlw-chemical-aggregated-panel.tsx` | 29 KB | インポートなし。化学物質パネルとして旧版の可能性 |
| `web/src/components/mhlw-deaths-panel.tsx` | 9.9 KB | インポートなし |
| `web/src/components/mhlw-law-articles-panel.tsx` | 9.9 KB | インポートなし |
| `web/src/components/mhlw-similar-cases-panel.tsx` | 4.9 KB | インポートなし |
| `web/src/components/chatbot-share-view.tsx` | 13 KB | インポートなし。チャットボット共有機能として実装中か廃止かを確認 |
| `web/src/components/translated-text.tsx` | 2.6 KB | インポートなし。多言語対応コンポーネントだが使用箇所なし |

**小計: 9ファイル / 約115.9 KB**

### 2-B: サイネージ未使用コンポーネント

`/signage` ルートは存在するが、以下コンポーネントはサイネージページからインポートされていない。

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `web/src/components/signage/incident-highlights-panel.tsx` | 3.9 KB | サイネージページに未インポート |
| `web/src/components/signage/law-highlights-panel.tsx` | 3.5 KB | サイネージページに未インポート |
| `web/src/components/signage/risk-hero-card.tsx` | 6.0 KB | サイネージページに未インポート |
| `web/src/components/signage/signage-hourly-weather.tsx` | 4.5 KB | サイネージページに未インポート |
| `web/src/components/signage/weather-alert-panel.tsx` | 5.2 KB | サイネージページに未インポート |

**小計: 5ファイル / 約23.1 KB**

### 2-C: 旧日付ドキュメント（レビューループ関連）

内容が古くなっている可能性があるが、まだ参照価値があるかを確認してから削除。

| パス | サイズ | 削除理由 |
|------|--------|----------|
| `docs/chrome-r8-emergency-fixes.md` | 8.4 KB | 特定のChrome review回での緊急修正ログ。完了済みの可能性 |
| `docs/chrome-review-fixes-2026-04-19.md` | 6.1 KB | 4/19付きレビュー修正ログ |
| `docs/chrome-review-round3-fixes.md` | 5.9 KB | レビュー第3回の修正ログ |
| `docs/must-fix-list-2026-04-19.md` | 11 KB | 4/19付きのMust Fix一覧。`outstanding-issues.md` に統合済みか確認 |
| `docs/review-loop-4-findings.md` | 5.2 KB | レビューループ第4回の知見。完了済みかを確認 |
| `docs/business-setup-2026-04-19.md` | 9.2 KB | 4/19付きセットアップログ。セットアップ完了後は不要 |
| `docs/persona-100-fixes.md` | 8.1 KB | ペルソナ100名レビューの修正ログ。`persona-100-review-2026-04-25.md` より古い |

**小計: 7ファイル / 約53.9 KB**

---

**セクション2 合計: 21ファイル / 約192.9 KB**

---

## セクション3: 削除すべきでない（保留）

| パス | 理由 |
|------|------|
| `docs/session-handover-2026-04-21.md` | 引き継ぎドキュメント。明示的に保持指定 |
| `docs/mhlw-integration-plan.md` | 進行中の統合計画。参照価値あり |
| `docs/bear-data-sources.md` | データソース一覧。運用上必要 |
| `docs/outstanding-issues.md` | 現在の課題一覧。常に参照 |
| `docs/remaining-proposals.md` | 未実装提案一覧。優先度判断に使用 |
| `docs/persona-100-personas.md` | ペルソナ定義。テスト・UX検討の基礎資料 |
| `docs/persona-100-review-2026-04-25.md` | 最新レビュー（4/25付き）。まだ参照価値あり |
| `docs/seminar-qa-report.md` | セミナー機能のQAレポート |
| `web/src/components/goods-icons/index.tsx` | アイコンセット。tree-shaking/lazy-load の可能性。削除はビルド確認後 |
| `data/accidents-10years.jsonl` | ETLパイプラインのソースデータ（3.1 MB） |
| `data/law-updates-10years.jsonl` | ETLパイプラインのソースデータ |
| `web/src/data/chemicals-mhlw/chemicals.jsonl` | 化学物質DB（3.9 MB）。API Routeが参照 |
| `web/src/data/deaths-mhlw/records-*.jsonl` | 死亡記録ソースデータ（ETLスクリプトが処理） |
| `web/src/data/laws-mhlw/articles.jsonl` | 法令条文データ |
| `scripts/etl/` 配下全スクリプト | データ更新パイプライン。再実行の必要性あり |
| `scripts/generate-seminar-pptx.mjs` | セミナーPPTX生成。運用ツール |
| `.env.example`, `web/.env.example` | 環境変数テンプレート。オンボーディングに必要 |
| `web/public/favicon.ico` | 使用中 |
| `web/public/apple-touch-icon.png` | PWA標準 |
| `web/public/icon-192x192.png`, `icon-512x512.png` | PWAマニフェスト参照 |
| `web/public/mascot/` | キャラクター画像。UI使用中 |
| `web/public/geo/japan-prefectures-ne10m.json` | 地図データ。マップコンポーネントが参照 |
| `web/public/manifest.json`, `sw.js`, `offline.html` | PWA必須ファイル |

---

## セクション4: 統合・整理が望ましい

### 4-A: docs/ の構造整理

現在、`docs/` に19ファイルが混在しており管理が困難。以下のサブディレクトリ構造への移行を推奨:

```
docs/
├── active/          # outstanding-issues.md, remaining-proposals.md
├── reference/       # bear-data-sources.md, persona-100-personas.md, mhlw-integration-plan.md
├── reviews/         # 最新のレビューレポートのみ保持
├── handover/        # session-handover-*.md
└── archive/         # 完了済み・古いドキュメント（削除前の一時保管）
```

### 4-B: mhlw系コンポーネントの整理

以下のコンポーネントは機能が重複している可能性があり、どれが「現行版」かを明確化すべき:

- `mhlw-accident-analysis-panel.tsx`（動的インポートあり → 現行版）
- `mhlw-accident-search-panel.tsx`（インポートなし → 旧版？）
- `mhlw-similar-cases-panel.tsx`（インポートなし → 分離された機能？）

→ 現行の `home-screen.tsx` のレンダリングツリーを確認して整理。

### 4-C: サイネージコンポーネントの状態明確化

`/signage` ページは存在するが、5つのサイネージコンポーネントがページに組み込まれていない。  
→ 「将来実装予定」ならコメントや `TODO:` を付与。「廃止」なら削除。方針を明確にする。

### 4-D: KYフォームの実装状況確認

`ky-paper-form.tsx`（17 KB）がインポートされていない。CLAUDE.md の優先課題5「KY用紙の完成」と関連するため、  
→ 実装中なら使用箇所を確認。未着手なら現行コードとの整合性を確認してから接続。

---

## サマリー

| セクション | ファイル数 | サイズ |
|------------|-----------|--------|
| セクション1（即削除可） | 14 | 約289 KB |
| セクション2（確認後削除可） | 21 | 約193 KB |
| **合計候補** | **35** | **約482 KB** |

最も確実な効果は **セクション1のパブリックアセット（Next.jsデフォルトSVG群）** と **完了済みレビューループレポート** の削除。  
コンポーネントの削除は `npm run build` で参照がないことを確認してから実施することを推奨。
