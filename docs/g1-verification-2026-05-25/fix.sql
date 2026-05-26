-- G-1検証で判明した本番Supabase障害の修正SQL
-- 実行場所: Supabase ダッシュボード → SQL Editor（postgres 権限で実行される）
-- 対象プロジェクト: safe-ai-site-ky (klqbfudraljartikwseq)
-- すべて冪等（再実行しても安全）。

-- ============================================================
-- (1) meeting_records テーブル作成（打合せ書クラウド同期。未作成）
--     docs/safety-diary-redesign/supabase-schema.sql と同内容。
-- ============================================================
create table if not exists public.meeting_records (
  device_id   text        not null,
  meeting_id  text        not null,
  work_date   date,
  site_name   text,
  author      text,
  payload     jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (device_id, meeting_id)
);

create index if not exists meeting_records_device_updated_idx
  on public.meeting_records (device_id, updated_at desc);

alter table public.meeting_records enable row level security;
-- anon/authenticated 向けポリシーは作らない（サーバールート service_role からのみアクセス）。

-- ============================================================
-- (2) service_role への GRANT 保険（原因B = GRANT不足だった場合の修正）
--     原因A（鍵が誤り）の場合この GRANT は無害（既に権限があるため）。
--     ※ 原因A の本修正は Vercel 側の SUPABASE_SERVICE_ROLE_KEY 差し替え（00-summary.md 手順2）。
-- ============================================================
grant usage on schema public to service_role;
grant all privileges on public.ky_records       to service_role;
grant all privileges on public.signage_sessions to service_role;
grant all privileges on public.meeting_records  to service_role;

-- 将来テーブルにも service_role 既定権限を付与（Supabase標準と同等）
alter default privileges in schema public grant all on tables to service_role;

-- ============================================================
-- (3) 確認クエリ（実行後に grantee=service_role が出ればOK）
-- ============================================================
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('ky_records','signage_sessions','meeting_records')
  and grantee = 'service_role'
order by table_name, privilege_type;
