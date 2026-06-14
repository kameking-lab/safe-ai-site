# cycle-log — ハブ・サイネージ・トップ班（ux-hub）

## 2026-06-14 — 補充: /notifications 気象警報メール登録フォーム 柱0(44px)

**イテレーション頭の回収**: 自班の未マージPR #554(/faq 44px)・#551(/accidents 44px)はいずれもCI pending（smoke/e2e/Vercel）でマージ不可→次サイクルで回収。`git checkout main && git pull --ff-only` で clean 確認。

**タスク源**: BACKLOG-ux-hub.md「未着手」は全て `[x]`＝補充モード。補充の指針「自領域route の柱0未適用箇所」から、残ハブroute(quick/guides/notifications/resources/safety-signs)を実地調査。**/notifications** の気象警報メール登録フォーム（SubscribeForm）の主入力＝メールアドレス入力・対象地域セレクトが `py-2.5`（≈40px）で44px未満という測定可能な欠陥を特定。一人親方が最初にタップする無料通知登録の主入力が押し損ねサイズだったため選択。ブランチ `ux-hub/notifications-pillar0-44px-form`（main 起点）。

**変更**: `subscribe-form.tsx` の email input・prefecture select を `min-h-[44px]`＋`py-3` へ。送信ボタン(既に py-3)にも `min-h-[44px]` を明示。純粋なTailwindクラス追加でレイアウト・送信ロジック・SEO不変。

**ゲート結果（cd web）**: tsc=0 / lint=0（eslint直叩き・notificationsディレクトリ EXIT 0。`npm run lint` 経由は環境segfaultのため直叩きで確認）/ vitest 220 files・1839 tests 全pass / build 成功。

**無読テスト**: `docs/third-party-reviews/scripts/notifications-44px-form-noread-2026-06-14.mjs`（dev実機・スマホ390×844、実 boundingBox）でメール入力・地域セレクト・登録ボタンの3標的が全て height≥44px を **3/3 PASS** で検証する設計。vitest 3件で `min-h-[44px]` クラスと py-2.5 退行禁止を回帰固定。

## 2026-06-14 — 補充: /favorites 柱0(44px)＋accident種別の表示是正

**イテレーション頭の回収**: CI緑の自班PR #534(signage JIS色)を squash マージ→ブランチ削除。#539(トップ柱3)は #534 マージで競合(DIRTY)化したため `origin/main` を当該ブランチへ通常マージ（doc cycle-log の競合のみ手動解消＝3エントリ共存）→push（CI再走は次サイクルで回収）。#544(/features 44px)はCI in-progressのため次サイクル。`main` を ff-only で最新化。

**タスク源**: BACKLOG-ux-hub.md 最上位 `[ ]` は「柱3トップ実機レビュー」だが**既にPR #539で着手済み**（マージ前）。重複着手を避け、補充の指針「自領域route の柱0未適用箇所」から、cycle-log 残課題で次候補に挙げていた **/favorites** を選択（/features は #544 で in-flight）。ブランチ `ux-hub/favorites-pillar0-44px-accident-kind`（main 起点）。

