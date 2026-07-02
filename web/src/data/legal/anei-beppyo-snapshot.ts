/**
 * 【生成物・手書き禁止】安衛法施行令 別表第3/第6の2 スナップショット
 *
 * scripts/etl/build-anei-beppyo-snapshot.mjs が e-Gov法令API v2 の現行条文から機械生成。
 * substance-legal-audit.test.ts がサイト表示タグ（regulation-tag-labels / mock categories）
 * との全件突合に使用する正本。編集は必ず ETL の再実行で行うこと。
 *
 * 取得日: 2026-07-02
 */

export const ANEI_BEPPYO_SNAPSHOT_META = {
  retrievedAt: "2026-07-02",
  seirei: { lawId: "347CO0000000318", revisionId: "347CO0000000318_20260401_507CO0000000361", sha256: "575ea4b36d767844bdf604a4c38ed7efb7045e29bb3c6bca560763b7df69fa65" },
  yukisoku: { lawId: "347M50002000036", revisionId: "347M50002000036_20260401_508M60000100003", sha256: "ba30caa7ab8eccbc0c920f4851038363b351c958fc3eea45d045badf4a8ecc81" },
  tokkasoku: { lawId: "347M50002000039", revisionId: "347M50002000039_20260401_508M60000100003", sha256: "8972d0b29cdcc06a379a58de1d5df34c0dd9d5bace96535d02bf68e27b37e67b" },
} as const;

/** 令別表第3の1エントリ。go は号番号（枝番は「3の2」形式）。isPreparation は製剤・混合物行 */
export type Beppyo3Entry = { go: string; name: string; isPreparation: boolean };

/** 令別表第3 第1号（特化則 第一類物質） */
export const BEPPYO3_CLASS1: readonly Beppyo3Entry[] = [
  {go: "1",name: "ジクロルベンジジン及びその塩",isPreparation: false},
  {go: "2",name: "アルフア―ナフチルアミン及びその塩",isPreparation: false},
  {go: "3",name: "塩素化ビフエニル（別名ＰＣＢ）",isPreparation: false},
  {go: "4",name: "オルト―トリジン及びその塩",isPreparation: false},
  {go: "5",name: "ジアニシジン及びその塩",isPreparation: false},
  {go: "6",name: "ベリリウム及びその化合物",isPreparation: false},
  {go: "7",name: "ベンゾトリクロリド",isPreparation: false},
  {go: "8",name: "１から６までに掲げる物をその重量の一パーセントを超えて含有し、又は７に掲げる物をその重量の〇・五パーセントを超えて含有する製剤その他の物（合金にあつては、ベリリウムをその重量の三パーセントを超えて含有するものに限る。）",isPreparation: true},
];

