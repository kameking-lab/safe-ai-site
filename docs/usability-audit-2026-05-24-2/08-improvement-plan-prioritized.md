# 08. 改善案 優先順位付き(P0 / P1 / P2)

> P0(致命的・3日以内)、P1(重要・1週間以内)、P2(理想・余力で)で全件記録。
> 各改善案には対象機能・現状の問題(1行)・改善内容(2-3行)・推定クリック数削減or体感速度向上・推定実装工数。

---

## P0 (致命的・実務阻害) - 22件 / 合計 134h

### P0-001: チャットボット ストリーミング応答導入
- 対象: /chatbot
- 現状: 送信→10秒沈黙、ドット3つアニメのみ。フリーズと誤解されて連打。
- 改善: Server-Sent Events で chunked response。`@google/generative-ai` の `generateContentStream` を使用。秒数進捗表示付き。
- 効果: 体感5-10秒→1秒以内に最初の文字
- 工数: 16h

### P0-002: /community-cases 投稿の永続化
- 対象: /community-cases
- 現状: `ugc-store.ts:14-19` で serverStore がプロセス内メモリ。Vercelサーバーレスで消失。「自動審査→公開」は虚偽。
- 改善: Supabase 等への接続。モデレータダッシュボード実装。
- 効果: 投稿者信頼回復、SEO効果(UGC増加)
- 工数: 24h(オーナー確認必須)

### P0-003: 計画ジェネレータ「10業種」コピー訂正
- 対象: /strategy/plan-generator
- 現状: コピー「10業種30テンプレ」/ 実装13業種39テンプレ。SEO/JSON-LD/featureList/OG含め全箇所虚偽。
- 改善: 全箇所「13業種39テンプレート」に統一。`page.tsx:18,20,57,62,89`一括修正。
- 効果: 信頼性回復・SEO正確化
- 工数: 1h

### P0-004: 化学物質RA「8,400物質超」コピー訂正
- 対象: /chemical-ra
- 現状: `page.tsx:88` の「8,400物質超」は実装約3,700と乖離。
- 改善: 「約3,700物質(内訳: MHLW告示251 + NITE GHS 2729 + PRTR 398 + 化審/毒劇/CWC/廃掃 255)」に訂正。コピー・JSON-LD・OG。
- 効果: 信頼性回復
- 工数: 1h

### P0-005: /accidents-reports 直近7日/30日タブ追加
- 対象: /accidents-reports/[industry]
- 現状: `hub-filter.tsx:35-37` のフィルタ軸は q/type/month のみ。「直近」軸なし。
- 改善: 詳細ページに「直近7日/30日/全期間」タブ。`accident-analysis.ts:537-541` の occurredKey 流用。
- 効果: シナリオ7(直近1週間)を「不可能」→「2クリック」
- 工数: 8h

### P0-006: 計画ジェネレータ 過去保存+前年比較
- 対象: /strategy/plan-generator
- 現状: `CopilotProvider.tsx:127` の recordPlan は最新1件のみ。前年比較不可。
- 改善: localStorage で過去3件保存+前年比較ハイライト。
- 効果: 「年に1回作って棚」→PDCAサイクル成立
- 工数: 12h

### P0-007: チャットボット 建設業サンプル質問追加
- 対象: /chatbot
- 現状: サンプル質問6個に「足場」「墜落」「フルハーネス」「KY」一切なし。製造業偏重。
- 改善: 「足場の手すり高さは?」「墜落防止のフルハーネス着用義務は?」「統括安全衛生責任者の選任要件は?」「KYTの4ラウンド法とは?」追加。
- 効果: シナリオ3を 4→2 クリック、ペルソナA冷遇解消
- 工数: 2h

### P0-008: /qa-knowledge 削除・301リダイレクト
- 対象: /qa-knowledge
- 現状: 119行のテンプレで中身ゼロ、FAQ誘導のみ。SEO害。
- 改善: 301 → /faq。
- 効果: 検索ノイズ削減、空ページ排除
- 工数: 1h

