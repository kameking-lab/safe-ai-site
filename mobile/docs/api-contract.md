# モバイルAPI境界 v1

## 現在存在する公開API

APIホストは `https://www.anzen-ai-portal.jp` 固定。変更可能なURL設定・秘密キーはアプリに持たない。ネイティブはCapacitorHttpの明示呼出し（fetch全面patchなし）。読み取り専用APIの利用とAIの認可を分ける。Originが省略されるネイティブHTTPを認証の代わりにしない。

| 経路 | 用途と検証 |
|---|---|
| GET `/api/signage-data?locationId=...` | 日々の報道RSSと気象庁警報。`degradedSources` の `labor-rss` は速報の更新失敗。JMAの `jmaSelectedState`・`jmaSourceFetchedAt`・発表日時を別に表示。Open-Meteoの予測から公式警報を生成しない |
| GET `/api/revisions` | 公開ゲート通過分の履歴全件。`publishedAt`・施行日・原文URL・検証状態を保持 |

既存統計はサーバー／クライアントへのJSON importであり、無料の統計JSON APIではない。`/api/stats` は運用統計、`/api/accidents/estat` と `/api/mhlw/search` は停止・隔離経路なので流用しない。

## 新設が必要な契約（未実装・未配備）

### GET `/api/mobile/v1/statistics`

`src/lib/contracts.ts` の `statisticsSchema`。`source`, `sourceUrl`, `sourceUpdatedAt`, `note`, `years[{year,count,types}]`。政府公開データの検証済み収録範囲だけを返す。全国総数への置換、未収録年の0件補完、隔離コーパスの再公開をしない。未提供ならアプリは最後の取得分／同梱版を維持する。

### GET `/api/mobile/v1/capabilities`

`capabilitySchema`。例はテストの `tests/fixtures.ts`（ローカル試験専用）。次をすべてサーバーで保証してから公開する。

- v1はログインなし。サーバー発行の推測困難な匿名セッションをSecure・HttpOnly Cookie等で結び、同じセッションのチャット／RA日次枠を共有する。任意の端末ID・申告残数・IPだけを信用しない。インストール単位の匿名枠は会員のWeb/iOS共有枠ではない。
- `session: anonymous`, `plan: free`, 5分以内の `expiresAt`、CSRF token。
- `safety.originalEvidence=true`, `dangerousAssertionsBlocked=true`, `sharedMonthlyBudgetYen=50000`, `serverSideEnforced=true`。
- `features.law_chat`: 3回／JST日、`features.chemical_ra`: 1件／JST日。`available` は実際の評価可否。`quota={limit,used,reserved,remaining,resetAt}`。
- `remaining=max(0,limit-used-reserved)`。サーバーのJST日付を使用。原価停止・burst・機能未提供で枠を成功消費しない。
- 匿名セッション作成の濫用制限、再送、予約、月間原価集約はサーバー側で実装する。ローカルカウンターへフォールバックしない。

### POST `/api/mobile/v1/ai`

入力：`{version:1,feature:law_chat|chemical_ra,input,requestId:UUID,privacyConfirmed:true}`。`X-Anzen-CSRF`を付ける。Cookie等の匿名セッションを検証し、capabilitiesの提示内容を認可の正本として信頼しない。

処理：入力サイズ・個人／機密情報・送信同意・Origin/CSRF→既存安全レート→requestId冪等性／同一入力→匿名日次枠・原価の原子的予約→既存サイトの安全なチャット／RAサービス→根拠照合・危険な断定の遮断→結果保存・枠確定。既存月間5万円停止が確認／実装されるまで利用不可。呼出しごとに追加最大原価を予約し、Webを含む全対象経路を集計する。

返却は `aiResultSchema`。完成時は `status:completed`, `evidence[{title,original,url,asOf,verification}]`, `conditions`, `safety.reviewed=true` と危険断定遮断状態、サーバー残数。requestIdとfeatureは要求に一致させる。安全拒否・fallback・評価未提供は `charged:false`。原文なしの完成回答はアプリも拒否する。

旧 `/api/chatbot`・`/api/chemical-ra` を無条件に直接呼ばない。capabilitiesのフラグだけ追加して旧APIへ迂回させることも不可。安全なサービス呼出しと、入口ごとの強制・共有台帳が必要。

エラーは `{error:{code,resetAt?}}`。`DAILY_LIMIT_REACHED`, `OPERATION_PENDING`, `BURST_LIMITED`, `ABUSE_RATE_LIMITED`, `AI_BUDGET_FREE_PAUSED`, `AI_BUDGET_STOPPED`, `FEATURE_UNAVAILABLE` を区別。burst／abuseは `Retry-After`。月次停止を翌日0時回復と表示しない。

同じrequestIdの再送は二重消費させない。v1クライアントは通信失敗後の同一入力再送でrequestIdを維持し、成功時だけ破棄する。プロセス再起動後の処理中結果回収はサーバー契約完成時の追加検証項目。AI本文は端末へ永続保存しない。

## 通信・認可の公開条件

- iOSのネイティブCookie永続性・リダイレクト・再起動・消去を実機で確認。Cookieを手作業で移植しない。
- ブラウザー検証用には許可origin、OPTIONS、`Content-Type` と `X-Anzen-CSRF`、credentialsを限定。既存same-origin検査を緩和しない。
- APIホスト以外へのredirect禁止。外部リンクはHTTPS限定のシステムブラウザーへ分離。アプリWebView内に遠隔サイトをロードしない。
- AI・capabilitiesは `Cache-Control: private, no-store`。予算台帳／原価不明・安全装置停止・機能未提供なら503。無料情報と気象表示は継続。
- v1.1の会員認証、RevenueCat、課金／復元、WebとiOSの合算利用、10地点・APNsは別契約。匿名セッションIDを会員IDとして昇格させない。

これらのAPIは実際に存在しない状態をfixtureで隠して本番接続済みとしない。`FEATURE_UNAVAILABLE`、404、503、ネットワーク断でもアプリが安全に停止することを検証する。
