# 03. 軸2 アウトプット即時性

> 入力した瞬間に結果が見え始めるか。ボタン押下→結果表示までの体感秒数。ローディング状態の親切さ。

---

## 即時性スコア表

| 機能 | 入力→結果の体感 | ローディング設計 | 「沈黙」リスク | 評価 |
| ---- | ---------------- | ---------------- | -------------- | ---- |
| WBGT計算機 | 入力即時(useMemo) | 不要 | なし | **Wow** |
| /chemical-database 検索 | 入力即時(client filter) | 不要 | なし | ◎ |
| /chemical-ra(物質検索) | 入力即時(全件in-memory scan・debounce無) | 不要 | 中位スマホで体感ラグ | ○ |
| /law-search | 入力即時(全文client search) | 不要 | 初回JSバンドル肥大化 | ○ |
| /circulars | 入力即時(useDeferredValue使用) | 不要 | 1069件全件client送り、初回重い | ○ |
| /chatbot | 送信→**10秒沈黙** | ドット3つアニメのみ | **高(P0)** | **✗** |
| /strategy/plan-generator | 送信→サーバラウンドトリップ→preview | Suspense fallback | プレビューまでなし | △ |
| /ky AI たたき台 | 送信→3秒以上待機 | aiBusy 表示 | 秒数表示なし | △ |
| /safety-diary AIたたき台 | 同上 | 同上 | 同上 | △ |
| /accidents-reports | SSG/ISR(revalidate=2592000) | Suspense skeleton | recharts hydrate遅延 | ○ |
| /accidents/[id] | dynamicParams=true、SSGなし | スケルトン | 個別遅延あり | △ |
| /signage | 60分間隔auto-refresh | カウントダウン表示なし | 動いてる感不足 | △ |
| /community-cases 投稿 | route.ts → serverStore メモリ | 完了画面 | **永続化されない(P0)** | **✗** |
| 各クイズ(/e-learning) | 回答→即解説 | 即時 | OK | ◎ |
| /faq 検索 | 入力即時(client filter) | 不要 | OK | ◎ |

---

## P0 即時性破綻

### I1: /chatbot にストリーミング応答なし
- **状況**: `/api/chatbot/route.ts` 全661行に `stream` 実装なし。`chatbot-panel.tsx:284` の `await fetch` → `await res.json()` が完全ブロッキング(:281-309)。
- **体感**: Gemini が回答生成終了するまで何も返らない(平均8-12秒)。
- **ローディング**: ドット3つアニメ(:942-951)のみ。秒数表示なし。
- **影響**: 初心者は「**フリーズ**」と誤解し、再送信を連打 → 同じ質問が複数回飛ぶ。
- **修正**: Server-Sent Events で chunked response。`@google/generative-ai` の `generateContentStream` を使用。
- **工数**: 16h

### I2: コミュニティ投稿が永続化されない(虚偽即時表示)
- **状況**: `route.ts:74,103` + `ugc-store.ts:14-19` で `serverStore` が**プロセス内メモリ**。Vercelサーバーレスでは投稿が消える/別インスタンスから見えない。`clientAddSubmission` で localStorage に書くため**投稿者本人のブラウザでしか見えない**。
- **体感**: 投稿完了画面「自動審査→公開」(`SubmitForm.tsx:209`)と表示するが、**他ユーザーから見ると消滅**。
- **影響**: 投稿者の信頼を裏切る。データ消失。
- **修正**: Supabase等への接続必須(オーナー確認案件)。
- **工数**: 24h(Supabase接続)

---

## P1 即時性課題

### I3: AIたたき台に予測秒数なし
- **状況**: KY/日誌の `/api/ky-assist?mode=table` 呼出しで `aiBusy` 表示のみ。3秒以上沈黙でユーザー不安。
- **修正**: 「8秒ほどお待ちください」または進捗バー(Gemini API のレイテンシは概ね2-5秒なので合算8秒で安全)。
- **工数**: 2h

### I4: /strategy/plan-generator にライブプレビューなし
- **状況**: `handleSubmit` で router.push → サーバラウンドトリップ → preview ページレンダリング。設定変更が即視覚化されない。
- **修正**: 右ペインにライブプレビュー(`SAFETY_PLAN_TEMPLATES` は `Object.freeze` 静的データなので技術軽量)。
- **工数**: 12h(Wow候補)

### I5: /signage にカウントダウン表示なし
- **状況**: `AutoRefreshStatus` は分のみ表示で残り時間カウントなし(`auto-refresh-status.tsx`)。
- **修正**: 「次回更新まで XX分」秒単位カウントダウン → 「動いてる」可視化。
- **工数**: 2h

### I6: /chemical-ra 物質検索に debounce なし
- **状況**: `MhlwChemicalSelector`(`mhlw-chemical-selector.tsx:42-45`) は debounce無しで毎キーストロークに3,500件全件スキャン。
- **修正**: debounce 150-200ms。
- **工数**: 1h

### I7: /circulars の初回バンドル肥大化
- **状況**: 1,069件全件クライアント送り(`CircularsFilterableList.tsx:21`)。
- **修正**: SSR検索化、または `/api/circulars/search` 経由化。
- **工数**: 16h

---

## P2 即時性改善余地

### I8: /law-search の useDeferredValue 不使用
- **修正**: useDeferredValue 追加で入力中の応答性向上。
- **工数**: 2h

### I9: /accidents/[id] が SSGなし
- **状況**: `[id]/page.tsx:21-27` dynamicParams=true で動的レンダリング。
- **修正**: 個別事故を SSG 化(累計事例数による静的ページ数)、ISR 適用。
- **工数**: 4h

---

## 「沈黙体感」マップ

| 体感秒数 | 該当機能 | ユーザー反応 |
| -------- | -------- | ------------ |
| 0秒(即時) | WBGT/chemical-db/faq/glossary/e-learning解説 | 「速い」 |
| 1-3秒 | accidents-reports SSR/SSG | 「普通」 |
| 3-5秒 | 計画生成 router.push, KY AI たたき台 | 「ちょっと遅い」 |
| **5-10秒** | **chatbot 回答**, /community-cases 投稿 | 「**フリーズ**」 |
| 10秒+ | chatbot で長文 RAG クエリ | 「壊れた」と判断 |

---

## 削減案サマリ

1. **chatbot ストリーミング応答**(P0/16h) — 5-10秒沈黙→1秒以内に最初の文字
2. **community-cases 永続化**(P0/24h) — 永続化欠陥解消
3. **plan-generator ライブプレビュー**(P1/12h) — Wow候補
4. **AIたたき台に予測秒数**(P1/2h)
5. **signage カウントダウン**(P1/2h)
6. **chemical-ra debounce**(P1/1h)
7. **circulars SSR化**(P1/16h)
8. **law-search useDeferredValue**(P2/2h)

合計工数: 75h
