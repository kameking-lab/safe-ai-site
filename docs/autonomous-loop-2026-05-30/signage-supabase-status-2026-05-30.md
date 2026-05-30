# サイネージ6桁共有 / Supabase 権限障害 — 状態と対応（2026-05-30 R2 項目3）

## 結論: 本番のSupabase権限障害は【解決済み】（本セッションで実機再確認）
- 過去メモ「本番のKY同期・6桁サイネージ共有が全滅、fix.sql 適用待ち」は **stale（古い）**。
- `docs/g1-fix-2026-05-25.md` の通り、根本原因（service_role への GRANT 不足。鍵は正しかった）は
  **2026-05-26 に fix.sql 相当を Supabase Management API で適用済み**。
- 2026-05-30 本セッションで本番を read-only 再検証:
  - `GET https://www.anzen-ai-portal.jp/api/ky/signage?code=000000` → **HTTP 404 not_found**
    （= signage_sessions への参照成功。権限エラー(502/42501)ではない）
  - `GET /api/ky/records?deviceId=__health_probe__` → **HTTP 200 ok:true**（ky_records 参照成功）
  - → 6桁共有・KY同期の本番バックエンドは**機能している**。

## オーナーが「今」やるべきこと: 基本なし
- fix.sql の再適用は不要（適用済み・冪等）。`docs/g1-verification-2026-05-25/fix.sql` は記録として保持。
- 後始末（任意・推奨）: 2026-05-26 の作業で使用した Supabase Personal Access Token が未失効なら
  https://supabase.com/dashboard/account/tokens で Revoke 推奨（g1-fix doc 記載どおり）。
- 万一、将来また `db_error`(502) が出た場合の再適用手順は §末尾。

## 私（CLI）が実施したコード側の改善（権限障害が再発してもユーザーが困らないように）
6桁共有が失敗したとき、従来は理由を問わず「通信状況をご確認ください」と表示し、
サーバー側の権限/設定障害でもユーザーの通信のせいに見える誤誘導があった。これを是正:
- `cloudCreateSignageSessionDetailed`（storage-adapter）を新設。失敗理由を
  `cloud_not_configured / server_error / busy / network` に分類（fetchWithTimeout で12sタイムアウト付き）。
- KY作成画面の「別端末で共有」は理由別の正直な案内に変更し、**常に確実に動く同一端末フォールバック
  （「サイネージへ」ボタン＝localStorage表示）へ誘導**する。
  - 例（server_error時）: 「別端末共有サーバーが一時的に利用できません（管理者対応中の可能性）。
    お急ぎの場合は同じ端末で『サイネージへ』を押せばこのKYをすぐ表示できます。」
- 回帰テスト6件（理由マッピング）を追加。

## fix.sql 再適用手順（将来 db_error 再発時のみ）
`docs/g1-verification-2026-05-25/fix.sql` を以下のいずれかで実行（冪等・再実行安全）:
- (A)【最も簡単・推奨】Supabase ダッシュボード → SQL Editor に fix.sql 全文を貼り付けて Run（postgres権限で実行され、秘密の共有不要）。
- (B) Supabase Personal Access Token を用意し Management API `POST /v1/projects/{ref}/database/query` で実行。
- 対象プロジェクト ref: `klqbfudraljartikwseq`。Vercel env の変更は不要。
