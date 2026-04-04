# CLAUDE.md - 安全AIサイト プロジェクトルール

## プロジェクト概要
労働安全の現場運用ポータル。スマホ/PC/サイネージで使う。
オーナーは労働安全コンサルタント。協会でのシステム受注ポートフォリオを兼ねる。

## 技術スタック
- Next.js App Router, TypeScript, Tailwind CSS
- Vercel デプロイ（GitHub mainブランチ連携）
- モックデータ中心 → 将来Supabase/AI API接続予定

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

## 品質基準
- Lighthouse Performance 90+, Accessibility 90+
- モバイル表示崩れゼロ
- リンク切れゼロ
- ビルドエラーゼロ
- TypeScript エラーゼロ

## 優先度の高い課題（引き継ぎ時点）
1. PCレイアウトの横伸び修正（全ページ）
2. 事故データベースの充実（厚労省データ10年分）
3. 法改正データの充実（10年分）
4. Eラーニングの編集機能
5. KY用紙の完成（音声入力・PDF出力）
6. 安衛法チャットボットの実装
7. 通知機能の実装
8. サブスク課金の設計

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
