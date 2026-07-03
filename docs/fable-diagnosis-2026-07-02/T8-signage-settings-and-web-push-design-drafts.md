# T8 + 決裁B 設計ドラフト — サイネージ設定の外部化（PC→6桁コード/QR→TV）＋ Web Push通知

- 種別: **設計ドラフトのみ（Path A）**。本ドキュメントはコードもデータもインフラも生成しない。実装は**オーナーの明示指示待ち**。
  - 根拠: CLAUDE.md「必ずオーナーに確認すること＝**DB（Supabase等）の接続・スキーマ変更**」「**環境変数の追加**」「**依存パッケージの大幅追加**」。本タスクは両パートとも新規テーブル/新規env/（Push側は）新規npmパッケージを要し、いずれも同ルールに抵触する。
- 起票: BACKLOG-ux-hub.md（2026-07-03、診断書 `01-signage.md` T8 ＋ `07-residuals-sweep.md` P2項9「決裁B」）
- 対象: サイネージ設定の外部化（T8）／Web Push通知の設計ドラフト（決裁B）。両者とも「設計ドラフトまでは自走可・実装はDB/鍵待ち」の同一パターンのため1文書にまとめる。

---

## 0. 要約（結論先出し）

- **T8（サイネージ設定の外部化）**: 現状 `/signage` の設定（地点・向き・表示モード等）は**その端末のlocalStorageのみ**に保存され、他端末（PC）から設定してTVへ配ることができない。KY朝礼サイネージ機能（`/ky/morning`）に**構造がほぼ同一の6桁コード共有機構が既に本番稼働中**（Supabase `signage_sessions` テーブル・`getServiceSupabase()`・`lib/ky/signage-code.ts`）であり、これを一般化して転用するのが最短路。ただし（a）新規テーブル or 既存テーブルへの列追加という**スキーマ変更**、（b）図面画像（現状「端末内のみ・外部送信なし」と明記されたプライバシー設計）を対象に含めるかは**オーナー判断が必須**。
- **決裁B（Web Push）**: 本リポジトリは**Service WorkerとPWA manifestは既に整備済み**で、`public/sw.js` には`push`イベントの**プレースホルダー実装まで既に存在する**（`showNotification`呼び出しあり）。一方で **VAPID鍵・`web-push`パッケージ・購読保存テーブル・購読/送信API・許諾UIはゼロ**＝配線されていない空砲状態。実装には新規npm依存＋VAPID鍵発行＋DBが要る＝Path A。
- 本ドキュメントは両テーマについて、(1) 現状の実在調査、(2) 実装可能な設計（データモデル・API・UI）、(3) オーナー判断が要る論点、を提示する。**コード変更は本PRに含まない**。

---

## Part A: サイネージ設定の外部化（T8）

### A-1. 現状の穴（実在調査）

| 設定項目 | 保存場所 | 永続化 | 他端末と共有可能か |
|---|---|---|---|
| 地点（地図/天気の対象都道府県庁所在地） | `localStorage["signage-location-id"]`（`web/src/app/signage/page.tsx:48,70,285`） | 端末内のみ | 不可 |
| 画面の向き（landscape/portrait） | `localStorage["signage-orientation"]`（同ファイル:49,84,297） | 端末内のみ | 不可 |
| 表示モード（図面/地図/作業資料） | plain `useState`（同ファイル:80） | **リロードで消える**（永続化すらされていない） | 不可 |
| キオスクモード（常掲用UI非表示） | URLクエリ `?kiosk=1` を毎回付与（同ファイル:93-97） | なし（URL依存） | 不可（URLごと共有すれば再現は可） |
| 図面画像＋ピン注記 | `localStorage["signage-floor-plan-image-v1"]` / `["signage-floor-plan-pins-v1"]`（`components/signage/signage-floor-plan-editor.tsx:7-8,31,41,54,69`） | 端末内のみ | 不可。**UI文言で「この端末（localStorage）に保存され、外部送信はされません」と明記済み**（同ファイル:257）＝意図的なプライバシー設計 |
| 表示言語 | `localStorage["safe-ai:signage-lang:v1"]`（`lib/signage/signage-prefs.ts:7`） | 端末内のみ | 不可 |
| 危険アラート自動音声読み上げ | `localStorage["signage-danger-autospeak"]`（`components/signage/signage-danger-alert.tsx:27`） | 端末内のみ | 不可 |
| 設定用の管理/設定ページ | **存在しない**。全設定はダッシュボード本体にインライン（`/signage/settings` のようなルートは無い） | — | — |

