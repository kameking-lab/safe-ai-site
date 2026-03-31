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

補助パラメータ:
- `forceErrorTransport=header`: query ではなく `x-force-error` header で注入
- `forceRevisionsDelayMs` / `forceSummaryDelayMs` / `forceChatDelayMs`: 遅延注入
- `NEXT_PUBLIC_FORCE_ERROR`: 全API共通のデフォルト失敗注入（queryが優先）

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

# smokeのみ（PR向け軽量）
npm run test:e2e:smoke

# failureシナリオのみ
npm run test:e2e:failure

# recoveryシナリオのみ
npm run test:e2e:recovery

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
  - ingest経由で整形済みの法改正一覧データ（UI表示用）
  - `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE=sample|real` で入力源を切替
- `src/lib/revisions-ingest/`
  - 実データ取り込み前提の入口
  - `sample-revisions.json`: サンプル入力（実データ想定）
  - `types.ts`: 取り込み入力型
  - `parse.ts`: 外部入力 payload を `RevisionImportRecord[]` へ変換
  - `normalize.ts`: 入力→`LawRevision` 正規化
  - `load-sample.ts`: サンプルJSONを読み込むローダー
  - `load-real.ts`: 実データ向けローダー（payload同期読込 / endpoint非同期fetch）
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
- `src/data/mock/weather-risk.ts`
  - 天気・警報のモックデータ（地域/気温/風/雨/警報）
- `src/lib/services/weather-risk-service.ts`
  - 天気・警報データから現場向けリスクを算出する service（暑さ/強風/雨/警報ルール）
  - `mock` と `live` の両方を保持し、`NEXT_PUBLIC_API_MODE=live` では `/api/weather-risk` から取得
- `src/components/weather-risk-card.tsx`
  - 「今日の現場リスク」表示UI（リスク高の視覚強調）

## revisions データ構造（現在）

`LawRevision`（一覧表示の正規化済み型）は以下を扱います。

- `id`
- `title`
- `publishedAt`
- `revisionNumber`
- `kind`（`law` / `ordinance` / `notice` / `guideline`）
- `category`
- `issuer`
- `summary`
- `source.url`
- `source.label`

## revisions ingest の正規化ルール（最小）

- `kind`: `law | ordinance | notice | guideline | other` へ正規化（不明値は `other`）
- `category`: 既知カテゴリを優先し、未設定時は `kind` から補完（最終的に `"通達"` フォールバック）
- `issuer`: `record.issuer` → `record.source.issuer` → `"発出元未設定"` の順で補完
- `revisionNumber`: 未設定時は `<publishedAt> <kind> 未設定` を補完
- `source.url`: `http/https` のみ採用し、不正URLは空文字へフォールバック
- `summary`: 未設定時 `"概要未設定"` を補完

## load-sample / load-real の役割

- `loadSampleRevisions()`
  - `sample-revisions.json` を読み込み、parse/normalize を経て `LawRevision[]` を返す
  - ローカル開発の既定入力
- `loadRealRevisionsFromPayload(payload)`
  - 外部取得済み payload（JSON配列/`records`）を同期的に正規化
  - 現状のUI/Routeで「実データ形式の注入」に使う
- `loadRealRevisions({ endpoint, fetchImpl, timeoutMs })`
  - 実データ取得URLから非同期fetchして正規化
  - 将来の本物データ接続時に `route` / `service` から呼ぶ入口

## real ingest の実行条件（現行）

- `ingestSource=real` のとき、`/api/revisions` は real ingest を優先します。
- 入力優先順位:
  1. `realSourcePayload`（query）
  2. `realSourceUrl`（query）
  3. `REVISIONS_REAL_SOURCE_URL`（server env）
- マッパー形式:
  - `realSourceFormat`（query）または `REVISIONS_REAL_SOURCE_FORMAT`（server env）
  - 未指定時は `default`
  - `official-db` は最小実装済み（`lawId` / `lawTitle` / `promulgatedAt` など）