/** 令別表第3 第2号（特化則 第二類物質） */
export const BEPPYO3_CLASS2: readonly Beppyo3Entry[] = [
  {go: "1",name: "アクリルアミド",isPreparation: false},
  {go: "2",name: "アクリロニトリル",isPreparation: false},
  {go: "3",name: "アルキル水銀化合物（アルキル基がメチル基又はエチル基である物に限る。）",isPreparation: false},
  {go: "3の2",name: "インジウム化合物",isPreparation: false},
  {go: "3の3",name: "エチルベンゼン",isPreparation: false},
  {go: "4",name: "エチレンイミン",isPreparation: false},
  {go: "5",name: "エチレンオキシド",isPreparation: false},
  {go: "6",name: "塩化ビニル",isPreparation: false},
  {go: "7",name: "塩素",isPreparation: false},
  {go: "8",name: "オーラミン",isPreparation: false},
  {go: "8の2",name: "オルト―トルイジン",isPreparation: false},
  {go: "9",name: "オルト―フタロジニトリル",isPreparation: false},
  {go: "10",name: "カドミウム及びその化合物",isPreparation: false},
  {go: "11",name: "クロム酸及びその塩",isPreparation: false},
  {go: "11の2",name: "クロロホルム",isPreparation: false},
  {go: "12",name: "クロロメチルメチルエーテル",isPreparation: false},
  {go: "13",name: "五酸化バナジウム",isPreparation: false},
  {go: "13の2",name: "コバルト及びその無機化合物",isPreparation: false},
  {go: "14",name: "コールタール",isPreparation: false},
  {go: "15",name: "酸化プロピレン",isPreparation: false},
  {go: "15の2",name: "三酸化二アンチモン",isPreparation: false},
  {go: "16",name: "シアン化カリウム",isPreparation: false},
  {go: "17",name: "シアン化水素",isPreparation: false},
  {go: "18",name: "シアン化ナトリウム",isPreparation: false},
  {go: "18の2",name: "四塩化炭素",isPreparation: false},
  {go: "18の3",name: "一・四―ジオキサン",isPreparation: false},
  {go: "18の4",name: "一・二―ジクロロエタン（別名二塩化エチレン）",isPreparation: false},
  {go: "19",name: "三・三′―ジクロロ―四・四′―ジアミノジフェニルメタン",isPreparation: false},
  {go: "19の2",name: "一・二―ジクロロプロパン",isPreparation: false},
  {go: "19の3",name: "ジクロロメタン（別名二塩化メチレン）",isPreparation: false},
  {go: "19の4",name: "ジメチル―二・二―ジクロロビニルホスフェイト（別名ＤＤＶＰ）",isPreparation: false},
  {go: "19の5",name: "一・一―ジメチルヒドラジン",isPreparation: false},
  {go: "20",name: "臭化メチル",isPreparation: false},
  {go: "21",name: "重クロム酸及びその塩",isPreparation: false},
  {go: "22",name: "水銀及びその無機化合物（硫化水銀を除く。）",isPreparation: false},
  {go: "22の2",name: "スチレン",isPreparation: false},
  {go: "22の3",name: "一・一・二・二―テトラクロロエタン（別名四塩化アセチレン）",isPreparation: false},
  {go: "22の4",name: "テトラクロロエチレン（別名パークロルエチレン）",isPreparation: false},
  {go: "22の5",name: "トリクロロエチレン",isPreparation: false},
  {go: "23",name: "トリレンジイソシアネート",isPreparation: false},
  {go: "23の2",name: "ナフタレン",isPreparation: false},
  {go: "23の3",name: "ニツケル化合物（２４に掲げる物を除き、粉状の物に限る。）",isPreparation: false},
  {go: "24",name: "ニツケルカルボニル",isPreparation: false},
  {go: "25",name: "ニトログリコール",isPreparation: false},
  {go: "26",name: "パラ―ジメチルアミノアゾベンゼン",isPreparation: false},
  {go: "27",name: "パラ―ニトロクロルベンゼン",isPreparation: false},
  {go: "27の2",name: "砒素及びその化合物（アルシン及び砒化ガリウムを除く。）",isPreparation: false},
  {go: "28",name: "弗化水素",isPreparation: false},
  {go: "29",name: "ベータ―プロピオラクトン",isPreparation: false},
  {go: "30",name: "ベンゼン",isPreparation: false},
  {go: "31",name: "ペンタクロルフエノール（別名ＰＣＰ）及びそのナトリウム塩",isPreparation: false},
  {go: "31の2",name: "ホルムアルデヒド",isPreparation: false},
  {go: "32",name: "マゼンタ",isPreparation: false},
  {go: "33",name: "マンガン及びその化合物",isPreparation: false},
  {go: "33の2",name: "メチルイソブチルケトン",isPreparation: false},
  {go: "34",name: "沃化メチル",isPreparation: false},
  {go: "34の2",name: "溶接ヒューム",isPreparation: false},
  {go: "34の3",name: "リフラクトリーセラミックファイバー",isPreparation: false},
  {go: "35",name: "硫化水素",isPreparation: false},
  {go: "36",name: "硫酸ジメチル",isPreparation: false},
  {go: "37",name: "１から３６までに掲げる物を含有する製剤その他の物で、厚生労働省令で定めるもの",isPreparation: true},
];

/** 令別表第3 第3号（特化則 第三類物質） */
export const BEPPYO3_CLASS3: readonly Beppyo3Entry[] = [
  {go: "1",name: "アンモニア",isPreparation: false},
  {go: "2",name: "一酸化炭素",isPreparation: false},
  {go: "3",name: "塩化水素",isPreparation: false},
  {go: "4",name: "硝酸",isPreparation: false},
  {go: "5",name: "二酸化硫黄",isPreparation: false},
  {go: "6",name: "フエノール",isPreparation: false},
  {go: "7",name: "ホスゲン",isPreparation: false},
  {go: "8",name: "硫酸",isPreparation: false},
  {go: "9",name: "１から８までに掲げる物を含有する製剤その他の物で、厚生労働省令で定めるもの",isPreparation: true},
];

