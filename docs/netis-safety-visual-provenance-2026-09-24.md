# /resources/netis-safety 画像の出典・権利証跡（2026-09-24）

Astra の事前レビュー（10技術・絞り込み・説明は動くが、画像が危険イラストと文字カードだけ）を受けた改修の証跡。
**原則**：製品・NETIS番号との対応、取得元URL、利用根拠、取得日の4点を文書化できた画像だけを掲載する。できない製品は「製品画像は未掲載」と明示し、汎用写真・別製品の画像・AI生成画像で代替しない。

## 結論

| 対象 | 掲載状態 |
|---|---|
| 製品画像（10技術） | **10件すべて未掲載（未完了として明示）**。提供元サイトに第三者再利用を認める文書が1件もなかったため |
| リスク区分の代表画像（4区分） | **4件ともWikimedia Commonsの実写に置換**（CC BY 2.0／CC BY-SA 4.0／パブリックドメイン）。「危険場面の代表例（実写）・NETIS掲載製品の写真ではない」と明示 |

## 1. 製品画像：10件の判定（2026-09-24 curl取得・目視確認）

判定基準：第三者の再利用を明示的に許す文言（自由利用、CCライセンス、報道・プレスキット等）がある場合のみ「利用可」。「無断転載禁止」や規約なし（沈黙）は「要許諾」。
候補画像はリポジトリへ保存していない（検証用に作業領域でのみ確認）。