- `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE=real` を設定すると、query未指定時の既定 ingest source を real にできます。
- real取得が未設定・失敗・不正payloadの場合は、安全に既存の sample/mock データへフォールバックします。

## 天気・警報リスク機能（最小）

### 現在の構成

- `src/data/mock/weather-risk.ts`
  - 地域名/日付/天気概要/気温/風/雨/警報・注意報のモックデータ
- `src/lib/services/weather-risk-service.ts`
  - 簡易ルールで `riskLevel`（低/中/高）、`primaryCautions`、`recommendedActions` を算出
  - ルール例:
    - 暑さ（気温）で加点
    - 強風で加点
    - 雨量で加点
    - 警報/注意報で加点（警報は重め）
- `src/components/weather-risk-card.tsx`
  - ホーム上部に「今日の現場リスク」カードを表示
  - 地域、リスクレベル、主な注意点、推奨アクションを表示
  - リスク高は赤系で強調
- `src/components/home-screen.tsx`
  - `services.weatherRisk.getTodaySiteRisk()` でデータ取得し、カードを表示

### 将来の live API 置換ポイント

1. `app/api/weather-risk/route.ts` で天気ソース（現在はOpen-Meteo）から `WeatherSnapshot` へ変換
2. `weather-risk-service.ts` の `createApiWeatherRiskService()` で route 結果を既存のリスク算出ロジックへ適用
3. `service-factory.ts` が `NEXT_PUBLIC_API_MODE=live` 時に weather service を live 実装へ切替
4. UI（`weather-risk-card.tsx`）は `SiteRiskWeather` 表示のまま維持し、表示層の変更を最小化

### live天気API（最小版）の使い方

- `NEXT_PUBLIC_API_MODE=live` を設定すると、`今日の現場リスク` は `/api/weather-risk` 経由で取得します。
- 地域ごとの座標は route 側で最小マップを持ちます（東京/大阪/名古屋/福岡/札幌）。
- 取得失敗時はサービス層で分かりやすいエラーを返し、UIは既存のエラー表示を使います。

```bash
# web/.env.local
NEXT_PUBLIC_API_MODE=live
```

オプション（任意）:
- `NEXT_PUBLIC_WEATHER_API_MODE=mock|live`（未設定時は `NEXT_PUBLIC_API_MODE` に従う）
- `NEXT_PUBLIC_WEATHER_API_TIMEOUT_MS=4500`（weather service の route fetch timeout）

### realSourceUrl の安全ルール

- `realSourceUrl` / `REVISIONS_REAL_SOURCE_URL` は **https URLのみ** 許可します。
- 許可ホストは `REVISIONS_REAL_SOURCE_ALLOW_HOSTS`（カンマ区切り）で明示します。
  - 例: `example.com,api.example.jp`
  - サブドメインは許可（`api.example.com` は `example.com` 指定で許可）
- 許可外/不正URL/未設定は real ingest を拒否し、安全フォールバックします。
- route レスポンスヘッダで判定可能:
  - `x-revisions-ingest-fallback-reason`: `endpoint_missing` / `endpoint_invalid` / `endpoint_not_allowed` / ...
  - `x-revisions-ingest-endpoint-host`: 判定対象ホスト（取得できた場合）

## official-db mapper の想定（最小）

`sourceFormat=official-db` では、以下を `parse.ts` で `RevisionImportRecord.meta` に取り込み、`normalize.ts` で最終 `LawRevision` へ反映します。

- 施行日: `effectiveDate` / `effective_date` / `enforcedAt` / `enforced_at`
- 改正種別: `amendmentType` / `amendment_type` / `revisionType` / `revision_type`
- 法令番号: `lawNumber` / `law_number` / `actNumber` / `act_number`
- 発出元: `issuedBy` / `issued_by` / `issuer` / `sourceIssuer`

