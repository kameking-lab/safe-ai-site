/**
 * Phase 1e: 規制タグの人間可読ラベル・色分け・公式参照リンク・要約定義
 *
 * concentration-limits.json の regulationTags[] に格納される 9 種類のタグを
 * UI 表示用に整形するための単一の真実の源泉。
 */

export type RegulationTag =
  | "nite"
  | "prtr1"
  | "prtr2"
  | "cscl1"
  | "cscl2"
  | "cscl-other"
  | "poison-control"
  | "cwc"
  | "waste"
  // P0-009 (usability-audit-day2): 労働安全衛生関連の特別則タグ。
  // 製造業安全担当者の最頻ユースケース(特化則第二類物質マーキング等)を
  // 既存「規制法令」セクションと同じUIで一望できるように追加。
  | "tokutei-1"
  | "tokutei-2"
  | "tokutei-3"
  | "yuki-1"
  | "yuki-2"
  // F2 (2026-07-03): 診断03 §2-2③のタグ語彙欠落を是正。第三種有機溶剤・鉛則・四アルキル鉛則は
  // 従来型に存在せず「正しいデータを作っても表現できない」状態だった。
  | "yuki-3"
  | "namari"
  | "yonalkyl"
  | "sankketsu"
  | "funjin"
  | "sekimen";

export type RegulationTagCategory =
  | "nite"
  | "prtr"
  | "chashin"
  | "poison-waste"
  | "cwc"
  | "osha";

export type RegulationTagInfo = {
  tag: RegulationTag;
  /** 短いバッジラベル (例: "PRTR第一種") */
  shortLabel: string;
  /** 正式名称 (例: "化管法 第一種指定化学物質") */
  fullLabel: string;
  /** 1-2 行の規制内容要約 */
  summary: string;
  /** 公式参照 URL */
  officialUrl: string;
  /** カテゴリ (色分けに使用) */
  category: RegulationTagCategory;
  /**
   * Tailwind バッジクラス
   * - 背景 / 文字色 / 枠線 をまとめて指定
   */
  badgeClass: string;
};