要点: 「休憩所TVを現場ごとにカスタムしたいが、TVにマウス/キーボードを繋いで地点セレクトやトグルを1つずつ操作するのは非現実的」という運用課題（診断書 01-signage.md T8）に対し、**外部化の受け皿が一切無い**。

### A-2. 再利用できる既存資産 — KY朝礼サイネージの6桁コード共有

`/ky/morning` には**構造上ほぼ同一の課題（別端末間の設定/データ共有）を解いた実装が既に本番稼働中**。

- `web/src/lib/ky/signage-code.ts`: `generateSignageCode()`（6桁ゼロ埋め）／`isValidSignageCode()`／`SIGNAGE_CODE_TTL_MS`（24h）。**KY固有ロジックを一切含まない汎用関数**（`lib/ky/` 配下にあるのは置き場所だけの問題）。
- `web/src/app/api/ky/signage/route.ts`: `POST`（Supabase `signage_sessions` へ `{code, payload, expires_at}` を挿入・6桁衝突は最大6回再試行・`23505`＝unique_violation判定）／`GET ?code=`（404=不存在・410=期限切れ）。`getServiceSupabase()` が null（env未設定）なら503。
- `web/src/lib/ky/storage-adapter.ts`: クライアント側トランスポート（`isKyCloudEnabled()` で `NEXT_PUBLIC_SUPABASE_URL` の有無を判定し、未設定なら自動でlocalStorageのみの動作にフォールバック＝**クラウド未設定でもサイトが壊れない**設計）。
- `web/src/components/ky-morning-signage.tsx`: `?code=XXXXXX` をURLから読み8秒間隔でポーリング（line 138-157）＋6桁手入力フォーム（278-304）。
- テーブル実体（`docs/ky-redesign/phase4-supabase-setup.md:63-69`）:
  ```sql
  create table if not exists signage_sessions (
    code text primary key,
    payload jsonb not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  );
  create index if not exists signage_expiry_idx on signage_sessions (expires_at);
  ```
- env: `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`（`web/src/lib/supabase/server.ts`）＝**既に本番で設定済みのはず**（KY機能が動いているなら）。**新規env追加は不要**という点でT6/T7ドラフトより着手障壁が低い。

→ **設計方針**: ゼロから設計するのではなく、この既存パターンを**一般化して転用**する。

### A-3. データ設計（案）— 新規テーブル vs 既存テーブル拡張

| 案 | 内容 | 長所 | 短所 |
|---|---|---|---|
| **A: 新規テーブル `signage_config_sessions`（推奨）** | `signage_sessions` と同形（`code` PK / `payload` jsonb / `expires_at` / `created_at`）を複製 | 本リポジトリの既存流儀と一致（`ky_records`・`meeting_shares`・`chemical_ra_records` 等、**機能ごとに専用テーブル**が原則＝`docs/meeting-distributed-input-2026-06-01/schema.sql` の設計方針を踏襲）。KYのコード空間と混ざらない＝衝突再試行の対象が完全分離。将来スキーマが分岐しても互いに影響しない | テーブルが1つ増える（が、既に3機能分あるので増分コストは小さい） |
| B: 既存 `signage_sessions` に `kind text not null default 'ky'` 列を追加し流用 | 同一テーブルに `kind='settings'` の行も入れる | テーブル増加なし | **既存テーブルへのALTER**＝KY機能の本番データに触れるリスクがゼロではない（列追加自体は非破壊だが、オーナー確認の重さは案Aと同等）。GETクエリに`kind`条件を足し忘れると誤ペイロードを返す事故のリスクがA案より高い |

**推奨=案A**。理由: 実装コストの差はほぼ無い一方、事故時の影響範囲がKY機能から完全に隔離される。

- `code`/`payload`/`expires_at` の生成・検証ロジック（`generateSignageCode`/`isValidSignageCode`）は**そのまま共用可**。ただし置き場所を `lib/ky/signage-code.ts` → `lib/signage/share-code.ts`（仮）へ移し、KY側の import を書き換える**簡単なリファクタが望ましい**（機能名を跨いだ import は将来の可読性を損なう。実装フェーズで対応、本ドラフトでは未実施）。

### A-4. スコープ — 何を「設定」に含めるか（★図面画像は除外を提案）

