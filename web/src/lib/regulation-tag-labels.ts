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
  | "waste";

export type RegulationTagCategory =
  | "nite"
  | "prtr"
  | "chashin"
  | "poison-waste"
  | "cwc";

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
];

/** カテゴリの順序定義 (フィルタ UI のグルーピング用) */
export const TAG_CATEGORY_ORDER: RegulationTagCategory[] = [
  "nite",
  "prtr",
  "chashin",
  "poison-waste",
  "cwc",
];

export const TAG_CATEGORY_LABELS: Record<RegulationTagCategory, string> = {
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
