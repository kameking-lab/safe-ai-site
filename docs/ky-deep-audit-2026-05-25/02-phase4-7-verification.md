# 02. Phase 4–7 実機動作確認（軸2）

**重要**: 本番URLに到達不可（egress 403）＋ブラウザ無しのため、**実機・実接続・実DBは全て未検証**。以下は「コード上どう実装されているか（=動くべき設計か）」の確認と、「社長がプレビューで実機確認する手順」をセットで記す。捏造YESはしない。

## Phase 4 クラウド保管（Supabase）
**コード確認 ✅**
- `lib/supabase/server.ts`：service_role クライアントは **サーバー専用**（ブラウザに鍵を渡さない）。env 未設定なら `null` → API は 503 → ブラウザは localStorage 継続。
- `api/ky/records`（GET/POST）・`api/ky/workers`（GET/POST）：`device_id` 単位。POSTは insert/upsert、GETは最新＋一覧。
- `lib/ky/storage-adapter.ts`：ローカルファースト＋背景同期＋再送キュー（最新優先）。`/ky/paper`・`/ky/workers` から呼び出し。
- 設計上の妥当性：RLS有効・anonポリシー無しでも service_role 経由で確実動作。オフライン時も localStorage で完結。

**実機確認（未検証・社長手順）**
1. プレビューで `/ky/paper` を開き保存 → Supabase の `ky_records` に行が増えるか。
2. `/ky/workers` で1名追加 → `worker_master` に当該 device_id の行ができるか。
3. 別ブラウザ（シークレット）で `/ky/paper` → 直近保存KYを引き継ぐか。
- 取れない場合の切り分け：Vercel env（`SUPABASE_SERVICE_ROLE_KEY` は Production/Preview のみ）と RLS。env無ければ 503 で localStorage 継続が正しい挙動。

## Phase 5 Gemini 本接続（危険箇所提案）
**コード確認 ✅**
- `lib/ky/gemini-suggest.ts`：RAGプロンプト生成＋JSON解析（```json フェンス/前後文除去）＋ **可能性・重大性を1–3にクランプ** ＋評価値・ラベル自動算出＋**grounded判定**（過去事例語句と一致するか＝ハルシネーション目印）。
- `api/ky/suggest`：作業内容→`suggestKyByIndustryAndWork`（150件RAG）→ Gemini（`gemini-2.5-flash`、circuit breaker、IP 10/分レート制限）→ 失敗/未設定なら擬似AIへ二段フォールバック。
- `/ky/paper`「AIに危険箇所を提案させる」→ 反映ボタン、source（本物/定型）と「要確認」バッジを表示。
- ユニットテスト19件で解析/クランプ/grounded/フォールバックを検証済（注入generate）。

**実機確認（未検証・社長手順）**
1. 作業内容に「足場での外壁塗装」を入力 →「AIに危険箇所を提案させる」。
2. 期待：本物のGemini（要 `GEMINI_API_KEY`）で危険・対策・可能性(1–3)・重大性(1–3)が返り、評価値が自動計算。
3. キー未設定/レート/失敗時は「定型提案」表示（=フォールバックが効く）。
- 注意：本物応答の質（事例に即しているか）は実応答を見ないと評価不能＝**未検証**。

## Phase 6 別端末サイネージ共有（6桁コード）
**コード確認 ✅**
- `lib/ky/signage-code.ts`：6桁・24h TTL。`api/ky/signage`：POST=コード発行（衝突回避6回・期限切れ掃除）、GET=コード取得（不存在404/期限切れ410）。
- `/ky/paper`「別端末で共有」→ 保存→コード発行→コード表示。`/ky/morning?code=XXXXXX` で受信＋約8秒ポーリング＋手入力フォーム。

**実機確認（未検証・社長手順）**
1. `/ky/paper` で「別端末で共有」→ 6桁コード表示。
2. 別端末（スマホ等）で `/ky/morning` にコード入力 or `?code=XXXXXX` → 同じKYが表示・自動更新。
3. 24h後に無効化。
- リアルタイム性（8秒ポーリング）の体感、別回線での到達は**未検証**。

## Phase 7 入力一本化＋デッドコード整理
**コード確認 ✅／一部要実機**
- `/ky/page.tsx`・`/pdf/page.tsx` は `permanentRedirect("/ky/paper")`。**HTTPステータスは 308（恒久）**。※社長メモの「301」とは異なるが、SEO上は 301/308 とも恒久で同等。301を厳密に要するなら別途指定が必要。
- SEO（HowTo構造化データ・canonical）は `/ky/paper` に移設・`robots:index` 有効化。
- 削除：`ky-instruction-record-form.tsx`(915行)・`ky-page-content.tsx`(約1623行)＝**約2,540行**。`grep` で他参照なし、テスト参照なしを確認のうえ削除。
- 主要ナビ（モバイル下部/アプリシェル/flagship）とKY内リンクを `/ky/paper` 直リンクに更新。長尾の文中 `/ky` リンクはリダイレクトで吸収。
- e2e（`e2e/ky.spec.ts`）を一本化後の挙動に更新し、CIで **smoke/e2e グリーン**（=リダイレクトとHowToと関連リンクは自動テスト通過）。

**実機確認（未検証・社長手順）**
1. `/ky`・`/pdf` にアクセス → `/ky/paper` に転送されるか（308）。
2. モバイル下部ナビ「KY」→ `/ky/paper` 直行か。
3. 旧来 `/ky?preset=...` 等のクエリ付き導線 → 転送はされるが **preset/import等のクエリ機能は /ky/paper では未対応**（=旧 `/ky` 固有機能は一本化で廃止。09参照）。

## 軸2 総括
- Phase 4–7 は **コード上は要件を満たす実装**で、CI（smoke/e2e）も緑。
- ただし **クラウド保存・Gemini応答・6桁共有・リダイレクト本番挙動は全て未検証**。**完成の最終確認はプレビュー実機が必須**。
- 一本化の副作用として「過去KY一覧・再編集」「/ky クエリ機能」が失われた点は要対応（09・10）。