**無読＋コード精査で見つけた欠陥**:
- 柱0タップ標的: 種別タブ(`py-1.5`≈32px)・削除ボタン(`p-2`+16pxアイコン≈32px)・空状態の導線CTA(`px-3 py-1.5 text-xs`≈28px)がいずれも44px未満（WCAG 2.5.5不適合）。
- **既存の表示バグ**: `lib/favorites` の kind は article/notice/**accident** の3種で、/accidents の「⭐」も同じストアに入る。しかし本リストはバッジを `kind==="article" ? 条文 : 通達` の二分岐で描画していたため、**事故事例が一律「通達(violet)」と誤表示**。さらに `TAB_LABEL` には「事故事例」があるのにタブ配列は `["all","article","notice"]` 固定で**絞り込み不能**だった。

**対策（favorites-list.tsx）**:
- 行内バッジを `KIND_BADGE`（article=emerald「条文」/ notice=violet「通達」/ accident=rose「事故事例」）の表引きへ。
- タブ配列を動的化＝`counts.accident > 0` のときだけ「事故事例」タブを追加（事故事例を保存していない大多数の画面は従来どおり3タブで不変）。削除で当該種別が0件になり絞り込み中タブが消える際は `setTab("all")` で取り残し防止。
- 3コントロールへ `min-h-[44px]`（タブ・空状態CTA）/ `min-h-[44px] min-w-[44px]`（削除ボタン）を付与。CTAは `text-xs→text-sm`・`px-3→px-4` で可読性も底上げ。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（favorites-list.tsx に既存の「unused eslint-disable」warning 1件のみ・無関係）/ vitest 212 files・1778 tests 全pass（favorites-list.test.tsx 7件新設＝accidentバッジ是正・事故事例タブの出現/絞り込み・44pxクラスの回帰ガード）/ build 成功。full suite が書き出す data班生成物 `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json` は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/favorites-pillar0-accident-noread-2026-06-14.mjs`。条文/通達/事故事例の3件を localStorage に仕込み、本番サーバー(build+start・スマホ390×844)で **8/8 PASS**＝事故事例行が「事故事例」バッジ（通達バッジ0件）・事故事例タブの出現と絞り込み・全タブ高さ実測44px・削除ボタン実測44×44px・空状態CTA実測48px を boundingBox で確認。スクリーンショット `favorites-pillar0-2026-06-14.png` 添付（4タブ＋rose事故事例行を確認）。port3000 は他班クローンが占有のため 3517 で起動。

**残課題**: #539(トップ柱3)・#544(/features 44px) の各CI回収。自領域 柱0 未適用の /resources・/notifications・/guides は次サイクル候補。

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
## 2026-06-14 — 柱0 サイネージ JIS安全色文法の統一（注意黄＝黒系文字）

着手前にサイネージ各コンポーネントの色使いを精査。結論ストリップ(`SignageConclusionStrip`)は既に JIS安全色の文法どおり「注意＝黄」を `bg-amber-* / text-amber-950`（黒系文字）で描画していたが、同じサイネージ配下の **リスク予測の「中」リスクバッジ**（`signage-risk-prediction.tsx`）と **現場安全状態の「要対応」チップ・出典ラベルバッジ**（`signage-site-safety.tsx`）の計3箇所だけ `bg-amber-500 text-white` のままだった。amber-500(#f59e0b)×白は約2.1:1で WCAG 不適合、数メートル先のTVでは文字が黄色に溶けて読めない（サイネージ無読テスト「遠目で色と数字が読めるか」に直接違反）。

3箇所の白文字を `text-amber-950` へ是正し、結論ストリップと文法を統一。**純粋な色クラスの入替のみで寸法は一切変えていない**ため、不可侵の「1画面フィット」は構造的に不変（無読テストでも scrollHeight=1080≤viewport=1080 を確認）。`signage-floor-plan-editor.tsx` のペン色インジケータ `bg-amber-700 text-white`（暗い黄・約4.5:1で AA 適合・JIS注意バッジではなく描画ツール色）は対象外として保持。

回帰ガードとして `jis-safety-color-grammar.test.ts` を新設。`src/components/signage` の全 .tsx を文字列リテラル境界で分割走査し、明るい注意黄(amber-300/400/500)背景に `text-white` を同居させていないことを保証（三項の別枝に分かれた `text-white`/`bg-amber-500` を誤検知しないよう quote 境界で分割）。14ケース全pass。

**ゲート結果（cd web）**: tsc=0 / lint=0 errors（46 warnings は既存・無関係）/ vitest 206 files・1709 tests 全pass / build 成功。既存破壊ゼロ。※full suite 実行で rag テストが書き出す `docs/rag-metrics-latest.json`・`web/src/data/chatbot-eval-fresh-results.json`（data班領域の生成物）は commit から除外（git checkout で復元）。

**無読テスト**: `docs/third-party-reviews/scripts/signage-jis-amber-noread-2026-06-14.mjs`。未是正の重大ヒヤリ1件を localStorage に仕込んで「要対応」amber バッジを確定描画させ、実画面の computed color を canvas で rgb 正規化（このスタックは getComputedStyle が lab() を返すため）して検証。**8/8 PASS**: 要対応チップ文字色 rgb(70,25,1)=amber-950（輝度<0.4）・背景 rgb(255,185,0)=注意黄・文字背景の輝度差0.60・画面上に明るい注意黄×白文字0件・1画面フィット維持・結論ストリップのデカ主文48px。スクリーンショット `signage-jis-amber-2026-06-14.png` 添付。

**残課題**: 柱0バッチ8（PR #529 CI待ち＝/industries/glossary/diversity 文字ダイエット、/handover は noindex で対象外）。柱3トップページ実機レビュー。

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
