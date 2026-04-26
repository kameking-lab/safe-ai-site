# 法改正データベース 検証ログ

**検証日**: 2026-04-26
**対象**: `data/law-updates-10years.jsonl`（既存65件）
**目的**: AI生成疑いデータの除去・URL生存確認・内容整合性チェック
**検証方法**: HTTPステータスコード（curl）+ WebFetchによる内容確認

## 検証ルール

1. **URL生存＋内容整合** → 残す
2. **URL生存だが内容不一致** → 削除（再書き換えではsummaryと出典の同一性が損なわれるため）
3. **URL 404/403** → 削除
4. **URLなし** → 削除
5. **内容に推測表現が含まれる** → 推測部分を削除

## 結果サマリー

- 検証前: 65件
- 削除: 34件
- 残存: 31件

## 削除エントリ一覧（34件）

### URL 404（15件）

| ID | URL | 状態 |
|---|---|---|
| lr-real-2025-002 | mhlw.go.jp/.../denshishinsei.html | 404 |
| lr-extra-2024-005 | mhlw.go.jp/.../rousaihoken04/040325.html | 404 |
| lr-extra-2024-002 | mhlw.go.jp/.../0000060037.html | 404 |
| lr-real-2023-002 | mhlw.go.jp/.../0000113878.html | 404 |
| lr-real-2022-001 | mhlw.go.jp/stf/newpage_01188.html | 404 |
| lr-real-2021-001 | mhlw.go.jp/.../0000124546.html | 404 |
| lr-real-2020-003 | mhlw.go.jp/.../0000113878.html | 404 |
| lr-extra-2020-001 | mhlw.go.jp/.../telework_20200708.html | 404 |
| lr-real-2020-002 | mhlw.go.jp/.../0000124546.html | 404 |
| lr-extra-2019-003 | mhlw.go.jp/.../anzeneisei_index.html | 404 |
| lr-real-2019-002 | mhlw.go.jp/stf/newpage_01188.html | 404 |
| lr-real-2018-002 | mhlw.go.jp/stf/newpage_01188.html | 404 |
| lr-extra-2017-003 | mhlw.go.jp/stf/houdou/newpage_00025.html | 404 |
| lr-real-2017-001 | mhlw.go.jp/.../0000160837.html | 404 |
| lr-extra-2015-003 | mhlw.go.jp/.../sekimen/ | 404 |

### URL生存だが内容不一致（10件）

| ID | URL | 実際の内容 | エントリの主張 |
|---|---|---|---|
| lr-extra-2024-001 | mhlw.go.jp/.../0000188411_00048.html | COVID-19診療報酬特例 | 個人事業者安全衛生規制 |
| lr-extra-2023-002 | 同上 | COVID-19診療報酬特例 | 個人事業者・特定フリーランス |
| lr-extra-2021-002 | 同上 | COVID-19診療報酬特例 | 高年齢者雇用安定法 |
| lr-extra-2019-002 | 同上 | COVID-19診療報酬特例 | 特定技能外国人安全衛生 |
| lr-extra-2018-002 | 同上 | COVID-19診療報酬特例 | 高年齢労働者通達 |
| lr-real-2023-003 | mhlw.go.jp/stf/newpage_32408.html | 中小企業退職金共済議事録 | 足場墜落防止 |
| lr-extra-2023-005 | mhlw.go.jp/.../anzeneisei28/index.html | 冬の低気温建設労働者 | 高所作業安全帯通達 |
| lr-extra-2021-004 | 同上 | 冬の低気温建設労働者 | 墜落防止対策強化 |
| lr-extra-2015-002 | 同上 | 冬の低気温建設労働者 | フルハーネスガイドライン |
| lr-extra-2020-002 | mhlw.go.jp/.../0000121431_00182.html | COVID-19検査情報 | コロナ職場対策通達 |
| lr-real-2017-002 | mhlw.go.jp/.../0000117365.html | 歯科医師臨床研修Q&A | 職長等教育拡大 |

### 一次ソースで具体内容（特定通達・省令番号）の裏付けが取れない（9件）

URL自体は生存・関連トピックだが、エントリが主張する特定の `基発XX第XX号` や `厚生労働省令第XX号` をURL先で確認できない。法的リスク回避のため削除。

| ID | URL | 主張内容 |
|---|---|---|
| lr-extra-2023-004 | laws.e-gov.go.jp/.../347AC | 熱中症努力義務(令和5年法律第50号) |
| lr-extra-2022-003 | laws.e-gov.go.jp/.../347M | 低圧電気特別教育(令和4年厚生労働省令第118号) |
| lr-extra-2021-003 | laws.e-gov.go.jp/.../347AC | 自律的管理改正公布(令和3年法律第33号) |
| lr-extra-2020-004 | mhlw.go.jp/.../anzeneisei50/ | じん肺胸部CT(基発0331第27号) |
| lr-extra-2020-003 | mhlw.go.jp/.../0000099121_00005 | 化学物質自律的管理検討会設置 |
| lr-extra-2016-004 | laws.e-gov.go.jp/.../335AC | じん肺電子申請(平成28年厚生労働省令第55号) |
| lr-extra-2015-001 | mhlw.go.jp/.../anzeneisei50/ | RA準備通達(基発0918第3号) |
| lr-real-2022-003 | mhlw.go.jp/.../0000099121_00005 | 一人親方安衛則(令和4年厚生労働省令第82号) |

