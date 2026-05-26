# G-1検証 総合サマリー（2026-05-26）

本番URL https://www.anzen-ai-portal.jp/ に対する実接続検証。main HEAD = 581058e2（PR #289 merge 反映済）。

## 結論（一行）

ページ表示・リダイレクト・**Gemini AI（KY/打合せ書とも）は本番で正常**。
一方 **Supabase クラウド層（KY同期・6桁サイネージ共有・打合せ書同期）が全滅**しており、
これは service_role 権限障害（鍵誤設定の可能性大）+ meeting_records テーブル未作成が原因。
サイトは localStorage フォールバックで落ちないが、クラウド付加機能はオーナー対応待ち。

## 機能別 YES/NO

KY機能:
- ページ（/ky/paper, /ky/list, /ky/workers, /ky/morning）: YES
- 旧URLリダイレクト（/ky, /pdf）: YES（200+meta-refresh、機能正常）
- AI危険予知提案 /api/ky/suggest（Gemini）: YES（JSON構造仕様どおり、likelihood/severity 1-3整数）
- クラウド保存 /api/ky/records: **NO**（permission denied）
- 6桁サイネージ共有 /api/ky/signage: **NO**（permission denied）

打合せ書機能:
- ページ /safety-diary・旧URLリダイレクト: YES
- AI提案 /api/meeting/suggest（Gemini）: YES
- クラウド保存 /api/meeting/records: **NO**（meeting_records テーブル未作成）

サイネージ機能:
- /ky/morning ページ配信: YES
- 6桁コード生成/取得: **NO**（signage_sessions permission denied）

## 本番障害の根本原因

### 症状
- `/api/ky/records`, `/api/ky/signage` → `42501 permission denied for table ...`（HTTP 502）
- これらは 503（cloud_not_configured）ではない → 本番に `SUPABASE_SERVICE_ROLE_KEY` は**設定済み**
- しかし service_role は本来 RLS をバイパスする全権ロール。その鍵で 42501 が出るのは異常。

### 仮説（確度順）
- **A（最有力）: 本番の `SUPABASE_SERVICE_ROLE_KEY` が誤った値**（anon キー混入、または別/旧プロジェクトの鍵）。
  - 根拠: 私の anon キーでの直接アクセスと**全く同じ** 42501 エラー。
  - 根拠: Vercel 上で当該変数・anon/URL が **13〜14時間前に更新**された形跡（鍵ローテーション時の貼り間違いと整合）。
- B: テーブルが Supabase 標準の grant 設定を経ずに作成され、service_role に table GRANT が無い。

A と B は SQL 1本で判別可能（下記）。

### meeting_records は別途「未作成」
docs/safety-diary-redesign/supabase-schema.sql 冒頭に「egress 403 のため未適用、社長が SQL Editor で実行」と明記。当初から一度も作成されていない。

## なぜ自力修正できないか
- service_role 鍵: Vercel で Sensitive 設定 → `vercel env pull` で空文字。手元に無い。
- Supabase への DDL/GRANT には service_role かDB superuser が必要。
- .env.local の Postgres 接続（PGHOST/POSTGRES_URL/DATABASE_URL）は **Neon 別DB**で、Supabase ではない。
- → CREATE TABLE / GRANT を自力実行する手段が無い。**オーナー対応が必須**。

## オーナー対応手順（所要 約5分）

### 手順1: どちらの原因か判別（Supabase SQL Editor で実行 = postgres 権限）
```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('ky_records','signage_sessions')
order by table_name, grantee;
```
- 結果に `service_role` が ALL/INSERT 等で出る → **原因A（鍵が誤り）**。手順2へ。
- `service_role` が出てこない → **原因B（GRANT 不足）**。手順3の GRANT を実行。

### 手順2（原因A の修正）: 正しい service_role 鍵を設定
1. Supabase ダッシュボード → safe-ai-site-ky → Project Settings → API
   → `service_role`（secret）の値をコピー（`anon` ではない方）。
2. Vercel → safe-ai-site → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY`
   を Production/Preview とも正しい service_role 値に更新。
3. 再デプロイ（最新コミットを Redeploy）。

### 手順3: meeting_records 作成（原因A/B どちらでも必須）
Supabase SQL Editor で `docs/g1-verification-2026-05-25/fix.sql` を実行（内容は同ファイル参照）。

### 修正後の再検証コマンド（このリポジトリで再実行可）
```bash
B=https://www.anzen-ai-portal.jp
curl -s -X POST $B/api/ky/signage -H "Content-Type: application/json" \
  -d '{"record":{"projectName":"検証","workDateYear":"2026","workDateMonth":"5","workDateDay":"25"}}'
# → {"ok":true,"code":"XXXXXX"} が返れば復旧
```

## Phase B/C への影響
- Phase B（サイネージ徹底レビュー）はコード/ドキュメント/競合調査が中心 → **影響なく続行可能**。
- Phase C 実装のうち多言語・表示モード・大画面・QR・印刷・スライドショー等は **クラウド非依存** → 実装可能。
- 6桁コード堅牢化は実装+ユニットテスト可能。本番E2E確認のみ Supabase 修正待ち。
