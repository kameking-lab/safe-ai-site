# 安全AIサイト（MVP）

法改正一覧・AI要約表示・質問チャットUIを提供する、スマホ優先の Next.js アプリです。

## 動作環境

- Node.js 20 以上推奨
- npm 10 以上推奨

## 起動手順

1. `web/` ディレクトリへ移動
2. 依存関係をインストール
3. 開発サーバーを起動
4. ブラウザで `http://localhost:3000` を開く

```bash
cd web
npm install
npm run dev
```

## よく使うコマンド

```bash
# Lint
npm run lint

# 本番ビルド確認
npm run build

# 本番起動
npm run start
```

## 実装方針（MVP）

- Next.js App Router
- TypeScript
- Tailwind CSS
- ダミーデータ中心（外部API本接続なし）
- スマホ優先UI
