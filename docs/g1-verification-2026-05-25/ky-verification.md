# G-1検証: KY機能（本番実接続）

- 検証日時: 2026-05-26（JST）
- 検証者: Claude Code CLI（自立モード）
- 本番URL: https://www.anzen-ai-portal.jp/
- main HEAD: 581058e2（PR #289 squash merge 反映済）

## 1. ページ系エンドポイント（curl HTTP）

| パス | 結果 | 応答時間 |
|---|---|---|
| GET /ky/paper | 200 | 0.55s |
| GET /ky/list | 200 | 0.56s |
| GET /ky/workers | 200 | 0.50s |
| GET /ky/morning | 200 | 0.52s |

判定: **YES**（全ページ200）

## 2. リダイレクト（旧URL → 用紙ファースト）

`/ky` `/pdf` は `permanentRedirect` 実装だが、本番では **HTTP 200 + meta refresh**（`<meta id="__next-page-redirect" http-equiv="refresh" content="0;url=/ky/paper">`）で返る。
これは Next.js が **静的プリレンダー（X-Nextjs-Prerender: 1）されたページの redirect を 200+meta-refresh で配信する正規挙動**。ブラウザは確実に /ky/paper へ遷移する。クエリ（fromDiary 等）も保持。

- `/ky` → /ky/paper（meta-refresh, 機能的にOK）
- `/pdf` → /ky/paper（meta-refresh, 機能的にOK, 確認済）

判定: **YES（注記つき）** — 301/308ではなく200+meta-refresh。SEO観点では将来308化が望ましいが機能は正常。

## 3. /api/ky/suggest（Gemini, Supabase非依存）

リクエスト: `{"workContent":"足場での外壁塗装"}`
結果: **HTTP 200, source=gemini**

応答JSON構造検証（抜粋）:
- `suggestions[]` 各要素に hazard / reduction / likelihood / severity / evaluation / riskLabel / basis / grounded
- likelihood: 2（1-3整数 ✓）
- severity: 2〜3（1-3整数 ✓）
- evaluation = likelihood × severity（4, 6 等 ✓）
- riskLabel: 「中（対策を検討）」「大（すぐ対策）」
- basis: 「一般的知見」, grounded: false

判定: **YES** — 本番 GEMINI_API_KEY 動作、JSON構造は仕様どおり。

## 4. /api/ky/records（Supabase 書き込み/読み取り）

POST `{"deviceId":"test-cli-2026-05-25","record":{...}}`:
- 結果: **HTTP 502 `db_error: permission denied for table ky_records`**

GET `?deviceId=test-cli-2026-05-25`:
- 結果: **HTTP 502 同上 permission denied**

判定: **NO（本番障害）** — 詳細は 00-summary.md「Supabase service_role 権限障害」参照。
- 503（cloud_not_configured）ではなく 502 のため、本番に SUPABASE_SERVICE_ROLE_KEY は **設定されている**が、その鍵で service_role 権限が得られていない。
- service_role は通常 RLS をバイパスするため、この 42501 は **鍵の値が誤り（anon キー混入等）**の可能性が最も高い。Vercel 上で当該変数は 13時間前に更新された形跡あり。

## 5. /api/ky/signage（6桁コード共有, Supabase）

POST `{"record":{...}}`（6桁コード生成）:
- 結果: **HTTP 502 `permission denied for table signage_sessions`**

GET `?code=000000`（取得）:
- 結果: **HTTP 502 同上**

判定: **NO（本番障害）** — 6桁サイネージ共有が本番で機能していない。ky_records と同一根本原因（service_role 権限）。

## クライアント側フォールバック（ユーザー影響の限定）

`web/src/lib/ky/storage-adapter.ts` の設計により、**localStorage が常に真実の保存先**。
クラウド POST 失敗時は静かにキュー退避し例外を投げない（`cloudPushKyRecord` は false を返すだけ）。
→ KY用紙の入力・保存・一覧・印刷は **本番で正常動作**。壊れているのは「別端末同期」と「6桁コード共有」のみ。

## KY G-1総合判定

- ページ・リダイレクト・Gemini提案: **YES**
- クラウド同期（records）・6桁共有（signage）: **NO（要オーナー対応）**
- ユーザー直撃度: 中（コア機能は localStorage で動作、クラウド付加機能のみ不全）
