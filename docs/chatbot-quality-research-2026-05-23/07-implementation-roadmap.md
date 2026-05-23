# 実装ロードマップ(Phase 1-4)

- 作成日: 2026-05-23
- 対象: チャットボット品質改修
- 合計工数: 14-21日相当(1人実装ベース)

## 0. 全体俯瞰

| Phase | 内容 | 工数 | 依存 |
|-------|------|------|------|
| Phase 1 | RAGコーパス整備 | 3-4日 | なし |
| Phase 2 | ハルシネーション絶滅3層 | 5-7日 | Phase 1 完了 |
| Phase 3 | 「最も近い条文」Fallback | 3-5日 | Phase 1 完了 |
| Phase 4 | 通達・告示URL添付 | 3-5日 | Phase 1 と並列可 |

順序: Phase 1 → Phase 2 / Phase 4(並列) → Phase 3 → 全体結合テスト

## 1. Phase 1: RAGコーパス整備(3-4日)

### 1.1 着手前提条件

- 本研究ドキュメント9件のレビュー完了
- オーナー判断 D1(建設業振り切りの程度)が確定
- 既存ベンチ(rag-100q main/fresh)が 100% を維持できることを確認

### 1.2 タスク詳細

#### 1.2.1 既存33-50法令の収録範囲確認(1日)

- 各 LawArticle ファイル(56個)の収録条文を一覧化
- 条文番号の欠番チェック
- 重要条文(PIN対象55トピック関連)の漏れ確認
- 出力: docs/chatbot-quality-research-2026-05-23/appendix-corpus-coverage.md(本研究後の作業ドキュメント、本Phase完了時に出力)

#### 1.2.2 不足省令・補強の収録(1-2日)

- 03-data-source-inventory.md セクション2で特定した補強候補:
  - 安衛則「足場等」第518〜575条群の未収録条文(あれば)
  - 安衛則「掘削の作業」第355〜367条
  - 安衛則「型枠支保工」第237〜247条
  - 建災防規程の追加条文(現状8条 → 全条文)
  - 労契法 第5条(安全配慮義務)の PIN 追加
- e-Gov 法令API から取得(オプション、月次バッチ実装は Phase 4 と並列)

#### 1.2.3 構造化条文DBの完成(1日)

- 04-hallucination-prevention-design.md セクション6.1で定義した article-registry.ts を実装
- 全 LawArticle に paragraphs + items の階層情報を整備(主要条文から優先)
- itemNumberMap の完備
- 漢数字→アラビア数字正規化を取込み時にも適用

### 1.3 完了基準(定量メトリクス)

- 既存 rag-100q main/fresh で recall@5 = 100% を維持
- 新規ベンチ「ペルソナテスト失敗11件」で recall@5 >= 60%(主条文ヒット率)
- 構造化条文DB のカバレッジ: PIN 対象55トピック関連条文の 100%

### 1.4 リスク

- リスク1: 新規条文追加で既存ベンチが degrade(リランクが効かなくなる)
  - 対策: 各追加後に test を回し、failure があれば即座にロールバック
- リスク2: 漢数字正規化で既存パターンマッチが破綻
  - 対策: 取込み時のみ適用、UI/API には旧表記を維持

### 1.5 オーナー確認必須事項

- D1: 建設業振り切りの程度(33→50→「+建設業重視で60法令」のどこまで)
- 安衛則の足場・掘削の収録範囲を「主要条文のみ」とするか「全条文」とするか

## 2. Phase 2: ハルシネーション絶滅3層実装(5-7日)

### 2.1 着手前提条件

- Phase 1 完了(構造化条文DBが整備されていること)
- ベンチ拡張(Citation Accuracy@1, Hallucination Rate)が設計済み

### 2.2 タスク詳細

#### 2.2.1 Layer 1: Pre-generation 同梱(1日)

- 04-hallucination-prevention-design.md セクション2の実装
- buildContextFromArticles の改修(出力可能な条文番号リストを構造化提示)
- buildUserPrompt の改修
- SYSTEM_PROMPT 更新(「リストにない条文番号の引用禁止」明記)

#### 2.2.2 Layer 2: Post-generation 照合(2-3日)

- 04-hallucination-prevention-design.md セクション3の実装
- chatbot-enrichment.ts に validateArticleReferences 関数追加
- 法令略称 + 条文番号 + 枝番 + 項 + 号 のレベルで照合
- 自動修正提案(itemNumberMap 逆引き)+ 不一致時の警告追記
- route.ts に Layer 2 統合(信頼度降格ロジック含む)

