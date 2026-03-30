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

## 現在の構成（任意改善後）

- `src/data/mock/law-revisions.ts`
  - 法改正の基本情報（一覧表示用の最小データ）
- `src/data/mock/summaries.ts`
  - 要約モック（3行要約 / 現場でやること / 対象業種）
- `src/data/mock/chat-responses.ts`
  - チャット応答ルール（キーワード連動）
- `src/lib/services/revision-service.ts`
  - 一覧取得の窓口（将来API化ポイント）
- `src/lib/services/summary-service.ts`
  - 要約取得の窓口（将来API化ポイント）
- `src/lib/services/chat-service.ts`
  - チャット応答生成の窓口（将来API化ポイント）

## 次にAPI接続する場所

1. `revision-service.ts` の `getLawRevisions()` を API fetch に置換
2. `summary-service.ts` の `getSummaryByRevisionId()` を API fetch に置換
3. `chat-service.ts` の `createChatResponse()` を API呼び出し（LLM/Backend）に置換
4. UI（`home-screen.tsx`）は service 呼び出しを維持し、直接モックデータへ依存しない
