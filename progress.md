# progress.md

## プロジェクト状況
- 状態: 進行中
- 現在の目標: MVPの基本レイアウト実装
- 次にやること: TASKS.md の 11（法改正ダミーデータ作成）

## 作業ログ

### 2026-03-30
- TASKS 1: Next.js アプリを初期化
  - `web/` に Next.js（App Router）プロジェクトを生成
  - 生成コマンド: `npx create-next-app@latest web --yes --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`
- TASKS 2: TypeScript を有効にする
  - `web/tsconfig.json` が生成され、TypeScript 構成が有効化されていることを確認
- TASKS 3: Tailwind CSS を導入する
  - `web/package.json` に `tailwindcss` と `@tailwindcss/postcss` が導入済み
  - `web/postcss.config.mjs` が `@tailwindcss/postcss` を参照
  - `web/src/app/globals.css` で `@import "tailwindcss";` を確認（Tailwind v4 テンプレ構成）
- TASKS 4: フォルダ構成を整理する
  - `web/src/components` / `web/src/data` / `web/src/lib` を作成（今後のMVP実装で分割しやすくするため）
- TASKS 5: 開発サーバーが起動することを確認する
  - `web/` で `npm run dev` を実行し、`http://localhost:3000` で Ready を確認
- TASKS 6: 共通レイアウトを作成する
  - `web/src/app/layout.tsx` を更新し、スマホ優先の共通コンテナ（`max-w-md`）を追加
  - `lang` を `ja` に変更し、メタデータ（タイトル/説明）をMVP向けに更新
- TASKS 7: ヘッダーを作成する
  - `web/src/components/header.tsx` を新規作成し、上部ヘッダーをコンポーネント分割
- TASKS 8: サイトタイトルと説明文を表示する
  - `Header` 内にサイト名、タイトル、説明文（日本語）を追加
- TASKS 9: タブナビゲーションのUIを作る
  - `web/src/components/tab-navigation.tsx` を新規作成（クライアントコンポーネント）
  - `web/src/app/page.tsx` で `Header` と `TabNavigation` を配置し、初期プレースホルダ文を表示
- TASKS 10: スマホで崩れないか確認する
  - `npm run lint` を実行し、ESLintエラーがないことを確認
  - iPhone 12 Pro（390x844）相当で手動確認し、以下を確認
    - ヘッダー文言（日本語）が可読
    - タブUI（法改正一覧 / AI要約 / 質問チャット）が崩れず操作可能
    - 不要な横スクロールが発生しない
  - 確認用アーティファクトを保存
    - `/opt/cursor/artifacts/tasks_10_mobile_layout_check.mp4`
    - `/opt/cursor/artifacts/tasks_10_mobile_layout_check.webp`
- TASKS 11: 法改正のダミーデータファイルを作る
  - `web/src/data/law-revisions.ts` を新規作成
  - 法改正カード表示用に `id` / `title` / `publishedAt` / `summary` を持つダミーデータを3件追加
- TASKS 12: 法改正カード一覧コンポーネントを作る
  - `web/src/components/law-revision-list.tsx` を新規作成
  - `web/src/app/page.tsx` に一覧コンポーネントを組み込み
- TASKS 13: カードにタイトル、日付、概要を表示する
  - 各カードに `title` / `publishedAt`（`YYYY/MM/DD`）/ `summary` を表示
- TASKS 14: 「AIで要約」ボタンを付ける
  - 各カードに「AIで要約」ボタンを追加（将来の連携用UI）
- TASKS 15: 「質問する」ボタンを付ける
  - 各カードに「質問する」ボタンを追加（将来の連携用UI）