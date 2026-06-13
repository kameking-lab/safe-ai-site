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

**残課題**: 柱0バッチ8/9（ハブ/ナビ12ページ）、サイネージ柱0（大型化・JIS安全色統一）、C-6 court-cases ページネーション。（PR #517 マージ済み）

## 2026-06-14 — 柱C-6 /court-cases ページネーション

着手前にハブ/ナビ系（柱0バッチ8）を一通り現状確認したところ、/quick・/faq・/resources・/notifications・/safety-signs・/guides は既にアイコンファースト＋44pxタイルが概ね達成済みで、無理に大改修すると水増し・既存破壊のリスクが高いと判断。代わりに、具体的かつ測定可能な欠陥が残る **柱C-6（/court-cases のページネーション）** を選択した。signage 柱0 は直前にマージした PR #517（SignageFeaturedGoods 削除）と同じ領域で衝突しうるため次サイクルへ。

`court-cases-browser.tsx` は `filtered` 88件を一度に全描画しており、スマホ全高が約25,974pxまで伸びていた。`PAGE_SIZE=24` を導入し `filtered.slice(0, visibleCount)` で初期24件のみ表示、「もっと見る（残りN件）」の min-h 48px フル幅ボタンで PAGE_SIZE 単位の追加読込にした。絞り込み条件が変わったら先頭から表示し直す処理は、React 推奨の「レンダー中に派生状態を調整」パターン（前回フィルタキーとの比較）で実装し、`react-hooks/set-state-in-effect` lint を回避。件数表示は「N件中M件を表示（全88件）」に更新。分野アイコングリッドは既に min-h-[44px] 達成済みのため変更不要。

結果: 初期スマホ全高 25,974px → **9,939px**（約62%減）。tsc=0／lint=0／vitest=1659 全pass（court-cases-browser.test.tsx を3ケース追加）／build成功。無読テスト（`docs/third-party-reviews/scripts/court-cases-pagination-noread-2026-06-14.mjs`）はローカル dev(3001) に対し **8/8 PASS**。既存の `accidents-courts-noread-2026-06-11.mjs` は件数表示の文言変更に追従（絞込総数を「件中」手前から読むよう更新）。

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

**残課題**: サイネージ柱0（大型化・JIS安全色統一 → PR #534 で着手）、トップページ柱3実機レビュー。

## 2026-06-14 — 柱0補充 /features 機能一覧ハブの44pxタップ標的化

**タスク源**: BACKLOG-ux-hub.md の未着手は柱3トップ実機レビュー1件のみだったが、これは自分の在飛 PR #539（トップのペルソナバンド）と同じファイル領域で衝突するため、補充指針に従い独立した自領域route /features を柱0で点検した。ブランチ `ux-hub/features-pillar0-44px-targets`（main 起点・PR #529/#534 マージ反映後）。

着手前に冒頭の `git checkout main && git pull --ff-only` で PR #529（batch8）をmainへ取り込み、衝突していた PR #534（signage）は origin/main を当該ブランチへ通常マージしてpush（CI再走→次サイクル回収）。

`/features` を無読テストで点検したところ、カード自体はスクリーンショット付きでビジュアルファースト達成済みだったが、**指で押す要素がほぼ全て44px未満**だった: カテゴリフィルタチップ・クイックリンク（5分ツアー等）・各カードの主CTA「機能を試す →」/副CTA「詳しく見る」・下部CTAが `py-2 text-sm`（実測≈36px）。一覧の主アクション（機能を試す）が押し損ねサイズなのは初訪の一人親方（スマホ）に直接の摩擦。

全タップ要素に `min-h-[44px]` を付与（フィルタ/カテゴリ/CTAは `inline-flex items-center justify-center` で縦中央寄せも追加）。**純粋なクラス追加でグリッド・余白・寸法は不変**（min-h は中身が44px超なら無効化＝既存破壊なし）。

**テスト**: `features-index-client.test.tsx` を新設（5ケース）。`LanguageProvider` でラップして描画し、フィルタ/主副CTA/クイックリンクの className に `min-h-[44px]` を保証＋カード件数がカタログと一致することを確認。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 210 files・1732 tests 全pass / build 成功。data班生成物（rag-metrics-latest.json・chatbot-eval-fresh-results.json）はfull suite走行で書き換わるため commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/features-44px-targets-noread-2026-06-14.mjs` を **8/8 PASS**（dev実機・スマホ390×844）。実 boundingBox でフィルタ「すべて」/先頭カテゴリ/主CTA/副CTA/クイックリンク/下部CTAが全て height≥44px・カードがスクリーンショット画像を伴う（ビジュアルファースト）ことを確認。
