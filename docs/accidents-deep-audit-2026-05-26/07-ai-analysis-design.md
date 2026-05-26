# 07 AI分析機能（軸7・化学物質RAパターン流用）

## 現状
- accident-analysis-panel / mhlw-accident-analysis-panel は**統計ベースでAI非搭載**。事故DBにAI機能は無い。
- 化学物質RA（/api/chemical-ra, sds-extract, mixture-suggest）でGemini活用パターン確立済み。

## 設計案（最有力の差別化）
- D-1 **AI事故注意喚起**: 業種・作業内容を入力 → 既存事故DB（accidentCasesMock）から類似ケースを抽出（accident-cross-search/関連ロジック流用）→ Geminiで「この作業で起きやすい事故・危険ポイント・再発防止策」を要約提示（参考・免責明示）。新規 /api/accidents/analyze。
- D-2 「今月の労災トレンド要約」: 集約データ（または月次速報取込後）をGeminiで平易に要約。
- D-3 KY連携: KY作業内容→類似事故サジェスト（軸10と統合）。

## コスト
- gemini-2.5-flash、1件 約¥10-20。想定50-100件/月で¥1,000-2,000、閾値内。IPレート制限（既存パターン）。

## 安全・遵守
- AI出力は「参考」明記（AI_LEGAL_DISCLAIMER）。事故事例は公開範囲のデータのみ。断定回避。

## 競合優位
- 職場のあんぜんサイト/JAISH は検索止まりでAIなし。HACARUSは有料。**無料・登録不要でAI注意喚起**は明確な差別化。

## 優先度
- **P0/P1: D-1 AI事故注意喚起**（業種・作業→類似事故＋危険ポイント＋対策）。事故DBの「専門家レベルで気軽に」を最短実現。
- P1: D-3 KY連携。
- P2: D-2 トレンド要約（直近取込と連動）。