### P0-009: 化学物質詳細ページ 特化則/有機則/酸欠則/粉じん則/石綿則タグ追加
- 対象: /chemical-database/[cas]
- 現状: `regulation-tag-labels.ts:8-17` の規制タグ9種に該当規制なし。製造業最頻出の特化則第二類が見えない。
- 改善: 規制タグに5つ追加+表示ロジック+`MhlwChemicalInfoCard` の安衛則第577条の2/第594条の2フラグ表示。
- 効果: 製造業安全担当者の主要ユースケース解決
- 工数: 6h

### P0-010: KY → 日誌 ワンクリック転記
- 対象: /ky → /safety-diary
- 現状: KY記録の workDetail/riskRows を日誌に流し込むAPIなし。手コピペ。
- 改善: KY保存後「この内容で日誌を書く」ボタン → /safety-diary/new?fromKy={id}
- 効果: 日誌作成3-5分目標達成
- 工数: 8h

### P0-011: /circulars と /laws/notices-precedents 統合
- 対象: /circulars, /laws/notices-precedents
- 現状: 通達系2系統並存。職長混乱。
- 改善: /laws/notices-precedents の通達 → /circulars 統合。判例だけ /precedents 新設に分離。
- 効果: IA整理、機能重複解消
- 工数: 12h

### P0-012: /e-learning HomeScreen経由廃止
- 対象: /e-learning
- 現状: `e-learning/page.tsx:49` で `HomeScreen variant="elearning"` 経由。Accident/KY/通知/PDFまで束ねた巨大ハブが重い。
- 改善: 本体パネル直表示。クイズ開始まで5-6スクロール→1スクロール。
- 効果: クイズ起動速度・体感
- 工数: 4h

### P0-013: /audits 8フォルダを /admin/audits/ 移管
- 対象: /audits/{brand-consistency, review-dashboard, p1/p2/p3-batch-plan, post-2week-regression, news-feed-stats, content-quality-cleanup, law-citation-full-audit}
- 現状: 社内監査資料が本番公開(noindex のみ)。誤クリック検索ノイズ。
- 改善: 8フォルダを /admin/audits/ に移管。残5フォルダ(site-status/site-reality-check/hobby-recovery-forecast/2026-05-16/2026-05-17-ux-seo)は読み物として維持。
- 効果: IA整理、Sidebar表示削減
- 工数: 4h

### P0-014: /e-learning 受講者進捗 localStorage 保存
- 対象: /e-learning
- 現状: `STORAGE_KEY = "el-theme-overrides"` は講師の問題編集保存で、受講者進捗保存皆無。法定教育エビデンスにならない。
- 改善: 受講者進捗localStorage+修了スコア表示。
- 効果: 法定教育の証跡として使える
- 工数: 8h

### P0-015: /mental-health-management 労働者本人セルフチェック
- 対象: /mental-health-management
- 現状: 「自社整備状況7問」のみ。本人診断ができない。
- 改善: /mental-health-management/self-check 新設(57項目セルフチェック・端末内処理・匿名)。
- 効果: 来訪者半数の期待充足
- 工数: 8h

### P0-016: /circulars + /law-search お気に入り+コピー機能
- 対象: /circulars, /law-search
- 現状: お気に入り・引用ボタンゼロ。現場で参照する条文を保存できない。
- 改善: localStorage お気に入り(最大20条文)+「条文+条番号」整形コピーボタン。
- 効果: 報告書執筆ユースケース実現
- 工数: 8h

### P0-017: ホーム「建設業の方はこちら」昇格
- 対象: /
- 現状: `page.tsx:43-59` の建設業バナーがホーム最下段。ペルソナA本命施策と銘打つ割に矛盾。
- 改善: ヒーロー直下に昇格。
- 効果: ペルソナA動線最適化
- 工数: 2h

### P0-018: /industries/[industry] hero直下に「今日の3CTA」帯
- 対象: /industries/[industry]
- 現状: KYセクションが5番目で、当日業務までスクロール5回。
- 改善: hero直下に「今日の3アクション」(KY/朝礼/日誌)。10業種すべてに。
- 効果: 当日業務即実行性
- 工数: 6h

