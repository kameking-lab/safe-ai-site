# cycle-log — ハブ・サイネージ・トップ班（ux-hub）

## 2026-06-13 — 決裁C: サイネージのアフィリエイト安全グッズを「出さない」

**タスク源**: BACKLOG-ux-hub.md 決裁C（自走可）。ブランチ `ux-hub/decision-c-remove-signage-goods`。

着手時、トップ候補だった柱0バッチ8（ハブ/ナビ12ページ一括）は SEO テキストを多く含む異種ページ群で、1 PR で安全に「文字ダイエット」しきるには既存破壊リスクが高いと判断。代わりに、決裁が確定していて完了条件が明確・参照ゼロが Grep で証明可能・自領域(signage/**)完結・回帰リスクゼロの決裁C を先に出荷した（topmost は判断で後回し、batch8/signage柱0 は次サイクルへ）。

**実施内容**:
- 全域 Grep で `SignageFeaturedGoods` / `FeaturedGoods` の参照を確認 → 本体定義以外の参照ゼロ（本番・テスト・ページ import すべて無し）。Amazon/楽天アフィリンクを描画する未配線コンポーネントだった。
- `web/src/components/signage/signage-featured-goods.tsx` を `git rm` で削除。
- 共有部品 `goods-icons`（`GoodsCategoryIcon`）は `safety-goods-panel.tsx` も使用するため**保持**。
- data層 `getSignageFeaturedSafetyGoods`（`src/data/mock/safety-goods.ts`）は data班凍結領域のため**未触**。削除後は未使用 export として残るが、build/lint に影響なし。data班での整理対象として BACKLOG に明記。
- `scripts/audit/internal-link-graph.json` に削除ファイルへのエッジ参照(1件)が残るが、これは生成物で TS/テストから import されておらず（consumer なし）、dangling edge target は無害。監査スクリプト再生成時に解消されるため手編集せず残置。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（45 warnings は既存・無関係）/ vitest 199 files・1656 tests 全pass / build 成功。既存破壊ゼロ。

**無読テスト**: 本タスクは未配線デッドコードの削除であり、描画される UI 変更なし（サイネージ各画面の見た目は不変）。検証は「参照ゼロの Grep 証明 + 全ゲート緑」で代替。サイネージ1画面フィットも不変。

**残課題**: 柱0バッチ8/9（ハブ/ナビ12ページ）、サイネージ柱0（大型化・JIS安全色統一）、C-6 court-cases ページネーション。

## 2026-06-14 — 柱0バッチ8/9 ハブ/ナビ系 文字ダイエット＋44pxタップ標的

**タスク源**: BACKLOG-ux-hub.md 最上位「柱0バッチ8/9」。ブランチ `ux-hub/pillar0-batch8-text-diet`（main 起点）。先行イテレーションのC-6（PR #523）はCIがpending（未green）のため未マージ、次イテレーションで回収。

バッチ8の残focus（無読テストで点検した4ページ）に対し、文字ダイエットと44pxタップ標的化を実施。

- **/industries**: ヘッダーが3段落構成（10業種をインライン列挙する段落＋「ロングテール」等クローラ向けキーワード段落）で、業種カードに到達する前に文章の壁になっていた。1文ガイド「あなたの業種を選ぶと、重点課題・関連法令・典型事故・KY・特別教育・事故レポート・年次計画への動線がまとまっています。」へ圧縮。業種名はすぐ下のカードと重複、SEOキーワードは metadata.description と各カードの keywords に保持されるため非破壊。
- **/glossary**: 五十音インデックスボタン（約32px）を `min-h-[44px] min-w-[44px] inline-flex items-center justify-center` で44×44pxのタップ標的に。
- **/diversity**: 導入アラート文を圧縮（重複表現を削除）しつつ「判断は一次資料・専門家にご確認ください」の安全上の注意書きは保持。目次ジャンプチップに `min-h-[44px]`。
- **/handover**: noindex＋key gate（`HANDOVER_GATE_KEY` 不一致で notFound）の社内引き継ぎ文書。初訪の一人親方ペルソナが到達しない非公開ページのため、本バッチの persona-facing 文字ダイエット対象から明示的に除外（doc整合性の既存破壊回避）。

**テスト**: vitest 10ケース追加（industries 3・glossary 3・diversity 4）。diversity/glossary は PageHeader→RubyText / EasyJapanese トグルが context を要求するため、Language/Furigana/EasyJapanese Provider でラップして描画。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 203 files・1680 tests 全pass / build 成功（初回はWindowsのTSワーカーがsegfault=3221225477でクラッシュ→再実行で成功、コード起因でなく環境起因）。

**無読テスト**: `docs/third-party-reviews/scripts/pillar0-batch8-text-diet-noread-2026-06-14.mjs` を8/8 PASS（dev実機・スマホ390×844）。3画面ともスクリーンショットで「どこに何があるか／次にやること（業種を選ぶ・五十音で引く・対象層を選ぶ）」が3秒で読めることを確認。

**残課題**: サイネージ柱0（大型化・JIS安全色統一）、C-6 court-cases ページネーション（PR #523 CI回収）、トップページ柱3実機レビュー。
