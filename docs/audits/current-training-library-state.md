# 安全研修ライブラリ 現在状態

- 監査基準日: 2026-08-27 JST
- 対象: `web/`（Next.js App Router）
- 公開範囲: 一覧1ページ、公開教材1ページ、noindexの利用条件1ページ
- 公開教材: 墜落・転落防止とフルハーネスの実務
- 未公開テーマ: 27件。一覧カードにテーマ名・想定対象者・`Coming Soon`だけを表示し、個別URL・CTAは作成しない。

## 変更前

- `/training/safety-seminars` は存在しなかった。
- 旧 `/education/tokubetsu/fullharness` は `/education` へのリダイレクトであり、公開教材として利用できなかった。
- 研修用の編集可能PPTX、20枚PDF、講師台本、配布資料、チェックリスト、クイズ、source registry、音声ファイルは共通正本化されていなかった。

## 現在の正本

- スライド・音声原稿: `web/src/data/safety-seminars/fall-prevention.json`
- claim registry: `web/src/data/safety-seminars/claims.json`
- source registry: `web/src/data/safety-seminars/source-registry.json`
- クイズ: `web/src/data/safety-seminars/quiz.json`
- テーマ一覧: `web/src/data/safety-seminars/themes.ts`
- 基準統計: 2025年全国確定値（COVID-19罹患災害除外）。2026年1〜6月の7月速報は分離表示。
- 法令基準: e-Gov法令API v2 `asof=2026-08-27`。

## 安全境界

- 「法定義務」「行政推奨」「科学的知見」「サイト提案」をclaim typeで分離した。
- 5mは行政上の選定目安、6.75m超は告示上の法的境界として分離した。
- 特別教育は、高さ2m以上・作業床設置困難・フルハーネス型使用の全条件で判定する。
- 固定クリアランス値、固定の安全待機時間、訓練単独の事故削減効果は表示しない。
- 教材は社内安全研修用で、法定の特別教育等を代替せず、修了証発行へ転用しない。

## 実装状態

- 20枚、音声ファイル20点、字幕、全文原稿、スライド一覧、キーボード、reduced motion、全画面を実装。
- ローカル日本語TTS音声を主系統、SpeechSynthesisをfallbackとした。自動再生は行わない。
- ホーム「今日学ぶ」、`/safety-ai`、`/features`、footer、`/services/automation`から1クリックで一覧へ到達できる。
- sitemapは一覧と公開教材だけを収載する。利用条件、query状態、Coming Soon個別URLは収載しない。

最終ゲート、Preview、Production、production smoke、commit、push、tagの結果は `current-training-library-production-result.md` に記録する。
