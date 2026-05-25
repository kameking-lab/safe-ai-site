# Phase 4 クラウド保管（Supabase）セットアップ手順

社長が選択: **Supabase**（無料枠で開始、必要時のみ有料・月額¥10,000上限内）。

このドキュメントは、Phase 4（クラウド保管）のコード実装を次セッションで行う前に、**社長が手動で行う準備**と、実装で使う**DBスキーマ・環境変数**を確定するためのものです。コードは「環境変数が無ければ自動で従来の端末内保存（localStorage）にフォールバック」する設計とし、設定前でもサイトは一切壊れません。

---

## A. 社長の手動作業（コード実装の前提）

1. **Supabaseプロジェクト作成**（https://supabase.com）
   - 無料プランで作成。リージョンは Tokyo (ap-northeast-1) を推奨。
   - 作成後、`Project Settings → API` から以下を控える:
     - Project URL（例: `https://xxxx.supabase.co`）
     - anon public key（ブラウザ公開可・RLSで保護）
     - service_role key（サーバー専用・秘密。サイネージ共有/Cronで使用）

2. **Vercel に環境変数を登録**（`Project → Settings → Environment Variables`）
   命名は `docs/env-naming-guide-2026-05-02.md` の方針（ブラウザ公開は `NEXT_PUBLIC_*`）に合わせる:

   | 変数名 | 値 | 公開範囲 |
   |--------|----|---------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL | ブラウザ可 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key | ブラウザ可（RLSで保護） |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | サーバー専用・秘密 |

   ※ Production / Preview / Development の3環境に設定。

3. **DBスキーマ適用**: 下記 B のSQLを Supabase の `SQL Editor` で実行（または次セッションでマイグレーションとして投入）。

---

## B. DBスキーマ（案）

匿名端末ID（`device_id`）で紐付ける方式（Phase 4 はメール認証なし）。本格的なユーザー認証は Phase 8 以降。

```sql
-- 端末ごとの匿名ID（localStorageに保存したUUID）で所有権を表す簡易モデル。
-- 将来のメール認証導入時に owner_id へ移行できるよう device_id を独立カラムに。

create table if not exists ky_records (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  work_date date,
  site_name text,
  project_name text,
  foreman_name text,
  payload jsonb not null,            -- KyInstructionRecordState 全体
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists ky_records_device_idx on ky_records (device_id, updated_at desc);

create table if not exists worker_master (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  payload jsonb not null,            -- Worker[]（端末の作業員マスター全体）
  updated_at timestamptz not null default now()
);
create unique index if not exists worker_master_device_uidx on worker_master (device_id);

-- 朝礼サイネージ共有: 6桁コードで別端末から読み取る短期データ。
create table if not exists signage_sessions (
  code text primary key,             -- 6桁（衝突時は再生成）
  payload jsonb not null,            -- 表示に必要なKY抜粋
  expires_at timestamptz not null,   -- 当日限り（例: 12〜18時間）
  created_at timestamptz not null default now()
);
create index if not exists signage_expiry_idx on signage_sessions (expires_at);

-- RLS: anon キーでの無制限アクセスを防ぐ。device_id 単位で行を分離。
alter table ky_records enable row level security;
alter table worker_master enable row level security;
-- ポリシー例（device_id をリクエストヘッダ/クレームで渡す設計に合わせ次セッションで確定）。
```

> RLSポリシーとアクセス経路（ブラウザ直 anon か、サーバー経由 service_role か）は、セキュリティ確保のため次セッションで実装と同時に確定する。サイネージ共有は service_role でサーバー側書き込み＋コード読み取りを基本とする。

---

## C. 次セッションで実装する内容（テスト可能になってから）

1. `@supabase/supabase-js` 追加（依存追加）。
2. 保管アダプタ: `operations-service` のKY保存/一覧/作業員マスターを、
   - 環境変数あり → Supabase（device_id 単位）
   - 環境変数なし or 失敗 → 既存 localStorage
   に切り替える透過レイヤ（Phase 6 のサイネージ共有もここに乗せる）。
3. サイネージ共有: 6桁コード発行 → 別端末 `/ky/morning?code=XXXXXX` で読み取り、数秒ポーリング更新。
4. 単体テスト（アダプタのフォールバック分岐・コード発行/期限切れ）と、Preview環境での疎通確認。

---

## D. コスト・制約の確認

- 無料枠で開始（月額¥0）。データ量増加時のみ有料（Pro 約¥4千/月）で**¥10,000上限内**。
- オフライン必須要件は維持: 環境変数未設定・通信失敗時は端末内保存で従来どおり動作。
- メール認証・課金は本Phase対象外（社長確認事項として別途）。