| NETIS番号 | 技術 | 候補画像URL（製品同一性の根拠） | 利用条件の根拠 | 判定 |
|---|---|---|---|---|
| CG-200009-VE | ヒヤリハンター | `https://matrix-inc.co.jp/assets/images/product/hiyari-v2-thumb_v2.webp`（alt「RFID接近検知装置「ヒヤリハンター」の製品イメージ」、同ページに「NETIS登録番号：CG-200009-VE」） | 利用規約・著作権ページなし。フッター「© 2026 Matrix Inc. All rights reserved.」のみ | 要許諾 |
| KT-180097-VE | パノラマOプレミアム | `https://www.tukusi.co.jp/data/item/631/1_img_20200313153612_EVqLtu.jpg`（画像内に製品ロゴ、仕様表に「NETIS登録番号 KT-180097-VE」） | [ご利用規約](https://www.tukusi.co.jp/info/regulation.php)「…当社または原著作者の文書による事前の許諾がない限り禁止します。」 | **明示禁止**（要書面許諾） |
| KK-210060-VE | ドボレコJK | `https://www.iwasakinet.co.jp/wp-content/uploads/2022/04/doboreko_re.jpg`（og:image、本文に「NETIS登録番号:KK-210060-VE」） | [岩崎 利用規約](https://www.iwasakinet.co.jp/terms-of-use/)「…事前に当社の許諾を得ることなしに、複製、転用、改変、公衆送信…を行うことはできません。」。製造元Xactiは規約ページなし | **明示禁止**（要許諾） |
| KT-230282-A | ハーネスノーティファイ | `https://ronk-jp.com/WPSD/wp-content/themes/ver2026/assets/img/TOP-products03.webp`（alt「ハーネスノーティファイ画像」。番号はチラシPDFにのみ記載） | 規約・著作権ページなし（`/privacy/`のみ） | 要許諾 |
| QS-210006-A | MICS AI | `https://assistyou-m.com/wp-content/themes/assistyou2025/img/prod_micsai/micsai_kv_bg_pc.webp`（筐体ラベル「NETIS QS-210006-A」。合成画像のため要トリミング） | 規約・著作権ページなし | 要許諾 |
| QS-240022-A | ハーネスアラート | `https://ykc-amulet.net/wp/wp-content/themes/ykc/assets/images/harness-alert/img01.png`（製品ページ `/harness-alert/` 配下、本文に登録番号） | 規約・著作権ページなし。「Copyright YOSHIKAWA KOGYO Co.,Ltd. All rights Reserved.」 | 要許諾 |
| KT-230099-VE | 熱中対策バンド（I-BOW） | `https://sooki.co.jp/irental/wp-content/uploads/2025/04/I-BOW-2025_hp.jpg`（alt「【2025年モデル】熱中対策バンド I-BOW」、本文に「NETIS番号：KT-230099-VE」） | 画像・著作権に関する条項なし。レンタル業者のため権利者はメーカー（スリーライク）の可能性 | 要許諾（メーカーへ） |
| KT-260019-A | TECHNO BAND | PR TIMES `https://prcdn.freetls.fastly.net/release_image/60820/36/60820-36-5ba05bbc63c243fd4e5b2f5092d57d14-908x697.png`（[リリース](https://prtimes.jp/main/html/rd/p/000000036.000060820.html)に技術名称・KT-260019-A） | [PR TIMES規約](https://prtimes.jp/main/html/kiyaku)は「報道関係者」が「報道目的に限り」無償利用可、かつ有償目的を除外。当サイトはアフィリエイト・有料プランを持つため適用が不明確 | **不明確→未掲載**（要許諾） |
| KK-210002-VE | ハッとセンサー | `https://tsucumore.com/wp-content/uploads/2025/01/672c3b3485d8be80c421fbd76706be74-800x420.jpg`（og:image、画像内にKK-210002-VEバッジ） | 規約中に著作権・画像条項なし | 要許諾 |
| KK-200054-A | カメラ式人検知システム（HADES） | `https://www.nishio-tm.co.jp/test2/wordpress/wp-content/uploads/2023/08/hades_image16.png`（`/netis/`で「NETIS KK-200054-A」の直下） | 規約・著作権ページなし（`/privacy/`のみ） | 要許諾 |

### 取得時に見つかった注意点
- **ドボレコJK**：Xactiのプレスリリース（https://xacti-co.com/news_20240328/）は「KK-200060-VE」と記載。岩崎の製品ページとXacti自身のNETISリンクは KK-210060-VE。誤記の可能性が高いが、NETIS公式は本環境から403で照合不可。**NETIS公式での再照合が必要**。
- **MICS AI**：og:image（`/img/ogp.jpg`）は兄弟製品 MICS（QS-110023-VE）のカメラ。許諾後も **この画像は使用しない**。
- NETIS公式ページ内の画像は、本環境から403で取得できず、国交省・NETISの利用規約上の扱いも未確認。

### 許諾が得られた場合の反映手順（データ変更のみ）
1. 提供元（I-BOWはメーカー）から、対象画像URL・サムネイル利用・クレジット表記を明記した書面（メール可）を得て保管。
2. 画像を `web/public/netis-safety/products/<登録番号>.webp` へ保存。
3. `web/src/components/netis-safety-data.ts` の該当技術の `productImage` を `status: "verified"` にし、`src`・`alt`・`sourceUrl`・`credit`・`usageBasis`（許諾の日付・相手）・`retrievedAt` を記入。UIはカード上部の画像とクレジット行を自動表示する。

## 2. リスク区分の代表画像（Wikimedia Commons、2026-09-24 API取得）

`prop=imageinfo&iiprop=url|extmetadata|size` で存在・ライセンス・作者を確認。960px版を取得し、800px幅へ縮小・WebP変換（品質78）して `web/public/netis-safety/categories/` に保存。画面では「写真の出典・ライセンスを確認」に作者・ライセンス・元ファイルへのリンクと改変内容を表示。

| 区分 | ファイル | 作者 | ライセンス | 写っているもの |
|---|---|---|---|---|
| 重機接触 | [Polka Dot Machinery (14699068438).jpg](https://commons.wikimedia.org/wiki/File:Polka_Dot_Machinery_(14699068438).jpg) | George Alexander Ishida Newman | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 東京の解体現場。油圧ショベル2台と手前に作業員（背面） |
| 立入禁止 | [Anzen-daiichi fence, Kusatsu, Shiga.jpg](https://commons.wikimedia.org/wiki/File:Anzen-daiichi_fence,_Kusatsu,_Shiga.jpg) | 運動会プロテインパワー | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 「安全第一」バリケード・コーン・コーンバー。人物なし |
| 墜落・転落 | [On Edge (8744516460).jpg](https://commons.wikimedia.org/wiki/File:On_Edge_(8744516460).jpg) | NIOSH（米国） | パブリックドメイン（米国連邦政府機関の著作物） | 開口端でハーネスを親綱へ接続して作業。顔は見えない |
| 暑熱・作業環境 | [Bioenvironmental engineering team … (9775034).jpg](https://commons.wikimedia.org/wiki/File:Bioenvironmental_engineering_team_defends_against_the_heatwave_with_exact_measurements_(9775034).jpg) | U.S. Air Force photo by Senior Airman Darius Frazier | パブリックドメイン（米国連邦政府機関の著作物） | 三脚上のWBGT測定器。人物なし |

保存したWebPのSHA-256：
```
3b6bc2bae0e4726144bce309fc5c1ab199f84e0688968a708db8191f01cf8d84  machine-collision.webp
9802285d5985e991c150b56b7f499e848267ed777e7460ef933bd2520391d8cb  restricted-zone.webp
90e79be3dd53ce96569f7e6568a4b57b105d7f4657b12551ccb9326980e6b55b  fall-prevention.webp
09e4c84a5e708f3f1040a2908e90d1b9c7b0c1676abfd755f97d4bf9fe0379aa  heat-environment.webp
```

### 判断メモ
- 立入禁止は当初候補（鹿児島の掘削溝）に作業員の顔が写るため、人物なしの控え候補を採用。
- 暑熱の写真は測定器のメーカー表示（QUESTemp/3M）が小さく読める。NETIS登録製品ではなく、画面で「NETIS掲載製品の写真ではない」と明示して代表場面として使用。
- 重機接触の写真の重機は Caterpillar 320D（Commons説明文）。同様に代表場面であり製品推奨ではない。
- CC BY-SA 4.0 の画像を縮小・変換した派生物は同ライセンスで提供される（出典表示に明記）。
- 従来のカテゴリ用イラスト（生成台帳 S040/S042/S031/S092）はファイルを残し、このページでは使用をやめた（他ページへの影響なし）。

## 3. UX変更と検証

- 各カードに「画像枠・技術名・登録番号・短い特徴」を表示。画像枠と技術名は **同じタブで** NETIS公式の詳細（既存の `netisDetailUrl`）へ遷移。画像リンクは `aria-hidden`・`tabIndex=-1` とし、キーボード操作は技術名リンクに一本化（重複タブ停止を避ける）。
- 絞り込み（`risk`）と検索（`q`）はURLで保持。遷移前に `sessionStorage` へスクロール位置と登録番号を保存し、戻った際に位置と技術名リンクへのフォーカスを復元（bfcache復帰にも対応）。
- 既存の「仕組み・適用条件を詳しく見る」「NETIS公式で照合」「提供元の技術情報」は維持。

| 検証 | 結果 |
|---|---|
| `vitest run src/components/netis-safety-guide.test.tsx src/components/home` | 77/77 pass |
| Playwright `e2e/netis-safety-visual.spec.ts`（Chromium） | 8/8 pass（新規：320/390pxでカード幅・横はみ出しなし、Enterで技術名リンク→NETIS（スタブ）→戻るで risk・q・スクロール位置・フォーカス復元、画像クリックでも同じ詳細へ） |
| axe（wcag2a/aa, 21a/aa） | 違反0（既存テスト） |
| 320/390/1440px 横はみ出し | `scrollWidth - clientWidth ≤ 1` |
| `tsc --noEmit`、変更ファイル ESLint | エラー0 |
| `npm run build` | 成功（exit 0） |

## 残課題（未完了）
1. 製品画像10件：提供元の書面許諾（I-BOWはメーカー）。取得後は上記手順でデータのみ更新。
2. ドボレコJKの登録番号表記ゆれ（KK-210060 / KK-200060）をNETIS公式で照合。
3. NETIS公式掲載画像の利用可否（国交省・NETIS利用規約）の確認。
