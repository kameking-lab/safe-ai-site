# progress.md

## プロジェクト状況
- 状態: 進行中
- 現在の目標: MVPの初期実装（セットアップ）
- 次にやること: TASKS.md の 6 から開始（基本レイアウト）

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