export const REGULATION_TAGS: Record<RegulationTag, RegulationTagInfo> = {
  nite: {
    tag: "nite",
    shortLabel: "政府版GHS",
    fullLabel: "NITE 統合版 GHS 分類結果",
    summary:
      "独立行政法人 製品評価技術基盤機構 (NITE) による政府版 GHS 分類。発がん性・変異原性・特定標的臓器毒性等 35 区分の有害性情報を提供。",
    officialUrl: "https://www.chem-info.nite.go.jp/chem/ghs/ghs_nite_download.html",
    category: "nite",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
  },
  prtr1: {
    tag: "prtr1",
    shortLabel: "PRTR第一種",
    fullLabel: "化管法 第一種指定化学物質",
    summary:
      "化管法の第一種指定化学物質。PRTR届出の要否は、対象業種、事業者全体の常用雇用者数、対象製品、事業所ごとの年間取扱量、特別要件施設等で決まります。物質の指定だけでは届出義務を確定できません。",
    officialUrl: "https://www.env.go.jp/chemi/prtr/risk0.html",
    category: "prtr",
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300",
  },
  prtr2: {
    tag: "prtr2",
    shortLabel: "PRTR第二種",
    fullLabel: "化管法 第二種指定化学物質",
    summary:
      "化管法の第二種指定化学物質はSDS制度の対象で、第二種としてのPRTR届出対象ではありません。SDS提供の要否は、製品の含有率・性状や譲渡・提供の条件を公式資料で確認してください。",
    officialUrl: "https://www.env.go.jp/chemi/prtr/risk0.html",
    category: "prtr",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  cscl1: {
    tag: "cscl1",
    shortLabel: "化審法 第一種特定",
    fullLabel: "化審法 第一種特定化学物質",
    summary:
      "化審法の第一種特定化学物質。製造・輸入の許可や使用制限等の規定があります。指定範囲、対象製品、用途、例外を経済産業省の公式資料で確認してください。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-rose-200 text-rose-950 border-rose-400",
  },
  cscl2: {
    tag: "cscl2",
    shortLabel: "化審法 第二種特定",
    fullLabel: "化審法 第二種特定化学物質",
    summary:
      "化審法の第二種特定化学物質。製造・輸入予定数量等の届出や取扱いに関する規定があります。対象となる行為・製品と必要な手続を経済産業省の公式資料で確認してください。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  "cscl-other": {
    tag: "cscl-other",
    shortLabel: "化審法 その他",
    fullLabel: "化審法 その他指定化学物質",
    summary:
      "化審法の監視化学物質・優先評価化学物質等に関する収録タグです。区分ごとに制度や手続が異なるため、個別の指定と適用条件を公式資料で確認してください。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-pink-100 text-pink-900 border-pink-300",
  },
  "poison-control": {
    tag: "poison-control",
    shortLabel: "毒劇法",
    fullLabel: "毒物及び劇物取締法",
    summary:
      "毒物又は劇物の指定に関する参照先です。濃度・製剤の除外規定、用途、製造・輸入・販売・業務上取扱いの別で適用が異なります。登録、表示、保管等の要件を該当条文で確認してください。",
    officialUrl:
      "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000051379.html",
    category: "poison-waste",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-300",
  },
  cwc: {
    tag: "cwc",
    shortLabel: "化学兵器禁止法",
    fullLabel: "化学兵器の禁止及び特定物質の規制等に関する法律 (CWC)",
    summary:
      "化学兵器禁止法に関する収録タグです。物質の区分、製造・使用・輸出入等の行為、数量によって許可・届出等の要件が異なります。個別の指定と手続を経済産業省の公式資料で確認してください。",
    officialUrl: "https://www.meti.go.jp/policy/anpo/law/cwc_law.html",
    category: "cwc",
    badgeClass: "bg-violet-100 text-violet-900 border-violet-300",
  },
  waste: {
    tag: "waste",
    shortLabel: "廃掃法",
    fullLabel: "廃棄物処理法 特定有害産業廃棄物",
    summary:
      "廃棄物処理法に関する参照先です。廃棄物の種類、発生施設、有害物質の含有・溶出等の基準によって区分が決まります。この物質を含むことだけでは特別管理産業廃棄物と確定しません。",
    officialUrl: "https://www.env.go.jp/recycle/waste/sp_contr/index.html",
    category: "poison-waste",
    badgeClass: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  },
  // ---- 労働安全衛生関連 特別則 (P0-009) -------------------------
  "tokutei-1": {
    tag: "tokutei-1",
    shortLabel: "特化則 第一類",
    fullLabel: "特定化学物質障害予防規則 第一類物質",
    summary:
      "労働安全衛生法施行令別表第三 第一号の物質区分です。製造許可、発散抑制等の適用は対象物・含有率・業務等で異なります。施行令と特化則の該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-red-200 text-red-950 border-red-400",
  },
  "tokutei-2": {
    tag: "tokutei-2",
    shortLabel: "特化則 第二類",
    fullLabel: "特定化学物質障害予防規則 第二類物質",
    summary:
      "労働安全衛生法施行令別表第三 第二号の物質区分です。発散抑制、作業環境測定、健康診断、作業主任者等の対象・例外は、物質区分、含有率、業務、作業場所等を該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
  },
  "tokutei-3": {
    tag: "tokutei-3",
    shortLabel: "特化則 第三類",
    fullLabel: "特定化学物質障害予防規則 第三類物質",
    summary:
      "労働安全衛生法施行令別表第三第三号が列挙する8種（アンモニア、一酸化炭素、塩化水素、硝酸、二酸化硫黄、フェノール、ホスゲン、硫酸）の物質区分です。この区分だけで個別の措置義務を確定せず、対象設備・業務・含有率に応じて漏えい防止、設備の修理等に関する特化則の該当条文を確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  "yuki-1": {
    tag: "yuki-1",
    shortLabel: "有機則 第一種",
    fullLabel: "有機溶剤中毒予防規則 第一種有機溶剤",
    summary:
      "有機則第1条第1項第3号の第一種有機溶剤は、1,2-ジクロルエチレンと二硫化炭素の2物質です。この区分だけで個別の措置義務を確定せず、業務、作業場所、含有率、使用量等に応じて発散抑制、測定、健康診断等の対象・例外を条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-amber-200 text-amber-950 border-amber-400",
  },
  "yuki-2": {
    tag: "yuki-2",
    shortLabel: "有機則 第二種",
    fullLabel: "有機溶剤中毒予防規則 第二種有機溶剤",
    summary:
      "有機則第1条第1項第4号の第二種有機溶剤。適用は業務、作業場所、含有率、使用量等によって異なります。発散抑制、測定、健康診断等の対象・例外を条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  "yuki-3": {
    tag: "yuki-3",
    shortLabel: "有機則 第三種",
    fullLabel: "有機溶剤中毒予防規則 第三種有機溶剤",
    summary:
      "有機則第1条第1項第5号の第三種有機溶剤。タンク等の内部を含む作業場所、業務、含有率、使用量等によって適用が異なります。発散抑制、保護具、健康診断等の対象・例外を条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-300",
  },
  namari: {
    tag: "namari",
    shortLabel: "鉛則",
    fullLabel: "鉛中毒予防規則",
    summary:
      "鉛業務に関する規則です。物質名だけで適用は決まらず、施行令別表第四の業務、鉛等の含有率、作業条件等の確認が必要です。発散抑制、作業主任者、測定、健康診断等は該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000037",
    category: "osha",
    badgeClass: "bg-slate-200 text-slate-900 border-slate-400",
  },
  yonalkyl: {
    tag: "yonalkyl",
    shortLabel: "四アルキル鉛則",
    fullLabel: "四アルキル鉛中毒予防規則",
    summary:
      "施行令別表第五の四アルキル鉛等業務に関する規則です。対象業務と適用条件を確認したうえで、作業主任者、設備、保護具、健康診断等の要件を該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000038",
    category: "osha",
    badgeClass: "bg-gray-200 text-gray-900 border-gray-400",
  },
  sankketsu: {
    tag: "sankketsu",
    shortLabel: "酸欠則",
    fullLabel: "酸素欠乏症等防止規則",
    summary:
      "酸素欠乏危険作業等に関する規則です。適用はガスの名称だけでなく、施行令別表第六の場所と作業の条件で確認します。測定、換気、作業主任者、保護具等の要件を該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000042",
    category: "osha",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300",
  },
  funjin: {
    tag: "funjin",
    shortLabel: "粉じん則",
    fullLabel: "粉じん障害防止規則",
    summary:
      "粉じん作業に関する規則です。物質名だけでなく、別表に列挙された作業・発生源と適用除外を確認します。発散抑制、保護具、教育等は該当条文で、健康管理はじん肺法も併せて確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/354M50002000018",
    category: "osha",
    badgeClass: "bg-stone-100 text-stone-900 border-stone-300",
  },
  sekimen: {
    tag: "sekimen",
    shortLabel: "石綿則",
    fullLabel: "石綿障害予防規則",
    summary:
      "石綿等を取り扱う作業に関する規則です。含有率、建材・設備、工事内容等により、事前調査、報告・届出、作業計画、隔離、健康診断、記録等の対象が異なります。各要件は該当条文で確認してください。",
    officialUrl: "https://laws.e-gov.go.jp/law/417M60000100021",
    category: "osha",
    badgeClass: "bg-zinc-200 text-zinc-950 border-zinc-400",
  },
};

export const ALL_REGULATION_TAGS: RegulationTag[] = [
  "nite",
  "prtr1",
  "prtr2",
  "cscl1",
  "cscl2",
  "cscl-other",
  "poison-control",
  "cwc",
  "waste",
  // P0-009 OSHA 系
  "tokutei-1",
  "tokutei-2",
  "tokutei-3",
  "yuki-1",
  "yuki-2",
  "yuki-3",
  "namari",
  "yonalkyl",
  "sankketsu",
  "funjin",
  "sekimen",
];

/** カテゴリの順序定義 (フィルタ UI のグルーピング用) */
export const TAG_CATEGORY_ORDER: RegulationTagCategory[] = [
  // P0-009: 製造業/建設業の最頻ユースケースである安衛法系を冒頭に配置。
  "osha",
  "nite",
  "prtr",
  "chashin",
  "poison-waste",
  "cwc",
];

export const TAG_CATEGORY_LABELS: Record<RegulationTagCategory, string> = {
  osha: "労働安全衛生 特別則",
  nite: "政府版GHS分類",
  prtr: "化管法 PRTR",
  chashin: "化審法",
  "poison-waste": "毒劇法・廃掃法",
  cwc: "化学兵器禁止法",
};

/** タグ判定: 与えられた tag が定義済の RegulationTag かどうか */
export function isKnownRegulationTag(t: string): t is RegulationTag {
  return (ALL_REGULATION_TAGS as readonly string[]).includes(t);
}

/** UI用: 配列をフィルタして既知タグのみに正規化 */
export function normalizeTags(tags: readonly string[] | undefined): RegulationTag[] {
  if (!tags) return [];
  const out: RegulationTag[] = [];
  for (const t of tags) {
    if (isKnownRegulationTag(t)) out.push(t);
  }
  return out;
}

/**
 * 建設業頻出物質プリセット (CAS).
 * Phase 1c/1d テストで確認済の主要 12 物質 + 建設業頻出 8 物質。
 */
export const CONSTRUCTION_PRIORITY_CAS: ReadonlyArray<{
  cas: string;
  name: string;
  category: "塗装系" | "解体系" | "防水系" | "地盤改良系" | "溶剤系";
}> = [
  // 塗装系
  { cas: "108-88-3", name: "トルエン", category: "塗装系" },
  { cas: "1330-20-7", name: "キシレン", category: "塗装系" },
  { cas: "141-78-6", name: "酢酸エチル", category: "塗装系" },
  { cas: "78-93-3", name: "メチルエチルケトン", category: "塗装系" },
  { cas: "67-64-1", name: "アセトン", category: "塗装系" },
  // 解体系
  { cas: "1332-21-4", name: "石綿", category: "解体系" },
  { cas: "7439-92-1", name: "鉛", category: "解体系" },
  { cas: "1336-36-3", name: "ポリ塩化ビフェニル (PCB)", category: "解体系" },
  { cas: "7439-97-6", name: "水銀", category: "解体系" },
  { cas: "7440-43-9", name: "カドミウム", category: "解体系" },
  // 防水系
  { cas: "75-09-2", name: "ジクロロメタン", category: "防水系" },
  { cas: "101-68-8", name: "メチレンジフェニルジイソシアネート (MDI)", category: "防水系" },
  { cas: "71-43-2", name: "ベンゼン", category: "防水系" },
  // 地盤改良系
  { cas: "79-06-1", name: "アクリルアミド", category: "地盤改良系" },
  // 溶剤系/その他
  { cas: "50-00-0", name: "ホルムアルデヒド", category: "溶剤系" },
  { cas: "75-21-8", name: "エチレンオキシド", category: "溶剤系" },
  { cas: "127-18-4", name: "テトラクロロエチレン", category: "溶剤系" },
  { cas: "79-01-6", name: "トリクロロエチレン", category: "溶剤系" },
  { cas: "7782-50-5", name: "塩素", category: "溶剤系" },
  { cas: "7664-39-3", name: "フッ化水素", category: "溶剤系" },
];

export const CONSTRUCTION_PRIORITY_CAS_SET = new Set(
  CONSTRUCTION_PRIORITY_CAS.map((x) => x.cas)
);

/**
 * 安衛法 特別則タグ（特化則・有機則・特別管理物質）の CAS マッピング。
 *
 * 【O11 (2026-07-11) 全対象ETL展開】特化則1〜3類・有機則1〜3種・特別管理物質は
 * cas-law-index.ts（人手レビュー層）× anei-beppyo-snapshot.ts（e-Gov生成物）から
 * **機械導出**する。従来のハードコード表（約35CAS）は撤去した＝手書き区分は存在しない。
 * substance-legal-audit.test.ts が導出結果と正本の全件突合を CI に常設しており、
 * cas-law-index の号参照を1件でも誤るとテストが落ちる。
 *
 * 業務・作業列挙型の規則（鉛則・四アルキル鉛則・石綿則・酸欠則・粉じん則）は
 * 物質スナップショットから導出できないため、従来どおり限定的な手書きを維持する
 * （付与先CASは substance-legal-audit.test.ts で凍結）。
 */
import { CAS_LAW_INDEX } from "@/data/legal/cas-law-index";
import { deriveFromIndexEntry } from "@/data/legal/substance-legal-profile";

/** 業務・作業列挙型の特別則（機械突合対象外）。付与先は監査テストで凍結 */
const MANUAL_OSHA_TAGS: Readonly<Record<string, RegulationTag[]>> = {
  // ---- 鉛則・四アルキル鉛則 (令別表第4/第5=業務列挙のため人手検証) ----
  "7439-92-1": ["namari"], // 鉛 (令別表第4の鉛業務)
  "78-00-2": ["yonalkyl"], // 四アルキル鉛 (令別表第5の四アルキル鉛等業務)
  // ---- 石綿則 ----------------------------------------------
  "1332-21-4": ["sekimen"], // 石綿 (アスベスト)
  "12172-73-5": ["sekimen"], // アモサイト
  "12001-29-5": ["sekimen"], // クリソタイル
  "12001-28-4": ["sekimen"], // クロシドライト
  // ---- 酸欠則 (作業環境規制。代表ガスのみ) -------------------
  "7727-37-9": ["sankketsu"], // 窒素 (酸素欠乏発生ガス)
  "124-38-9": ["sankketsu"], // 二酸化炭素 (高濃度で酸素欠乏発生)
  "7783-06-4": ["sankketsu"], // 硫化水素 (酸欠則 第二種。特化則第二類は導出側で付与)
  // ---- 粉じん則 (代表物質) --------------------------------
  "14808-60-7": ["funjin"], // 結晶質シリカ (石英)
  "14464-46-1": ["funjin"], // 結晶質シリカ (クリストバライト)
};

function buildDerivedOshaTags(): {
  tags: Record<string, RegulationTag[]>;
  special: Set<string>;
} {
  const tags: Record<string, RegulationTag[]> = {};
  const special = new Set<string>();
  for (const entry of CAS_LAW_INDEX) {
    const derived = deriveFromIndexEntry(entry);
    const list: RegulationTag[] = [];
    for (const k of derived.tokkaKubun) list.push(`tokutei-${k}` as RegulationTag);
    for (const k of derived.yukiClass) list.push(`yuki-${k}` as RegulationTag);
    if (derived.specialControl) special.add(entry.cas);
    if (list.length > 0) tags[entry.cas] = list;
  }
  for (const [cas, manual] of Object.entries(MANUAL_OSHA_TAGS)) {
    tags[cas] = [...(tags[cas] ?? []), ...manual];
  }
  return { tags, special };
}

const derivedOsha = buildDerivedOshaTags();

/** cas-law-index × e-Gov snapshot から機械導出した特別則タグ表（手書き禁止） */
export const OSHA_REGULATION_TAGS_BY_CAS: Readonly<Record<string, RegulationTag[]>> =
  derivedOsha.tags;

/**
 * CAS 番号から 安衛法 特別則 タグを取得。
 * 未登録の物質は空配列を返す (false-positive を避けるため index 未突合は表示しない)。
 */
export function oshaTagsForCas(cas: string | null | undefined): RegulationTag[] {
  if (!cas) return [];
  const tags = OSHA_REGULATION_TAGS_BY_CAS[cas];
  return tags ? [...tags] : [];
}

/**
 * 特別管理物質 (特化則38条の4・がん原性等で30年記録保存対象) の集合。
 * 第一類（塩素化ビフェニル等を除く）＋第2号の号レンジから機械導出。
 */
export const SPECIAL_CONTROL_CAS_SET: ReadonlySet<string> = derivedOsha.special;

export function isSpecialControlSubstance(cas: string | null | undefined): boolean {
  if (!cas) return false;
  return SPECIAL_CONTROL_CAS_SET.has(cas);
}
