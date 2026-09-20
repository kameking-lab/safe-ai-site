# AI実務研修 現在状態

- 監査基準日: 2026-08-27 JST
- 対象: `web/`（Next.js App Router）
- 既存安全研修: `/training/safety-seminars` と公開教材を変更せず、研修カテゴリー切替だけを追加
- 公開範囲: AI実務研修一覧1ページ、公開教材1ページ
- 公開教材: 「AIチャット仕事術」1件
- 未公開テーマ: 24件。折りたたみ一覧にテーマ名・対象者・`Coming Soon`だけを表示し、個別URL・CTAは作成しない

## 共通正本

- スライド・音声原稿・講師補足・演習: `web/src/data/ai-seminars/ai-chat-work.json`
- claim registry: `web/src/data/ai-seminars/claims.json`
- source registry: `web/src/data/ai-seminars/source-registry.json`
- テーマ一覧: `web/src/data/ai-seminars/themes.ts`
- 確認クイズ: `web/src/data/ai-seminars/quiz.json`
- AI依頼テンプレート: `web/src/data/ai-seminars/prompt-template.json`
- 20枚、3演習、5問クイズ。表示本文、Web原稿、字幕、PPTX、PDF、音声のスライド番号を共通化する

## 根拠と安全境界

- OpenAI、Anthropic、Googleの現行公式資料と、日本の個人情報保護委員会、経済産業省、文化庁資料を優先した
- 製品固有UIを転載せず、目的・背景・条件・出力形式、対話修正、一次資料確認という共通手順を扱う
- 個人情報は一律禁止と法的断定せず、承認済み環境、利用目的、現行規約、必要最小限、会社ルールを確認する
- 著作権は類似性・依拠性、人の創作的寄与を個別判断とし、行政資料を裁判所の最終判断として扱わない
- 自動化バイアス研究の発生率を生成AIの事務作業へ外挿しない
- 正答保証、生産性向上率、資格・認定、無検証の自動意思決定は表示しない

## 実装状態

- 既存音声付きスライドプレイヤーを再利用し、手動再生、一時停止、停止、前後移動、進捗、音量、ミュート、速度、字幕、全文原稿、一覧、全画面、キーボード、reduced motionを提供する
- 回答入力後だけ解説を表示する3演習と、人の確認地点を含むAI依頼テンプレートを提供する
- PPTX、研修PDF、講師台本、1枚配布資料、依頼テンプレート、5問クイズ・解答、出典一覧を公開対象とする
- sitemapは一覧と公開教材だけを収載し、query状態とComing Soon個別URLは収載しない

最終ゲート、Preview、Production、production smoke、commit、push、tagは `current-ai-training-production-result.md` に記録する。