### P0-019: チャットボット 17色17ブロックの配色再設計
- 対象: /chatbot
- 現状: 1回答内17色17ブロック縦積み。視線が散る。
- 改善: 主要3色(出典=エメラルド・関連=スカイ・警告=ロゼ)に統合。重複ブロック削減(MainFeatureNextActions+RelatedPageCards×2→1個)。
- 効果: 視覚負荷激減
- 工数: 8h

### P0-020: CopilotStepNav/CopilotMemo を chatbot から退避
- 対象: /chatbot
- 現状: CopilotStepNav/CopilotMemo がチャットの最上部を占有し、入力欄FV未表示。
- 改善: chatbotから除去または下部に移動。CopilotMemo は「最近の業種: 建設業」程度のシンプル表記に。
- 効果: 入力欄FV表示
- 工数: 4h

### P0-021: ナビゲーション NAV_CATEGORIES 10→6カテゴリ
- 対象: app-shell.tsx
- 現状: 10カテゴリ40+項目で「マップ」「学習」「その他」など意味希薄。
- 改善: 6カテゴリ20項目以内に圧縮(質問/記録/分析/学ぶ/業種別/管理)。
- 効果: ナビ整理
- 工数: 8h

### P0-022: チャット PDF出力追加
- 対象: /chatbot
- 現状: PDF出力なし(MD/TXT/JSONのみ)。職長は紙印刷文化。
- 改善: 回答+出典をPDF出力。
- 効果: 紙印刷文化対応
- 工数: 6h

---

## P1 (重要・1週間以内) - 31件 / 合計 130h

### P1-001 ~ P1-005: 動線改善
- P1-001 /law-search → /law/[law]/[num] URLルート(12h)
- P1-002 /law-search タブ化「キーワード | 条番号」(3h)
- P1-003 /faq トップに検索ボックス直置き(2h)
- P1-004 /glossary をグローバルナビに(1h)
- P1-005 ホーム条文番号入力ボックス追加(4h)

### P1-006 ~ P1-010: 即時性
- P1-006 AIたたき台に予測秒数表示(2h)
- P1-007 /signage カウントダウン表示(2h)
- P1-008 /chemical-ra 物質検索debounce(1h)
- P1-009 /circulars SSR化(16h)
- P1-010 plan-generator 右ペインライブプレビュー(12h)

### P1-011 ~ P1-015: 直感性
- P1-011 ホームH1書き換え「動詞ベース」(2h)
- P1-012 HomeThreePillars ラベル現場語彙化(1h)
- P1-013 WBGT用語tooltip(2h)
- P1-014 チャット サンプル質問押下→プリフィル方式(2h)
- P1-015 /e-learning と /education 改名(/quiz, /training)(6h)

### P1-016 ~ P1-020: 実務レベル
- P1-016 KY署名PDF埋込確認+修正(4h)
- P1-017 R7チェック localStorage 保存(2h)
- P1-018 WBGT結果 localStorage 保存(2h)
- P1-019 面接指導書コピー+PDF(4h)
- P1-020 /accidents-reports CSV出力(4h)

### P1-021 ~ P1-025: 視覚
- P1-021 ホーム3層重複の順序変更(4h)
- P1-022 /accidents-reports タブ化(12h)
- P1-023 /ky アコーディオン化+進捗ステップバー(8h)
- P1-024 /signage 絵文字→アイコン置換(4h)
- P1-025 /signage displayMode UI整理(4h)

### P1-026 ~ P1-031: その他
- P1-026 KY参加者デフォルト3名(1h)
- P1-027 KY必須/任意バッジ追加(2h)
- P1-028 /education + /education-certification 統合(8h)
- P1-029 /accidents 3兄弟タブ化(/accidents?view=list/reports/analytics)(12h)
- P1-030 倉庫/卸売 KYプリセット自業種化(4h)
- P1-031 小売/飲食/サービス KYプリセット自業種化(4h)

---

