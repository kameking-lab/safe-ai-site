/**
 * 拡張データセット 第4弾: 欠落OEL補充
 *
 * 出典:
 *  - 厚生労働省告示第177号（濃度基準値、令和5年4月以降） MHLW_177
 *    https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/anzeneisei02/00001.html
 *  - 日本産業衛生学会「許容濃度等の勧告」2024年度版 JSOH_2024
 *    https://www.sanei.or.jp/
 *  - ACGIH TLVs and BEIs (2024 edition) — 参考値のみ、原典を必ず確認のこと ACGIH_2024
 *  - IARC Monographs on the Identification of Carcinogenic Hazards to Humans
 *    https://monographs.iarc.who.int/list-of-classifications
 *    (WHO/IARC open data, non-commercial use, attribution required)
 *
 * 対象:
 *  A. MHLW 告示第177号 対象物質のうち ETL が未取込のもの（特殊表記形式）
 *  B. MHLW がん原性物質リスト掲載物質の IARC 分類補充
 *  C. MHLW 皮膚等障害化学物質・SDS 義務物質への OEL 補充（JSOH/ACGIH 参考値）
 *
 * 注意:
 *  - ACGIH TLV 値の一覧再配布は商用ライセンス必須。本ファイルは参考値の抜粋に留め、
 *    出典明示済み（ACGIH source フィールド）。原典確認を促すコメントを付記すること。
 *  - 「すずとして」「○○として」表記の MHLW 値は note フィールドに原文を保持。
 *  - ※２ 表記物質は MHLW 数値未設定のため ACGIH/JSOH 参考値のみ記載。
 */

// ─── A. MHLW 告示第177号: 特殊表記形式の濃度基準値 ────────────────────────

// A-1: カーボンブラック（レスピラブル粒子）
// 出典: MHLW 告示第177号, IARC Vol.93 Group 2B, ACGIH 2024
const CARBON_BLACK = [
  {
    cas: "1333-86-4",
    name: "カーボンブラック",
    nameEn: "Carbon black",
    iarc: "2B",
    iarcMonograph: "Vol.93",
    mhlw177: { twa: 0.3, unit: "mg/m³" },
    acgih: { twa: 3, unit: "mg/m³" },
    note: "レスピラブル粒子として（MHLW告示値）; ACGIH値は吸入性粒子",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/1333-86-4.pdf",
  },
];

