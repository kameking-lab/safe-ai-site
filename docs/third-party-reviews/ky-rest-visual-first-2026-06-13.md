# 柱0バッチ3/9 — KY残り画面 ビジュアルファースト（2026-06-13）

対象: `/ky`（→`/ky/paper`恒久リダイレクト）・`/ky/list`・`/ky-examples`・`/ky/workers`
（`/ky/paper`本体・`/ky/morning`は既に柱0適用済。本バッチは残り画面の是正）

## 背景（無読スイープ 2026-06-11 §A・§D の指摘）
- `/ky`（=`/ky/paper`）: h1=2 を実測（「柱0済・h1=2のみ残」と申し送り）。
- `/ky/list`・`/ky-examples`: スクリーニングFAIL（デカ視覚要素＝結論カードなし・最大font22px）。
- `/ky/workers`: スイープFAIL一覧外だが本バッチ対象。登録人数バッジは小さく「いまの状態」が3秒で読めない。

## 是正内容

### (1) `/ky/paper` 多重h1(2)是正 ＝ 印刷シートh1の降格
`ky-print-sheet.tsx` は A4印刷用シート（`hidden print:block` と印刷プレビューオーバーレイの2箇所で描画）で、
画面ヘッダーh1（`ky-paper-view.tsx:609`「作業前 危険予知活動表（KY）」）と**同一DOMに同文のh1が併存**していた。
**A4正式書式は不可侵**のため、見た目（`text-[14pt] font-bold tracking-wide`）を一切変えず非見出し要素（`p`）へ降格。
画面ヘッダーh1をページ唯一のh1にした。安全日誌バッチ1/9（meeting-print-sheet）と同じ作法。

### (2) `/ky/list` 結論カード新設（保存件数）
画面最上部に件数結論カード（ConclusionCard再利用）。
- 保存ゼロ: 青「保存KYなし」＋「新規KY作成」44pxボタンへ誘導。
- 絞り込みで該当ゼロ: 無彩「該当なし（保存N件中0件）」＝条件変更を促す（偽の空状態にしない）。
- 保存あり: 青デカ数字「N件 保存KY」。絞り込み中は「全N件中」を補足。
色文法: 件数は安全状態ではないため緑を使わず info(青)。

### (3) `/ky-examples` 結論カード新設（該当事例件数）＋チップ44px化
- 該当あり: 青デカ数字「N件 該当事例」（最大150件）。
- 該当ゼロ: 黄「該当なし」＝絞り込み変更を促す（旧・末尾の小さいamber注記は結論カードへ統合し削除）。
- 業種・作業種別チップを `min-h-[32px]`→`min-h-[44px]`（デカボタン・タップ44px）。

### (4) `/ky/workers` 結論カード新設（登録人数）
- 登録ゼロ: 青「登録なし」＝登録フォームへ誘導。
- 登録あり: 青デカ数字「N名 登録済み」＋「KY用紙の参加者はチェックで選べる」1行。
既存の「登録済み作業員 N名」小バッジは一覧見出しに残置（重複ではなく一覧の内訳ラベル）。

## 無読チェック（実測）
スクリプト: `docs/third-party-reviews/scripts/ky-rest-visual-first-2026-06-13.mjs`
（iPhone12相当 390×844・`serviceWorkers:"block"`・prod server `PORT=3100 npm run start`）

```
PASS  /ky→/ky/paper にリダイレクト
PASS  /ky/paper の h1 が DOM全体で 1個（印刷シートh1是正）  — dom=1 visible=1
PASS  /ky/list 結論カードあり  — 保存KYなし / 新規KY作成 / まずは新規KYを作成・保存しましょう
PASS  /ky/list h1=1
PASS  /ky-examples 結論カードあり（該当事例N件）  — 150件 / 該当事例
PASS  /ky-examples h1=1
PASS  /ky/workers 結論カードあり  — 登録なし / 作業員を登録すると…
PASS  /ky/workers h1=1
8/8 PASS
```

## ゲート
tsc 0 / lint 0 errors（警告45は既存のみ）/ vitest 191ファイル1593 pass / build 成功。
A4印刷帳票は見た目不変（h1→p は視覚無変化・装飾は print 範囲外）。法令・データの変更なし。

## 申し送り
- ピクトグラム: ky-examples の業種別アイコン化は色付きチップで分類が伝わるため今回は見送り（過剰実装回避）。
  事例カードへの事故の型ピクト流用（accident-pictogram-map）は次バッチ以降の検討余地。
- `/ky/list` は KyRecordSummary に承認状態を持たないため、行ごとの承認色バッジは全件フルロードのコスト増になり見送り。
  件数結論カードを「いまの状態」の主役に据える設計で代替。
