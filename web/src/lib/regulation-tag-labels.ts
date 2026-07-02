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
 * P0-009 (usability-audit-day2-2026-05-24):
 * 主要物質の 安衛法 特別則 タグの CAS マッピング。
 *
 * 出典:
 * - 特定化学物質障害予防規則 (347M50002000039) 別表第1
 * - 有機溶剤中毒予防規則 (347M50002000036) 別表第1
 * - 石綿障害予防規則 (417M60000100021)
 * - 厚生労働省 化学物質情報 (https://anzeninfo.mhlw.go.jp/anzen_pg/SAB_FND.aspx)
 *
 * 全 200 物質超の特化則対象を網羅すると ETL 整備が必要なため、
 * まずは建設業/製造業の最頻 22 物質に絞ってハードコード。残りの物質は
 * 後続フェーズで MHLW 別表データ取込により自動付与する設計を残す。
 *
 * 「特別管理物質」(発がん性)に該当するものはコメントで明示。
 */
export const OSHA_REGULATION_TAGS_BY_CAS: Readonly<Record<string, RegulationTag[]>> = {
  // ---- 特化則 第二類 (特別管理物質含む) -----------------------
  "75-09-2": ["tokutei-2"], // ジクロロメタン (特別管理物質・令別表第3第2号19の3)
  "71-43-2": ["tokutei-2"], // ベンゼン (特別管理物質・同30)
  "79-06-1": ["tokutei-2"], // アクリルアミド (同1。特化則38条の4の列挙外=特別管理物質ではない)
  "50-00-0": ["tokutei-2"], // ホルムアルデヒド (特別管理物質・同31の2)
  "75-21-8": ["tokutei-2"], // エチレンオキシド (特別管理物質・同5)
  "127-18-4": ["tokutei-2"], // テトラクロロエチレン (特別管理物質・特別有機溶剤・同22の4)
  "79-01-6": ["tokutei-2"], // トリクロロエチレン (特別管理物質・特別有機溶剤・同22の5)
  "7782-50-5": ["tokutei-2"], // 塩素 (同7。第三類ではない)
  "7664-39-3": ["tokutei-2"], // フッ化水素 (同28。第三類ではない)
  "67-66-3": ["tokutei-2"], // クロロホルム (特別管理物質・特別有機溶剤・同11の2。平成26年改正で有機則第一種から移行)
  "56-23-5": ["tokutei-2"], // 四塩化炭素 (特別管理物質・特別有機溶剤・同18の2。平成26年改正で有機則第一種から移行)
  "1336-36-3": ["tokutei-1"], // PCB (塩素化ビフェニル・令別表第3第1号3)
  "7439-97-6": ["tokutei-2"], // 水銀 (同22)
  "7440-43-9": ["tokutei-2"], // カドミウム (同10)
  // ---- 特化則 第三類 (大量漏えい・急性中毒予防) ----------------
  "7647-01-0": ["tokutei-3"], // 塩化水素 (令別表第3第3号3)
  "7697-37-2": ["tokutei-3"], // 硝酸 (同4)
  // ---- 有機則 第二種 (主要溶剤) -------------------------------
  "108-88-3": ["yuki-2"], // トルエン
  "1330-20-7": ["yuki-2"], // キシレン
  "67-64-1": ["yuki-2"], // アセトン
  "78-93-3": ["yuki-2"], // メチルエチルケトン (MEK)
  "141-78-6": ["yuki-2"], // 酢酸エチル
  // ---- 石綿則 ----------------------------------------------
  "1332-21-4": ["sekimen"], // 石綿 (アスベスト)
  "12172-73-5": ["sekimen"], // アモサイト
  "12001-29-5": ["sekimen"], // クリソタイル
  "12001-28-4": ["sekimen"], // クロシドライト
  // ---- 酸欠則 (CAS 直接指定はないが代表ガス) -------------------
  // 酸欠則は作業環境(酸素濃度18%未満)の規制であり物質単位ではないため、
  // タグは作業環境関連物質(窒素・二酸化炭素・硫化水素)のみに付与。
  "7727-37-9": ["sankketsu"], // 窒素 (酸素欠乏発生ガス)
  "124-38-9": ["sankketsu"], // 二酸化炭素 (高濃度で酸素欠乏発生)
  "7783-06-4": ["tokutei-2", "sankketsu"], // 硫化水素 (酸欠則 第二種・特化則 第二類)
  // ---- 粉じん則 (代表物質) --------------------------------
  "14808-60-7": ["funjin"], // 結晶質シリカ (石英)
  "14464-46-1": ["funjin"], // 結晶質シリカ (クリストバライト)
};

/**
 * P0-009: CAS 番号から 安衛法 特別則 タグを取得。
 * 未登録の物質は空配列を返す (false-positive を避けるためマッピング外は表示しない)。
 */
export function oshaTagsForCas(cas: string | null | undefined): RegulationTag[] {
  if (!cas) return [];
  const tags = OSHA_REGULATION_TAGS_BY_CAS[cas];
  return tags ? [...tags] : [];
}

/**
 * P0-009: 特別管理物質 (特化則 第二類のうちがん原性等で30年記録保存対象) かどうか。
 * UI表示で「特別管理物質」バッジを併記するために使用。
 *
 * 注: 完全な特別管理物質リストは ETL 整備が必要。ここでは確実なものに限定。
 */
export const SPECIAL_CONTROL_CAS_SET = new Set<string>([
  // 特化則38条の4の列挙 (令別表第3第2号の号番号) と突合済み 2026-07-02
  "75-09-2", // ジクロロメタン (19の3)
  "71-43-2", // ベンゼン (30)
  "50-00-0", // ホルムアルデヒド (31の2)
  "75-21-8", // エチレンオキシド (5)
  "127-18-4", // テトラクロロエチレン (22の4)
  "79-01-6", // トリクロロエチレン (22の5)
  "67-66-3", // クロロホルム (11の2)
  "56-23-5", // 四塩化炭素 (18の2)
  // アクリルアミド(79-06-1)は第二類だが38条の4の列挙外=特別管理物質ではないため含めない
]);

export function isSpecialControlSubstance(cas: string | null | undefined): boolean {
  if (!cas) return false;
  return SPECIAL_CONTROL_CAS_SET.has(cas);
}
