# BACKLOG-plain-v2-rewrite — fidelity v2 リライトキュー（2026-07-13）

fidelity v2 導入（漢数字正規化・拡張単位・ただし書保存・「原文をご覧ください」禁止・
主体語彙外の義務検出・安衛則 fulltext アンカー）で炙り出された 84 条のリライト対象。
執筆規約と完了条件の正本: `docs/plain-language-prompts/README.md`。
違反の詳細は `docs/plain-v2-audit-2026-07-13/violations.json`。

## 運用ルール

1. 該当条 (`web/src/data/plain/<法令>.ts` の当該エントリ) を書き直して v2 の全検査を緑にし、
   `generatedAt` を `2026-07-13` 以降に更新する。
2. plain を書き直した条ごとに:
   - `plain-length-ratchet.test.ts` の `RATCHET_MAX=79` を実数まで下げる。
   - `plain-fulltext-anchor.test.ts` の `RATCHET_MAX=102` を実数まで下げる（安衛則のみ）。
3. `node scripts/plain-v2-audit.mjs` で残り件数を再測。0 に近づくたびに BACKLOG のこの節から
   `[x]` に更新する。
4. 触ってよいのは `web/src/data/plain/<担当法令>.ts` と、必要なら `corpus-gaps-fill.ts` の
   安衛則 gap-fill 条だけ（安衛則の fulltext 由来リライト時）。

## v2 強制モードで違反した 84 条 (法令別)

**2026-07-13 法令名訂正**: 本節は当初 egovLawId と法令名の対応が複数箇所ズレていた
（violations.json の articleNum・原文抜粋と law-metadata.ts の egovLawId を突合して訂正）。
また 石綿則(417M60000100021・7条) が本節から完全に漏れていた（totals.totalViolated=84 の
内訳には含まれていた）ため、本訂正で追加した。

### 安衛則 (347M50002000032) — 26条 → anei-kisoku/hen*.ts
- [ ] 第4条 [duty-out-of-vocab] — 「選任」の義務主体明示
- [ ] 第34条 [duty-out-of-vocab] — 「文書」の義務主体を omissions または本文に明示（酷評 A-5）
- [ ] 第52条の2 [duty-out-of-vocab] — 「記録」の義務主体明示
- [ ] 第35条・第36条・第45条・第86条・第256条・第285条・第332条・第333条・第352条・第355条・
      第356条・第373条・第539条の4・第552条・第563条・第564条・第566条・第567条・第585条・
      第593条・第594条・第619条・第151条の21 [style] — 括弧書き除外後 120字/400字上限の分割

### クレーン則 (347M50002000034) — 13条 → crane-kisoku.ts
（訂正: 旧記載「安衛法」は誤り。violations.json の原文抜粋はクレーン・デリックの規定でクレーン則）
- [x] 第5条・第9条・第18条・第23条・第29条・第33条・第34条・第35条・第36条・第37条・第77条・
      第96条・第120条 [style] — 長文分割（PR: plain/v2-rewrite-crane）

### ボイラー則 (347M50002000033) — 6条 → boiler-atsuryoku-yoki-anzen-kisoku.ts
（訂正: 旧記載「安衛則の一部」は誤り。violations.json の原文抜粋はボイラー・圧力容器の規定）
- [x] 第10条・第24条・第41条・第62条・第63条・第94条 [style]（PR: plain/v2-rewrite-boiler）

### 特化則 (347M50002000039) — 12条 → tokka-kisoku.ts
- [x] 第2条・第3条・第7条・第10条・第28条・第30条・第31条・第36条の2・第38条の3・
      第38条の4・第38条の10 [style]（PR: plain/v2-rewrite-tokka）
- [x] 第48条 [duty-out-of-vocab] — 「許可」の義務主体明示（PR: plain/v2-rewrite-tokka）

