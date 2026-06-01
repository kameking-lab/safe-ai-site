-- 打合せ書「協力会社 分散入力 → 元請 自動集約」 スキーマ（追加のみ・冪等）
-- 実行場所: Supabase ダッシュボード → SQL Editor（postgres 権限で実行）
-- 対象プロジェクト: safe-ai-site-ky
--
-- 【安全原則】
--  - 追加のみ（CREATE TABLE IF NOT EXISTS / ADD のみ）。既存テーブル(ky_records / signage_sessions /
--    meeting_records / chemical_ra_records 等)・既存データには一切触れない。
--  - 何度実行しても安全（冪等）。
--  - 既存方針と同じ「service_role（サーバールート）からのみ読み書き、匿名公開しない」。
--    匿名キーはこれらのテーブルに一切アクセスできない（RLS有効＋anonポリシー無し）。
--    セキュリティ境界はサーバーAPI(/api/meeting/share, /api/meeting/contribute/[token])での
--    トークン照合。token を知る者だけがその打合せ書の入力にアクセスできる（capability方式）。
--  - 過去のGRANT不足障害(g1-fix)の教訓として、service_role への GRANT を明示的に付与する。
--
-- このコンテナからは Supabase に到達できない（egress制限）ため未適用。社長がSQL Editorで実行してください。

-- ============================================================
-- (1) 共有（元請が打合せ書ごとに発行する共有トークン → 1打合せ書にスコープ）
-- ============================================================
create table if not exists public.meeting_shares (
  token       text        primary key,           -- 推測不能な64桁hex（capability）
  device_id   text        not null,               -- 元請の端末ID（取り込み時の所有者照合に使用）
  meeting_id  text        not null,               -- 対象打合せ書（token はこの1件にのみ有効）
  site_name   text,                               -- 協力会社に見せる最小コンテキスト
  work_date   text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz                         -- 任意（既定14日。期限切れは入力不可）
);

create index if not exists meeting_shares_device_meeting_idx
  on public.meeting_shares (device_id, meeting_id);

-- ============================================================
-- (2) 協力会社の投稿（1社1行。contribution_id を鍵に自社分のみ編集）
-- ============================================================
create table if not exists public.meeting_share_inputs (
  contribution_id text       primary key,         -- サーバー生成の推測不能ID（自社行の編集鍵）
  token           text       not null references public.meeting_shares(token) on delete cascade,
  payload         jsonb      not null,            -- 協力会社の申告（companyName/workContent/risk 等。元請確定欄は含めない）
  submitted_at    timestamptz not null default now()
);

create index if not exists meeting_share_inputs_token_idx
  on public.meeting_share_inputs (token);

-- ============================================================
-- (3) RLS: 匿名公開しない（anon/authenticated ポリシーを作らない＝遮断）。
--     service_role（サーバールート）のみがアクセス（RLSを貫通）。
-- ============================================================
alter table public.meeting_shares       enable row level security;
alter table public.meeting_share_inputs enable row level security;
-- 注: anon/authenticated 向けポリシーは意図的に作らない。直接の匿名アクセスは全行拒否される。

-- ============================================================
-- (4) service_role への GRANT（GRANT不足障害の予防・冪等）
-- ============================================================
grant usage on schema public to service_role;
grant all privileges on public.meeting_shares       to service_role;
grant all privileges on public.meeting_share_inputs to service_role;
-- 既定権限（将来の再作成時も service_role に付与）
alter default privileges in schema public grant all on tables to service_role;

-- ============================================================
-- (5) 確認クエリ（grantee=service_role が両テーブルで出ればOK）
-- ============================================================
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('meeting_shares','meeting_share_inputs')
  and grantee = 'service_role'
order by table_name, privilege_type;