- **含める（Phase 1・軽量jsonなので即可）**: 地点ID・向き・既定表示モード・既定キオスクフラグ・表示言語・危険アラート自動読み上げ。いずれも文字列/真偽値でpayloadは数百バイト程度。
- **除外を提案（要オーナー判断）**: 図面画像＋ピン注記。理由は2点。
  1. 既存UIに**「この端末に保存され外部送信されません」という明示的なプライバシー文言**（`signage-floor-plan-editor.tsx:257`）が既にあり、これを覆して外部（Supabase）送信に変えるのは**仕様の後退ではなく方針転換**＝オーナー判断が必要。
  2. 図面画像はbase64で数百KB〜数MBになり得る。`jsonb` 列に載せると行サイズ・Supabase無料枠のストレージ/帯域を圧迫し、KYの軽量payload（テキストのKY記録）とは负荷特性が別物。含める場合は画像を Vercel Blob（`BLOB_READ_WRITE_TOKEN`＝既存env）にアップロードしURLだけをpayloadに入れる設計が必要（別途設計要）。
- 本ドラフトのPhase 1スコープは「除外」を前提に進める。

### A-5. UXフロー（★実機のTV入力手段が不明＝要オーナー確認）

診断書 T8 の完了条件は「PCで地点・図面設定→TVでコード入力→反映、を実機フローで確認」＝**TV側は6桁コードを手入力する**ことが明言されている。QRはその代替/補助と解釈する。

1. **PC/スマホ側**（新規ページ `/signage/settings`、当班所有route配下に新設）: 既存の地点セレクト等と同じUIをフォーム化し「TVに送る」ボタンで `POST /api/signage/config-sessions` → 6桁コード発行。画面に**大きな数字**＋QR（`https://<site>/signage?applyCode=123456` へのdeep link）を両方表示（どちらもコード自体は同じ、encoding違いのみ）。
2. **TV側**: `/signage` に非キオスク時のみ見える「設定を読み込む」ボタン→軽量モーダルでオンスクリーン数字キーパッド（物理キーボード不要・マウス/リモコンのポインタ操作のみで入力可能、`/ky/morning` の6桁入力フォームと統一UI）。QRのURLを直接開いた場合は`?applyCode=`を読み取り自動適用（コード入力を省略）。
3. 適用後は `GET /api/signage/config-sessions?code=` の結果を各 `localStorage` キーへ書き戻す（＝配線後もTV側は従来どおりlocalStorageから動く。Supabaseへの常時依存にしない＝オフライン耐性を落とさない）。
4. 有効期限（TTL）はKYと同じ24hを起点案とするが、**「設定を数か月単位で使い続ける」運用**には短すぎる可能性がある。恒久反映したい場合はTTL切れ後もTV側localStorageに残った値をそのまま使い続ける（=コードは"一度きりの搬送手段"であって継続同期ではない）。継続同期（PC変更→TV自動反映）が要件なら`/ky/morning`と同じ8秒ポーリング方式への拡張が可能だが、**サイネージの主更新ループ（15分間隔）と衝突しないか要検討**＝Phase 2扱いとする。
5. **オーナー確認事項**: 実際に現場で使われているTV/端末の入力手段（リモコンのみ／タッチ対応／キーボード接続可否／カメラ有無）が本コードベースからは分からない。QRを「TVのカメラで読む」運用にするか「PC/スマホでURLを開いてTVブラウザに手動で同じURLを打つ」運用にするかは、この実機情報が無いと確定できない。**本ドラフトはTV側=数字キーパッド手入力を主経路とし、QRはPC/スマホ側での確認・共有補助**という保守的な想定に留める。

### A-6. API設計（案・未実装）

```
POST /api/signage/config-sessions
  body: { settings: { locationId, orientation, displayMode, kiosk, lang, dangerAutoSpeak } }
  → { ok: true, code: "123456", expiresAt: "..." }  / 503 cloud_not_configured（既存KYパターンと同一挙動）

GET /api/signage/config-sessions?code=123456
  → { ok: true, settings: {...}, expiresAt: "..." } / 404 not_found / 410 expired / 400 invalid_code
```

`web/src/app/api/ky/signage/route.ts` の実装をほぼそのまま複製し、テーブル名と型だけ差し替える想定（新規ロジックはほぼ無い＝実装リスクは低い）。

---

## Part B: Web Push通知の設計ドラフト（決裁B）

### B-1. 現状（実在調査）