### 有機則 (347M50002000036) — 1条 → yuki-kisoku.ts
- [x] 第16条の2 [duty-out-of-vocab] — 「プッシュプル型換気装置」の義務主体明示（PR: plain/v2-rewrite-koatsu-yuki-funjin）

### 電離則 (347M50002000041) — 5条 → denri-houshasen-kisoku.ts
（訂正: 旧記載「クレーン則」は誤り。violations.json の原文抜粋は管理区域・被ばく限度の規定）
- [x] 第3条・第3条の2・第44条・第45条・第56条 [style]（PR: plain/v2-rewrite-gondola-denri）

### 事務所則 (347M50002000043) — 4条 → jimusho-eisei-kijun-kisoku.ts
（訂正: 旧記載「電離則」は誤り。violations.json の原文抜粋は測定方法・給水・便所の規定）
- [x] 第7条の2・第8条・第13条・第17条 [style]（PR: plain/v2-rewrite-jimusho-anrei）

### ゴンドラ則 (347M50002000035) — 3条 → gondola-anzen-kisoku.ts
（訂正: 旧記載「有機則(鉛則)」は誤り。violations.json の原文抜粋はゴンドラの規定）
- [x] 第10条・第22条・第28条 [style]（PR: plain/v2-rewrite-gondola-denri）

### 施行令 (347CO0000000318) — 3条 → rodo-anzen-eisei-ho-sikokiregu.ts
- [x] 第6条 (1文778字・最悪の1つ)・第8条・第20条 [style]（PR: plain/v2-rewrite-jimusho-anrei）

### 検定則 (347M50002000045) — 1条 → kikai-kentei-kisoku.ts
- [x] 第6条 [style]（PR #913・マージ済み）

### 高圧則 (347M50002000040) — 1条 → koa-atsu-sagyo-anzen-eisei-kisoku.ts
- [x] 第15条 [style]（PR: plain/v2-rewrite-koatsu-yuki-funjin）— v2 で 18キロパスカル
      以上/以下 の限度方向を復元済み。全体 125字/最長124字が120字上限を超えていたので分割

### 粉じん則 (354M50002000018) — 2条 → funjin-kisoku.ts
（訂正: 旧記載「鉛則」は誤り。violations.json の原文抜粋は特定粉じん発生源・粉じん作業の規定）
- [x] 第4条・第23条の2 [style]（PR: plain/v2-rewrite-koatsu-yuki-funjin）

### 石綿則 (417M60000100021) — 7条 → sekimen-kisoku.ts
（本節に漏れていたため追加。totals.totalViolated=84 の内訳には含まれていた）
- [ ] 第1条・第5条・第13条・第20条・第27条・第35条・第40条 [style]

## 安衛則 gap-fill/簡略コーパス乖離条 (fulltext リライト対象) — 102条

`plain-fulltext-anchor.test.ts` が列挙する。BACKLOG-plain-2 (安衛則担当) に統合し、
fulltext から plain を再執筆するたびに ratchet を下げる。

代表的な条 (書き換え優先度順):
- [ ] 第117条 (研削といし) ← 本 PR で ただし書 復元済 (実害是正)
- [ ] 第96条・第131条・第164条・第332条・第333条・第352条・第574条・第588条・第194条の22・
      第151条の21・第194条の22 (gap-fill 由来の要旨言い換え=酷評 A-8)
- [ ] 第552条 (架設通路の中桟等 = 酷評 A-2)
- [ ] 第563条 (作業床)・第577条の2・第577条の3 (化学物質ばく露低減 = 現行法の中核)

## 参照

- 監査結果: `docs/plain-v2-audit-2026-07-13/violations.json`
- 監査サマリ: `docs/plain-v2-audit-2026-07-13/README.md`
- ゲート実装: `web/src/lib/plain/fidelity.ts` (FIDELITY_V2_SINCE=2026-07-13)
- 実証テスト: `web/src/lib/plain/fidelity.test.ts` (v2 盲点吸収の実証セクション)
