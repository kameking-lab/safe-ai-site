# 環境変数 クリーンアップ候補 (2026-05-02)

調査日: 2026-05-02  
調査担当: Claude Code (reverent-goldwasser-280c0b)  
参照元: `docs/env-references-2026-05-02.txt`

---

## A. 削除候補（Vercel から削除を検討）

### A-1. `GOOGLE_API_KEY` — 旧エイリアス (非推奨)

| 項目 | 内容 |
|------|------|
| 参照箇所 | `web/src/app/api/chat/route.ts:96`, `web/src/app/api/chatbot/route.ts:191` |
| 状態 | `GEMINI_API_KEY || GOOGLE_API_KEY` のフォールバックとして残存 |
| 対応 | `GEMINI_API_KEY` を正として、コード側のフォールバックを将来削除可能。**Vercel 設定済みの場合は削除不要** |
| 優先度 | 低（動作には影響しない） |

### A-2. `NEXT_PUBLIC_FEEDBACK_FORM_URL` — コード参照なし

| 項目 | 内容 |
|------|------|
| 参照箇所 | `web/.env.example` にのみ記載。コード内に `process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL` 参照なし |
| 対応 | Vercel に設定済みなら削除可。`web/.env.example` からも削除推奨 |
| 優先度 | 中 |

### A-3. `NEXT_PUBLIC_GSC_VERIFICATION` — 直接 metadata に埋め込み済み

| 項目 | 内容 |
|------|------|
| 参照箇所 | `web/src/app/layout.tsx` の `verification.google` フィールドに直書き済み |
| 状態 | `web/.env.example` にはあるが、コードで env 参照していない |
| 対応 | Vercel に設定済みなら削除可 |
| 優先度 | 低 |

---

## B. 命名不一致（修正必要）

### B-1. `NEXT_PUBLIC_RAKUTEN_AFID` vs `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID`

| 項目 | 内容 |
|------|------|
| コードで使用している名前 | `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` |
| `web/.env.example` の記載 | `NEXT_PUBLIC_RAKUTEN_AFID` ← **誤り** |
| Vercel に設定すべき名前 | `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` |
| 対応 | `web/.env.example` を修正済み（`env-naming-guide` 参照）。Vercel で `NEXT_PUBLIC_RAKUTEN_AFID` が設定されている場合は `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` に再設定 |
| 優先度 | **高（アフィリエイト収益に影響）** |

---

## C. Vercel 未設定の可能性がある変数（コード参照あり・設定を推奨）

以下はコードで参照されているが `web/.env.example` に記載されておらず、Vercel 未設定リスクがある。

| 変数名 | 用途 | 未設定時の影響 |
|--------|------|----------------|
| `BLOB_READ_WRITE_TOKEN` | MHLW 記事のBlobストレージ読み書き | MHLW検索が500エラー |
| `RESEND_API_KEY` | メール通知送信 | 通知メール送信不可 |
| `RESEND_AUDIENCE_ID` | Resend オーディエンス管理 | 購読者登録不可 |
| `CRON_SECRET` | Cron ジョブ認証 | 気象アラートCronが401エラー |
| `NEXT_PUBLIC_SITE_URL` | Stripe Checkout のリダイレクト先 | ローカル `localhost:3000` にリダイレクト |
| `NEXT_PUBLIC_REVISIONS_INGEST_SOURCE` | 法改正データソース切替 | デフォルト `sample` (モック)で動作 |
| `REVISIONS_REAL_SOURCE_URL` | 法改正リアルデータURL | `real` モード時に必要 |
| `AUTH_SECRET` | NextAuth セッション署名 | 認証が無効化 |

---

## D. 開発専用変数（本番に設定不要）

| 変数名 | 用途 | 推奨設定環境 |
|--------|------|-------------|
| `NEXT_PUBLIC_FORCE_ERROR` | エラーUI強制表示（開発デバッグ用） | Development のみ |
| `NEXT_PUBLIC_FORCE_ERROR_TRANSPORT` | エラー伝達方式強制（開発デバッグ用） | Development のみ |
| `REVISIONS_REAL_SOURCE_PAYLOAD_JSON` | テスト用ペイロード直接注入 | Development のみ |
| `REVISIONS_REAL_SOURCE_FORMAT` | データフォーマット指定 | 実データ運用時のみ |

---

## E. 追加推奨変数

| 変数名 | 推奨値 | 理由 |
|--------|--------|------|
| `NEXT_PUBLIC_PAID_MODE` | `false` | 課金機能の有効/無効フラグ。将来の課金実装時に切替 |
| `NOTIFY_FROM` | `ANZEN AI <noreply@anzen-ai.com>` | デフォルト値があるが明示設定を推奨 |

---

## アクションサマリー

```
優先度 高:
  1. web/.env.example の NEXT_PUBLIC_RAKUTEN_AFID を NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID に修正 ← 完了
  2. Vercel で NEXT_PUBLIC_RAKUTEN_AFID → NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID に変更
  3. NEXT_PUBLIC_SITE_URL を Vercel Production に設定（値: https://safe-ai-site.vercel.app）

優先度 中:
  4. NEXT_PUBLIC_PAID_MODE=false を全環境に追加
  5. NEXT_PUBLIC_FEEDBACK_FORM_URL が Vercel にある場合は削除

優先度 低:
  6. GOOGLE_API_KEY は残置でも可（フォールバックとして機能する）
  7. NEXT_PUBLIC_GSC_VERIFICATION が Vercel にある場合は削除（コード不使用）
```
