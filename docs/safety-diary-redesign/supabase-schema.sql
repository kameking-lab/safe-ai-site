-- 安全工程打合せ書 クラウド保管テーブル（Phase 7）
-- KY の ky_records と同方針: service_role（サーバー専用ルート）からのみ読み書き。
-- 未適用でもアプリは localStorage で動作する（/api/meeting/records が 503 を返しフォールバック）。
--
-- 注意: 本コンテナからは Supabase に到達できない（egress 403）ため、このSQLは未適用。
-- 社長が Supabase SQL Editor で実行してください（実行後、複数端末同期が有効化）。

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

-- RLS: 匿名公開しない。service_role のみ（サーバールート getServiceSupabase 経由）でアクセス。
alter table public.meeting_records enable row level security;
-- （anon/authenticated 向けポリシーは作らない。将来の本人認証導入時に device_id→user_id へ移行）

-- 将来: 協力会社マスター（Phase 2 で UI 化する場合）
-- create table if not exists public.company_master (
--   device_id text not null,
--   company_id text not null,
--   name text not null,
--   type text,            -- 元請/1次/2次/3次
--   parent_company_id text,
--   updated_at timestamptz not null default now(),
--   primary key (device_id, company_id)
-- );
-- alter table public.company_master enable row level security;
