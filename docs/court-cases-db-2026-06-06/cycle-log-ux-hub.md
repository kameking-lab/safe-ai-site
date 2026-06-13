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

**残課題**: 柱0バッチ8 の残focusは /glossary・/industries・/diversity・/handover の文字ダイエット。signage 柱0（大型化・JIS安全色統一）。

## 2026-06-14 — 柱0 サイネージ JIS安全色文法の統一（注意黄＝黒系文字）

着手前にサイネージ各コンポーネントの色使いを精査。結論ストリップ(`SignageConclusionStrip`)は既に JIS安全色の文法どおり「注意＝黄」を `bg-amber-* / text-amber-950`（黒系文字）で描画していたが、同じサイネージ配下の **リスク予測の「中」リスクバッジ**（`signage-risk-prediction.tsx`）と **現場安全状態の「要対応」チップ・出典ラベルバッジ**（`signage-site-safety.tsx`）の計3箇所だけ `bg-amber-500 text-white` のままだった。amber-500(#f59e0b)×白は約2.1:1で WCAG 不適合、数メートル先のTVでは文字が黄色に溶けて読めない（サイネージ無読テスト「遠目で色と数字が読めるか」に直接違反）。

3箇所の白文字を `text-amber-950` へ是正し、結論ストリップと文法を統一。**純粋な色クラスの入替のみで寸法は一切変えていない**ため、不可侵の「1画面フィット」は構造的に不変（無読テストでも scrollHeight=1080≤viewport=1080 を確認）。`signage-floor-plan-editor.tsx` のペン色インジケータ `bg-amber-700 text-white`（暗い黄・約4.5:1で AA 適合・JIS注意バッジではなく描画ツール色）は対象外として保持。

回帰ガードとして `jis-safety-color-grammar.test.ts` を新設。`src/components/signage` の全 .tsx を文字列リテラル境界で分割走査し、明るい注意黄(amber-300/400/500)背景に `text-white` を同居させていないことを保証（三項の別枝に分かれた `text-white`/`bg-amber-500` を誤検知しないよう quote 境界で分割）。14ケース全pass。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 206 files・1709 tests 全pass / build 成功。既存破壊ゼロ。※full suite 実行で rag テストが書き出す `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（data班領域の生成物）は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/signage-jis-amber-noread-2026-06-14.mjs`。未是正の重大ヒヤリ1件を localStorage に仕込んで「要対応」amber バッジを確定描画させ、実画面の computed color を canvas で rgb 正規化（このスタックは getComputedStyle が lab() を返すため）して検証。**8/8 PASS**: 要対応チップ文字色 rgb(70,25,1)=amber-950（輝度<0.4）・背景 rgb(255,185,0)=注意黄・文字背景の輝度差0.60・画面上に明るい注意黄×白文字0件・1画面フィット維持・結論ストリップのデカ主文48px。スクリーンショット `signage-jis-amber-2026-06-14.png` 添付。

**残課題**: 柱0バッチ8（PR #529 CI待ち＝/industries/glossary/diversity 文字ダイエット、/handover は noindex で対象外）。柱3トップページ実機レビュー。