役割分離:
- `parse.ts`: 取得元フォーマット差分の吸収
- `normalize.ts`: 欠損補完・型正規化・安全化
- `load-real.ts`: 入力源選択（payload/endpoint）と endpoint 安全検証

## ingest パイプラインの流れ

1. `load-real.ts` / `load-sample.ts`: 入力源（payload or endpoint or sample）を選択
2. `parse.ts`: 取得元フォーマットごとに `RevisionImportRecord` へ変換（mapper）
3. `normalize.ts`: 欠損補完・URL検証を行い `LawRevision` へ正規化
4. `route.ts` (`/api/revisions`): ingest結果を API レスポンス化し、状態ヘッダを付与
5. `revision-service` / `service-factory`: UIから query 指定で real ingest 条件を透過

## 次にAPI接続する場所

1. `NEXT_PUBLIC_API_MODE=live` で `service-factory.ts` 経由の実装に切替
2. `revision-service.ts` の `createApiRevisionService()` で `/api/revisions` fetch を本番APIへ置換
3. `summary-service.ts` の `ApiSummaryService` で `/api/summaries?revisionId=...` を本番APIへ置換
4. `chat-service.ts` の `ApiChatService` で `/api/chat` POST をLLM/Backend APIへ置換
5. UI（`home-screen.tsx`）は `ServiceResult` だけを扱うため、UI層の大きな変更なしで接続先を差し替え可能

### 法改正の実データ取得へ置き換えるポイント

1. `REVISIONS_REAL_SOURCE_ALLOW_HOSTS` を本番取得先の正式ドメインで管理し、運用時に明示する
2. `src/lib/revisions-ingest/load-real.ts` の endpoint を本番取得先（法令DB/内部API）へ接続（現状は実呼び出し可能）
3. 取得元ごとの差分は `src/lib/revisions-ingest/parse.ts` に mapper 追加で吸収
4. 項目品質ルール（URL/issuer/kind/revisionNumber）は `src/lib/revisions-ingest/normalize.ts` に集約
5. `src/app/api/revisions/route.ts` の fallback 戦略（reason/header付き）を維持しつつ、real取得成功率を段階的に上げる
6. UI側は `LawRevision` 受け取りのまま維持し、`service-factory` と `revision-service` の透過設定で対応

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
curl "http://localhost:3000/api/revisions?forceError=timeout"
curl "http://localhost:3000/api/revisions?forceError=validation"

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
curl -H "x-force-error: timeout" "http://localhost:3000/api/revisions"
curl -H "x-force-error: validation" "http://localhost:3000/api/revisions"

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
npm run test:e2e:smoke
npm run test:e2e:failure
npm run test:e2e:recovery
```

- 検証内容:
  - 正常系: 一覧表示 / AI要約表示 / チャット送信
  - 失敗系:
    - 一覧 5xx / timeout / validation
    - 要約 5xx / timeout / validation
    - チャット 5xx / timeout / validation
  - 回復系:
    - 要約 5xx 失敗後、再試行で回復
    - チャット 5xx 失敗後、再送で回復

### Playwright artifact 取り扱い

- `playwright.config.ts` で以下を有効化:
  - `trace: "retain-on-failure"`
  - `video: "retain-on-failure"`
  - `screenshot: "only-on-failure"`
- CIでは `playwright-report` / `test-results` をartifact保存

## GitHub Actions（最小CI）

リポジトリ直下の `.github/workflows/web-ci.yml` で、以下を実行する最小CIを追加済みです。

1. `smoke` ジョブ（PR/Push向け）
   - `npm run lint`
   - `npm run build`
   - `npm run test`
   - `npm run test:e2e:smoke`
2. `full` ジョブ（手動/夜間向け）
   - `npm run lint`
   - `npm run build`
   - `npm run test`
   - `npm run test:e2e`

`full` は `workflow_dispatch` と `schedule` で実行できるため、将来は夜間の全シナリオ実行へ拡張しやすい構成です。