| 要素 | 状態 |
|---|---|
| `/notifications` ページ | メール登録フォームのみが実配線（`web/src/app/(main)/notifications/subscribe-form.tsx:31` が `POST /api/notify/subscribe`）。ページ内ROADMAP表示に「気象庁の大雨・強風警報をプッシュ通知」を**Phase 1「開発中」として既に告知済み**（`page.tsx:28-56`）だが**未実装のコピーのみ**＝実態と表示の乖離あり |
| Service Worker | `web/public/sw.js` が既に存在し `service-worker-registrar.tsx` から `/sw.js` に登録済み（scope `/`）。**`push` イベントリスナーが実装済み**（`self.registration.showNotification(...)`）＝受信側の最終段だけは書かれている | 
| PWA manifest | `web/public/manifest.json` 実在（アイコン・standalone表示など一式） |
| 購読（`PushManager.subscribe`）呼び出し | **どこにも無い**（grep `PushManager`/`serviceWorker.register`結果はSW登録のみ） |
| VAPID鍵 | **どこにも無い**（`VAPID`検索ヒット0） |
| `web-push` npmパッケージ | **未導入**（package.json未確認だが依存grepもヒット0） |
| 購読保存API/テーブル | **無し** |
| `notificationclick` ハンドラ（通知タップ時の遷移） | **無し**（`sw.js`のpushリスナーに後続実装なし） |
| `pushsubscriptionchange` ハンドラ（ブラウザ側の自動再購読） | **無し** |

要点: **受信の最終段（`showNotification`）だけプレースホルダーが先に書かれ、それより手前（許諾UI・購読API・送信基盤・鍵管理）が丸ごと無い**状態。「決裁Bが未着手」（07-residuals-sweep.md 項5）という記録と整合する。

### B-2. スコープ（MVP）

- 既存の`/notifications`ロードマップが「気象庁の大雨・強風警報プッシュ通知」を明言済みのため、MVPは**この1種類のみ**とする（法改正・ニュースの購読等は別途拡張、本ドラフトは扱わない）。
- 既存の email 経路（`/api/notify/weather-alert`＝`RESEND_API_KEY`/`RESEND_AUDIENCE_ID`・都道府県別本文）と**並走するチャンネル**として設計する（置き換えではない＝メール購読者を壊さない）。

### B-3. 必要な追加リソース（★すべてPath A対象）

