# fidelity v2 全512条 再監査 — 2026-07-13

酷評第2ラウンド CR2-D1/D2/D3/D4/D5 の吸収として、fidelity ゲートを v2 に更新し、
generatedAt < 2026-07-13 の在庫を含む全 512 条を再監査した結果。

## v2 の追加検査

| 検査 | 追加ゲート | 効いた実例 |
|---|---|---|
| G1 数値抽出前の漢数字正規化 | `normalizeAllNumerics` を extract の前段に差し込み。「百五十立方メートル」「〇・〇八メガパスカル」「五十ミリメートル」を可視化 | 有機則2条・鉛則58条・高圧則15条・安衛則117条 |
| G2 拡張単位語彙 | mSv・MPa・kPa・Pa・m³・m²・mg・g・μg・mm・km・V・A・円・万円 追加。全角スラッシュ分数「１／１５」を FRACTION_SLASH_RE で拾う | 有機則2条(1/15・2/5・3/2)・電離則(mSv)・高圧則(kPa) |
| G4 読者放り出しの禁止 lint | `原文をご覧ください` `原文を参照` `e-Gov` を plainText に含めたら reader-abandoned | 酸欠則第6・12条、有機則30条の3 |
| G5 ただし書・適用除外の保存 | 原文の「ただし〜この限りでない/適用しない/除く」に対し、plain＋omissions に例外マーカーを要求 | 安衛則117条(50mm未満除外) |
| G6 主体語彙外の義務検出 | SUBJECTS 16→18語に拡張。全文中で最終「Xは」を採取し、参照片/接続詞は除外し、語彙外主体の義務を duty-out-of-vocab として報告 | 安衛則34(文書)・安衛則52の2(記録)・有機則16の2(装置) |
| G7 安衛則 fulltext アンカー | `plain-fulltext-anchor.test.ts` を新設。安衛則 plain を e-Gov 全文スナップショットに対しても照合し、gap-fill/簡略コーパスの盲点を可視化 | 安衛則102条が gap-fill/簡略コーパス由来 (ratchet=102 で開始) |

## 実害是正 (この PR で本番から嘘を消したもの)

| 条 | 何を直したか |
|---|---|
| 安衛則第117条 | 「ただし、直径が50ミリメートル未満の研削といしは適用対象外です」を復元。gap-fill 原文も e-Gov 実法文と一致するよう修正 |
| 有機則第2条 | 許容消費量の係数 (W=1/15×A・W=2/5×A・W=3/2×A) と気積 150 立方メートル上限を plainText に復元 |
| 有機則第24条 | 「第28条の3の2第4項」の措置対象参照を omissions で declared |
| 有機則第30条の3 | 「原文をご覧ください」で放り出していた項目を omissions 宣言に切替。「第6条第1項」の誤読リスクを「情報通信技術活用法第6条第1項」と明示 |
| 鉛則第1条 | 「令別表第4」参照を omissions で declared |
| 鉛則第34条 | 「令別表第4第9号」を本文で復元 |
| 鉛則第58条 | 「令別表第4第9号」を本文で復元 (酷評 A-4) |
| 四アルキル鉛則第1条 | 漢数字表記の別表参照 (別表第五第一号) を「別表第5第1号」に統一 |
| 特化則第38条の3 | 「第36条の3の2第4項の措置対象場所」を追記 |
| 機械等検定則第8条 | 「別表第2の検査設備」「別表第3の資格」を復元 |
| 高圧則第15条 | ガス分圧の限度方向「以上/以下」を復元 (18〜160 のような範囲表記から改める) |
| 酸欠則第6条・第12条 | 「原文をご覧ください」を削除し、omissions で宣言 |
| 安衛則第7条 | 「第1種衛生管理者免許等」を本文で復元 |

## v2 強制モードでの残 84 件 (BACKLOG-plain-v2-rewrite 候補)

`node scripts/plain-v2-audit.mjs` を forcedV2 モードで走らせた結果。
generatedAt < FIDELITY_V2_SINCE(2026-07-13) の在庫を含むので、これらは
現行 CI では通過するが v2 が全面強制されると赤くなる。Sonnet 後続部隊で
リライトする執筆キューとして扱う。

| 種別 | 件数 | 内訳 |
|---|---|---|
| style (端的さ 120/400 字上限) | 82件 | #888 で導入した長さゲートの恒久免除条群。安衛則26・26条・特化則7・28条系・施行令第6・20条・クレーン則29・33・35条など (別紙 `violations.json` 参照) |
| duty-out-of-vocab (主体語彙外の義務) | 5件 | 安衛則第4条(選任)・第34条(文書)・第52条の2(記録)・有機則第16条の2(装置)・特化則第48条(許可) |

### リライト方針

1. **duty-out-of-vocab 5件**: 主語を明示するか、omissions で主体を明示。
2. **style 82件**: 括弧書き除外後 120 字超の1文を分割 or omissions で切り出し。
3. 分割・書き直しごとに `plain-fulltext-anchor.test.ts` の `RATCHET_MAX=102` と
   `plain-length-ratchet.test.ts` の `RATCHET_MAX=79`, `WORST_CEIL=778字` を下げる。

## 実装ファイル

- `web/src/lib/plain/fidelity.ts` — v2 検査追加 (漢数字正規化・拡張単位・ただし書・読者放り出し・語彙外主体)
- `web/src/lib/plain/fidelity.test.ts` — 「盲点を1件でも仕込むと必ず落ちる」実証テスト 9件追加
- `web/src/data/plain/plain-fulltext-anchor.test.ts` — 安衛則 plain × e-Gov 全文スナップショット照合 (新設)
- `web/src/data/plain/plain-length-ratchet.test.ts` — 端的さラチェット (CR2-D4 対応、新設)
- `web/scripts/plain-v2-audit.mjs` — v2 強制モード全条監査スクリプト (新設)
- `web/src/data/laws/corpus-gaps-fill.ts` — 安衛則第117条の ただし書 (五十ミリメートル未満) を復元
- `web/src/data/plain/anzen-eisei-kisoku.ts` — 第7条・第117条を修正
- `web/src/data/plain/yuki-kisoku.ts` — 第2条・第24条・第30条の3を修正
- `web/src/data/plain/en-kisoku.ts` — 第1条・第34条・第58条を修正
- `web/src/data/plain/shi-alkyl-en-kisoku.ts` — 第1条 別表参照を算用数字化
- `web/src/data/plain/tokka-kisoku.ts` — 第38条の3 措置対象場所を復元
- `web/src/data/plain/kikai-kentei-kisoku.ts` — 第8条 別表参照復元
- `web/src/data/plain/koa-atsu-sagyo-anzen-eisei-kisoku.ts` — 第15条 限度方向復元
- `web/src/data/plain/sankketsu-kisoku.ts` — 第6条・第12条 「原文をご覧ください」を除去