#### 2.2.3 ベンチ拡張(1日)

- Citation Accuracy@1 メトリクス実装(rag-metrics.test.ts に追加)
- Hallucination Rate メトリクス実装
- 「ハルシネーション誘発質問セット」30問追加(架空条文を促す曖昧質問)
- npm run eval:chatbot に新メトリクス出力を統合

#### 2.2.4 統合テスト + 調整(1-2日)

- 既存 rag-100q main/fresh で Citation Accuracy@1 = 100% を確認
- 新規誘発セット30問で Hallucination Rate < 1% を確認
- False Positive(正常応答を誤検出)率 < 5% を維持

### 2.3 完了基準(定量メトリクス)

- Citation Accuracy@1: >= 99.5%
- Hallucination Rate: < 1%
- Out-of-Scope Detection Rate: >= 95%
- 既存 Recall@5 100% を維持

### 2.4 リスク

- リスク1: Gemini プロンプトが長くなり応答時間が悪化
  - 対策: 上位5条文に絞る、各 200 文字以内に圧縮
- リスク2: Layer 2 で誤検知が増えて警告だらけになる
  - 対策: 漸進的に厳格化(初期は警告のみ、安定後に自動破棄)
- リスク3: Gemini Flash の能力では構造化制約に従いきれない
  - 対策: 必要に応じて Gemini Pro 切替検討(オーナー判断 D4)

### 2.5 オーナー確認必須事項

- D4: Gemini Flash → Pro 切替の是非(品質 vs コスト)
- D6: Pre-gen 制約に違反した応答の扱い(警告のみ vs 自動破棄)

## 3. Phase 3: 「最も近い条文」Fallback 実装(3-5日)

### 3.1 着手前提条件

- Phase 1 完了
- Phase 2 完了が望ましい(Pre-gen 制約と Fallback ロジックの整合のため)

### 3.2 タスク詳細

#### 3.2.1 fallback-law-suggestions.ts 整備(1-2日)

- 05-fallback-logic-design.md セクション3.3の実装
- TOPIC_TO_LAW_CATEGORY マッピング初期収録(50件)
- ペルソナテスト失敗11件の関連法令を全件カバー

#### 3.2.2 route.ts の Fallback 分岐改修(0.5日)

- normalizedScore による 3 分岐(Direct/Adjacent/Out-of-Scope)
- searchPartialMatches 呼出
- 応答スタイルの分岐生成

#### 3.2.3 UI 改修(1-2日)

- ChatbotBody.tsx で信頼度・分岐表示
- 「直接該当」「関連条項」「データ範囲外」の視覚区別
- dig deeper の差別化

#### 3.2.4 テスト追加(0.5日)

- ペルソナテスト失敗11件をテストケース化
- 期待結果(Direct/Adjacent/Out)のラベル付与
- 閾値最適化(grid search)

### 3.3 完了基準(定量メトリクス)

- Fallback Quality(完全一致なし時に妥当な代替提示): >= 80%
- False Adjacent: < 5%
- False Direct: < 2%
- ペルソナテスト失敗11件のうち、5-7件が △ → ◯ に改善

### 3.4 リスク

- リスク1: Adjacent Hit の閾値が経験的で、調整に時間がかかる
  - 対策: 既存ベンチへの影響を計測しながら漸進的に調整
- リスク2: 関連法令誘導が「本ツールの価値」を希薄化
  - 対策: 関連法令誘導は補助、主応答は「本ツールでわかること」優先

### 3.5 オーナー確認必須事項

- なし(設計範囲内で判断可能)

## 4. Phase 4: 通達・告示URL添付(3-5日)

### 4.1 着手前提条件

- Phase 1 と並列実装可(構造化条文DBの主要部分があれば着手可)
- オーナー判断 D2(通達URL表示形式)が確定

### 4.2 タスク詳細

#### 4.2.1 article-notice-map.ts 整備(2日)

- 06-notice-attachment-design.md セクション3の実装
- PIN対象55トピック関連の条文-通達マッピング(初期200条文 × 平均2通達 = 400マッピング)
- 半自動マッピング(category 一致)を補助

#### 4.2.2 応答フロー改修(0.5日)

- searchRelevantNotices の二段階呼出(条文紐付き + キーワードベース)
- 重複除外 + bindingLevel 順 + 最大5件
- 応答末尾の通達セクション拡張