| 追加物 | 種別 | CLAUDE.mdの該当ルール |
|---|---|---|
| `web-push` npmパッケージ | 依存追加 | 「依存パッケージの大幅追加」 |
| VAPID鍵ペア発行（`web-push generate-vapid-keys`） | 新規シークレット | 「新しい外部API/サービスの導入」に準ずる（Web Push自体はブラウザ標準APIで外部サービスではないが、鍵管理は新規） |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`（ブラウザ公開） | 環境変数追加 | 「環境変数の追加」 |
| `VAPID_PRIVATE_KEY`（サーバーシークレット） | 環境変数追加 | 同上 |
| `VAPID_SUBJECT`（`mailto:` 連絡先、任意） | 環境変数追加 | 同上 |
| 新規Supabaseテーブル `push_subscriptions` | DBスキーマ変更 | 「DB（Supabase等）の接続・スキーマ変更」 |

### B-4. データ設計（案）

```sql
create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  endpoint      text not null unique,   -- ブラウザが発行する購読URL（重複購読の自然な去重キー）
  p256dh        text not null,          -- 暗号化用公開鍵（PushSubscriptionのkeys.p256dh）
  auth          text not null,          -- 認証シークレット（keys.auth）
  prefecture    text,                   -- 既存メール購読と同じ都道府県フィルタ（任意）
  created_at    timestamptz not null default now()
);
```

- 既存の `signage_sessions`/`ky_records` と同じ「service_role専用・anon無効・RLS有効」の方針を踏襲。
- `endpoint` はブラウザ/端末ごとに一意なため、同一ユーザーが複数端末で購読しても自然に複数行になる（想定どおり）。

### B-5. クライアントフロー（案）

1. `/notifications` に「プッシュ通知を有効にする」ボタンを追加（既存メールフォームと併記、どちらか一方でも両方でも可）。
2. クリック時: `Notification.requestPermission()` → 許可されたら既存登録済み `navigator.serviceWorker.ready` の `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <NEXT_PUBLIC_VAPID_PUBLIC_KEY> })`。
3. 得られた `PushSubscription` を `POST /api/push/subscribe` へ送信（endpoint/keys/prefectureを保存）。
4. 既存 `sw.js` に **`notificationclick`** ハンドラを追加（`event.notification.close()` → `clients.openWindow(data.url ?? "/")`）。現状は通知は出るがタップしても何も起きない状態のため、この追加はPhase1必須。
5. `pushsubscriptionchange`（ブラウザ都合での自動再購読）も追加し、新しいsubscriptionをサーバーへ再送する（未実装のまま放置すると数か月後に購読が静かに死ぬ既知のWeb Push運用課題）。

### B-6. 送信フロー（案）

- 新規 `POST /api/notify/push-weather-alert`（既存 `/api/notify/weather-alert` と同一の `CRON_SECRET` 認証・同一トリガー元を想定）。
- サーバー側で `web-push` の `sendNotification(subscription, JSON.stringify({title, body, url}))` を対象都道府県で絞った `push_subscriptions` 行ごとに実行。
- 送信失敗（410 Gone＝購読失効）を検知したら該当行を削除（購読テーブルの自然なクリーンアップ、追加バッチ不要）。
- 既存の「Resend未設定なら200でskip」という運用パターン（cronのリトライ地獄を避ける設計）を踏襲し、「VAPID未設定なら200でskip」を同様に実装。

### B-7. Path Aで止める理由の再確認

- 鍵発行自体は無料・即時だが、**発行者（誰のmailtoで登録するか）とキー管理責任の所在**はプロダクトオーナー決定事項。
- 新規テーブルはT8同様スキーマ変更。
- npm依存追加はCLAUDE.mdの明示ルール対象。

---

## 共通: Path A 境界（本ドラフトの守備範囲）

- 本ドラフトは**設計のみ・コード/データ/依存関係の変更ゼロ**。`cd web` の tsc/lint/vitest/build は非改変で全緑維持（本PRはdocs追加のみ）。
- 実装は**オーナー承認後**にのみ着手。承認が出た場合の着手単位は以下を推奨:
  - T8: A-3案A（新規テーブル`signage_config_sessions`）の作成をオーナー自身がSupabase SQL Editorで実行（既存 `signage_sessions`/`meeting_shares` と同じ運用＝このコンテナからSupabaseへ到達できないため）→ 当班がAPI route・UIを実装。
  - 決裁B: オーナーがVAPID鍵を発行しVercel環境変数へ設定＋`push_subscriptions`テーブル作成→当班が購読/送信API・クライアントUI・sw.js拡張を実装。
- **要オーナー判断の一覧**（実装着手前に確認）:
  1. T8: 新規テーブル vs 既存`signage_sessions`拡張（A-3、推奨=新規テーブル）。
  2. T8: 図面画像を共有対象に含めるか（A-4、推奨=Phase 1は除外）。
  3. T8: 実際のTV設置端末の入力手段（キーパッド/QR/両方、どちらが主経路か）（A-5）。
  4. 決裁B: VAPID鍵の発行者・`VAPID_SUBJECT`に使うmailto。
  5. 決裁B: `web-push` npm依存追加の承認。
  6. 両者共通: 新規Supabaseテーブルのスキーマ承認・作成実行（オーナー自身、コンテナからは到達不可）。

---

## 付録: 実在確認済みの参照（本ドラフト作成時に監査した事実）

- `web/src/app/signage/page.tsx`: localStorageキー群（48-49行）・地点セレクト（466-479行付近）・キオスク判定（93-97行）。
- `web/src/components/signage/signage-floor-plan-editor.tsx`: `IMAGE_KEY`/`PINS_KEY`（7-8行）・外部送信なし文言（257行）。
- `web/src/lib/signage/signage-prefs.ts` / `web/src/lib/signage/no-accident-store.ts` / `web/src/components/signage/signage-danger-alert.tsx`: その他localStorageキー。
- `web/src/lib/ky/signage-code.ts`・`web/src/app/api/ky/signage/route.ts`・`web/src/lib/ky/storage-adapter.ts`・`web/src/components/ky-morning-signage.tsx`: 転用元の6桁コード共有実装一式。
- `web/src/lib/supabase/server.ts`: `getServiceSupabase()`（env未設定時null・呼び出し側503フォールバック）。
- `docs/ky-redesign/phase4-supabase-setup.md:63-69`: `signage_sessions` テーブルDDL実物。
- `docs/meeting-distributed-input-2026-06-01/schema.sql`: 「機能ごとに専用テーブル・service_role専用・anon無効」という既存の設計流儀。
- `web/public/sw.js`: `push`イベントリスナー（`showNotification`呼び出しあり・`notificationclick`/`pushsubscriptionchange`は無し）。
- `web/src/components/service-worker-registrar.tsx`: SW登録（`/sw.js`, scope `/`）。
- `web/public/manifest.json`: PWA manifest実在。
- `web/src/app/(main)/notifications/page.tsx`・`subscribe-form.tsx`: メール購読フォーム実装＋Push告知コピー（未実装）。
- `web/src/app/api/notify/weather-alert/route.ts`: 既存メール送信cronの認証・スキップ設計パターン（`CRON_SECRET`・未設定200スキップ）。
</content>
