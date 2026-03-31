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

## 環境変数（live/mock切替）

- `NEXT_PUBLIC_API_MODE=mock`
  - 既存モック service を直接利用（従来どおり）
- `NEXT_PUBLIC_API_MODE=live`
  - Next.js Route Handler (`/api/revisions`, `/api/summaries`, `/api/chat`) を fetch して取得

`.env.example` をコピーして `.env.local` を作成してください。

```bash
cp .env.example .env.local
```

### live / mock 切替

- 既定は `mock`（環境変数未指定時）
- `live` にすると Next.js Route Handler (`/api/revisions`, `/api/summaries`, `/api/chat`) 経由で取得

```bash
# web/.env.local を作成
NEXT_PUBLIC_API_MODE=live
```

`mock` に戻す場合は `NEXT_PUBLIC_API_MODE=mock`、または環境変数を未設定にしてください。

## よく使うコマンド

```bash
# Lint
npm run lint

# 本番ビルド確認
npm run build

# Service層の単体テスト
npm run test

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
  - 一覧取得の窓口（`RevisionService` インターフェース）
- `src/lib/services/summary-service.ts`
  - 要約取得の窓口（`SummaryService` インターフェース）
- `src/lib/services/chat-service.ts`
  - チャット応答生成の窓口（`ChatService` インターフェース）
- `src/lib/services/service-factory.ts`
  - `NEXT_PUBLIC_API_MODE` で `mock` / `live` の実装を切替
- `src/app/api/revisions/route.ts`
  - 法改正一覧の Route Handler（liveモード用）
- `src/app/api/summaries/route.ts`
  - 要約取得の Route Handler（`revisionId` 必須、失敗レスポンス対応）
- `src/app/api/chat/route.ts`
  - チャット応答の Route Handler（入力検証、失敗レスポンス対応）
- `src/lib/types/api.ts`
  - API入出力型（request/response）と `ServiceResult` の共通型

## 次にAPI接続する場所

1. `NEXT_PUBLIC_API_MODE=live` で `service-factory.ts` 経由の実装に切替
2. `revision-service.ts` の `createApiRevisionService()` で `/api/revisions` fetch を本番APIへ置換
3. `summary-service.ts` の `ApiSummaryService` で `/api/summaries?revisionId=...` を本番APIへ置換
4. `chat-service.ts` の `ApiChatService` で `/api/chat` POST をLLM/Backend APIへ置換
5. UI（`home-screen.tsx`）は `ServiceResult` だけを扱うため、UI層の大きな変更なしで接続先を差し替え可能

## liveモードでの最小確認手順

```bash
cd web
cp .env.example .env.local
# .env.local の NEXT_PUBLIC_API_MODE=live に変更
npm run dev
```

ブラウザで `http://localhost:3000` を開き、
- 法改正一覧の表示
- 「AIで要約」で要約表示
- チャット送信で回答表示
を確認してください。

## 最小テスト方針（service層）

- 目的: API接続前でも、service契約（成功/失敗・戻り値形）を壊さないことを担保する
- 対象: `revision-service` / `summary-service` / `chat-service`
- 手段: Vitestでモック実装の単体テストを実行
- 実行コマンド: `npm run test`