## P2 (理想・余力で) - 16件 / 合計 76h

### P2-001 ~ P2-005: 拡張機能
- P2-001 化学物質 複数混合RA(16h)
- P2-002 法令ブックマークQRコード出力(4h)
- P2-003 法改正diff表示(改正前後の条文比較)(12h)
- P2-004 計画ジェネレータ Word/Excel出力(8h)
- P2-005 plan-generator 表紙印影4枠+ロゴ画像URL入力(8h)

### P2-006 ~ P2-010: 拡張UI
- P2-006 サイネージQR起動(4h)
- P2-007 サイネージ「現場ダッシュボード」(WBGT+業種別+R7)1画面(8h)
- P2-008 チャット履歴検索ボックス(4h)
- P2-009 チャット エラーリトライボタン(1h)
- P2-010 階層マップから条文ピンポイント到達(4h)

### P2-011 ~ P2-016: 削減・整理
- P2-011 /audits/* 残り5フォルダの読み物統合(2h)
- P2-012 /accidents/[id] SSG化(4h)
- P2-013 /quick + /quick-start とホームヒーローCTAの統合(4h)
- P2-014 FlagshipGrid 10→8カード削減(2h)
- P2-015 業種ハブ「他の業種」セクション削除(1h)
- P2-016 化学物質「curated/mhlw」タブ統合(2h)

---

## 改善ロードマップ(P0全件)

| 日 | 着手 | 工数 |
| -- | ---- | ---- |
| Day 1(8h) | 3,4,8(コピー修正3件+/qa-knowledge削除) | 3h |
| Day 1(8h) | 7,17(チャット建設業サンプル+ホームバナー昇格) | 4h |
| Day 1余) | 13(audits移管) | 4h |
| Day 2(8h) | 5(直近フィルタ) | 8h |
| Day 3(8h) | 6(過去保存) | 8h(残4h Day4) |
| Day 4(8h) | 6(過去保存続) + 9(化学物質タグ追加) | 4+4 |
| Day 5(8h) | 9続 + 18(industries CTA帯) + 21(NAV整理半分) | 2+6 |
| Day 6(8h) | 21(NAV続) + 19(チャット配色) + 20(Copilot退避) | 2+4+2 |
| Day 7(8h) | 10(KY→日誌) + 19続 + 12(e-learning HS) | 8 |
| Day 8(8h) | 14(e-learning進捗) + 22(チャットPDF) | 6+2 |
| Day 9(8h) | 22続 + 15(メンタル本人診断) | 4+4 |
| Day 10(8h) | 15続 + 16(お気に入り) | 4+4 |
| Day 11(8h) | 16続 + 11(circulars統合)半分 | 4+4 |
| Day 12(8h) | 11続 + 1(チャットストリーミング)着手 | 4+4 |
| Day 13(8h) | 1続 | 8 |
| Day 14(8h) | 1完 + 2(community-cases 永続化)着手(オーナー確認後) | 4+4 |
| Day 15-17 | 2続(Supabase) | 20 |

**P0全件完了: 17営業日(実働134h)**

P1全件追加: +130h = 約16日 → 計**33日(約7週間)**でP0+P1完了

---

## 各改善案のKPI

| 改善案 | KPI(改善前→改善後) |
| ------ | -------------------- |
| P0-001 ストリーミング | 体感5-10秒→1秒以内 |
| P0-005 直近フィルタ | シナリオ7「不可能」→2クリック |
| P0-007 建設業サンプル | シナリオ3 4→2クリック |
| P0-010 KY→日誌 | シナリオ2 8-12→5クリック |
| P0-006 過去保存 | 計画再利用率 0%→70% |
| P0-019 チャット17色 | 1回答色数 17→3 |
| P0-022 チャットPDF | PDF出力可機能数 1→2 |
| P0-021 NAV整理 | カテゴリ 10→6、項目 40→20 |
| P0-013 audits移管 | 公開フォルダ 14→5 |
| P0-017 建設業バナー昇格 | ペルソナA着地→当日業務 3クリック→1クリック |
