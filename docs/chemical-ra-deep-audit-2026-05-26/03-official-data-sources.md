# 03 公式データソース調査（軸3）

研究エージェント調査 2026-05-26。実装時は各公式リストの最新版を再取得すること（創作禁止）。

## 機械取得可否一覧（規制対象物質リスト）

| 法律 | 機械取得 | 主データ源 | URL | 無料/商用 |
|---|---|---|---|---|
| 安衛法 SDS/ラベル対象 | ○ | 職場のあんぜんサイト Excel | anzeninfo.mhlw.go.jp/anzen/gmsds/gmsds640.html | 政府利用規約（CC明示は要確認） |
| 有機則・特化則等 | △ | e-Gov別表＋NITE-CHRIP補完 | laws.e-gov.go.jp | 可 |
| 化管法(PRTR/SDS) | ○ | NITE化管法/METI | nite.go.jp/chem/prtr/law_index.html | 可 |
| 化審法 | ○ | NITE J-CHECK/METI | nite.go.jp/chem/jcheck/ | 可 |
| 毒劇法 | △ | 厚労省検索(NITE-CHRIP連携) | mhlw.go.jp(dokugeki) | 直Excel無 |
| 消防法 危険物 | ✕〜△ | e-Gov(品名定義) | laws.e-gov.go.jp | 物質列挙無 |
| 大気汚染防止法 | △ | 環境省 | env.go.jp/air/osen/law/yugai.html | 可 |
| 水質汚濁防止法 | △ | 環境省/e-Gov | env.go.jp/water/law/qa_hs.html | 可 |
| 土壌汚染対策法 | ○ | 環境省 | env.go.jp/water/dojo | 可（26物質・容易） |
| 廃棄物処理法 特管 | ✕ | 環境省(物性定義) | env.go.jp/recycle/waste/sp_contr/ | 物質列挙無 |
| 高圧ガス保安法 | △ | e-Gov | laws.e-gov.go.jp | 可 |
| フロン排出抑制法 | △ | METI | meti.go.jp(ozone) | 可 |
| GHS分類(JIS) | ○ | NITE統合版GHS分類 | nite.go.jp/chem/ghs/ghs_nite_download.html | 自由に引用・複写可 |
| UN番号 | △〜✕ | 国連勧告（無料一括未特定） | 不明 | 不明 |
| 横断: NITE-CHRIP | ○ | NITE | chem-info.nite.go.jp/chem/chrip/ | 商用可 |
| 横断: ケミココ | △(UI主) | 環境省 | chemicoco.env.go.jp | 可 |

## 統合の中核方針（研究結論）
- **CAS番号を主キー**に NITE系（CHRIP/J-CHECK/GHS統合版/化管法）を統合するのが最も現実的。本サイトは既にこの方針（prtr/chashin/nite データがCASキー）。
- **二層構造**を推奨: (A)列挙型(GHS/安衛/化管/化審/土壌/大気/水質) はCASマッピングで統合、(B)カテゴリ/物性型(消防/廃掃/高圧ガス) は「該当する可能性あり＋判定条件表示」の別UI。

## 安衛法 自律的管理拡大（核心・要追従）
- 現行 896物質（2025/4/1）→ **2026/4/1 までに約2,900物質**へ段階拡大。2026/4施行でSDS交付義務違反に罰則新設。2027/4にも追加決定済み。
- 公式リスト: 職場のあんぜんサイトの Excel直ファイル（label_sds_list_YYYYMMDD.xlsx、物質名日英・CAS・裾切値）。
- 本サイトの compact.json は安衛カテゴリを保持済み。**2026/4の約2,900物質への更新が最重要メンテ**。

## 要確認（実装前に潰す）
- 安衛法Excel/NITEデータの正確なライセンス（商用ポータル掲載前に明文確認）。
- 化審法 優先評価化学物質の正確な物質数（J-CHECK）。
- 毒劇法 毒物/劇物/特定毒物の確定総数（濃度・製剤・除外規定で複雑）。
- NITE-CHRIP 利用条件の現行URL（調査時に旧URL 404）。

## 出典
（02・本文中URL、および）NITE J-CHECK https://www.nite.go.jp/chem/jcheck/ ／ NITE統合版GHS https://www.nite.go.jp/chem/ghs/ghs_nite_download.html ／ 化管法NITE https://www.nite.go.jp/chem/prtr/law_index.html ／ 環境省 土壌 https://www.env.go.jp/water/dojo/ ／ ケミココ https://www.chemicoco.env.go.jp/