#### 4.2.3 UI コンポーネント(1日)

- ChatbotNoticeCard コンポーネント新規
- ChatbotLeafletCard コンポーネント新規
- 折りたたみ/インライン切替(オーナー判断 D2に従う)

#### 4.2.4 URL ヘルスチェック(0.5日)

- scripts/check-notice-urls.mjs 実装
- Vercel Cron 統合(月次)
- 結果出力先設計

#### 4.2.5 テスト追加(0.5日)

- Notice Citation Rate メトリクス実装
- Article-Notice Mapping Coverage メトリクス実装

### 4.3 完了基準(定量メトリクス)

- Notice Citation Rate: >= 95%(noticeNumber + title が実在通達と一致)
- Article-Notice Mapping Coverage: PIN 対象55トピック関連の 80%+
- URL Health Rate: 月次ヘルスチェックで 95%+ が 200 OK

### 4.4 リスク

- リスク1: マッピング初期整備が手作業で時間超過
  - 対策: PIN対象55トピックの55条文に限定して整備、残りは Phase 5 以降に持ち越し
- リスク2: 厚労省 URL の不安定性
  - 対策: 月次ヘルスチェック + Internet Archive スナップショット併用(必要なら)
- リスク3: 著作権上のリスク(通達本文要約は禁止)
  - 対策: 通達は構造化メタ + 直リンクのみ。 本文転載・要約しない

### 4.5 オーナー確認必須事項

- D2: 通達URL表示形式(インライン/折りたたみ/別ページ)
- D3: e-Gov 法令API v2 の定期取込み実装の是非
- D5: 通達収録拡大と「個人運営研究プロジェクト」体裁の整合(本Phaseで通達追加100件以上なら確認推奨)

## 5. 全体結合テスト(各 Phase 完了時 + 全体完了時)

### 5.1 各 Phase 完了時

- 既存ベンチ(rag-100q main/fresh)の Recall@5 100% を維持
- Phase 2 完了時: Citation Accuracy@1 >= 99.5%、Hallucination Rate < 1%
- Phase 3 完了時: Fallback Quality >= 80%
- Phase 4 完了時: Notice Citation Rate >= 95%

### 5.2 全体完了時

- ペルソナテスト50困りごとを再評価
  - 33法令枠外7件のうち、5件以上を △ → ◯
  - 実務対応フロー型4件のうち、2件以上を △ → ◯
- E2E テスト(playwright)で /chatbot の golden path を全件 PASS
- npm run build + npm run lint で 0 エラー

## 6. オーナー確認必須事項 全件

詳細は 08-owner-decisions.md。 ロードマップに直結する項目を再掲:

- D1: 建設業振り切りの程度(Phase 1)
- D2: 通達URL表示形式(Phase 4)
- D3: e-Gov 法令API 定期取込み実装の是非(Phase 1+4)
- D4: Gemini Flash → Pro 切替(Phase 2)
- D5: 通達収録拡大と研究プロジェクト体裁の整合(Phase 4)
- D6: Pre-gen 制約違反時のフォールバック動作(Phase 2)
- D7: サブスク課金との結合(全体方針)

## 7. 推奨着手順序と理由

- Phase 1 を先行(必須前提)
- Phase 4 を Phase 1 と並列着手(独立性が高い、UIの早期改善でユーザー価値即時提供)
- Phase 2 を Phase 1 完了後すぐ着手(構造化DBに依存)
- Phase 3 は Phase 2 完了後着手(Pre-gen 制約との整合のため)

タイムライン例(1人):
- Day 1-4: Phase 1
- Day 1-5(並列): Phase 4(条文-通達マッピング以外を先行、マッピングは Phase 1 完了後)
- Day 5-11: Phase 2
- Day 12-16: Phase 3
- Day 17-21: 全体結合テスト + UI 微調整 + ベンチ確認

## 8. ベンチ拡張サマリ(参考)

各 Phase で追加するメトリクス:

- Phase 1: Coverage(各法令の収録条文数)、Pinned Topic Hit Rate
- Phase 2: Citation Accuracy@1、Hallucination Rate、Out-of-Scope Detection Rate
- Phase 3: Fallback Quality、False Adjacent、False Direct
- Phase 4: Notice Citation Rate、Article-Notice Mapping Coverage、URL Health Rate

これらを docs/rag-metrics-latest.json に統合し、各 Phase 完了時に commit。
