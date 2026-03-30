# AGENTS.md

## このプロジェクトのゴール
安全AIサイトのMVPを完成させること。
今回のMVPは以下に限定する。
- 法改正一覧
- AI要約表示
- 質問チャットUI

## 最重要ルール
- 必ず PRD.md と TASKS.md を読んでから作業開始する
- TASKS.md の順番を守る
- 1タスクずつ進める
- タスク完了ごとに progress.md を更新する
- エラーが出たら自分で修正して続行する
- ユーザー確認なしで進める
- 迷ったら MVPを小さく保つ
- 大きな設計変更は禁止
- MVP外の機能は実装しない
- 動作確認を優先する
- UIはスマホ優先で作る
- 実装後は変更ファイルを簡潔にまとめる

## 技術ルール
- Next.js App Router を使う
- TypeScript を使う
- Tailwind CSS を使う
- コンポーネントを分ける
- ハードコードしすぎず、将来API差し替えしやすくする
- ダミーデータでよい
- APIキーや秘密情報は絶対に埋め込まない

## 作業ルール
- 作業前に短い実行計画を書く
- 作業後に何をやったかを progress.md に記録する
- テストや起動確認をできる範囲で行う
- 失敗した試行は簡潔に記録する
- 詰まったら次善策で前進する
- 不必要なライブラリは追加しない

## 禁止事項
- 認証の追加
- 課金機能の追加
- DB本接続の追加
- 外部APIの本接続
- 画像入力や音声入力の実装
- MVP外のページ追加

## Cursor Cloud specific instructions

### サービス概要
Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 のシングルサービス構成。外部DB・API接続なし、ダミーデータのみ。

### 起動コマンド
- **依存関係インストール**: `cd web && npm install`
- **開発サーバー**: `cd web && npm run dev` → http://localhost:3000
- **Lint**: `cd web && npm run lint`
- **ビルド**: `cd web && npm run build`

### 注意点
- パッケージマネージャは **npm**（`package-lock.json` あり）。yarn/pnpm は使わないこと。
- Next.js 16.2.1 は訓練データと異なるAPIを持つ場合がある。コード変更前に `node_modules/next/dist/docs/` のガイドを参照すること（`web/AGENTS.md` 参照）。
- 環境変数・シークレットは不要（ダミーデータMVP）。