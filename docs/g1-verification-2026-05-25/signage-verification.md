# G-1検証: サイネージ機能（本番実接続）

- 検証日時: 2026-05-26（JST）
- 本番URL: https://www.anzen-ai-portal.jp/

## 1. /ky/morning（朝礼サイネージ）ページ

| パス | 結果 | 応答時間 |
|---|---|---|
| GET /ky/morning | 200 | 0.52s |
| GET /ky/morning?code=000000 | 200 | 0.49s |

ページ自体は code 有無に関わらず 200 で配信される（クライアント側で code → セッション取得を試みる設計）。

判定: **YES（ページ配信）**

## 2. 6桁コード共有のバックエンド（signage_sessions）

- POST /api/ky/signage（生成）: **HTTP 502 permission denied for table signage_sessions**
- GET /api/ky/signage?code=000000（取得）: **HTTP 502 同上**

判定: **NO（本番障害）** — 6桁コードの生成・取得が本番で機能していない。
ky_records と同一の Supabase service_role 権限障害が根本原因。

→ つまり現状、別端末（サイネージ表示端末）から6桁コードで朝礼KYを呼び出す導線は
**本番では成立しない**。`/ky/morning?code=XXXXXX` を開いても、クライアントが
`cloudGetSignageSession(code)` を呼ぶ → 502 → null フォールバックとなり、共有KYは表示されない。

## 3. ポーリング動作

`/ky/morning` のリアルタイム更新ポーリングは signage GET に依存するため、上記障害により
共有セッションの自動反映は機能しない。ローカル（同一端末で作成→そのまま朝礼表示）の経路は
localStorage 経由で動作する想定。

## サイネージ G-1総合判定

- ページ配信: **YES**
- 6桁コード共有（別端末連携の中核）: **NO（要オーナー対応）**
- 影響: Phase B/C で磨き込む「スマホ/タブレットだけで現場サイネージ完結」の中核導線が
  本番で塞がっている。Supabase 権限修正が前提。
- ただしコード実装自体は存在し、Phase C の堅牢化（QR・期限延長等）は実装+ユニットテスト可能。
  本番E2E確認のみ Supabase 修正待ち。
