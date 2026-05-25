# G-1 実接続検証（2026-05-25 最終仕上げ）

## 結論（正直に）
**本コンテナでは実機・実接続検証は実行不可（未検証）**。理由（本日再確認）:
- 本番URL `https://www.anzen-ai-portal.jp/ky/paper` → **HTTP 403**（egress全ドメイン遮断。`example.com` も403）。
- ブラウザ実行エンジン無し（UI操作・保存・ダッシュボード確認不可）。
- ローカルに `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` 無し（実呼び出し不可）。

→ 以下は **コードレベルでの契約確認（実装が正しいか）** と **社長がプレビュー/本番で行う手順**。**実稼働YESは社長確認後に確定**。捏造しない。

## ① Supabase保存（ky_records / worker_master）
**コード契約 ✅**
- `POST /api/ky/records`：`getServiceSupabase()`（service_role・サーバー専用）→ `ky_records` に insert（device_id/work_date/site_name/project_name/foreman_name/payload）。env無→503→ブラウザ localStorage 継続。
- `GET /api/ky/records?deviceId=`：updated_at降順で最新＋一覧。
- `/ky/paper` 保存時に `cloudPushKyRecord`、`/ky/workers` 編集時に `cloudPushWorkers`。
**社長手順（プレビュー/本番）**: `/ky/paper` で1枚作成→保存→Supabase「Table Editor」で `ky_records` に行追加を確認。`/ky/workers` 追加→`worker_master` に行。
**判定**: 実機未検証（YES/NO は要確認）。

## ② Gemini AI提案（可能性/重大性 1-3）
**コード契約 ✅**
- `POST /api/ky/suggest`：作業内容→`suggestKyByIndustryAndWork`（150件RAG）→ `generateHazardsWithGemini`（`gemini-2.5-flash`）→ `parseHazardSuggestions`（JSON抽出・**likelihood/severity を1-3にクランプ**・評価値算出・grounded判定）。失敗/未設定→擬似AIフォールバック。circuit breaker＋IP 10/分。
- ユニットテスト19件で解析/クランプ/フォールバックを検証済（注入generate）。
**社長手順**: `/ky/paper`「AIに危険箇所を提案させる」に「足場での外壁塗装」→ 応答が「本物のAI（Gemini）の提案」表記で、可能性・重大性が1-3、評価値自動算出されるか。`GEMINI_API_KEY` 未設定なら「定型提案」になる（=フォールバック動作）。
**判定**: 実機未検証（実応答品質も要目視）。

## ③ 6桁コード共有
**コード契約 ✅**
- `POST /api/ky/signage`：`generateSignageCode`（6桁・24h）→ `signage_sessions` insert（衝突回避6回・期限切れ掃除）。
- `GET /api/ky/signage?code=`：不存在404・期限切れ410・有効ならKY返却。
- `/ky/paper`「別端末で共有」→コード発行、`/ky/morning?code=` で受信＋8秒ポーリング。
**社長手順（curl例・本番で実行可）**:
  - 発行は要ブラウザ（device保存→共有）。受信確認は `curl "https://www.anzen-ai-portal.jp/api/ky/signage?code=XXXXXX"` で JSON（record）が返るか。存在しないコードで404が返るか。
**判定**: 実機未検証。

## ④ リダイレクト /ky・/pdf → /ky/paper
**コード契約 ✅**：`permanentRedirect("/ky/paper")`（**308**）。e2e（`e2e/ky.spec.ts`）で転送＋HowTo＋関連リンクをCI緑で確認済。
**社長手順**: `curl -I https://www.anzen-ai-portal.jp/ky`（308 と Location: /ky/paper）。※社長メモの「301」と異なり実装は308（恒久・SEO同等）。
**判定**: コード/CI上は確認済、本番ステータスは要 `curl -I`。

## 総括
- **コード契約は4点とも実装どおり**（前回レビュー＋本実装で確認）。
- **実稼働（Supabase/Gemini/6桁/リダイレクト本番）は社長のプレビュー確認が必須**＝本doc時点では「未検証」。
- 不具合が出た場合のみ修正（本セッションでは実機到達不可のため、報告ベースで対応）。
