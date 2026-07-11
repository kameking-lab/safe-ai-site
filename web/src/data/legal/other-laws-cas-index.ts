/**
 * CAS番号 ⇄ 他法令（毒劇法・化審法・高圧ガス）照合インデックス（F2拡張・O11）
 *
 * cas-law-index.ts と同じ設計原則の人手レビュー層:
 * - 名前解決のみを担い、区分（毒物/劇物/特定毒物・第一種/第二種特定）は一切持たない。
 *   区分は必ず other-laws-snapshot.ts（e-Gov生成物）から導出する。
 * - エントリの存在自体が「e-Gov現行条文と突合済み」の宣言。参照が無いエントリは
 *   「非該当であることを確認済み」を意味する（notes に根拠を書く）。
 * - 群指定（「〜化合物」「〜塩類」等）は該当する個別CASを群の号へ紐付け、notes に明記。
 *   ただし書き（含有率下限・除外物）がある号は notes に写す。
 * - nameContains は snapshot 側の同号 name に含まれるべき文字列（号ずれ・改正の自己検査）。
 *
 * レビュー: 2026-07-11 e-Gov現行条文（other-laws-snapshot.ts の revisionId 参照）と
 * サイトDB名称の正規化完全一致＋群指定の人手審査で構築。
 * 生成補助スクリプトの出力を人手レビューの上でコミットしている（機械出力の無審査反映は禁止）。
 */

export type DokugekiTable = "hyo1" | "hyo2" | "hyo3" | "rei1" | "rei2" | "rei3";

export type DokugekiRef = {
  table: DokugekiTable;
  go: string;
  /** 自己検査: snapshot 側の同号の name にこの文字列が含まれること */
  nameContains: string;
};

export type KashinhoRef = {
  clazz: 1 | 2;
  go: string;
  nameContains: string;
};

export type KouatsuRef = {
  kind: "toxic" | "flammable";
  /** 一般高圧ガス保安規則 第2条の品名（完全一致必須） */
  name: string;
};

export type OtherLawsIndexEntry = {
  cas: string;
  label: string;
  /** 毒劇法の該当号。無指定＝非該当を確認済み */
  dokugeki?: readonly DokugekiRef[];
  /** 化審法 特定化学物質の該当号 */
  kashinho?: readonly KashinhoRef[];
  /** 高圧ガス保安法（一般則2条）の品名該当 */
  kouatsu?: readonly KouatsuRef[];
  /** 毒劇法に非該当であることを正本と突合して確認済み（notes に根拠必須） */
  dokugekiNone?: true;
  /** 群指定の範囲・ただし書き・非該当の根拠等 */
  notes?: string;
};