## 残存エントリ（31件）

| ID | URL | 確認方法 |
|---|---|---|
| lr-extra-2024-006 | mhlw.go.jp/.../0000116133.html | WebFetch ALIVE 熱中症対策 |
| lr-real-2024-001 | mhlw.go.jp/.../0000148322.html | WebFetch ALIVE 働き方改革 |
| lr-real-2024-002 | mhlw.go.jp/.../0000099121_00005.html | WebFetch ALIVE 令和4年厚生労働省令第91号明記 |
| lr-real-2024-003 | 同上 | WebFetch ALIVE 化学物質ばく露管理(濃度基準値文脈) |
| lr-extra-2024-003 | 同上 | WebFetch ALIVE 化学物質第2段階 |
| lr-extra-2024-004 | env.go.jp/air/asbestos/ | WebFetch ALIVE 環境省石綿対策 |
| lr-extra-2023-003 | mhlw.go.jp/.../0000099121_00005.html | WebFetch ALIVE 化学物質第2段階 |
| lr-extra-2023-006 | mlit.go.jp/.../tk2_000001_00017.html | WebFetch ALIVE 建設業安全衛生経費 |
| lr-real-2023-001 | mhlw.go.jp/.../0000099121_00005.html | WebFetch ALIVE 化学物質管理者選任 |
| lr-extra-2023-001 | 同上 | WebFetch ALIVE 化学物質第1段階 |
| lr-real-2022-002 | 同上 | WebFetch ALIVE 自律的管理転換 |
| lr-extra-2022-001 | 同上 | WebFetch ALIVE 自律的管理大改正 |
| lr-extra-2022-004 | mhlw.go.jp/.../0000116133.html | WebFetch ALIVE 熱中症WBGT |
| lr-extra-2022-005 | laws.e-gov.go.jp/.../417M50002000021 | curl 200 石綿則 |
| lr-extra-2022-002 | laws.e-gov.go.jp/.../347M50002000032 | curl 200 安衛則 |
| lr-extra-2021-001 | laws.e-gov.go.jp/.../347M50002000039 | curl 200 特化則 |
| lr-real-2021-002 | mhlw.go.jp/.../shigoto/guideline.html | WebFetch ALIVE テレワーク |
| lr-real-2020-001 | mhlw.go.jp/stf/newpage_10178.html | WebFetch ALIVE エイジフレンドリー |
| lr-real-2019-001 | mhlw.go.jp/.../0000148322.html | WebFetch ALIVE 働き方改革 |
| lr-extra-2019-001 | laws.e-gov.go.jp/.../347M50002000032 | curl 200 安衛則 |
| lr-real-2018-003 | mhlw.go.jp/.../0000189195.html | WebFetch ALIVE 受動喫煙対策 |
| lr-real-2018-001 | mhlw.go.jp/.../0000148322.html | WebFetch ALIVE 働き方改革 |
| lr-extra-2018-001 | laws.e-gov.go.jp/.../347AC0000000057 | curl 200 安衛法 |
| lr-extra-2018-003 | mhlw.go.jp/.../0000116133.html | WebFetch ALIVE クールワーク |
| lr-extra-2017-001 | laws.e-gov.go.jp/.../347M50002000032 | curl 200 安衛則 |
| lr-extra-2017-002 | mhlw.go.jp/.../rousaihoken06/03.html | curl 200 特別加入 |
| lr-real-2016-003 | laws.e-gov.go.jp/.../428AC1000000111 | curl 200 建設工事従事者法 |
| lr-real-2016-002 | mhlw.go.jp/.../anzeneisei12/ | WebFetch ALIVE ストレスチェック |
| lr-real-2016-001 | laws.e-gov.go.jp/.../347AC0000000057 | curl 200 安衛法 |
| lr-extra-2015-004 | mhlw.go.jp/.../anzeneisei12/ | WebFetch ALIVE ストレスチェック |
| lr-extra-2014-001 | laws.e-gov.go.jp/.../347AC0000000057 | curl 200 安衛法 |

## 推測表現の除去

`lr-real-2024-003` のsummary末尾「2025年度以降も追加予定」は事実確認できない予測のため削除した。

## 注記

- e-Gov法令検索（laws.e-gov.go.jp/law/）はJavaScriptレンダリングのためWebFetch本文取得不可。HTTPステータスコード200でURL生存を確認。
- 残存31件はすべてHTTP 200 + 関連トピック合致を確認済み。
- 特定通達/省令番号の最終確認は官報・告示原本でのレビュー推奨。
