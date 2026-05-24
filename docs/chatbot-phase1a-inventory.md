# Phase 1a 法令コーパス棚卸し

- 生成日: 2026-05-24
- 対象ディレクトリ: `web/src/data/laws/`
- 生成スクリプト: `web/scripts/audit-law-corpus.mjs`

## サマリ

- ファイル数（law-types / law-metadata / index を除く）: 53
- 法令短縮名（lawShort）ユニーク数: 54
- 収録条文数（lawShort × articleNum ユニーク）: 715
- 重複登録（同一 lawShort + articleNum が複数ファイルに出現）: 12
- LAW_METADATA 未登録の lawShort: 17

## 法令別カバレッジ

| lawShort | 正式名 | 条文数 | 重複 | 収録ファイル | 表記方針 | e-Gov | 最終監査 |
|---|---|---:|---:|---|---|---|---|
| THP指針 | 健康保持増進指針 | 4 | 0 | kenko-hoji-zoshin-shishin.ts | literal-mixed | (metadata 未登録) | - |
| VDTガイドライン | 情報機器作業における労働衛生管理のためのガイドライン | 4 | 0 | vdt-guideline.ts | literal-mixed | [link](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000114111.html) | 2026-05-17 |
| クレーン則 | クレーン等安全規則 | 53 | 0 | corpus-gaps-fill.ts, crane-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000034) | 2026-05-17 |
| ゴンドラ則 | ゴンドラ安全規則 | 15 | 0 | corpus-gaps-fill.ts, gondola-anzen-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000035) | 2026-05-17 |
| じん肺則 | じん肺法施行規則 | 12 | 0 | jinpai-ho-sikokiregu.ts | summary-only | [link](https://laws.e-gov.go.jp/law/335M50002000006) | 2026-05-17 |
| じん肺法 | じん肺法 | 8 | 0 | corpus-gaps-fill.ts, jinpai-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/335AC0000000030) | 2026-05-17 |
| パート有期法 | パートタイム・有期雇用労働法 | 3 | 0 | tanki-rodo-sha-kanri-ho.ts | literal-mixed | (metadata 未登録) | - |
| ボイラー則 | ボイラー及び圧力容器安全規則 | 18 | 0 | boiler-atsuryoku-yoki-anzen-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000033) | 2026-05-17 |
| メンタル指針 | 労働者の心の健康の保持増進のための指針 | 4 | 0 | mental-health-shishin.ts | literal-mixed | [link](https://www.mhlw.go.jp/file/06-Seisakujouhou-11300000-Roudoukijunkyokuanzeneiseibu/0000050925.pdf) | 2026-05-17 |
| 安衛則 | 労働安全衛生規則 | 115 | 12 | anzen-eisei-kisoku.ts, ashiba-sagyo-kisoku.ts, corpus-gaps-fill.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000032) | 2026-05-17 |
| 安衛法 | 労働安全衛生法 | 61 | 0 | corpus-gaps-fill.ts, rodo-anzen-eisei-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347AC0000000057) | 2026-05-17 |
| 安衛令 | 労働安全衛生法施行令 | 2 | 0 | rodo-anzen-eisei-ho-sikokiregu.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347CO0000000318) | 2026-05-17 |
| 育介法 | 育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律 | 6 | 0 | corpus-gaps-fill.ts, ikuji-kaigo-kyugyo-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/403AC0000000076) | 2026-05-17 |
| 鉛則 | 鉛中毒予防規則 | 15 | 0 | en-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 化学物質RA指針 | 化学物質リスクアセスメント指針 | 5 | 0 | kagaku-busshitsu-kanri-shishin.ts | literal-mixed | (metadata 未登録) | - |
| 化審法 | 化学物質の審査及び製造等の規制に関する法律 | 13 | 0 | kashin-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/348AC0000000117) | 2026-05-17 |
| 過重労働通達 | 過重労働対策通達 | 4 | 0 | jiritsushinkei-setsumeisho.ts | literal-mixed | (metadata 未登録) | - |
| 過労死防止法 | 過労死等防止対策推進法 | 13 | 0 | karoshi-boshi-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/426AC1000000100) | 2026-05-17 |
| 機械等検定規則 | 機械等検定規則 | 12 | 0 | kikai-kentei-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 均等法 | 雇用の分野における男女の均等な機会及び待遇の確保等に関する法律（男女雇用機会均等法） | 4 | 0 | koyo-kinto-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347AC0000000113) | 2026-05-17 |
| 健康増進法 | 健康増進法 | 13 | 0 | kenko-zoshin-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/414AC0000000103) | 2026-05-17 |
| 建災防規程 | 建設業労働災害防止規程 | 12 | 0 | kensetsu-rosai-boshi-kitei.ts | summary-only | [link](https://www.kensaibou.or.jp/) | 2026-05-17 |
| 建設業法 | 建設業法 | 4 | 0 | kensetsu-gyoho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/324AC0000000100) | 2026-05-17 |
| 港湾労働法 | 港湾労働法 | 12 | 0 | kowan-rodo-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/363AC0000000040) | 2026-05-17 |
| 高圧ガス保安法 | 高圧ガス保安法 | 13 | 0 | koatsu-gas-hoanho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/326AC0000000204) | 2026-05-17 |
| 高圧則 | 高気圧作業安全衛生規則 | 14 | 0 | koa-atsu-sagyo-anzen-eisei-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000040) | 2026-05-17 |
| 最賃法 | 最低賃金法 | 3 | 0 | saitei-chingin-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/334AC0000000137) | 2026-05-17 |
| 作環測法 | 作業環境測定法 | 6 | 0 | sagyokankyo-sokuteiho.ts | literal-mixed | (metadata 未登録) | - |
| 酸欠則 | 酸素欠乏症等防止規則 | 24 | 0 | sankketsu-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000042) | 2026-05-17 |
| 四アルキル鉛則 | 四アルキル鉛中毒予防規則 | 12 | 0 | shi-alkyl-en-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 事務所則 | 事務所衛生基準規則 | 14 | 0 | jimusho-eisei-kijun-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 女性則 | 女性労働基準規則 | 3 | 0 | josei-rodo-kijun-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 職安法 | 職業安定法 | 3 | 0 | shokugyo-antei-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/322AC0000000141) | 2026-05-17 |
| 職能法 | 職業能力開発促進法 | 3 | 0 | shokugyo-noryoku-kaihatsu-sokushin-ho.ts | literal-mixed | (metadata 未登録) | - |
| 食品衛生法 | 食品衛生法 | 14 | 0 | shokuhin-eisei-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/322AC0000000233) | 2026-05-17 |
| 振動指針 | 振動障害予防指針 | 1 | 0 | corpus-gaps-fill.ts | literal-mixed | (metadata 未登録) | - |
| 石綿則 | 石綿障害予防規則 | 9 | 0 | sekimen-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/417M60000100021) | 2026-05-17 |
| 船員安衛則 | 船員労働安全衛生規則 | 13 | 0 | senin-anzen-eisei-kisoku.ts | summary-only | [link](https://laws.e-gov.go.jp/law/339M50000800053) | 2026-05-17 |
| 騒音規制法 | 騒音規制法 | 12 | 0 | soon-kisei-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/343AC0000000098) | 2026-05-17 |
| 騒音指針 | 騒音障害防止指針 | 1 | 0 | corpus-gaps-fill.ts | literal-mixed | (metadata 未登録) | - |
| 電離則 | 電離放射線障害防止規則 | 16 | 0 | denri-houshasen-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000041) | 2026-05-17 |
| 特化則 | 特定化学物質障害予防規則 | 30 | 0 | corpus-gaps-fill.ts, tokka-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000039) | 2026-05-17 |
| 毒劇法 | 毒物及び劇物取締法 | 14 | 0 | dokugeki-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/325AC0000000303) | 2026-05-17 |
| 熱中症通達 | 熱中症対策通達 | 2 | 0 | corpus-gaps-fill.ts | literal-mixed | (metadata 未登録) | - |
| 年少者則 | 年少者労働基準規則 | 3 | 0 | nensha-rodo-kijun-kisoku.ts | literal-mixed | (metadata 未登録) | - |
| 派遣法 | 労働者派遣法(安全衛生関連) | 10 | 0 | haken-anzen-eisei.ts | literal-mixed | (metadata 未登録) | - |
| 粉じん則 | 粉じん障害防止規則 | 16 | 0 | funjin-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/354M50002000018) | 2026-05-17 |
| 有機則 | 有機溶剤中毒予防規則 | 29 | 0 | yuki-kisoku.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/347M50002000036) | 2026-05-17 |
| 労基則 | 労働基準法施行規則 | 3 | 0 | rodo-kijun-ho-sikokiregu.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/322M40000100023) | 2026-05-17 |
| 労基法 | 労働基準法 | 10 | 0 | corpus-gaps-fill.ts, rodo-kijun-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/322AC0000000049) | 2026-05-17 |
| 労契法 | 労働契約法 | 4 | 0 | rodo-keiyaku-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/419AC0000000128) | 2026-05-17 |
| 労災保険法 | 労働者災害補償保険法 | 8 | 0 | corpus-gaps-fill.ts, rodo-sha-saigai-hosho-hoken-ho.ts | literal-mixed | [link](https://laws.e-gov.go.jp/law/322AC0000000050) | 2026-05-17 |
| 労災防止団体法 | 労働災害防止団体法 | 12 | 0 | rosai-boshi-dantai-ho.ts | summary-only | [link](https://laws.e-gov.go.jp/law/339AC0000000118) | 2026-05-17 |
| 労施法 | 労働施策総合推進法 | 1 | 0 | corpus-gaps-fill.ts | literal-mixed | (metadata 未登録) | - |

## 表記方針の判定基準

- `summary-only`: ファイル先頭コメントに「独自要約」「逐語転載なし」「逐語転載は禁止」のいずれかを含むもの。
- `literal-mixed`: 上記マーカーが無いもの。 e-Gov 法令本文の逐語コピーが含まれる前提でリスク管理する。
- 法令本文（条文テキスト）は著作物性が無いとされるため著作権上の問題は本質的に無いが、
  Phase 2/3/4 設計（出典明示・ハルシネーション照合）の都合上、要約方針への統一が望ましい。

## LAW_METADATA 未登録の lawShort（要追加）

- THP指針 (健康保持増進指針) — ファイル: kenko-hoji-zoshin-shishin.ts
- パート有期法 (パートタイム・有期雇用労働法) — ファイル: tanki-rodo-sha-kanri-ho.ts
- 鉛則 (鉛中毒予防規則) — ファイル: en-kisoku.ts
- 化学物質RA指針 (化学物質リスクアセスメント指針) — ファイル: kagaku-busshitsu-kanri-shishin.ts
- 過重労働通達 (過重労働対策通達) — ファイル: jiritsushinkei-setsumeisho.ts
- 機械等検定規則 (機械等検定規則) — ファイル: kikai-kentei-kisoku.ts
- 作環測法 (作業環境測定法) — ファイル: sagyokankyo-sokuteiho.ts
- 四アルキル鉛則 (四アルキル鉛中毒予防規則) — ファイル: shi-alkyl-en-kisoku.ts
- 事務所則 (事務所衛生基準規則) — ファイル: jimusho-eisei-kijun-kisoku.ts
- 女性則 (女性労働基準規則) — ファイル: josei-rodo-kijun-kisoku.ts
- 職能法 (職業能力開発促進法) — ファイル: shokugyo-noryoku-kaihatsu-sokushin-ho.ts
- 振動指針 (振動障害予防指針) — ファイル: corpus-gaps-fill.ts
- 騒音指針 (騒音障害防止指針) — ファイル: corpus-gaps-fill.ts
- 熱中症通達 (熱中症対策通達) — ファイル: corpus-gaps-fill.ts
- 年少者則 (年少者労働基準規則) — ファイル: nensha-rodo-kijun-kisoku.ts
- 派遣法 (労働者派遣法(安全衛生関連)) — ファイル: haken-anzen-eisei.ts
- 労施法 (労働施策総合推進法) — ファイル: corpus-gaps-fill.ts

---
生成: 2026-05-24 / 727 条文レコード走査