/** 令別表第6の2（有機溶剤）。欠番（平成26年改正で特化則へ移行した号等）はそのまま欠番 */
export type Beppyo62Entry = { go: number; name: string; isMixture: boolean };
export const BEPPYO6_2: readonly Beppyo62Entry[] = [
  {go: 1,name: "アセトン",isMixture: false},
  {go: 2,name: "イソブチルアルコール",isMixture: false},
  {go: 3,name: "イソプロピルアルコール",isMixture: false},
  {go: 4,name: "イソペンチルアルコール（別名イソアミルアルコール）",isMixture: false},
  {go: 5,name: "エチルエーテル",isMixture: false},
  {go: 6,name: "エチレングリコールモノエチルエーテル（別名セロソルブ）",isMixture: false},
  {go: 7,name: "エチレングリコールモノエチルエーテルアセテート（別名セロソルブアセテート）",isMixture: false},
  {go: 8,name: "エチレングリコールモノ―ノルマル―ブチルエーテル（別名ブチルセロソルブ）",isMixture: false},
  {go: 9,name: "エチレングリコールモノメチルエーテル（別名メチルセロソルブ）",isMixture: false},
  {go: 10,name: "オルト―ジクロルベンゼン",isMixture: false},
  {go: 11,name: "キシレン",isMixture: false},
  {go: 12,name: "クレゾール",isMixture: false},
  {go: 13,name: "クロルベンゼン",isMixture: false},
  {go: 15,name: "酢酸イソブチル",isMixture: false},
  {go: 16,name: "酢酸イソプロピル",isMixture: false},
  {go: 17,name: "酢酸イソペンチル（別名酢酸イソアミル）",isMixture: false},
  {go: 18,name: "酢酸エチル",isMixture: false},
  {go: 19,name: "酢酸ノルマル―ブチル",isMixture: false},
  {go: 20,name: "酢酸ノルマル―プロピル",isMixture: false},
  {go: 21,name: "酢酸ノルマル―ペンチル（別名酢酸ノルマル―アミル）",isMixture: false},
  {go: 22,name: "酢酸メチル",isMixture: false},
  {go: 24,name: "シクロヘキサノール",isMixture: false},
  {go: 25,name: "シクロヘキサノン",isMixture: false},
  {go: 28,name: "一・二―ジクロルエチレン（別名二塩化アセチレン）",isMixture: false},
  {go: 30,name: "Ｎ・Ｎ―ジメチルホルムアミド",isMixture: false},
  {go: 34,name: "テトラヒドロフラン",isMixture: false},
  {go: 35,name: "一・一・一―トリクロルエタン",isMixture: false},
  {go: 37,name: "トルエン",isMixture: false},
  {go: 38,name: "二硫化炭素",isMixture: false},
  {go: 39,name: "ノルマルヘキサン",isMixture: false},
  {go: 40,name: "一―ブタノール",isMixture: false},
  {go: 41,name: "二―ブタノール",isMixture: false},
  {go: 42,name: "メタノール",isMixture: false},
  {go: 44,name: "メチルエチルケトン",isMixture: false},
  {go: 45,name: "メチルシクロヘキサノール",isMixture: false},
  {go: 46,name: "メチルシクロヘキサノン",isMixture: false},
  {go: 47,name: "メチル―ノルマル―ブチルケトン",isMixture: false},
  {go: 48,name: "ガソリン",isMixture: false},
  {go: 49,name: "コールタールナフサ（ソルベントナフサを含む。）",isMixture: false},
  {go: 50,name: "石油エーテル",isMixture: false},
  {go: 51,name: "石油ナフサ",isMixture: false},
  {go: 52,name: "石油ベンジン",isMixture: false},
  {go: 53,name: "テレビン油",isMixture: false},
  {go: 54,name: "ミネラルスピリツト（ミネラルシンナー、ペトロリウムスピリツト、ホワイトスピリツト及びミネラルターペンを含む。）",isMixture: false},
  {go: 55,name: "前各号に掲げる物のみから成る混合物",isMixture: true},
];

