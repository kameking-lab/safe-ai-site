-- P1-5 化学物質RA結果のクラウド保管テーブル（Phase B）
-- 実行場所: Supabase ダッシュボード → SQL Editor（postgres権限）または Management API。
-- 対象プロジェクト: safe-ai-site-ky (klqbfudraljartikwseq)
-- 【重要】前回の本番障害（service_role GRANT不足）の教訓を反映し、GRANT を必ず含める。
-- すべて冪等（再実行安全）。未適用でもアプリは localStorage で動作する（API が 503/フォールバック）。

create table if not exists public.chemical_ra_records (
  device_id   text        not null,
  ra_id       text        not null,
  cas         text,
  substance   text,
  work_content text,
  exposure_band text,          -- ばく露リスク区分 I〜IV 等
  payload     jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (device_id, ra_id)
);

create index if not exists chemical_ra_records_device_updated_idx
  on public.chemical_ra_records (device_id, updated_at desc);

alter table public.chemical_ra_records enable row level security;
-- anon/authenticated 向けポリシーは作らない（サーバールート service_role からのみアクセス）。

-- service_role への GRANT（前回 ky_records/signage_sessions で漏れて 42501 になった教訓）。
grant usage on schema public to service_role;
grant all privileges on public.chemical_ra_records to service_role;
-- 既定権限（将来テーブルにも付与。既に適用済みなら無害）
alter default privileges in schema public grant all on tables to service_role;

-- 確認: grantee=service_role が出ればOK
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'chemical_ra_records' and grantee = 'service_role'
order by privilege_type;