/** 収録: 毒劇法210CAS / 化審法33CAS / 高圧ガス51CAS */
export const OTHER_LAWS_CAS_INDEX: readonly OtherLawsIndexEntry[] = [
  {
    cas: "106-99-0",
    label: "1,3-ブタジエン",
    kouatsu: [{ kind: "flammable", name: "ブタジエン" }],
  },
  {
    cas: "50-29-3",
    label: "DDT",
    kashinho: [{ clazz: 1, go: "7", nameContains: "ＤＤＴ" }],
  },
  {
    cas: "106-97-8",
    label: "n-ブタン",
    kouatsu: [{ kind: "flammable", name: "ブタン" }],
  },
  {
    cas: "5230-87-5",
    label: "しきみの実",
    dokugeki: [{ table: "rei2", go: "39", nameContains: "しきみの実" }],
  },
  {
    cas: "144-62-7",
    label: "しゆう酸",
    dokugeki: [{ table: "hyo2", go: "49", nameContains: "蓚酸" }],
  },
  {
    cas: "7803-51-2",
    label: "りん化水素",
    kouatsu: [{ kind: "toxic", name: "ホスフィン" }, { kind: "flammable", name: "ホスフィン" }],
  },
  {
    cas: "79-06-1",
    label: "アクリルアミド",
    dokugeki: [{ table: "rei2", go: "1の3", nameContains: "アクリルアミド" }],
  },
  {
    cas: "79-10-7",
    label: "アクリル酸",
    dokugeki: [{ table: "rei2", go: "1の4", nameContains: "アクリル酸" }],
    notes: "ただし、アクリル酸一〇％以下を含有するものを除く。",
  },
  {
    cas: "107-13-1",
    label: "アクリロニトリル",
    kouatsu: [{ kind: "toxic", name: "アクリロニトリル" }, { kind: "flammable", name: "アクリロニトリル" }],
  },
  {
    cas: "107-02-8",
    label: "アクロレイン",
    dokugeki: [{ table: "hyo2", go: "2", nameContains: "アクロレイン" }],
    kouatsu: [{ kind: "toxic", name: "アクロレイン" }, { kind: "flammable", name: "アクロレイン" }],
  },
  {
    cas: "26628-22-8",
    label: "アジ化ナトリウム",
    dokugeki: [{ table: "rei1", go: "1", nameContains: "アジ化ナトリウム" }],
    notes: "ただし、アジ化ナトリウム〇・一％以下を含有するものを除く。",
  },
  {
    cas: "74-86-2",
    label: "アセチレン",
    kouatsu: [{ kind: "flammable", name: "アセチレン" }],
  },
  {
    cas: "543-21-5",
    label: "アセチレンジカルボン酸アミド",
    dokugeki: [{ table: "rei2", go: "3", nameContains: "アセチレンジカルボン酸ア" }],
  },
  {
    cas: "75-07-0",
    label: "アセトアルデヒド",
    kouatsu: [{ kind: "flammable", name: "アセトアルデヒド" }],
  },
  {
    cas: "67-64-1",
    label: "アセトン",
    dokugekiNone: true,
    notes: "毒劇法非該当を確認済み（有機則第二種のみ）",
  },
  {
    cas: "62-53-3",
    label: "アニリン",
    dokugeki: [{ table: "hyo2", go: "3", nameContains: "アニリン" }],
  },
  {
    cas: "107-18-6",
    label: "アリルアルコール",
    dokugeki: [{ table: "rei1", go: "1の6", nameContains: "アリルアルコール" }],
  },
  {
    cas: "7784-42-1",
    label: "アルシン",
    dokugeki: [{ table: "rei1", go: "23", nameContains: "砒素化合物" }],
    kouatsu: [{ kind: "toxic", name: "アルシン" }, { kind: "flammable", name: "アルシン" }],
    notes: "砒素化合物（群指定・水素化ヒ素）",
  },
  {
    cas: "309-00-2",
    label: "アルドリン",
    dokugeki: [{ table: "hyo2", go: "77", nameContains: "ヘキサクロルヘキサヒドロ" }],
    kashinho: [{ clazz: 1, go: "4", nameContains: "アルドリン" }],
  },
  {
    cas: "7664-41-7",
    label: "アンモニア",
    dokugeki: [{ table: "hyo2", go: "4", nameContains: "アンモニア" }],
    kouatsu: [{ kind: "toxic", name: "アンモニア" }, { kind: "flammable", name: "アンモニア" }],
  },
  {
    cas: "74-84-0",
    label: "エタン",
    kouatsu: [{ kind: "flammable", name: "エタン" }],
  },
  {
    cas: "75-04-7",
    label: "エチルアミン",
    kouatsu: [{ kind: "flammable", name: "エチルアミン" }],
  },
  {
    cas: "100-41-4",
    label: "エチルベンゼン",
    kouatsu: [{ kind: "flammable", name: "エチルベンゼン" }],
  },
  {
    cas: "2104-64-5",
    label: "エチル－パラ－ニトロフェニルチオノベンゼンホスホネイト（別名ＥＰＮ）",
    dokugeki: [{ table: "hyo1", go: "1", nameContains: "エチルパラニトロフエニル" }],
  },
  {
    cas: "2595-54-2",
    label: "エチル－Ｎ－（ジエチルジチオホスホリルアセチル）－Ｎ－メチルカルバメート",
    dokugeki: [{ table: "hyo2", go: "6", nameContains: "エチル―Ｎ―（ジエチルジ" }],
  },
  {
    cas: "74-85-1",
    label: "エチレン",
    kouatsu: [{ kind: "flammable", name: "エチレン" }],
  },
  {
    cas: "75-21-8",
    label: "エチレンオキシド",
    dokugeki: [{ table: "rei2", go: "14の7", nameContains: "エチレンオキシド" }],
    kouatsu: [{ kind: "toxic", name: "酸化エチレン" }, { kind: "flammable", name: "酸化エチレン" }],
  },
  {
    cas: "115-29-7",
    label: "エンドサルファン",
    kashinho: [{ clazz: 1, go: "29", nameContains: "エンドスルファン" }],
  },
  {
    cas: "7727-18-6",
    label: "オキシ三塩化バナジウム",
    dokugeki: [{ table: "rei2", go: "18の3", nameContains: "オキシ三塩化バナジウム" }],
  },
  {
    cas: "297-78-9",
    label: "オクタクロルテトラヒドロメタノフタラン",
    dokugeki: [{ table: "hyo1", go: "3", nameContains: "オクタクロルテトラヒドロ" }],
  },
  {
    cas: "152-16-9",
    label: "オクタメチルピロホスホルアミド",
    dokugeki: [{ table: "hyo1", go: "4", nameContains: "オクタメチルピロホスホル" }, { table: "hyo3", go: "1", nameContains: "オクタメチルピロホスホル" }],
  },
  {
    cas: "681-84-5",
    label: "オルトケイ酸テトラメチル",
    dokugeki: [{ table: "rei1", go: "5の2", nameContains: "オルトケイ酸テトラメチル" }],
  },
  {
    cas: "7440-43-9",
    label: "カドミウム",
    dokugekiNone: true,
    notes: "単体カドミウムは毒劇法非該当（カドミウム化合物は指定令2条22号で劇物）",
  },
  {
    cas: "7440-09-7",
    label: "カリウム",
    dokugeki: [{ table: "hyo2", go: "13", nameContains: "カリウム" }],
  },
  {
    cas: "11135-81-2",
    label: "カリウムナトリウム合金",
    dokugeki: [{ table: "hyo2", go: "14", nameContains: "カリウムナトリウム合金" }],
  },
  {
    cas: "8006-61-9",
    label: "ガソリン",
    dokugekiNone: true,
    notes: "毒劇法非該当を確認済み（別表・指定令に収載なし）",
  },
  {
    cas: "1330-20-7",
    label: "キシレン",
    dokugeki: [{ table: "rei2", go: "22の4", nameContains: "キシレン" }],
  },
  {
    cas: "91-22-5",
    label: "キノリン",
    dokugeki: [{ table: "rei2", go: "22の5", nameContains: "キノリン" }],
  },
  {
    cas: "8063-06-7",
    label: "クラーレ",
    dokugeki: [{ table: "hyo1", go: "5", nameContains: "クラーレ" }],
  },
  {
    cas: "1319-77-3",
    label: "クレゾール（混合）",
    dokugeki: [{ table: "hyo2", go: "15", nameContains: "クレゾール" }],
  },
  {
    cas: "7789-00-6",
    label: "クロム酸カリウム (再分類)",
    dokugeki: [{ table: "rei2", go: "26", nameContains: "クロム酸塩類" }],
    notes: "クロム酸塩類（群指定）",
  },
  {
    cas: "13765-19-0",
    label: "クロム酸カルシウム (再分類)",
    dokugeki: [{ table: "rei2", go: "26", nameContains: "クロム酸塩類" }],
    notes: "クロム酸塩類（群指定）",
  },
  {
    cas: "7775-11-3",
    label: "クロム酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "26", nameContains: "クロム酸塩類" }],
    notes: "クロム酸塩類（群指定）",
  },
  {
    cas: "7758-97-6",
    label: "クロム酸鉛",
    dokugeki: [{ table: "rei2", go: "26", nameContains: "クロム酸塩類" }],
    notes: "クロム酸塩類（群指定・クロム酸鉛70%以下含有製剤は除外）",
  },
  {
    cas: "109-61-5",
    label: "クロロぎ酸ノルマルプロピル",
    dokugeki: [{ table: "rei2", go: "28の6", nameContains: "クロロぎ酸ノルマルプロピ" }],
  },
  {
    cas: "107-20-0",
    label: "クロロアセトアルデヒド",
    dokugeki: [{ table: "rei1", go: "6の3", nameContains: "クロロアセトアルデヒド" }],
  },
  {
    cas: "75-00-3",
    label: "クロロエタン（別名塩化エチル）",
    kouatsu: [{ kind: "flammable", name: "塩化エチル" }],
  },
  {
    cas: "126-99-8",
    label: "クロロプレン",
    dokugeki: [{ table: "rei2", go: "28の16", nameContains: "クロロプレン" }],
    kouatsu: [{ kind: "toxic", name: "クロロプレン" }],
  },
  {
    cas: "67-66-3",
    label: "クロロホルム",
    dokugeki: [{ table: "hyo2", go: "20", nameContains: "クロロホルム" }],
  },
  {
    cas: "74-87-3",
    label: "クロロメタン",
    kouatsu: [{ kind: "toxic", name: "クロルメチル" }, { kind: "flammable", name: "クロルメチル" }],
  },
  {
    cas: "1885-14-9",
    label: "クロロ炭酸フェニルエステル",
    dokugeki: [{ table: "rei1", go: "6の6", nameContains: "クロロ炭酸フエニルエステ" }],
  },
  {
    cas: "105-39-5",
    label: "クロロ酢酸エチル",
    dokugeki: [{ table: "rei2", go: "28の7", nameContains: "クロロ酢酸エチル" }],
  },
  {
    cas: "3926-62-3",
    label: "クロロ酢酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "28の8", nameContains: "クロロ酢酸ナトリウム" }],
  },
  {
    cas: "96-34-4",
    label: "クロロ酢酸メチル",
    dokugeki: [{ table: "rei1", go: "6の4", nameContains: "クロロ酢酸メチル" }],
  },
  {
    cas: "79-14-1",
    label: "グリコール酸",
    dokugeki: [{ table: "rei2", go: "24の2", nameContains: "グリコール酸" }],
    notes: "ただし、グリコール酸三・六％以下を含有するものを除く。",
  },
  {
    cas: "16961-83-4",
    label: "ケイフッ化水素酸",
    dokugeki: [{ table: "hyo2", go: "21", nameContains: "硅弗化水素酸" }],
  },
  {
    cas: "143-50-0",
    label: "ケポン",
    kashinho: [{ clazz: 1, go: "23", nameContains: "クロルデコン" }],
  },
  {
    cas: "7782-65-2",
    label: "ゲルマン",
    kouatsu: [{ kind: "toxic", name: "モノゲルマン" }, { kind: "flammable", name: "モノゲルマン" }],
  },
  {
    cas: "420-04-2",
    label: "シアナミド",
    dokugeki: [{ table: "rei2", go: "31の2", nameContains: "シアナミド" }],
    notes: "ただし、シアナミド一〇％以下を含有するものを除く。",
  },
  {
    cas: "151-50-8",
    label: "シアン化カリウム",
    dokugeki: [{ table: "rei1", go: "8", nameContains: "無機シアン化合物" }],
    notes: "無機シアン化合物（群指定）",
  },
  {
    cas: "143-33-9",
    label: "シアン化ナトリウム",
    dokugeki: [{ table: "hyo1", go: "8", nameContains: "シアン化ナトリウム" }],
  },
  {
    cas: "74-90-8",
    label: "シアン化水素",
    dokugeki: [{ table: "hyo1", go: "7", nameContains: "シアン化水素" }],
    kouatsu: [{ kind: "toxic", name: "シアン化水素" }, { kind: "flammable", name: "シアン化水素" }],
  },
  {
    cas: "592-04-1",
    label: "シアン化第二水銀",
    dokugeki: [{ table: "rei1", go: "17", nameContains: "水銀化合物" }],
    notes: "水銀化合物（群指定）",
  },
  {
    cas: "544-92-3",
    label: "シアン化銅 (Ⅰ) (再分類)",
    dokugeki: [{ table: "rei1", go: "8", nameContains: "無機シアン化合物" }],
    notes: "無機シアン化合物（群指定）",
  },
  {
    cas: "917-61-3",
    label: "シアン酸ナトリウム",
    dokugeki: [{ table: "hyo2", go: "22", nameContains: "シアン酸ナトリウム" }],
  },
  {
    cas: "75-19-4",
    label: "シクロプロパン",
    kouatsu: [{ kind: "flammable", name: "シクロプロパン" }],
  },
  {
    cas: "66-81-9",
    label: "シクロヘキシミド",
    dokugeki: [{ table: "hyo2", go: "27", nameContains: "シクロヘキシミド" }],
  },
  {
    cas: "108-91-8",
    label: "シクロヘキシルアミン",
    dokugeki: [{ table: "rei2", go: "40の2", nameContains: "シクロヘキシルアミン" }],
  },
  {
    cas: "7803-62-5",
    label: "シラン",
    kouatsu: [{ kind: "toxic", name: "モノシラン" }, { kind: "flammable", name: "モノシラン" }],
  },
  {
    cas: "869-29-4",
    label: "ジアセトキシプロペン",
    dokugeki: [{ table: "rei1", go: "6の16", nameContains: "ジアセトキシプロペン" }],
  },
  {
    cas: "5827-05-4",
    label: "ジイソプロピル－Ｓ－（エチルスルフィニルメチル）－ジチオホスフェイト",
    dokugeki: [{ table: "rei2", go: "33", nameContains: "ジイソプロピル―Ｓ―（エ" }],
    notes: "ただし、ジイソプロピル―Ｓ―（エチルスルフイニルメチル）―ジチオホスフエイト五％以下を含有するものを除く。",
  },
  {
    cas: "13286-32-3",
    label: "ジエチル-S-ベンジルチオホスフェイト（別名：キタジン）",
    dokugeki: [{ table: "rei2", go: "37の6", nameContains: "ジエチル―Ｓ―ベンジルチ" }],
    notes: "ただし、ジエチル―Ｓ―ベンジルチオホスフエイト二・三％以下を含有するものを除く。",
  },
  {
    cas: "109-89-7",
    label: "ジエチルアミン",
    kouatsu: [{ kind: "toxic", name: "ジエチルアミン" }],
  },
  {
    cas: "3078-97-5",
    label: "ジエチルパラジメチルアミノスルホニルフェニルチオホスフェイト",
    dokugeki: [{ table: "rei1", go: "9の4", nameContains: "ジエチルパラジメチルアミ" }],
  },
  {
    cas: "56-38-2",
    label: "ジエチル－パラ－ニトロフェニルチオホスフェイト（別名パラチオン）",
    dokugeki: [{ table: "hyo1", go: "9", nameContains: "ジエチルパラニトロフエニ" }, { table: "hyo3", go: "3", nameContains: "ジエチルパラニトロフエニ" }],
  },
  {
    cas: "1587-41-3",
    label: "ジクロルジニトロメタン",
    dokugeki: [{ table: "rei2", go: "40の4", nameContains: "ジクロルジニトロメタン" }],
  },
  {
    cas: "821-10-3",
    label: "ジクロルブチン",
    dokugeki: [{ table: "hyo2", go: "29", nameContains: "ジクロルブチン" }],
  },
  {
    cas: "115-32-2",
    label: "ジコフォル",
    kashinho: [{ clazz: 1, go: "14", nameContains: "ケルセン" }],
  },
  {
    cas: "101-83-7",
    label: "ジシクロヘキシルアミン",
    dokugeki: [{ table: "rei2", go: "42の2", nameContains: "ジシクロヘキシルアミン" }],
    notes: "ただし、ジシクロヘキシルアミン四％以下を含有するものを除く。",
  },
  {
    cas: "1590-87-0",
    label: "ジシラン",
    kouatsu: [{ kind: "toxic", name: "ジシラン" }, { kind: "flammable", name: "ジシラン" }],
  },
  {
    cas: "25550-58-7",
    label: "ジニトロフェノール",
    dokugeki: [{ table: "rei1", go: "12の2", nameContains: "ジニトロフエノール" }],
  },
  {
    cas: "39300-45-3",
    label: "ジニトロメチルヘプチルフェニルクロトナート",
    dokugeki: [{ table: "rei2", go: "46の2", nameContains: "ジニトロメチルヘプチルフ" }],
    notes: "ただし、ジニトロメチルヘプチルフエニルクロトナート〇・二％以下を含有するものを除く。",
  },
  {
    cas: "19287-45-7",
    label: "ジボラン",
    dokugeki: [{ table: "rei1", go: "13の5", nameContains: "ジボラン" }],
    kouatsu: [{ kind: "toxic", name: "ジボラン" }, { kind: "flammable", name: "ジボラン" }],
  },
  {
    cas: "3309-87-3",
    label: "ジメチル-S-パラクロルフェニルチオホスフェイト",
    dokugeki: [{ table: "rei2", go: "55の2", nameContains: "ジメチル―Ｓ―パラクロル" }],
  },
  {
    cas: "36614-38-7",
    label: "ジメチル-（イソプロピルチオエチル）-ジチオホスフェイト",
    dokugeki: [{ table: "rei1", go: "13の6", nameContains: "ジメチル―（イソプロピル" }],
    notes: "ただし、ジメチル―（イソプロピルチオエチル）―ジチオホスフエイト四％以下を含有するものを除く。",
  },
  {
    cas: "124-40-3",
    label: "ジメチルアミン",
    dokugeki: [{ table: "rei2", go: "50の7", nameContains: "ジメチルアミン" }],
    kouatsu: [{ kind: "flammable", name: "ジメチルアミン" }],
    notes: "ただし、ジメチルアミン五〇％以下を含有するものを除く。",
  },
  {
    cas: "2674-91-1",
    label: "ジメチルエチルスルフィニルイソプロピルチオホスフェイト",
    dokugeki: [{ table: "hyo2", go: "38", nameContains: "ジメチルエチルスルフイニ" }],
  },
  {
    cas: "115-10-6",
    label: "ジメチルエーテル",
    kouatsu: [{ kind: "flammable", name: "メチルエーテル" }],
  },
  {
    cas: "732-11-6",
    label: "ジメチルフタリルイミドメチルジチオホスフェイト",
    dokugeki: [{ table: "hyo2", go: "43", nameContains: "ジメチルフタリルイミドメ" }],
  },
  {
    cas: "7782-49-2",
    label: "セレン",
    dokugeki: [{ table: "hyo1", go: "16", nameContains: "セレン" }],
  },
  {
    cas: "7783-07-5",
    label: "セレン化水素",
    dokugeki: [{ table: "rei1", go: "18", nameContains: "セレン化合物" }],
    kouatsu: [{ kind: "toxic", name: "セレン化水素" }, { kind: "flammable", name: "セレン化水素" }],
    notes: "セレン化合物（群指定）",
  },
  {
    cas: "592-85-8",
    label: "チオシアン酸水銀（II）",
    dokugeki: [{ table: "rei1", go: "17", nameContains: "水銀化合物" }],
    notes: "水銀化合物（群指定）",
  },
  {
    cas: "79-19-6",
    label: "チオセミカルバジド",
    dokugeki: [{ table: "hyo1", go: "17", nameContains: "チオセミカルバジド" }],
  },
  {
    cas: "107-49-3",
    label: "テトラエチルピロホスフェイト（別名ＴＥＰＰ）",
    dokugeki: [{ table: "hyo1", go: "18", nameContains: "テトラエチルピロホスフエ" }, { table: "hyo3", go: "7", nameContains: "テトラエチルピロホスフエ" }],
  },
  {
    cas: "78-00-2",
    label: "テトラエチル鉛",
    dokugeki: [{ table: "hyo1", go: "6", nameContains: "四アルキル鉛" }, { table: "hyo3", go: "2", nameContains: "四アルキル鉛" }],
    notes: "四アルキル鉛（群指定）の一種",
  },
  {
    cas: "39185-89-2",
    label: "テトラクロルニトロエタン",
    dokugeki: [{ table: "rei2", go: "71の2", nameContains: "テトラクロルニトロエタン" }],
  },
  {
    cas: "127-18-4",
    label: "テトラクロロエチレン",
    kashinho: [{ clazz: 2, go: "2", nameContains: "テトラクロロエチレン" }],
  },
  {
    cas: "40088-47-9",
    label: "テトラブロモ(フェノキシベンゼン)",
    kashinho: [{ clazz: 1, go: "25", nameContains: "テトラブロモ（フェノキシ" }],
  },
  {
    cas: "75-59-2",
    label: "テトラメチルアンモニウム＝ヒドロキシド",
    dokugeki: [{ table: "rei1", go: "19の3", nameContains: "テトラメチルアンモニウム" }],
  },
  {
    cas: "75-74-1",
    label: "テトラメチル鉛",
    dokugeki: [{ table: "hyo1", go: "6", nameContains: "四アルキル鉛" }, { table: "hyo3", go: "2", nameContains: "四アルキル鉛" }],
    notes: "四アルキル鉛（群指定）の一種",
  },
  {
    cas: "60-57-1",
    label: "ディルドリン",
    dokugeki: [{ table: "hyo2", go: "75", nameContains: "ヘキサクロルエポキシオク" }],
    kashinho: [{ clazz: 1, go: "5", nameContains: "ディルドリン" }],
  },
  {
    cas: "8001-35-2",
    label: "トキサフェン",
    kashinho: [{ clazz: 1, go: "12", nameContains: "トキサフェン" }],
  },
  {
    cas: "4607-81-2",
    label: "トリクロルニトロエチレン",
    dokugeki: [{ table: "rei2", go: "73の2", nameContains: "トリクロルニトロエチレン" }],
  },
  {
    cas: "79-01-6",
    label: "トリクロロエチレン",
    kashinho: [{ clazz: 2, go: "1", nameContains: "トリクロロエチレン" }],
  },
  {
    cas: "10025-78-2",
    label: "トリクロロシラン",
    dokugeki: [{ table: "rei2", go: "74の3", nameContains: "トリクロロシラン" }],
  },
  {
    cas: "98-13-5",
    label: "トリクロロ（フェニル）シラン",
    dokugeki: [{ table: "rei2", go: "74の4", nameContains: "トリクロロ（フエニル）シ" }],
  },
  {
    cas: "7094-94-2",
    label: "トリフェ ニルスズ=クロロアセタート",
    kashinho: [{ clazz: 2, go: "10", nameContains: "トリフェニルスズ＝クロロ" }],
  },
  {
    cas: "1803-12-9",
    label: "トリフェニルスズ=N,N-ジメチルジチオカルバマート",
    kashinho: [{ clazz: 2, go: "4", nameContains: "トリフェニルスズ＝Ｎ・Ｎ" }],
  },
  {
    cas: "1493-13-6",
    label: "トリフルオロメタンスルホン酸",
    dokugeki: [{ table: "rei2", go: "74の7", nameContains: "トリフルオロメタンスルホ" }],
    notes: "ただし、トリフルオロメタンスルホン酸一〇％以下を含有するものを除く。",
  },
  {
    cas: "102-82-9",
    label: "トリブチルアミン",
    dokugeki: [{ table: "rei1", go: "19の6", nameContains: "トリブチルアミン" }],
  },
  {
    cas: "6517-25-5",
    label: "トリブチルスズ=スルファマート",
    kashinho: [{ clazz: 2, go: "19", nameContains: "トリブチルスズ＝スルファ" }],
  },
  {
    cas: "2155-70-6",
    label: "トリブチルスズ=メタクリラート",
    kashinho: [{ clazz: 2, go: "11", nameContains: "トリブチルスズ＝メタクリ" }],
  },
  {
    cas: "3090-36-6",
    label: "トリブチルスズ=ラウラート",
    kashinho: [{ clazz: 2, go: "16", nameContains: "トリブチルスズ＝ラウラー" }],
  },
  {
    cas: "75-50-3",
    label: "トリメチルアミン",
    kouatsu: [{ kind: "toxic", name: "トリメチルアミン" }, { kind: "flammable", name: "トリメチルアミン" }],
  },
  {
    cas: "26915-12-8",
    label: "トルイジン",
    dokugeki: [{ table: "hyo2", go: "61", nameContains: "トルイジン" }],
  },
  {
    cas: "108-88-3",
    label: "トルエン",
    dokugeki: [{ table: "rei2", go: "76の2", nameContains: "トルエン" }],
  },
  {
    cas: "7440-23-5",
    label: "ナトリウム",
    dokugeki: [{ table: "hyo2", go: "62", nameContains: "ナトリウム" }],
  },
  {
    cas: "54-11-5",
    label: "ニコチン",
    dokugeki: [{ table: "hyo1", go: "19", nameContains: "ニコチン" }],
  },
  {
    cas: "13463-39-3",
    label: "ニッケルカルボニル",
    dokugeki: [{ table: "hyo1", go: "20", nameContains: "ニツケルカルボニル" }],
  },
  {
    cas: "98-95-3",
    label: "ニトロベンゼン",
    dokugeki: [{ table: "hyo2", go: "63", nameContains: "ニトロベンゼン" }],
  },
  {
    cas: "25154-52-3",
    label: "ノニルフェノール",
    dokugeki: [{ table: "rei2", go: "78の2", nameContains: "ノニルフエノール" }],
    notes: "ただし、ノニルフエノール一％以下を含有するものを除く。",
  },
  {
    cas: "95-70-5",
    label: "パラトルイレンジアミン",
    dokugeki: [{ table: "hyo2", go: "66", nameContains: "パラトルイレンジアミン" }],
  },
  {
    cas: "7803-57-8",
    label: "ヒドラジン一水和物",
    dokugeki: [{ table: "rei2", go: "80の5", nameContains: "ヒドラジン一水和物" }],
    notes: "ただし、ヒドラジン一水和物三〇％以下を含有するものを除く。",
  },
  {
    cas: "302-01-2",
    label: "ヒドラジン及びその一水和物",
    dokugeki: [{ table: "rei1", go: "23の2", nameContains: "ヒドラジン" }],
  },
  {
    cas: "7803-49-8",
    label: "ヒドロキシルアミン",
    dokugeki: [{ table: "hyo2", go: "69", nameContains: "ヒドロキシルアミン" }],
  },
  {
    cas: "1303-00-0",
    label: "ヒ化ガリウム (別名：ガリウムヒ素)",
    dokugekiNone: true,
    notes: "毒劇法非該当を確認済み（砒素化合物の群指定から指定令1条23号ただし書きで明示除外）",
  },
  {
    cas: "7440-38-2",
    label: "ヒ素",
    dokugeki: [{ table: "hyo1", go: "21", nameContains: "砒素" }],
  },
  {
    cas: "4782-29-0",
    label: "ビス（トリブチルスズ）=フタラート",
    kashinho: [{ clazz: 2, go: "17", nameContains: "ビス（トリブチルスズ）＝" }],
  },
  {
    cas: "6454-35-9",
    label: "ビス（トリブチルスズ）=フマラート",
    kashinho: [{ clazz: 2, go: "12", nameContains: "ビス（トリブチルスズ）＝" }],
  },
  {
    cas: "14275-57-1",
    label: "ビス（トリブチルスズ）=マレアート",
    kashinho: [{ clazz: 2, go: "20", nameContains: "ビス（トリブチルスズ）＝" }],
  },
  {
    cas: "88-89-1",
    label: "ピクリン酸",
    dokugeki: [{ table: "hyo2", go: "68", nameContains: "ピクリン酸" }],
    notes: "ただし、爆発薬を除く。",
  },
  {
    cas: "108-95-2",
    label: "フェノール",
    dokugeki: [{ table: "hyo2", go: "70", nameContains: "フエノール" }],
  },
  {
    cas: "7664-39-3",
    label: "フッ化水素",
    dokugeki: [{ table: "hyo1", go: "22", nameContains: "弗化水素" }],
  },
  {
    cas: "7782-41-4",
    label: "フッ素",
    kouatsu: [{ kind: "toxic", name: "ふつ素" }],
  },
  {
    cas: "7789-21-1",
    label: "フルオロスルホン酸",
    dokugeki: [{ table: "rei1", go: "24の3", nameContains: "フルオロスルホン酸" }],
  },
  {
    cas: "27949-52-6",
    label: "ブチル-S-ベンジル-S-エチルジチオホスフェイト",
    dokugeki: [{ table: "rei2", go: "85の11", nameContains: "ブチル―Ｓ―ベンジル―Ｓ" }],
  },
  {
    cas: "2079-00-7",
    label: "ブラストサイジンS",
    dokugeki: [{ table: "hyo2", go: "71", nameContains: "ブラストサイジンＳ" }],
  },
  {
    cas: "598-31-2",
    label: "ブロムアセトン",
    dokugeki: [{ table: "rei2", go: "87の3", nameContains: "ブロムアセトン" }],
  },
  {
    cas: "74-83-9",
    label: "ブロモメタン",
    kouatsu: [{ kind: "toxic", name: "ブロムメチル" }, { kind: "flammable", name: "ブロムメチル" }],
  },
  {
    cas: "105-36-2",
    label: "ブロモ酢酸エチル",
    dokugeki: [{ table: "rei1", go: "24の6", nameContains: "ブロモ酢酸エチル" }],
  },
  {
    cas: "74-98-6",
    label: "プロパン",
    kouatsu: [{ kind: "flammable", name: "プロパン" }],
  },
  {
    cas: "115-07-1",
    label: "プロピレン",
    kouatsu: [{ kind: "flammable", name: "プロピレン" }],
  },
  {
    cas: "75-56-9",
    label: "プロピレンオキシド",
    kouatsu: [{ kind: "flammable", name: "酸化プロピレン" }],
  },
  {
    cas: "77-47-4",
    label: "ヘキサクロロシクロペンタジエン",
    dokugeki: [{ table: "rei1", go: "26の2", nameContains: "ヘキサクロロシクロペンタ" }],
  },
  {
    cas: "118-74-1",
    label: "ヘキサクロロベンゼン",
    kashinho: [{ clazz: 1, go: "3", nameContains: "ヘキサクロロベンゼン" }],
  },
  {
    cas: "25637-99-4",
    label: "ヘキサブロモシクロドデカン",
    kashinho: [{ clazz: 1, go: "30", nameContains: "ヘキサブロモシクロドデカ" }],
  },
  {
    cas: "142-62-1",
    label: "ヘキサン酸",
    dokugeki: [{ table: "rei2", go: "91の3", nameContains: "ヘキサン酸" }],
    notes: "ただし、ヘキサン酸一一％以下を含有するものを除く。",
  },
  {
    cas: "76-44-8",
    label: "ヘプタクロル",
    kashinho: [{ clazz: 1, go: "8", nameContains: "ヘプタクロル" }],
  },
  {
    cas: "111-14-8",
    label: "ヘプタン酸",
    dokugeki: [{ table: "rei2", go: "92の2", nameContains: "ヘプタン酸" }],
    notes: "ただし、ヘプタン酸一一％以下を含有するものを除く。",
  },
  {
    cas: "135-19-3",
    label: "ベタナフトール（別名2-ナフトール）",
    dokugeki: [{ table: "hyo2", go: "78", nameContains: "ベタナフトール" }],
  },
  {
    cas: "71-43-2",
    label: "ベンゼン",
    kouatsu: [{ kind: "toxic", name: "ベンゼン" }, { kind: "flammable", name: "ベンゼン" }],
    dokugekiNone: true,
    notes: "毒劇法非該当を確認済み（別表・指定令に収載なし。旧ミラーの毒劇タグは偽陽性として除去）",
  },
  {
    cas: "1763-23-1",
    label: "ペルフルオロオクタンスルホン酸 (PFOS)",
    kashinho: [{ clazz: 1, go: "17", nameContains: "ＰＦＯＳ" }],
  },
  {
    cas: "335-67-1",
    label: "ペルフルオロオクタン酸 (PFOA)",
    kashinho: [{ clazz: 1, go: "34", nameContains: "ＰＦＯＡ" }],
  },
  {
    cas: "87-86-5",
    label: "ペンタクロロフェノール",
    dokugeki: [{ table: "hyo2", go: "80", nameContains: "ペンタクロルフエノール（" }],
    kashinho: [{ clazz: 1, go: "31", nameContains: "ペンタクロロフェノール" }],
  },
  {
    cas: "131-52-2",
    label: "ペンタクロロフェノールナトリウム",
    dokugeki: [{ table: "rei2", go: "95", nameContains: "ペンタクロルフエノール塩" }],
    notes: "ペンタクロルフエノール塩類（群指定）。1%以下含有製剤は除外",
  },
  {
    cas: "608-93-5",
    label: "ペンタクロロベンゼン",
    kashinho: [{ clazz: 1, go: "19", nameContains: "ペンタクロロベンゼン" }],
  },
  {
    cas: "109-52-4",
    label: "ペンタン酸",
    dokugeki: [{ table: "rei2", go: "95の2", nameContains: "ペンタン酸" }],
    notes: "ただし、ペンタン酸一一％以下を含有するものを除く。",
  },
  {
    cas: "75-44-5",
    label: "ホスゲン",
    dokugeki: [{ table: "rei1", go: "26の4", nameContains: "ホスゲン" }],
    kouatsu: [{ kind: "toxic", name: "ホスゲン" }],
  },
  {
    cas: "10294-56-1",
    label: "ホスホン酸",
    dokugeki: [{ table: "rei2", go: "96の2", nameContains: "ホスホン酸" }],
  },
  {
    cas: "50-00-0",
    label: "ホルムアルデヒド",
    dokugeki: [{ table: "hyo2", go: "81", nameContains: "ホルムアルデヒド" }],
  },
  {
    cas: "53469-21-9",
    label: "ポリ塩化ビフェニル",
    kashinho: [{ clazz: 1, go: "1", nameContains: "ポリ塩化ビフェニル" }],
  },
  {
    cas: "2385-85-5",
    label: "マイレックス",
    kashinho: [{ clazz: 1, go: "13", nameContains: "マイレックス" }],
  },
  {
    cas: "79-41-4",
    label: "メタクリル酸",
    dokugeki: [{ table: "rei2", go: "98の4", nameContains: "メタクリル酸" }],
    notes: "ただし、メタクリル酸二五％以下を含有するものを除く。",
  },
  {
    cas: "67-56-1",
    label: "メタノール",
    dokugeki: [{ table: "hyo2", go: "83", nameContains: "メタノール" }],
  },
  {
    cas: "7803-55-6",
    label: "メタバナジン酸アンモニウム",
    dokugeki: [{ table: "rei2", go: "98の5", nameContains: "メタバナジン酸アンモニウ" }],
    notes: "ただし、メタバナジン酸アンモニウム〇・〇一％以下を含有するものを除く。",
  },
  {
    cas: "74-82-8",
    label: "メタン",
    kouatsu: [{ kind: "flammable", name: "メタン" }],
  },
  {
    cas: "6423-72-9",
    label: "メタンアルソン酸カルシウム",
    dokugeki: [{ table: "rei2", go: "98の6", nameContains: "メタンアルソン酸カルシウ" }],
  },
  {
    cas: "33972-75-7",
    label: "メタンアルソン酸鉄",
    dokugeki: [{ table: "rei2", go: "98の7", nameContains: "メタンアルソン酸鉄" }],
  },
  {
    cas: "124-63-0",
    label: "メタンスルホニル＝クロリド",
    dokugeki: [{ table: "rei1", go: "26の5", nameContains: "メタンスルホニル＝クロリ" }],
  },
  {
    cas: "75-75-2",
    label: "メタンスルホン酸",
    dokugeki: [{ table: "rei2", go: "98の8", nameContains: "メタンスルホン酸" }],
    notes: "ただし、メタンスルホン酸〇・五％以下を含有するものを除く。",
  },
  {
    cas: "74-89-5",
    label: "メチルアミン",
    dokugeki: [{ table: "rei2", go: "98の10", nameContains: "メチルアミン" }],
    kouatsu: [{ kind: "toxic", name: "モノメチルアミン" }, { kind: "flammable", name: "モノメチルアミン" }],
    notes: "ただし、メチルアミン四〇％以下を含有するものを除く。",
  },
  {
    cas: "78-93-3",
    label: "メチルエチルケトン",
    dokugeki: [{ table: "rei2", go: "98の13", nameContains: "メチルエチルケトン" }],
  },
  {
    cas: "18984-32-2",
    label: "メチルジチオカルバミン酸亜鉛",
    dokugeki: [{ table: "rei2", go: "99の6", nameContains: "メチルジチオカルバミン酸" }],
  },
  {
    cas: "76-20-0",
    label: "メチルスルホナール",
    dokugeki: [{ table: "hyo2", go: "84", nameContains: "メチルスルホナール" }],
  },
  {
    cas: "676-97-1",
    label: "メチルホスホン酸ジクロリド",
    dokugeki: [{ table: "rei1", go: "26の8", nameContains: "メチルホスホン酸ジクロリ" }],
  },
  {
    cas: "756-79-6",
    label: "メチルホスホン酸ジメチル",
    dokugeki: [{ table: "rei2", go: "100の9", nameContains: "メチルホスホン酸ジメチル" }],
  },
  {
    cas: "74-93-1",
    label: "メチルメルカプタン",
    dokugeki: [{ table: "rei1", go: "26の10", nameContains: "メチルメルカプタン" }],
  },
  {
    cas: "556-61-6",
    label: "メチル＝イソチオシアネート",
    dokugeki: [{ table: "rei2", go: "98の11", nameContains: "メチルイソチオシアネート" }],
  },
  {
    cas: "68-11-1",
    label: "メルカプト酢酸",
    dokugeki: [{ table: "rei2", go: "100の18", nameContains: "メルカプト酢酸" }],
    notes: "ただし、メルカプト酢酸一％以下を含有するものを除く。",
  },
  {
    cas: "144-49-0",
    label: "モノフルオール酢酸",
    dokugeki: [{ table: "hyo1", go: "25", nameContains: "モノフルオール酢酸" }, { table: "hyo3", go: "8", nameContains: "モノフルオール酢酸" }],
  },
  {
    cas: "640-19-7",
    label: "モノフルオール酢酸アミド",
    dokugeki: [{ table: "hyo1", go: "26", nameContains: "モノフルオール酢酸アミド" }, { table: "hyo3", go: "9", nameContains: "モノフルオール酢酸アミド" }],
  },
  {
    cas: "351-05-3",
    label: "モノフルオール酢酸パラブロムアニリド",
    dokugeki: [{ table: "rei2", go: "101", nameContains: "モノフルオール酢酸パラブ" }],
  },
  {
    cas: "24312-44-5",
    label: "モノフルオール酢酸パラブロムベンジルアミド",
    dokugeki: [{ table: "rei2", go: "101の2", nameContains: "モノフルオール酢酸パラブ" }],
  },
  {
    cas: "110-91-8",
    label: "モルホリン",
    dokugeki: [{ table: "rei2", go: "101の3", nameContains: "モルホリン" }],
    notes: "ただし、モルホリン六％以下を含有するものを除く。",
  },
  {
    cas: "10034-85-2",
    label: "ヨウ化水素",
    dokugeki: [{ table: "hyo2", go: "87", nameContains: "沃化水素" }],
  },
  {
    cas: "58-89-9",
    label: "リンデン (γ-BHC)",
    dokugeki: [{ table: "hyo2", go: "76", nameContains: "一・二・三・四・五・六―" }],
    kashinho: [{ clazz: 1, go: "22", nameContains: "ガンマ" }],
  },
  {
    cas: "108-46-3",
    label: "レソルシノール",
    dokugeki: [{ table: "rei2", go: "108", nameContains: "レソルシノール" }],
    notes: "ただし、レソルシノール二〇％以下を含有するものを除く。",
  },
  {
    cas: "5349-28-0",
    label: "ロダン酢酸エチル",
    dokugeki: [{ table: "hyo2", go: "92", nameContains: "ロダン酢酸エチル" }],
  },
  {
    cas: "83-79-4",
    label: "ロテノン",
    dokugeki: [{ table: "hyo2", go: "93", nameContains: "ロテノン" }],
  },
  {
    cas: "1341-49-7",
    label: "一水素二フッ化アンモニウム",
    dokugeki: [{ table: "rei2", go: "10の2", nameContains: "一水素二弗化アンモニウム" }],
    notes: "ただし、一水素二弗化アンモニウム四％以下を含有するものを除く。",
  },
  {
    cas: "630-08-0",
    label: "一酸化炭素",
    kouatsu: [{ kind: "toxic", name: "一酸化炭素" }, { kind: "flammable", name: "一酸化炭素" }],
  },
  {
    cas: "7637-07-2",
    label: "三フッ化ほう素",
    kouatsu: [{ kind: "toxic", name: "三フッ化ホウ素" }],
  },
  {
    cas: "7783-55-3",
    label: "三フッ化リン",
    dokugeki: [{ table: "rei1", go: "6の15", nameContains: "三弗化燐" }],
    kouatsu: [{ kind: "toxic", name: "三フッ化リン" }],
  },
  {
    cas: "10025-91-9",
    label: "三塩化アンチモン",
    dokugeki: [{ table: "rei2", go: "7", nameContains: "アンチモン化合物" }],
    notes: "アンチモン化合物（群指定）",
  },
  {
    cas: "7705-07-9",
    label: "三塩化チタン",
    dokugeki: [{ table: "rei2", go: "30の7", nameContains: "三塩化チタン" }],
  },
  {
    cas: "10294-34-5",
    label: "三塩化ホウ素",
    dokugeki: [{ table: "rei1", go: "6の11", nameContains: "三塩化硼素" }],
  },
  {
    cas: "7783-54-2",
    label: "三弗化窒素",
    kouatsu: [{ kind: "toxic", name: "三フッ化窒素" }],
  },
  {
    cas: "1327-53-3",
    label: "三酸化二ヒ素",
    dokugeki: [{ table: "rei1", go: "23", nameContains: "砒素化合物" }],
    notes: "砒素化合物（群指定）",
  },
  {
    cas: "75-15-0",
    label: "二硫化炭素",
    dokugeki: [{ table: "hyo2", go: "64", nameContains: "二硫化炭素" }],
    kouatsu: [{ kind: "toxic", name: "二硫化炭素" }, { kind: "flammable", name: "二硫化炭素" }],
  },
  {
    cas: "7446-08-4",
    label: "二酸化セレン (再分類)",
    dokugeki: [{ table: "rei1", go: "18", nameContains: "セレン化合物" }],
    notes: "セレン化合物（群指定）",
  },
  {
    cas: "7446-09-5",
    label: "二酸化硫黄",
    kouatsu: [{ kind: "toxic", name: "亜硫酸ガス" }],
  },
  {
    cas: "7647-19-0",
    label: "五フッ化リン",
    kouatsu: [{ kind: "toxic", name: "五フッ化リン" }],
  },
  {
    cas: "10026-13-8",
    label: "五塩化リン",
    dokugeki: [{ table: "rei1", go: "6の10", nameContains: "五塩化燐" }],
  },
  {
    cas: "1303-28-2",
    label: "五酸化二ヒ素",
    dokugeki: [{ table: "rei1", go: "23", nameContains: "砒素化合物" }],
    notes: "砒素化合物（群指定）",
  },
  {
    cas: "7758-19-2",
    label: "亜塩素酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "1の2", nameContains: "亜塩素酸ナトリウム" }],
    notes: "ただし、亜塩素酸ナトリウム二五％以下を含有するもの及び爆発薬を除く。",
  },
  {
    cas: "542-56-3",
    label: "亜硝酸イソブチル",
    dokugeki: [{ table: "rei2", go: "1の5", nameContains: "亜硝酸イソブチル" }],
  },
  {
    cas: "541-42-4",
    label: "亜硝酸イソプロピル",
    dokugeki: [{ table: "rei1", go: "1の2", nameContains: "亜硝酸イソプロピル" }],
  },
  {
    cas: "110-46-3",
    label: "亜硝酸イソペンチル",
    dokugeki: [{ table: "rei2", go: "1の6", nameContains: "亜硝酸イソペンチル" }],
  },
  {
    cas: "7758-09-0",
    label: "亜硝酸カリウム",
    dokugeki: [{ table: "rei2", go: "2", nameContains: "亜硝酸塩類" }],
    notes: "亜硝酸塩類（群指定）",
  },
  {
    cas: "7632-00-0",
    label: "亜硝酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "2", nameContains: "亜硝酸塩類" }],
    notes: "亜硝酸塩類（群指定）",
  },
  {
    cas: "544-16-1",
    label: "亜硝酸ブチル",
    dokugeki: [{ table: "rei1", go: "1の3", nameContains: "亜硝酸ブチル" }],
  },
  {
    cas: "624-91-9",
    label: "亜硝酸メチル",
    dokugeki: [{ table: "rei2", go: "2の3", nameContains: "亜硝酸メチル" }],
  },
  {
    cas: "7783-82-6",
    label: "六フッ化タングステン",
    dokugeki: [{ table: "rei1", go: "31", nameContains: "六弗化タングステン" }],
  },
  {
    cas: "87-68-3",
    label: "六塩化ブタジエン",
    kashinho: [{ clazz: 1, go: "15", nameContains: "ヘキサクロロブタ" }],
  },
  {
    cas: "7783-61-1",
    label: "四フッ化ケイ素",
    kouatsu: [{ kind: "toxic", name: "四フッ化ケイ素" }],
  },
  {
    cas: "7783-60-0",
    label: "四フッ化硫黄",
    dokugeki: [{ table: "rei1", go: "13の4", nameContains: "四弗化硫黄" }],
    kouatsu: [{ kind: "toxic", name: "四フッ化硫黄" }],
  },
  {
    cas: "56-23-5",
    label: "四塩化炭素",
    dokugeki: [{ table: "hyo2", go: "26", nameContains: "四塩化炭素" }],
    kashinho: [{ clazz: 2, go: "3", nameContains: "四塩化炭素" }],
  },
  {
    cas: "10108-64-2",
    label: "塩化カドミウム",
    dokugeki: [{ table: "rei2", go: "22", nameContains: "カドミウム化合物" }],
    notes: "カドミウム化合物（群指定）",
  },
  {
    cas: "7719-09-7",
    label: "塩化チオニル",
    dokugeki: [{ table: "rei2", go: "17の2", nameContains: "塩化チオニル" }],
  },
  {
    cas: "10361-37-2",
    label: "塩化バリウム",
    dokugeki: [{ table: "rei2", go: "79", nameContains: "バリウム化合物" }],
    notes: "バリウム化合物（群指定）",
  },
  {
    cas: "75-01-4",
    label: "塩化ビニル",
    kouatsu: [{ kind: "flammable", name: "塩化ビニル" }],
  },
  {
    cas: "98-09-9",
    label: "塩化ベンゼンスルホニル",
    dokugeki: [{ table: "rei1", go: "2の3", nameContains: "塩化ベンゼンスルホニル" }],
  },
  {
    cas: "10025-87-3",
    label: "塩化ホスホリル",
    dokugeki: [{ table: "rei1", go: "2の4", nameContains: "塩化ホスホリル" }],
  },
  {
    cas: "7646-85-7",
    label: "塩化亜鉛",
    dokugeki: [{ table: "rei2", go: "1", nameContains: "無機亜鉛塩類" }],
    notes: "無機亜鉛塩類（群指定）",
  },
  {
    cas: "7647-01-0",
    label: "塩化水素",
    dokugeki: [{ table: "hyo2", go: "8", nameContains: "塩化水素" }],
  },
  {
    cas: "7772-99-8",
    label: "塩化第一スズ (再分類)",
    dokugeki: [{ table: "rei2", go: "69", nameContains: "無機錫塩類" }],
    notes: "無機錫塩類（群指定）",
  },
  {
    cas: "10112-91-1",
    label: "塩化第一水銀",
    dokugeki: [{ table: "hyo2", go: "9", nameContains: "塩化第一水銀" }],
  },
  {
    cas: "7546-30-7",
    label: "塩化第一水銀",
    dokugeki: [{ table: "hyo2", go: "9", nameContains: "塩化第一水銀" }],
  },
  {
    cas: "7487-94-7",
    label: "塩化第二水銀",
    dokugeki: [{ table: "rei1", go: "17", nameContains: "水銀化合物" }],
    notes: "水銀化合物（群指定）",
  },
  {
    cas: "7447-39-4",
    label: "塩化銅（II）",
    dokugeki: [{ table: "rei2", go: "72", nameContains: "無機銅塩類" }],
    notes: "無機銅塩類（群指定）",
  },
  {
    cas: "7782-50-5",
    label: "塩素",
    dokugeki: [{ table: "rei2", go: "17の3", nameContains: "塩素" }],
    kouatsu: [{ kind: "toxic", name: "塩素" }],
  },
  {
    cas: "3811-04-9",
    label: "塩素酸カリウム",
    dokugeki: [{ table: "rei2", go: "18", nameContains: "塩素酸塩類" }],
    notes: "塩素酸塩類（群指定）",
  },
  {
    cas: "7775-09-9",
    label: "塩素酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "18", nameContains: "塩素酸塩類" }],
    notes: "塩素酸塩類（群指定）",
  },
  {
    cas: "2699-79-8",
    label: "弗化スルフリル",
    dokugeki: [{ table: "rei1", go: "24の2", nameContains: "弗化スルフリル" }],
  },
  {
    cas: "7784-36-3",
    label: "弗化砒素（V）",
    kouatsu: [{ kind: "toxic", name: "五フッ化ヒ素" }],
  },
  {
    cas: "1333-74-0",
    label: "水素",
    kouatsu: [{ kind: "flammable", name: "水素" }],
  },
  {
    cas: "1310-58-3",
    label: "水酸化カリウム",
    dokugeki: [{ table: "hyo2", go: "53", nameContains: "水酸化カリウム" }],
  },
  {
    cas: "1310-73-2",
    label: "水酸化ナトリウム",
    dokugeki: [{ table: "hyo2", go: "54", nameContains: "水酸化ナトリウム" }],
  },
  {
    cas: "1310-65-2",
    label: "水酸化リチウム",
    dokugeki: [{ table: "rei2", go: "68の2", nameContains: "水酸化リチウム" }],
  },
  {
    cas: "7439-97-6",
    label: "水銀",
    dokugeki: [{ table: "hyo1", go: "15", nameContains: "水銀" }],
  },
  {
    cas: "7553-56-2",
    label: "沃(よう)素",
    dokugeki: [{ table: "hyo2", go: "88", nameContains: "沃素" }],
  },
  {
    cas: "513-77-9",
    label: "炭酸バリウム",
    dokugeki: [{ table: "rei2", go: "79", nameContains: "バリウム化合物" }],
    notes: "バリウム化合物（群指定）",
  },
  {
    cas: "108-31-6",
    label: "無水マレイン酸",
    dokugeki: [{ table: "rei2", go: "98の3", nameContains: "無水マレイン酸" }],
    notes: "ただし、無水マレイン酸一・二％以下を含有するものを除く。",
  },
  {
    cas: "108-24-7",
    label: "無水酢酸",
    dokugeki: [{ table: "rei2", go: "98の2", nameContains: "無水酢酸" }],
    notes: "ただし、無水酢酸〇・二％以下を含有するものを除く。",
  },
  {
    cas: "7778-39-4",
    label: "砒酸",
    dokugeki: [{ table: "rei1", go: "23", nameContains: "砒素化合物" }],
    notes: "砒素化合物（群指定）",
  },
  {
    cas: "7697-37-2",
    label: "硝酸",
    dokugeki: [{ table: "hyo2", go: "51", nameContains: "硝酸" }],
  },
  {
    cas: "10022-31-8",
    label: "硝酸バリウム",
    dokugeki: [{ table: "rei2", go: "79", nameContains: "バリウム化合物" }],
    notes: "バリウム化合物（群指定）",
  },
  {
    cas: "10045-94-0",
    label: "硝酸水銀（II）",
    dokugeki: [{ table: "rei1", go: "17", nameContains: "水銀化合物" }],
    notes: "水銀化合物（群指定）",
  },
  {
    cas: "10099-74-8",
    label: "硝酸鉛",
    dokugeki: [{ table: "rei2", go: "77", nameContains: "鉛化合物" }],
    notes: "鉛化合物（群指定）",
  },
  {
    cas: "1306-23-6",
    label: "硫化カドミウム",
    dokugeki: [{ table: "rei2", go: "22", nameContains: "カドミウム化合物" }],
    notes: "カドミウム化合物（群指定）",
  },
  {
    cas: "7783-06-4",
    label: "硫化水素",
    kouatsu: [{ kind: "toxic", name: "硫化水素" }, { kind: "flammable", name: "硫化水素" }],
  },
  {
    cas: "16721-80-5",
    label: "硫化水素ナトリウム",
    dokugeki: [{ table: "rei2", go: "102の4", nameContains: "硫化水素ナトリウム" }],
  },
  {
    cas: "7664-93-9",
    label: "硫酸",
    dokugeki: [{ table: "hyo2", go: "89", nameContains: "硫酸" }],
  },
  {
    cas: "10124-36-4",
    label: "硫酸カドミウム",
    dokugeki: [{ table: "rei2", go: "22", nameContains: "カドミウム化合物" }],
    notes: "カドミウム化合物（群指定）",
  },
  {
    cas: "65-30-5",
    label: "硫酸ニコチン",
    dokugeki: [{ table: "rei1", go: "21", nameContains: "ニコチン塩類" }],
    notes: "ニコチン塩類（群指定）",
  },
  {
    cas: "7733-02-0",
    label: "硫酸亜鉛",
    dokugeki: [{ table: "rei2", go: "1", nameContains: "無機亜鉛塩類" }],
    notes: "無機亜鉛塩類（群指定）",
  },
  {
    cas: "7758-98-7",
    label: "硫酸銅(II)・無水物",
    dokugeki: [{ table: "rei2", go: "72", nameContains: "無機銅塩類" }],
    notes: "無機銅塩類（群指定）",
  },
  {
    cas: "7726-95-6",
    label: "臭素",
    dokugeki: [{ table: "hyo2", go: "50", nameContains: "臭素" }],
  },
  {
    cas: "36355-01-8",
    label: "臭素化ビフェニル（ヘキサブロモビフェニル異性体）",
    kashinho: [{ clazz: 1, go: "24", nameContains: "ヘキサブロモビフェニル" }],
  },
  {
    cas: "1313-60-6",
    label: "過酸化ナトリウム",
    dokugeki: [{ table: "hyo2", go: "11", nameContains: "過酸化ナトリウム" }],
  },
  {
    cas: "124-43-6",
    label: "過酸化尿素",
    dokugeki: [{ table: "hyo2", go: "12", nameContains: "過酸化尿素" }],
  },
  {
    cas: "7722-84-1",
    label: "過酸化水素",
    dokugeki: [{ table: "hyo2", go: "10", nameContains: "過酸化水素" }],
  },
  {
    cas: "141-78-6",
    label: "酢酸エチル",
    dokugeki: [{ table: "rei2", go: "30の3", nameContains: "酢酸エチル" }],
  },
  {
    cas: "563-68-8",
    label: "酢酸タリウム",
    dokugeki: [{ table: "rei2", go: "30の4", nameContains: "酢酸タリウム" }],
  },
  {
    cas: "301-04-2",
    label: "酢酸鉛",
    dokugeki: [{ table: "rei2", go: "77", nameContains: "鉛化合物" }],
    notes: "鉛化合物（群指定）",
  },
  {
    cas: "1306-19-0",
    label: "酸化カドミウム",
    dokugeki: [{ table: "rei2", go: "22", nameContains: "カドミウム化合物" }],
    notes: "カドミウム化合物（群指定）",
  },
  {
    cas: "1307-96-6",
    label: "酸化コバルト(II)",
    dokugeki: [{ table: "rei1", go: "6の13", nameContains: "酸化コバルト（Ⅱ）" }],
  },
  {
    cas: "21908-53-2",
    label: "酸化水銀 (Ⅱ) (再分類)",
    dokugeki: [{ table: "rei1", go: "17", nameContains: "水銀化合物" }],
    notes: "水銀化合物（群指定）",
  },
  {
    cas: "13530-68-2",
    label: "重クロム酸",
    dokugeki: [{ table: "hyo2", go: "48", nameContains: "重クロム酸" }],
  },
  {
    cas: "7789-09-5",
    label: "重クロム酸アンモニウム (別名：二クロム酸アンモニウム) (再分類)",
    dokugeki: [{ table: "rei2", go: "60", nameContains: "重クロム酸塩類" }],
    notes: "重クロム酸塩類（群指定）",
  },
  {
    cas: "7778-50-9",
    label: "重クロム酸カリウム",
    dokugeki: [{ table: "rei2", go: "60", nameContains: "重クロム酸塩類" }],
    notes: "重クロム酸塩類（群指定・二クロム酸カリウム）",
  },
  {
    cas: "10588-01-9",
    label: "重クロム酸ナトリウム",
    dokugeki: [{ table: "rei2", go: "60", nameContains: "重クロム酸塩類" }],
    notes: "重クロム酸塩類（群指定）",
  },
  {
    cas: "7439-92-1",
    label: "鉛",
    dokugekiNone: true,
    notes: "単体の鉛は毒劇法非該当（鉛化合物は指定令2条77号で劇物だが単体金属は対象外）",
  },
  {
    cas: "7723-14-0",
    label: "黄リン",
    dokugeki: [{ table: "hyo1", go: "2", nameContains: "黄燐" }],
  },
  {
    cas: "72-20-8",
    label: "１，２，３，４，１０，１０－ヘキサクロロ－６，７－エポキシ－１，４，４ａ，５，６，７，８，８ａ－オクタヒドロ－エンド－１，４－エンド－５，８－ジメタノナフタレン（別名エンドリン）",
    dokugeki: [{ table: "hyo1", go: "23", nameContains: "ヘキサクロルエポキシオク" }],
    kashinho: [{ clazz: 1, go: "6", nameContains: "エンドリン" }],
  },
  {
    cas: "57-74-9",
    label: "１，２，４，５，６，７，８，８－オクタクロロ－２，３，３ａ，４，７，７ａ－ヘキサヒドロ－４，７－メタノ－１Ｈ－インデン（別名クロルデン）※６",
    dokugeki: [{ table: "rei2", go: "18の5", nameContains: "一・二・四・五・六・七・" }],
    kashinho: [{ clazz: 1, go: "8", nameContains: "クロルデン" }],
    notes: "クロルデン（類縁化合物の混合物）。6%以下含有製剤は除外",
  },
  {
    cas: "767-10-2",
    label: "Ｎ－ブチルピロリジン",
    dokugeki: [{ table: "rei2", go: "85の6", nameContains: "Ｎ―ブチルピロリジン" }],
  },
];

export const OTHER_LAWS_CAS_INDEX_BY_CAS: ReadonlyMap<string, OtherLawsIndexEntry> = new Map(
  OTHER_LAWS_CAS_INDEX.map((e) => [e.cas, e]),
);