/** 有機則第1条第1項第3号: 第一種有機溶剤の令別表第6の2 号番号 */
export const YUKI1_GO: readonly number[] = [28,38];

/** 有機則第1条第1項第4号: 第二種有機溶剤の令別表第6の2 号番号 */
export const YUKI2_GO: readonly number[] = [1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18,19,20,21,22,24,25,30,34,35,37,39,40,41,42,44,45,46,47];

/**
 * 特化則38条の4: 特別管理物質に該当する令別表第3第2号の号番号（レンジ展開済）。
 * このほか第一類物質（塩素化ビフェニル等を除く）も特別管理物質。
 */
export const SPECIAL_CONTROL_GO2: readonly string[] = ["3の2","3の3","4","5","6","8","8の2","11","11の2","12","13の2","14","15","15の2","18の2","18の3","18の4","19","19の2","19の3","19の4","19の5","21","22の2","22の3","22の4","22の5","23の2","23の3","24","26","27の2","29","30","31の2","32","33の2","34の3"];

/**
 * 施行令22条1項3号の原文（特化則健診＝特化則39条の対象業務の範囲）。
 * 対象は「別表第三第一号若しくは第二号」＝第三類物質は特殊健診の対象外。
 * さらに第2号5（エチレンオキシド）・31の2（ホルムアルデヒド）は括弧書きで明示除外。
 * substance-legal-profile.ts の健診対象導出はこの原文への文言ガードで固定する。
 */
export const ARTICLE22_ITEM3_TEXT = "別表第三第一号若しくは第二号に掲げる特定化学物質（同号５及び３１の２に掲げる物並びに同号３７に掲げる物で同号５又は３１の２に係るものを除く。）を製造し、若しくは取り扱う業務（同号８若しくは３２に掲げる物又は同号３７に掲げる物で同号８若しくは３２に係るものを製造する事業場以外の事業場においてこれらの物を取り扱う業務及び同号３の３、１１の２、１３の２、１５、１５の２、１８の２から１８の４まで、１９の２から１９の４まで、２２の２から２２の５まで、２３の２、３３の２若しくは３４の３に掲げる物又は同号３７に掲げる物で同号３の３、１１の２、１３の２、１５、１５の２、１８の２から１８の４まで、１９の２から１９の４まで、２２の２から２２の５まで、２３の２、３３の２若しくは３４の３に係るものを製造し、又は取り扱う業務で厚生労働省令で定めるものを除く。）、第十六条第一項各号に掲げる物（同項第四号に掲げる物及び同項第九号に掲げる物で同項第四号に係るものを除く。）を試験研究のため製造し、若しくは使用する業務又は石綿等の取扱い若しくは試験研究のための製造若しくは石綿分析用試料等の製造に伴い石綿の粉じんを発散する場所における業務";

/** 特化則38条の4 第1項の原文（特別管理物質の定義列挙の文言ガード用） */
export const TOKKA_ARTICLE38_4_TEXT = "事業者は、第一類物質（塩素化ビフェニル等を除く。）又は令別表第三第二号３の２から６まで、８、８の２、１１から１２まで、１３の２から１５の２まで、１８の２から１９の５まで、２１、２２の２から２２の５まで、２３の２から２４まで、２６、２７の２、２９、３０、３１の２、３２、３３の２若しくは３４の３に掲げる物若しくは別表第一第三号の二から第六号まで、第八号、第八号の二、第十一号から第十二号まで、第十三号の二から第十五号の二まで、第十八号の二から第十九号の五まで、第二十一号、第二十二号の二から第二十二号の五まで、第二十三号の二から第二十四号まで、第二十六号、第二十七号の二、第二十九号、第三十号、第三十一号の二、第三十二号、第三十三号の二若しくは第三十四号の三に掲げる物（以下「特別管理物質」と総称する。）を製造し、又は取り扱う作業場（クロム酸等を取り扱う作業場にあつては、クロム酸等を鉱石から製造する事業場においてクロム酸等を取り扱う作業場に限る。）において常時作業に従事する労働者について、一月を超えない期間ごとに次の事項を記録し、これを三十年間保存するものとする。労働者の氏名従事した作業の概要及び当該作業に従事した期間特別管理物質により著しく汚染される事態が生じたときは、その概要及び事業者が講じた応急の措置の概要";
