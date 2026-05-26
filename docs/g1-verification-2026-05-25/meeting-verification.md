# G-1検証: 打合せ書機能（本番実接続）

- 検証日時: 2026-05-26（JST）
- 本番URL: https://www.anzen-ai-portal.jp/

## 1. ページ系エンドポイント

| パス | 結果 |
|---|---|
| GET /safety-diary | 200 |
| GET /safety-diary/new → /safety-diary | 200 + meta-refresh（Phase 12 で旧入力廃止、用紙ファーストへ一本化）|

next.config の `redirects()` 側でも旧URL（/anzen-nisshi, /anzen-eisei-nisshi, /safety-diary/new/detail, /safety-diary/monthly/:ym）→ /safety-diary を恒久リダイレクト設定済み。

判定: **YES**（ページ・リダイレクトとも正常）

## 2. meeting_records テーブル存在確認（Supabase REST, anon key）

```
GET /rest/v1/meeting_records?limit=1
→ HTTP 404 PGRST205 "Could not find the table 'public.meeting_records' in the schema cache"
```

判定: **NO** — テーブル未作成。`docs/safety-diary-redesign/supabase-schema.sql` 冒頭に
「本コンテナからは Supabase に到達できない（egress 403）ため未適用。社長が SQL Editor で実行」
と明記されており、**当初から一度も適用されていない**ことが確定。

（補足: 本セッションの実行環境からは Supabase REST に到達可能だが、書き込み/DDL に必要な
service_role 鍵が手元に無い（Vercel 上で Sensitive 設定のため pull すると空）。Postgres 直結も
Neon 別DB を指しており Supabase ではない。よって自力での CREATE TABLE は不可。）

## 3. /api/meeting/records（Supabase 書き込み）

POST `{"deviceId":"test-cli-2026-05-25","record":{"siteName":"打合せ検証現場"}}`:
- 結果: **HTTP 502 `db_error: Could not find the table 'public.meeting_records'`**

判定: **NO** — テーブル未作成のため当然失敗。テーブル作成後に再検証要。

## 4. /api/meeting/suggest（Gemini, Supabase非依存）

POST `{"workContent":"鉄骨建方作業","siteName":"検証現場"}`:
- 結果: **HTTP 200, source=gemini**
- 応答JSON: `disasters[]`（予想災害5件）+ `instructions`（安全衛生指示事項テキスト）
- KY Phase5 の Gemini パイプライン（RAG＋本物Gemini＋2段フォールバック）流用、構造は仕様どおり

判定: **YES** — 打合せ書のAI提案は本番で正常動作。

## 打合せ書 G-1総合判定

- ページ・リダイレクト・Gemini提案: **YES**
- クラウド同期（meeting_records）: **NO** — テーブル未作成（要 SQL 実行）+ service_role 権限（要鍵修正）
- ユーザー直撃度: 中（localStorage で打合せ書作成は可能、別端末同期のみ不全）
