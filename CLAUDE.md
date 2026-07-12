# CLAUDE.md - 安全AIサイト プロジェクトルール

## プロジェクト概要
労働安全の現場運用ポータル。スマホ/PC/サイネージで使う。
オーナーは労働安全コンサルタント。協会でのシステム受注ポートフォリオを兼ねる。

## 技術スタック
- Next.js App Router, TypeScript, Tailwind CSS
- Vercel デプロイ（GitHub mainブランチ連携）
- モックデータ中心 → 将来Supabase/AI API接続予定

## パッケージマネージャー（重要）
- **npm のみ使用。pnpm・yarn は絶対に使わない**
- `npm install` でパッケージ追加、`npm ci` でクリーンインストール
- `pnpm-lock.yaml` / `yarn.lock` は .gitignore で除外済み。コミット禁止
- `web/package.json` に `"packageManager": "npm@11.8.0"` を設定済み

## コマンド
- `cd web && npm run dev` → 開発サーバー (localhost:3000)
- `cd web && npm run build` → ビルド確認
- `cd web && npm run lint` → ESLint
- `cd web && npm run test` → vitest
- `cd web && npx playwright test` → E2Eテスト

## コーディングルール
- TypeScript strict、any禁止
- コンポーネントは web/src/components/ に置く
- ページは web/src/app/(main)/[機能名]/ に置く
- モックデータは web/src/data/mock/ に置く
- API Routeは web/src/app/api/ に置く
- Tailwind でスタイリング。別CSSファイルは作らない
- 日本語UIで統一（コード中のコメントは日本語OK）

## レイアウトルール（重要）
- PC: max-w-7xl + mx-auto でコンテンツ幅を制限。横に間延びさせない
- スマホ: 縦並びスクロール、タップしやすいサイズ
- サイネージ: フルスクリーン前提、自動更新
- レスポンシブは mobile-first で書く

## 自律作業のルール
### 自分で判断してよいこと
- UIの改善（レイアウト崩れ、余白、フォントサイズ）
- コンポーネントの分割・リファクタリング
- モックデータの追加・充実
- TODO/FIXMEの解消
- lint/build エラーの修正
- テストの追加
- パフォーマンス改善
- アクセシビリティ改善
- SEO基本対応（meta, OGP）
- リンク切れ修正

### 必ずオーナーに確認すること
- 新しい外部API/サービスの導入
- DB（Supabase等）の接続・スキーマ変更
- 課金・認証の実装
- アフィリエイトIDの変更
- ページ構成の大幅変更（URL変更を伴うもの）
- 環境変数の追加
- 依存パッケージの大幅追加

### 毎回やること
1. 変更前に npm run build が通ることを確認
2. 変更後に npm run build + npm run lint が通ることを確認
3. 見た目の変更はスクリーンショットで報告
4. 何を直したか、何が残っているかを報告
5. 新機能ページを追加するPRでは `web/src/data/features-catalog.ts`（/features カタログ）への収載を完了条件に含める（酷評CR2-H1: /law-navi・/search 等が長期間0リンクの孤島だった再発防止）

## 品質基準
- Lighthouse Performance 90+, Accessibility 90+
- モバイル表示崩れゼロ
- リンク切れゼロ
- ビルドエラーゼロ
- TypeScript エラーゼロ

## 優先度の高い課題（2026-07-12 実装実態に更新）

> 正本の勝敗計器は `docs/nihonichi-scorecard.md`。本リストはそのうち「まだ手が要る課題」だけを残す。
> 旧「引き継ぎ時点」リストの 4/5/6 は 2026-07-12 の実ファイル確認で完了済みと判明したため下部「解消済み」へ移動（NIQ-OPS2）。

