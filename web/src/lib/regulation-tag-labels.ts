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
      "特定化学物質の環境への排出量の把握等及び管理の改善の促進に関する法律 (化管法/PRTR法) で第一種指定。事業者は年間取扱量 1 トン以上の場合、環境への排出量・廃棄物移動量を国に届出する義務。",
    officialUrl: "https://www.env.go.jp/chemi/prtr/risk0.html",
    category: "prtr",
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300",
  },
  prtr2: {
    tag: "prtr2",
    shortLabel: "PRTR第二種",
    fullLabel: "化管法 第二種指定化学物質",
    summary:
      "化管法で第二種指定。SDS 交付義務はあるが、PRTR 排出量届出の義務はなし。今後の使用拡大・排出量増加により第一種に移行する可能性のある物質。",
    officialUrl: "https://www.env.go.jp/chemi/prtr/risk0.html",
    category: "prtr",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  cscl1: {
    tag: "cscl1",
    shortLabel: "化審法 第一種特定",
    fullLabel: "化審法 第一種特定化学物質",
    summary:
      "化学物質の審査及び製造等の規制に関する法律 (化審法) で第一種特定化学物質に指定。難分解性・高蓄積性・人または高次捕食動物への長期毒性があり、原則として製造・輸入禁止。PCB、ヘキサクロロベンゼン等。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-rose-200 text-rose-950 border-rose-400",
  },
  cscl2: {
    tag: "cscl2",
    shortLabel: "化審法 第二種特定",
    fullLabel: "化審法 第二種特定化学物質",
    summary:
      "化審法で第二種特定化学物質に指定。難分解性で長期毒性があり、相当広範な地域の環境において相当程度残留している物質。製造・輸入の事前届出と数量制限あり。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  "cscl-other": {
    tag: "cscl-other",
    shortLabel: "化審法 その他",
    fullLabel: "化審法 その他指定化学物質",
    summary:
      "化審法で監視化学物質または優先評価化学物質等に指定。性状把握・有害性評価の対象。",
    officialUrl: "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    category: "chashin",
    badgeClass: "bg-pink-100 text-pink-900 border-pink-300",
  },
  "poison-control": {
    tag: "poison-control",
    shortLabel: "毒劇法",
    fullLabel: "毒物及び劇物取締法",
    summary:
      "毒物又は劇物に指定。製造・輸入・販売には登録が必要、業務上取扱者は施錠管理・専用容器・盗難紛失防止措置が義務。表示「医薬用外」必須。",
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
      "化学兵器禁止条約の国内実施法。第1種〜第3種特定物質に該当する場合、製造・所持・輸出入に経済産業大臣の許可が必要。サリン、VX、マスタードガス等の前駆体物質。",
    officialUrl: "https://www.meti.go.jp/policy/anpo/law/cwc_law.html",
    category: "cwc",
    badgeClass: "bg-violet-100 text-violet-900 border-violet-300",
  },
  waste: {
    tag: "waste",
    shortLabel: "廃掃法",
    fullLabel: "廃棄物処理法 特定有害産業廃棄物",
    summary:
      "廃棄物処理及び清掃に関する法律で特定有害産業廃棄物に該当する物質を含む廃棄物。処理基準・特別管理産業廃棄物としての保管・運搬・処分の規制対象。",
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
      "労働安全衛生法施行令別表第三 第一号。製造許可物質 (ジクロロベンジジン、ベリリウム、アルファナフチルアミン等)。製造時は厚生労働大臣の許可が必要。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-red-200 text-red-950 border-red-400",
  },
  "tokutei-2": {
    tag: "tokutei-2",
    shortLabel: "特化則 第二類",
    fullLabel: "特定化学物質障害予防規則 第二類物質",
    summary:
      "労働安全衛生法施行令別表第三 第二号。発散抑制装置の設置・作業環境測定 (6か月以内ごと)・特殊健康診断 (6か月以内ごと)・作業主任者選任義務。特別管理物質はさらに30年間記録保存。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-red-100 text-red-900 border-red-300",
  },
  "tokutei-3": {
    tag: "tokutei-3",
    shortLabel: "特化則 第三類",
    fullLabel: "特定化学物質障害予防規則 第三類物質",
    summary:
      "労働安全衛生法施行令別表第三 第三号 (アンモニア、一酸化炭素、塩化水素、硝酸、二酸化硫黄、フェノール、ホスゲン、硫酸の8種)。大量漏えい時の急性中毒予防を主目的とした規制。漏えい防止措置・修理時の作業基準等を要求。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000039",
    category: "osha",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300",
  },
  "yuki-1": {
    tag: "yuki-1",
    shortLabel: "有機則 第一種",
    fullLabel: "有機溶剤中毒予防規則 第一種有機溶剤",
    summary:
      "有機則第1条第1項第3号の第一種有機溶剤 (令別表第六の二第28号・第38号 = 1,2-ジクロルエチレン、二硫化炭素の2物質。クロロホルム・四塩化炭素等は平成26年改正で特化則の特別有機溶剤へ移行)。発散抑制装置として密閉式・局所排気装置(プッシュプル型)の設置義務。作業環境測定 6か月以内ごと。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-amber-200 text-amber-950 border-amber-400",
  },
  "yuki-2": {
    tag: "yuki-2",
    shortLabel: "有機則 第二種",
    fullLabel: "有機溶剤中毒予防規則 第二種有機溶剤",
    summary:
      "有機溶剤中毒予防規則 別表第一 第二種 (トルエン、キシレン、酢酸エチル、MEK等の主要溶剤)。局所排気装置(囲い式・外付け式)以上の発散抑制義務。作業環境測定 6か月以内ごと、特殊健診も同頻度。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  "yuki-3": {
    tag: "yuki-3",
    shortLabel: "有機則 第三種",
    fullLabel: "有機溶剤中毒予防規則 第三種有機溶剤",
    summary:
      "有機則第1条第1項第5号の第三種有機溶剤 (令別表第六の二のうち第一種・第二種以外＝ガソリン、コールタールナフサ、石油エーテル、石油ナフサ、石油ベンジン、テレビン油、ミネラルスピリットの7物質)。タンク等の内部で業務を行う場合を中心に発散抑制・換気・保護具を規制。特殊健診はタンク等内部業務に限り対象 (有機則第29条)。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000036",
    category: "osha",
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-300",
  },
  namari: {
    tag: "namari",
    shortLabel: "鉛則",
    fullLabel: "鉛中毒予防規則",
    summary:
      "鉛等・焼結鉱等を扱う鉛業務 (令別表第四: 製錬、鉛蓄電池の製造、はんだ付け、鉛装置の破砕・溶接、含鉛塗料のかき落とし等) を規制。局所排気装置等の発散抑制、鉛作業主任者の選任、作業環境測定 (1年以内ごと)、鉛健康診断を義務付け。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000037",
    category: "osha",
    badgeClass: "bg-slate-200 text-slate-900 border-slate-400",
  },
  yonalkyl: {
    tag: "yonalkyl",
    shortLabel: "四アルキル鉛則",
    fullLabel: "四アルキル鉛中毒予防規則",
    summary:
      "四アルキル鉛等業務 (令別表第五: 四アルキル鉛の製造、ガソリンへの混入、装置の修理、タンク内作業等) を規制。作業主任者の選任、保護具の使用、四アルキル鉛健康診断 (6か月以内ごと) を義務付け。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000038",
    category: "osha",
    badgeClass: "bg-gray-200 text-gray-900 border-gray-400",
  },
  sankketsu: {
    tag: "sankketsu",
    shortLabel: "酸欠則",
    fullLabel: "酸素欠乏症等防止規則",
    summary:
      "酸素濃度18%未満となる恐れのある場所 (タンク内部・地下ピット・マンホール・サイロ・船倉等) の作業を規制。酸素欠乏危険作業主任者選任・作業前測定・換気・空気呼吸器等を義務付け。第二種は硫化水素中毒予防も対象。",
    officialUrl: "https://laws.e-gov.go.jp/law/347M50002000042",
    category: "osha",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300",
  },
  funjin: {
    tag: "funjin",
    shortLabel: "粉じん則",
    fullLabel: "粉じん障害防止規則",
    summary:
      "粉じん作業 (鉱物・岩石・金属の研磨・破砕・選別、アーク溶接、ずい道掘削等) を規制。発散抑制設備・呼吸用保護具・特別教育・じん肺健診を義務付け。じん肺法 (粉じん作業従事者の健康管理) と一体運用。",
    officialUrl: "https://laws.e-gov.go.jp/law/354M50002000018",
    category: "osha",
    badgeClass: "bg-stone-100 text-stone-900 border-stone-300",
  },
  sekimen: {
    tag: "sekimen",
    shortLabel: "石綿則",
    fullLabel: "石綿障害予防規則",
    summary:
      "石綿 (アスベスト) およびこれを含有する建材等の取扱作業を規制。事前調査・除去/封じ込め/囲い込み工事の作業計画届出・作業主任者選任・特殊健診 (40年間記録保存) を義務付け。建築物解体時の石綿事前調査結果報告 (R4.4.1〜) も含む。",
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
