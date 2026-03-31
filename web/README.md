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

## CI向け環境変数（失敗注入）

E2Eで失敗パターンを再現する場合は、以下の query を URL に付けるか、`x-force-error` header を利用します。

- `forceError=5xx`: 503系の一時障害を再現
- `forceError=timeout`: timeout系（summary/chat）を再現
- `forceError=validation`: validation系（summary/chat）を再現

## よく使うコマンド

```bash
# Lint
npm run lint

# 本番ビルド確認
npm run build

# Service層の単体テスト
npm run test

# liveモード E2E
npm run test:e2e

# CIと同等の一括チェック
npm run check:ci

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

## 検証手順の整理

### 1) ローカル検証（mock中心）

```bash
cd web
npm install
npm run lint
npm run test
npm run dev
```

### 2) live検証（正常系）

```bash
cd web
cp .env.example .env.local
# .env.local: NEXT_PUBLIC_API_MODE=live
npm run dev
```

ブラウザで以下を確認:
- 一覧表示
- AI要約表示
- チャット送信

## forceError（query/header）で失敗状態を再現

Route Handler は `forceError` を query/header のどちらでも受け付けます。

```bash
# query で再現（revisions）
curl "http://localhost:3000/api/revisions?forceError=5xx"

# query で再現（summaries）
curl "http://localhost:3000/api/summaries?revisionId=lr-001&forceError=5xx"
curl "http://localhost:3000/api/summaries?revisionId=lr-001&forceError=timeout"
curl "http://localhost:3000/api/summaries?revisionId=lr-001&forceError=validation"

# query で再現（chat）
curl -X POST "http://localhost:3000/api/chat?forceError=5xx" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'
curl -X POST "http://localhost:3000/api/chat?forceError=timeout" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'
curl -X POST "http://localhost:3000/api/chat?forceError=validation" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'

# header で再現（revisions）
curl -H "x-force-error: 5xx" "http://localhost:3000/api/revisions"

# header で再現（summaries）
curl -H "x-force-error: 5xx" "http://localhost:3000/api/summaries?revisionId=lr-001"
curl -H "x-force-error: timeout" "http://localhost:3000/api/summaries?revisionId=lr-001"
curl -H "x-force-error: validation" "http://localhost:3000/api/summaries?revisionId=lr-001"

# header で再現（chat）
curl -X POST "http://localhost:3000/api/chat" -H "x-force-error: 5xx" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'
curl -X POST "http://localhost:3000/api/chat" -H "x-force-error: timeout" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'
curl -X POST "http://localhost:3000/api/chat" -H "x-force-error: validation" -H "content-type: application/json" -d '{"revisionId":"lr-001","revisionTitle":"高所作業時の墜落防止措置の強化","question":"施行日はいつですか"}'
```

## 最小テスト方針（service層）

- 目的: API接続前でも、service契約（成功/失敗・戻り値形）を壊さないことを担保する
- 対象: `revision-service` / `summary-service` / `chat-service`
- 手段: Vitestでモック実装の単体テストを実行
- 実行コマンド: `npm run test`

## E2E テスト（Playwright 最小構成）

- 目的: `live` モードでの基本導線と失敗注入時の通知・再試行導線を自動検証
- 設定:
  - `playwright.config.ts`
  - `e2e/live-mode.spec.ts`
- 実行コマンド:

```bash
npm run test:e2e
```

- 検証内容:
  - 正常系: 一覧表示 / AI要約表示 / チャット送信
  - 失敗系:
    - 一覧 5xx
    - 要約 5xx
    - 要約 timeout
    - チャット validation
  - 回復系:
    - 要約 5xx 失敗後、再試行で回復

## GitHub Actions（最小CI）

リポジトリ直下の `.github/workflows/web-ci.yml` で、以下を実行する最小CIを追加済みです。

1. `npm run lint`
2. `npm run build`
3. `npm run test`
4. `npm run test:e2e`