// A-2: すず有機化合物群（「すずとして」単位）
// 出典: MHLW 告示第177号各 SDS
// 数値はすず（Sn）含量として表現されることに注意
const TIN_COMPOUNDS = [
  {
    cas: "818-08-6",
    name: "ジブチルスズ=オキシド",
    nameEn: "Dibutyltin oxide",
    mhlw177: { twa: 0.1, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/818-08-6.pdf",
  },
  {
    cas: "683-18-1",
    name: "ジブチルスズ=ジクロリド",
    nameEn: "Dibutyltin dichloride",
    mhlw177: { twa: 0.1, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/683-18-1.pdf",
  },
  {
    cas: "77-58-7",
    name: "ジブチルスズ=ジラウラート",
    nameEn: "Dibutyltin dilaurate",
    mhlw177: { twa: 0.1, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/77-58-7.pdf",
  },
  {
    cas: "78-04-6",
    name: "ジブチルスズ=マレアート",
    nameEn: "Dibutyltin maleate",
    mhlw177: { twa: 0.1, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/78-04-6.pdf",
  },
  {
    cas: "25168-24-5",
    name: "ジブチルスズビス（イソオクチル＝チオグリコレート）",
    nameEn: "Dibutyltin bis(isooctyl thioglycolate)",
    mhlw177: { twa: 0.1, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/25168-24-5.pdf",
  },
  {
    cas: "1461-25-2",
    name: "テトラブチルスズ",
    nameEn: "Tetrabutyltin",
    mhlw177: { twa: 0.2, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/1461-25-2.pdf",
  },
  {
    cas: "639-58-7",
    name: "トリフェニルスズ=クロリド",
    nameEn: "Triphenyltin chloride",
    mhlw177: { twa: 0.003, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/639-58-7.pdf",
  },
  {
    cas: "1461-22-9",
    name: "トリブチルスズ=クロリド",
    nameEn: "Tributyltin chloride",
    mhlw177: { twa: 0.05, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/1461-22-9.pdf",
  },
  {
    cas: "1983-10-4",
    name: "トリブチルスズ=フルオリド",
    nameEn: "Tributyltin fluoride",
    mhlw177: { twa: 0.05, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/1983-10-4.pdf",
  },
  {
    cas: "1118-46-3",
    name: "ブチルトリクロロスズ",
    nameEn: "Butyltrichlorotin",
    mhlw177: { twa: 0.02, unit: "mg/m³" },
    note: "すずとして（MHLW告示値）",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/1118-46-3.pdf",
  },
];

// A-3: 千区切り数値を持つ MHLW 告示物質（ETL parseLimit の comma に対応）
const MHLW_HIGH_PPM = [
  {
    cas: "75-63-8",
    name: "ブロモトリフルオロメタン",
    nameEn: "Bromotrifluoromethane (Halon 1301)",
    mhlw177: { twa: 1000, unit: "ppm" },
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/75-63-8.pdf",
  },
  {
    cas: "109-87-5",
    name: "メチラール",
    nameEn: "Methylal (dimethoxymethane)",
    mhlw177: { twa: 1000, unit: "ppm" },
    acgih: { twa: 1000, unit: "ppm" },
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/109-87-5.pdf",
  },
];

// A-4: MHLW 濃度基準値対象（※２ 表記: 数値未設定）→ ACGIH/JSOH 参考値を補充
// 出典: ACGIH 2024（参考値）, IARC Monographs
const MHLW_NO_LIMIT_YET = [
  {
    cas: "96-18-4",
    name: "1,2,3-トリクロロプロパン",
    nameEn: "1,2,3-Trichloropropane",
    iarc: "2A",
    iarcMonograph: "Vol.101",
    acgih: { twa: 10, unit: "ppm" },
    note: "MHLW 濃度基準値未設定（皮膚吸収・発がん性懸念）; ACGIH 値は参考",
  },
  {
    cas: "556-52-5",
    name: "2,3-エポキシ-1-プロパノール（グリシドール）",
    nameEn: "Glycidol",
    iarc: "2A",
    iarcMonograph: "Vol.112",
    acgih: { twa: 0.5, unit: "ppm" },
    jsoh: { twa: 0.5, unit: "ppm" },
    note: "MHLW 濃度基準値未設定; ACGIH/JSOH 値は参考",
  },
  {
    cas: "2426-08-6",
    name: "ノルマル-ブチル-2,3-エポキシプロピルエーテル",
    nameEn: "n-Butyl glycidyl ether",
    iarc: "2B",
    acgih: { twa: 3, unit: "ppm" },
    note: "MHLW 濃度基準値未設定; ACGIH 値は参考",
  },
  {
    cas: "100-63-0",
    name: "フェニルヒドラジン",
    nameEn: "Phenylhydrazine",
    iarc: "2B",
    iarcMonograph: "Vol.115",
    acgih: { twa: 0.1, unit: "ppm" },
    note: "皮膚吸収; MHLW 濃度基準値未設定; ACGIH 値は参考",
  },
  {
    cas: "106-91-2",
    name: "メタクリル酸2,3-エポキシプロピル（グリシジルメタクリレート）",
    nameEn: "Glycidyl methacrylate",
    iarc: "2B",
    acgih: { twa: 0.2, unit: "ppm" },
    note: "MHLW 濃度基準値未設定; ACGIH 値は参考",
    mhlwSdsUrl: "https://anzeninfo.mhlw.go.jp/user/anzen/kag/pdf/noudo/106-91-2.pdf",
  },
];

// ─── B. MHLW がん原性物質リスト: IARC 分類補充 ─────────────────────────────
// 以下はすべて concentration-limits.json に未収録の物質
// IARC 分類は WHO IARC Monographs (2024 List of Classifications) より
// https://monographs.iarc.who.int/list-of-classifications

// B-1: IARC Group 1 確定発がん物質
const IARC_GROUP1 = [
  // 抗がん剤・アルキル化剤
  {
    cas: "148-82-3",
    name: "メルファラン",
    nameEn: "Melphalan",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "51-75-2",
    name: "ビス（2-クロロエチル）メチルアミン（HN2・クロルメチン）",
    nameEn: "Bis(2-chloroethyl)methylamine (HN2, Mechlorethamine)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "505-60-2",
    name: "ビス（2-クロロエチル）スルフィド（マスタードガス）",
    nameEn: "Bis(2-chloroethyl)sulfide (Sulfur mustard, Mustard gas)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "52-24-4",
    name: "トリエチレンチオホスホルアミド（チオテパ）",
    nameEn: "Triethylenethiophosphoramide (Thiotepa)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "55-98-1",
    name: "ブタン-1,4-ジイル=ジメタンスルホナート（ブスルファン）",
    nameEn: "1,4-Butanediol dimethanesulfonate (Busulfan, Myleran)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "494-03-1",
    name: "N,N-ビス（2-クロロエチル）-2-ナフチルアミン（クロルナファジン）",
    nameEn: "N,N-bis(2-chloroethyl)-2-naphthylamine (Chlornaphazine)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "6055-19-2",
    name: "シクロホスファミド一水和物",
    nameEn: "Cyclophosphamide monohydrate",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  // 免疫抑制剤
  {
    cas: "79217-60-0",
    name: "シクロスポリン",
    nameEn: "Cyclosporin",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  // ホルモン剤
  {
    cas: "56-53-1",
    name: "ジエチルスチルベストロール（スチルベストロール）",
    nameEn: "Diethylstilbestrol (DES)",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "53-16-7",
    name: "エストロン（3-ヒドロキシ-1,3,5(10)-エストラトリエン-17-オン）",
    nameEn: "Estrone",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  // 天然毒素
  {
    cas: "1402-68-2",
    name: "アフラトキシン",
    nameEn: "Aflatoxins",
    iarc: "1",
    iarcMonograph: "Vol.100F",
  },
  // 鉱物繊維
  {
    cas: "12510-42-8",
    name: "エリオナイト",
    nameEn: "Erionite",
    iarc: "1",
    iarcMonograph: "Vol.42/100C",
  },
  // 結晶質シリカ
  {
    cas: "1317-95-9",
    name: "結晶質シリカ（石英）",
    nameEn: "Crystalline silica - Quartz",
    iarc: "1",
    iarcMonograph: "Vol.68/100C",
    note: "職業的ばく露による吸入時",
  },
  {
    cas: "61790-53-2",
    name: "結晶質シリカ（クリストバライト）",
    nameEn: "Crystalline silica - Cristobalite",
    iarc: "1",
    iarcMonograph: "Vol.68/100C",
    note: "職業的ばく露による吸入時",
  },
  // コールタール蒸留物
  {
    cas: "61789-28-4",
    name: "クレオソート油",
    nameEn: "Creosote oils",
    iarc: "1",
    iarcMonograph: "Vol.35/93",
  },
  // カドミウム化合物 (Group 1)
  {
    cas: "542-83-6",
    name: "カドミウム及びその化合物（酢酸カドミウム）",
    nameEn: "Cadmium acetate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "543-90-8",
    name: "カドミウム及びその化合物（酢酸カドミウム）",
    nameEn: "Cadmium acetate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "2223-93-0",
    name: "カドミウム及びその化合物（酢酸カドミウム二水和物）",
    nameEn: "Cadmium acetate dihydrate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "2605-44-9",
    name: "カドミウム及びその化合物（ベヘン酸カドミウム）",
    nameEn: "Cadmium behenate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "7789-42-6",
    name: "カドミウム及びその化合物（臭化カドミウム）",
    nameEn: "Cadmium bromide",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "7790-78-5",
    name: "カドミウム及びその化合物（塩素酸カドミウム）",
    nameEn: "Cadmium chlorate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "7790-80-9",
    name: "カドミウム及びその化合物（塩化カドミウム）",
    nameEn: "Cadmium chloride",
    iarc: "1",
    iarcMonograph: "Vol.100C",
    acgih: { twa: 0.01, unit: "mg/m³" },
    note: "吸入性粒子として（ACGIH参考値）",
  },
  {
    cas: "7790-84-3",
    name: "カドミウム及びその化合物（硫酸カドミウム）",
    nameEn: "Cadmium sulfate",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "10022-68-1",
    name: "カドミウム及びその化合物（ヨウ化カドミウム）",
    nameEn: "Cadmium iodide",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "21041-95-2",
    name: "カドミウム及びその化合物（水酸化カドミウム）",
    nameEn: "Cadmium hydroxide",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
  {
    cas: "12214-12-9",
    name: "カドミウム及びその化合物（カドミウムセレン化合物系）",
    nameEn: "Cadmium selenide sulfide",
    iarc: "1",
    iarcMonograph: "Vol.100C",
  },
];

// B-2: IARC Group 2A（おそらく発がん性あり）
const IARC_GROUP2A = [
  // 白金抗がん剤
  {
    cas: "15663-27-1",
    name: "シスプラチン",
    nameEn: "Cisplatin",
    iarc: "2A",
    iarcMonograph: "Vol.26/S6",
  },
  // 抗生物質
  {
    cas: "56-75-7",
    name: "クロラムフェニコール",
    nameEn: "Chloramphenicol",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
  // ハロゲン化炭化水素
  {
    cas: "106-93-4",
    name: "1,2-ジブロモエタン（EDB）",
    nameEn: "1,2-Dibromoethane (EDB)",
    iarc: "2A",
    iarcMonograph: "Vol.15/71",
    acgih: { twa: 0.05, unit: "ppm" },
    note: "発がん性（2A）; 皮膚吸収",
  },
  {
    cas: "593-60-2",
    name: "ブロモエチレン（塩化ビニルブロモ）",
    nameEn: "Vinyl bromide",
    iarc: "2A",
    iarcMonograph: "Vol.39/71",
    acgih: { twa: 0.5, unit: "ppm" },
  },
  // 硫酸エステル
  {
    cas: "64-67-5",
    name: "硫酸ジエチル",
    nameEn: "Diethyl sulfate",
    iarc: "2A",
    iarcMonograph: "Vol.54/71",
    acgih: { twa: 0.05, unit: "ppm" },
    note: "皮膚吸収",
  },
  {
    cas: "77-78-1",
    name: "硫酸ジメチル",
    nameEn: "Dimethyl sulfate",
    iarc: "2A",
    iarcMonograph: "Vol.4/71",
    acgih: { twa: 0.1, unit: "ppm" },
    note: "皮膚吸収",
  },
  // カルバモイルクロリド
  {
    cas: "79-44-7",
    name: "ジメチルカルバモイル=クロリド",
    nameEn: "Dimethylcarbamoyl chloride",
    iarc: "2A",
    iarcMonograph: "Vol.12/71",
  },
  // フェノキシ酢酸除草剤類縁物質
  {
    cas: "93-15-2",
    name: "メチルオイゲノール（4-アリル-1,2-ジメトキシベンゼン）",
    nameEn: "Methyleugenol",
    iarc: "2A",
    iarcMonograph: "Vol.101",
  },
  // りん酸エステル系難燃剤
  {
    cas: "126-72-7",
    name: "りん酸トリス（2,3-ジブロモプロピル）",
    nameEn: "Tris(2,3-dibromopropyl) phosphate (TDBPP)",
    iarc: "2A",
    iarcMonograph: "Vol.20/71",
  },
  // 2-ニトロプロパン
  {
    cas: "79-46-9",
    name: "2-ニトロプロパン",
    nameEn: "2-Nitropropane",
    iarc: "2A",
    iarcMonograph: "Vol.71",
    acgih: { twa: 10, unit: "ppm" },
  },
  // 鉛及び無機化合物 (Group 2A)
  {
    cas: "592-05-2",
    name: "鉛及びその無機化合物（酢酸鉛）",
    nameEn: "Lead acetate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "598-63-0",
    name: "鉛及びその無機化合物（炭酸鉛）",
    nameEn: "Lead carbonate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "1344-40-7",
    name: "鉛及びその無機化合物（りん酸水素鉛）",
    nameEn: "Lead hydrogen phosphate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "7446-14-2",
    name: "鉛及びその無機化合物（硫酸鉛）",
    nameEn: "Lead sulfate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "7783-46-2",
    name: "鉛及びその無機化合物（フッ化鉛）",
    nameEn: "Lead fluoride",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "10099-76-0",
    name: "鉛及びその無機化合物（けい酸鉛）",
    nameEn: "Lead silicate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "12013-69-3",
    name: "鉛及びその無機化合物（炭化鉛）",
    nameEn: "Lead carbide",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "12060-00-3",
    name: "鉛及びその無機化合物（酸化鉛）",
    nameEn: "Lead oxide (litharge/massicot)",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "12202-17-4",
    name: "鉛及びその無機化合物",
    nameEn: "Inorganic lead compound",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "13424-46-9",
    name: "鉛及びその無機化合物（アジ化鉛）",
    nameEn: "Lead azide",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "13814-96-5",
    name: "鉛及びその無機化合物（フルオロほう酸鉛）",
    nameEn: "Lead tetrafluoroborate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "14720-53-7",
    name: "鉛及びその無機化合物（亜硝酸鉛）",
    nameEn: "Lead nitrite",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "19783-14-3",
    name: "鉛及びその無機化合物",
    nameEn: "Inorganic lead compound",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "25808-74-6",
    name: "鉛及びその無機化合物（塩化鉛）",
    nameEn: "Lead chloride",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "90583-37-2",
    name: "鉛及びその無機化合物",
    nameEn: "Inorganic lead compound",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "1072-35-1",
    name: "ステアリン酸鉛",
    nameEn: "Lead stearate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "56189-09-4",
    name: "ステアリン酸鉛",
    nameEn: "Lead stearate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "57142-78-6",
    name: "塩基性フタル酸鉛",
    nameEn: "Basic lead phthalate",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  {
    cas: "15245-44-0",
    name: "トリニトロレゾルシン鉛",
    nameEn: "Lead trinitroresorcinate (Lead styphnate)",
    iarc: "2A",
    iarcMonograph: "Vol.87",
  },
  // N-ニトロソ系化合物
  {
    cas: "154-93-8",
    name: "N,N'-ビス（2-クロロエチル）-N-ニトロソ尿素（BCNU・カルムスチン）",
    nameEn: "BCNU (Carmustine)",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
  {
    cas: "13909-09-6",
    name: "N-（2-クロロエチル）-N'-（4-メチルシクロヘキシル）-N-ニトロソ尿素（CCNU・ロムスチン）",
    nameEn: "CCNU (Lomustine)",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
  {
    cas: "54749-90-5",
    name: "N-（2-クロロエチル）-N-ニトロソ-N'-グルコシル尿素（クロロゾトシン）",
    nameEn: "Chlorozotocin",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
];

// B-3: IARC Group 2B（発がん性の可能性）
const IARC_GROUP2B = [
  // ハロゲン化化合物
  {
    cas: "116-14-3",
    name: "テトラフルオロエチレン",
    nameEn: "Tetrafluoroethylene",
    iarc: "2B",
    iarcMonograph: "Vol.97",
    acgih: { twa: 2, unit: "ppm" },
  },
  {
    cas: "75-02-5",
    name: "フッ化ビニル",
    nameEn: "Vinyl fluoride",
    iarc: "2B",
    iarcMonograph: "Vol.97",
    acgih: { twa: 1, unit: "ppm" },
  },
  // ジアゾ化合物
  {
    cas: "334-88-3",
    name: "ジアゾメタン",
    nameEn: "Diazomethane",
    iarc: "2B",
    iarcMonograph: "Vol.71",
    acgih: { twa: 0.2, unit: "ppm" },
    note: "TLV-C (ceiling): ACGIH値は参考",
  },
  // 芳香族アミン
  {
    cas: "615-05-4",
    name: "2,4-ジアミノアニソール",
    nameEn: "2,4-Diaminoanisole",
    iarc: "2B",
    iarcMonograph: "Vol.16/27",
  },
  {
    cas: "95-80-7",
    name: "2,4-ジアミノトルエン",
    nameEn: "2,4-Diaminotoluene",
    iarc: "2B",
    iarcMonograph: "Vol.16/79",
  },
  {
    cas: "838-88-0",
    name: "4,4'-ジアミノ-3,3'-ジメチルジフェニルメタン",
    nameEn: "4,4'-Methylene bis(2-methylaniline)",
    iarc: "2B",
    iarcMonograph: "Vol.99",
  },
  // ニトロ芳香族
  {
    cas: "5522-43-0",
    name: "1-ニトロピレン",
    nameEn: "1-Nitropyrene",
    iarc: "2B",
    iarcMonograph: "Vol.46",
  },
  {
    cas: "7496-02-8",
    name: "6-ニトロクリセン",
    nameEn: "6-Nitrochrysene",
    iarc: "2B",
    iarcMonograph: "Vol.46",
  },
  {
    cas: "25321-14-6",
    name: "2,4-ジニトロトルエン",
    nameEn: "Dinitrotoluenes (2,4-isomer dominant)",
    iarc: "2B",
    iarcMonograph: "Vol.65",
  },
  {
    cas: "79-46-9",
    name: "2-ニトロプロパン",
    nameEn: "2-Nitropropane",
    iarc: "2A",
    iarcMonograph: "Vol.71",
  },
  // ヒドラジン類
  {
    cas: "7803-57-8",
    name: "ヒドラジン一水和物",
    nameEn: "Hydrazine monohydrate",
    iarc: "2B",
    iarcMonograph: "Vol.4/71",
    acgih: { twa: 0.01, unit: "ppm" },
    note: "皮膚吸収; ACGIH 値は参考",
  },
  {
    cas: "540-73-8",
    name: "1,1-ジメチルヒドラジン",
    nameEn: "1,1-Dimethylhydrazine",
    iarc: "2B",
    iarcMonograph: "Vol.71",
    acgih: { twa: 0.01, unit: "ppm" },
    note: "皮膚吸収; ACGIH 値は参考",
  },
  // 炭化ケイ素（繊維状）
  {
    cas: "409-21-2",
    name: "炭化けい素（ウィスカー）",
    nameEn: "Silicon carbide (fibrous/whisker form)",
    iarc: "2B",
    iarcMonograph: "Vol.68",
    note: "IARC 2B はウィスカー・繊維状形態に限定",
  },
  // その他
  {
    cas: "5216-25-1",
    name: "1-クロロ-4-（トリクロロメチル）ベンゼン",
    nameEn: "1-Chloro-4-(trichloromethyl)benzene",
    iarc: "2B",
    iarcMonograph: "Vol.71",
  },
  {
    cas: "5694-00-8",
    name: "アクリルアミド（グリシナミド相当）",
    nameEn: "Oxirane-2-carboxamide",
    iarc: "2B",
  },
  {
    cas: "530-64-3",
    name: "キノリン及びその塩酸塩",
    nameEn: "Quinoline",
    iarc: "2B",
    iarcMonograph: "Vol.108",
  },
  {
    cas: "61789-28-4",
    name: "クレオソート油",
    nameEn: "Creosote",
    iarc: "1",
    iarcMonograph: "Vol.35/93",
  },
];

// B-4: IARC Group 3（ヒト発がん性に分類できない）
const IARC_GROUP3_MISC = [
  {
    cas: "149-30-4",
    name: "2-メルカプトベンゾチアゾール",
    nameEn: "2-Mercaptobenzothiazole",
    iarc: "3",
    iarcMonograph: "Vol.53",
  },
  {
    cas: "101-80-4",
    name: "4,4'-ジアミノジフェニルエーテル",
    nameEn: "4,4'-Diaminodiphenyl ether",
    iarc: "3",
    iarcMonograph: "Vol.29",
  },
];

// ─── C. 皮膚等障害化学物質・SDS 義務物質への OEL 補充 ───────────────────────
// 現在 label_sds / skin カテゴリのみで concentration-limits.json に未収録の重要物質
// 出典: JSOH 2024年度勧告 / ACGIH 2024（参考値）

// C-1: 殺菌剤・防腐剤・農薬系
const PESTICIDES_BIOCIDES = [
  {
    cas: "13194-48-4",
    name: "エトプロホス",
    nameEn: "Ethoprophos",
    iarc: "2B",
    iarcMonograph: "Vol.130",
    note: "有機リン農薬; 皮膚吸収",
  },
  {
    cas: "12071-83-9",
    name: "プロピネブ",
    nameEn: "Propineb",
    note: "ジチオカルバミン酸塩系農薬",
  },
  {
    cas: "13510-89-9",
    name: "アンチモン及びその化合物（三酸化アンチモン）",
    nameEn: "Antimony trioxide",
    iarc: "2B",
    iarcMonograph: "Vol.47/100C",
    acgih: { twa: 0.5, unit: "mg/m³" },
    note: "Sb として（ACGIH 参考値）",
  },
];

// C-2: 染料・顔料中間体
const DYES_INTERMEDIATES = [
  {
    cas: "95-69-2",
    name: "4-クロロ-2-メチルアニリン",
    nameEn: "4-Chloro-2-methylaniline (p-Chloro-o-toluidine)",
    iarc: "1",
    iarcMonograph: "Vol.99",
    acgih: { twa: 0.01, unit: "ppm" },
    note: "皮膚吸収; ACGIH 値は参考",
  },
  {
    cas: "3165-93-3",
    name: "4-クロロ-2-メチルアニリン塩酸塩",
    nameEn: "4-Chloro-2-methylaniline hydrochloride",
    iarc: "1",
    iarcMonograph: "Vol.99",
    note: "皮膚吸収",
  },
  {
    cas: "39156-41-7",
    name: "4-メトキシベンゼン-1,3-ジアミン硫酸塩",
    nameEn: "4-Methoxy-m-phenylenediamine sulfate",
    iarc: "2B",
    iarcMonograph: "Vol.27",
  },
  {
    cas: "224-42-0",
    name: "ジベンゾ[a,j]アクリジン",
    nameEn: "Dibenzo[a,j]acridine",
    iarc: "2B",
    iarcMonograph: "Vol.32",
  },
  {
    cas: "132-32-1",
    name: "3-アミノ-N-エチルカルバゾール",
    nameEn: "3-Amino-N-ethylcarbazole",
    iarc: "2B",
    iarcMonograph: "Vol.16",
  },
  {
    cas: "305-03-3",
    name: "クロラムブシル",
    nameEn: "Chlorambucil",
    iarc: "1",
    iarcMonograph: "Vol.100A",
  },
  {
    cas: "14047-09-7",
    name: "ビス（3,4-ジクロロフェニル）ジアゼン",
    nameEn: "Bis(3,4-dichlorophenyl)diazene",
    iarc: "2B",
    iarcMonograph: "Vol.16",
  },
  {
    cas: "2610-05-1",
    name: "コンゴーレッド（四ナトリウム塩）",
    nameEn: "Congo red",
    iarc: "3",
    iarcMonograph: "Vol.29",
  },
];

// C-3: 工業化学品（ラジカル重合開始剤・その他）
const INDUSTRIAL_CHEMICALS = [
  {
    cas: "79-94-7",
    name: "テトラブロモビスフェノールA",
    nameEn: "Tetrabromobisphenol A (TBBPA)",
    iarc: "2B",
    iarcMonograph: "Vol.115",
  },
  {
    cas: "72-54-8",
    name: "o,p'-DDT（4,4'-(2,2-ジクロロエタン-1,1-ジイル)ジクロロベンゼン）",
    nameEn: "o,p'-DDT",
    iarc: "2A",
    iarcMonograph: "Vol.113",
    note: "DDT 混合物の IARC 2A に準じる",
  },
  {
    cas: "72-55-9",
    name: "p,p'-DDE（4,4'-(2,2-ジクロロエテン-1,1-ジイル)ジクロロベンゼン）",
    nameEn: "p,p'-DDE",
    iarc: "2B",
    iarcMonograph: "Vol.113",
  },
  {
    cas: "64742-52-5",
    name: "石油留分（水素化処理ナフサ）",
    nameEn: "Petroleum streams, hydrotreated naphtha",
    iarc: "3",
  },
  {
    cas: "135-20-6",
    name: "N-ニトロソフェニルヒドロキシルアミンアンモニウム塩（クプフェロン）",
    nameEn: "Cupferron",
    iarc: "2B",
    iarcMonograph: "Vol.71",
  },
  {
    cas: "320-67-2",
    name: "アザシチジン（5-アザシチジン）",
    nameEn: "5-Azacytidine",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
  {
    cas: "56-75-7",
    name: "クロラムフェニコール",
    nameEn: "Chloramphenicol",
    iarc: "2A",
    iarcMonograph: "Vol.50",
  },
  {
    cas: "89-61-2",
    name: "1,4-ジクロロ-2-ニトロベンゼン",
    nameEn: "1,4-Dichloro-2-nitrobenzene",
    iarc: "3",
    iarcMonograph: "Vol.65",
  },
  {
    cas: "611-06-3",
    name: "2,4-ジクロロ-1-ニトロベンゼン",
    nameEn: "2,4-Dichloro-1-nitrobenzene",
    iarc: "3",
    iarcMonograph: "Vol.65",
  },
  {
    cas: "764-41-0",
    name: "1,4-ジクロロ-2-ブテン",
    nameEn: "1,4-Dichloro-2-butene",
    iarc: "2A",
    iarcMonograph: "Vol.71",
  },
  {
    cas: "68308-34-9",
    name: "けつ岩油（シェールオイル）",
    nameEn: "Shale-oils",
    iarc: "1",
    iarcMonograph: "Vol.35",
  },
  {
    cas: "25214-70-4",
    name: "アニリン-ホルムアルデヒド縮合物",
    nameEn: "Aniline-formaldehyde condensates",
    iarc: "2B",
    iarcMonograph: "Vol.99",
  },
  {
    cas: "484-20-8",
    name: "4-メトキシ-7H-フロ[3,2-g][1]ベンゾピラン-7-オン（メトキサレン）",
    nameEn: "Methoxsalen",
    iarc: "1",
    iarcMonograph: "Vol.24/50",
    note: "光感作性物質; PUVA療法併用時に Group 1",
  },
  {
    cas: "98-56-6",
    name: "パラ-クロロトリフルオロメチルベンゼン",
    nameEn: "1-Chloro-4-(trifluoromethyl)benzene",
    acgih: { twa: 100, unit: "ppm" },
  },
  {
    cas: "100-17-4",
    name: "パラ-メトキシニトロベンゼン",
    nameEn: "p-Nitroanisole",
    iarc: "3",
    iarcMonograph: "Vol.65",
  },
  {
    cas: "71133-14-7",
    name: "ブロモジクロロ酢酸",
    nameEn: "Bromodichloroacetic acid",
    iarc: "2B",
    iarcMonograph: "Vol.101",
  },
  // 核種・放射性物質に関連する化学種
  {
    cas: "13520-83-7",
    name: "硝酸ウラニル六水和物",
    nameEn: "Uranium(VI) dinitrate dioxide hexahydrate",
    note: "重金属毒性; 腎毒性",
  },
  {
    cas: "541-09-3",
    name: "酢酸ウラニル（ウラン(VI)ジオキシドジアセテート）",
    nameEn: "Uranium(VI) dioxidediacetate",
    note: "重金属毒性",
  },
  {
    cas: "6159-44-0",
    name: "酢酸ウラニル二水和物",
    nameEn: "Uranium(VI) dioxidediacetate dihydrate",
    note: "重金属毒性",
  },
  {
    cas: "2040-52-0",
    name: "シュウ酸トリウム",
    nameEn: "Thorium bis(ethanedioate)",
    note: "放射性金属; 取扱には放射線障害防止法による規制あり",
  },
  // 臭素化ビフェニル（PBBs）
  {
    cas: "13654-09-6",
    name: "臭素化ビフェニル（ヘキサブロモビフェニル）",
    nameEn: "Polybrominated biphenyls (Hexabromobiphenyl)",
    iarc: "2B",
    iarcMonograph: "Vol.41",
  },
  {
    cas: "27858-07-7",
    name: "臭素化ビフェニル（PBBs）",
    nameEn: "Polybrominated biphenyls",
    iarc: "2B",
    iarcMonograph: "Vol.41",
  },
  {
    cas: "36355-01-8",
    name: "臭素化ビフェニル（ヘキサブロモビフェニル異性体）",
    nameEn: "Polybrominated biphenyls",
    iarc: "2B",
    iarcMonograph: "Vol.41",
  },
  // 銅化合物
  {
    cas: "28407-37-6",
    name: "銅及びその化合物（ジチオカルバミン酸銅）",
    nameEn: "Copper dimethyldithiocarbamate",
    note: "農薬・顔料用途",
  },
];

// ─── エクスポート ────────────────────────────────────────────────────────────

export const EXPANDED_CHEMICALS_4 = [
  ...CARBON_BLACK,
  ...TIN_COMPOUNDS,
  ...MHLW_HIGH_PPM,
  ...MHLW_NO_LIMIT_YET,
  ...IARC_GROUP1,
  ...IARC_GROUP2A,
  ...IARC_GROUP2B,
  ...IARC_GROUP3_MISC,
  ...PESTICIDES_BIOCIDES,
  ...DYES_INTERMEDIATES,
  ...INDUSTRIAL_CHEMICALS,
];
