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

## 2026-06-14 — 柱3レビュー トップページ ペルソナ最短到達（一人親方）

**イテレーション頭の回収**: CI緑の自班PR #529（柱0バッチ8）は main と doc 競合(DIRTY)だったため `origin/main` を当該ブランチへ通常マージしてdoc競合のみ解消→push（CI再走は次サイクルで回収）。#534（signage JIS色）はCI in-progressのため次サイクル回収。`main` を ff-only で最新化後、本タスクに着手。

**タスク源**: BACKLOG-ux-hub.md「柱3レビュー」。ブランチ `ux-hub/top-pillar3-persona-review`（main 起点）。バッチ8/signage は #529/#534 で既出荷済み（main未マージ）のため、未着手で残るこのトップ実機レビューを選択。

**実機レビュー（スマホ390×844・dev実機）**: トップを上から無読でスキャン。
- 最上部「現場ですぐ使う」=0スクロールで主要機能10タイル(min-h 78px・3列・アイコンファースト)。一人親方が必要とする KY用紙/AIに質問/事故事例DB/法改正 が全て揃う。→ 機能への最短到達は既に良好。
- Hero(h1/SEO/3CTA/統計) と 3本柱(本日の安全トピック=事故/警報/法改正) も視認性良好。全高7,551pxでスクロール地獄なし。
- **唯一の測定可能な欠陥**: ペルソナバンド「あなたの立場から始める」がモバイル `grid-cols-1`。先頭=建設業カードがフル高さ(約180px)を占め、その真下に一人親方カードが隠れる。「自分の立場」エントリ(/for/solo)に到達するのに建設業カードを丸ごとスクロールする必要があった＝当の一人親方ペルソナにとって最遠。

**対策（home-persona-entry.tsx）**: バンドを `grid-cols-2 lg:grid-cols-4`(モバイル2列)へ。建設業は読み順1番目=左上に温存（documented priority 不変）しつつ、一人親方を同一行の右上＝初手で視界に入る位置へ引き上げ。狭い2列では説明文 `<p>` を `hidden sm:block` で畳み、アイコン+役割名+タグ(機能の一目signal)で3秒スキャン可能に。sm以上は従来通り説明文表示・lgは4列1行。card に `min-h-[44px]`・`p-3 sm:p-4`。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 205 files・1702 tests 全pass（home-persona-entry.test.tsx に2列化＋DOM順の回帰ガード2件追加）/ build 成功。※`npm run lint` 初回はWindowsのeslintワーカーがsegfaultでクラッシュ→`npx eslint .` 再実行で 0 errors（環境起因・コード無関係、前サイクルと同症状）。

**無読テスト**: `docs/third-party-reviews/scripts/top-persona-shortest-reach-noread-2026-06-14.mjs` を **9/9 PASS**（dev実機・スマホ390×844）。建設業=左/一人親方=右の同一行配置(上端ズレ<80px)・主要機能タイル44px・一人親方→/for/solo 動線を実画面 boundingBox で確認。sm(768)/lg(1280) もスクリーンショットで非破壊を確認。

**残課題**: 柱0バッチ8 残focus(/glossary 等は #529 で出荷済み)・signage 柱0(#534 出荷済み)の各CI回収。自領域 柱0 未適用の /features・/favorites は次サイクル候補。