### まだ残っている課題
1. 法令網羅性の底上げ（スコアカード§1-3 負け）: 全文取込 FT-D2〜D7（`BACKLOG-data`）で条ページを段階開放。安衛則1,182条は取込済み、安衛法・安衛令ほかは抄録段階。
2. モバイルLighthouse再実測と是正（§S-3 負け・2026-05-14実測で81.1/LCP 5105ms＝2ヶ月前で現状不明）。`BACKLOG-ops` の静穏窓実測タスクを実行し、90未満ページのみ各レーンへ是正分割。
3. 閉じている端末へのPush通知（§8-3 負け）: タブ表示中OS通知・ベル・メール・RSSは完備。閉端末Pushのみ VAPID鍵未発行（Path A制約）で停止＝**鍵発行はオーナー専権**（`docs/vapid-push-setup-guide-2026-07-11.md`／NIQ-HUB1）。
4. SEO計器の稼働（§S-1/S-2 測定不能）: GSC/GA4未稼働で順位・インデックス・流入がゼロ計測。**サイト全体で唯一残っている社長作業・約30分**（`docs/ga4-gsc-status-2026-05-23/02-required-actions.md`／NIQ-SEO1）。
5. サブスク課金の設計（`NEXT_PUBLIC_PAID_MODE` は現状 off）。Stripe価格ID等の実装土台はあるが本番運用は未着手＝オーナー判断待ち。

### 解消済み（旧リストからの陳腐化訂正・実ファイルで確認）
- **Eラーニングの編集機能**: `web/src/components/elearning-editor-panel.tsx` で実装済（localStorage永続）。§6-3=勝。
- **KY用紙（音声入力・PDF出力）**: 音声=`web/src/components/voice-input-field.tsx`、印刷/PDF=`web/src/components/ky-paper/ky-print-sheet.tsx` で実装済。§5-1並・§5-3実装。
- **安衛法チャットボット**: 本番稼働・51問公開eval 100%（`docs/chatbot-genquality-51q-final-2026-07-11.json`）。§3=勝（競合不在）。

## 環境変数命名規則（重要）

詳細: `docs/env-naming-guide-2026-05-02.md`、クリーンアップ候補: `docs/env-cleanup-candidates.md`

### NEXT_PUBLIC_* (ブラウザ公開)
| 正式名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_AMAZON_AFFILIATE_ID` | Amazon アソシエイトタグ (旧名: AMAZON_ASSOCIATE_TAG も使用可) |
| `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイトID (**AFID は誤り**) |
| `NEXT_PUBLIC_FORMSPREE_ID` | お問い合わせフォーム |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | Stripe プロプラン Price ID |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | Stripe スタンダードプラン Price ID |
| `NEXT_PUBLIC_SITE_URL` | 本番URL (Stripe リダイレクト用) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4測定ID。Vercel Production envのみに設定（Preview/Devは`VERCEL_ENV`ガードでタグ未出力＝`web/src/lib/analytics-env.ts`） |
| `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE` | 法改正データソース切替 |
| `NEXT_PUBLIC_PAID_MODE` | 課金機能フラグ (false/true) |

### サーバーサイドシークレット
| 正式名 | 用途 |
|--------|------|
| `GEMINI_API_KEY` | Gemini AI 全機能 (`GOOGLE_API_KEY` は旧エイリアス) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (MHLW検索) |
| `STRIPE_SECRET_KEY` | Stripe 決済 |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証 |
| `AUTH_SECRET` | NextAuth セッション |
| `RESEND_API_KEY` / `RESEND_AUDIENCE_ID` | メール通知 |
| `CRON_SECRET` | Cron ジョブ認証 |

## ファイル構成
```
safe-ai-site/
├── web/
│   ├── src/
│   │   ├── app/          # ページ (Next.js App Router)
│   │   │   ├── (main)/   # メインレイアウト配下
│   │   │   ├── api/      # API Routes
│   │   │   └── signage/  # サイネージ（独立レイアウト）
│   │   ├── components/   # UIコンポーネント
│   │   ├── data/mock/    # モックデータ
│   │   └── lib/          # ユーティリティ・サービス
│   └── public/           # 静的ファイル
├── CLAUDE.md             # ← このファイル
├── HANDOFF_FROM_CURSOR.md
├── AFFILIATE.md
└── vercel.json
```
