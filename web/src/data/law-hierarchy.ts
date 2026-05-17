import { allLawArticles } from "@/data/laws";
import { mhlwNotices } from "@/data/mhlw-notices";

/**
 * 階層レベル。
 * - law: 法律（国会制定、最上位）
 * - cabinetOrder: 政令（内閣制定）
 * - ministerialOrdinance: 省令（厚労省制定）
 */
export type LawHierarchyLevel = "law" | "cabinetOrder" | "ministerialOrdinance";

export const LEVEL_LABEL: Record<LawHierarchyLevel, string> = {
  law: "法律",
  cabinetOrder: "政令",
  ministerialOrdinance: "省令",
};

const EGOV_BASE = "https://laws.e-gov.go.jp/law";

export type LawHierarchyNode = {
  /** 内部識別子（kebab-case） */
  id: string;
  /** 親ノードID（最上位法律はundefined） */
  parentId?: string;
  /** 階層レベル */
  level: LawHierarchyLevel;
  /** 正式名称 */
  title: string;
  /** 略称（バッジ表示用） */
  shortTitle: string;
  /** 公布番号・主旨など短い説明 */
  description: string;
  /** e-Gov法令検索のID（laws.e-gov.go.jp/law/{id}）。検索不能な法令は省略 */
  eGovLawId?: string;
  /**
   * `/law-search` で絞り込み対象として使う法令名（LawArticle.law と一致）。
   * 既存のRAGコーパスに収録されていない法令は省略。
   */
  lawNameInData?: string;
  /**
   * `mhlwNotices` の lawRef フィールド値。関連通達件数の集計に使う。
   * lawRef が「労働安全衛生規則」「特定化学物質障害予防規則」など、
   * 規則名と完全一致する場合のみ設定。
   */
  circularLawRef?: string;
  /** 主な所管領域・短い注記（カードに2行で表示） */
  scopeNote: string;
};

/**
 * 労働安全衛生法を頂点とする階層構造。
 * 法律 → 政令 → 省令の3階層。
 * 関連告示・通達・指針は `/circulars` 側で全件管理しており、
 * このページからは集計件数と遷移リンクのみを提供する。
 */
export const LAW_HIERARCHY_NODES: LawHierarchyNode[] = [
  {
    id: "rodo-anzen-eisei-ho",
    level: "law",
    title: "労働安全衛生法",
    shortTitle: "安衛法",
    description: "昭和47年法律第57号",
    eGovLawId: "347AC0000000057",
    lawNameInData: "労働安全衛生法",
    circularLawRef: "労働安全衛生法",
    scopeNote:
      "労働災害防止の総合的枠組み。事業者責務・安全衛生管理体制・健康診断・有害物規制の根拠法。",
  },
  {
    id: "rodo-anzen-eisei-ho-sikokirei",
    parentId: "rodo-anzen-eisei-ho",
    level: "cabinetOrder",
    title: "労働安全衛生法施行令",
    shortTitle: "安衛令",
    description: "昭和47年政令第318号",
    eGovLawId: "347CO0000000318",
    lawNameInData: "労働安全衛生法施行令",
    circularLawRef: "労働安全衛生法施行令",
    scopeNote:
      "法第14条等の対象作業・規制対象物質・統括安全衛生責任者選任義務の具体的範囲を定める政令。",
  },
  {
    id: "anzen-eisei-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "労働安全衛生規則",
    shortTitle: "安衛則",
    description: "昭和47年労働省令第32号",
    eGovLawId: "347M50002000032",
    lawNameInData: "労働安全衛生規則",
    circularLawRef: "労働安全衛生規則",
    scopeNote: "安衛法全般の細則。一般作業の安全衛生基準を網羅する基本省令。",
  },
  {
    id: "crane-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "クレーン等安全規則",
    shortTitle: "クレーン則",
    description: "昭和47年労働省令第34号",
    eGovLawId: "347M50002000034",
    lawNameInData: "クレーン等安全規則",
    circularLawRef: "クレーン等安全規則",
    scopeNote:
      "クレーン・移動式クレーン・デリック・エレベーターの設置・使用・運転に関する基準。",
  },
  {
    id: "boiler-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "ボイラー及び圧力容器安全規則",
    shortTitle: "ボイラー則",
    description: "昭和47年労働省令第33号",
    eGovLawId: "347M50002000033",
    lawNameInData: "ボイラー及び圧力容器安全規則",
    circularLawRef: "ボイラー及び圧力容器安全規則",
    scopeNote: "ボイラー・第一種/第二種圧力容器・小型ボイラー等の設置・運転・検査基準。",
  },
  {
    id: "gondola-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "ゴンドラ安全規則",
    shortTitle: "ゴンドラ則",
    description: "昭和47年労働省令第35号",
    eGovLawId: "347M50002000035",
    lawNameInData: "ゴンドラ安全規則",
    scopeNote: "ビル外壁清掃等で使用するゴンドラの構造規格・設置・点検基準。",
  },
  {
    id: "yuki-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "有機溶剤中毒予防規則",
    shortTitle: "有機則",
    description: "昭和47年労働省令第36号",
    eGovLawId: "347M50002000036",
    lawNameInData: "有機溶剤中毒予防規則",
    circularLawRef: "有機溶剤中毒予防規則",
    scopeNote: "塗装・洗浄・印刷等の有機溶剤取扱業務の作業環境測定・健康診断・呼吸用保護具基準。",
  },
  {
    id: "en-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "鉛中毒予防規則",
    shortTitle: "鉛則",
    description: "昭和47年労働省令第37号",
    eGovLawId: "347M50002000037",
    lawNameInData: "鉛中毒予防規則",
    circularLawRef: "鉛中毒予防規則",
    scopeNote: "鉛製錬・鉛蓄電池製造・はんだ付け等の鉛業務における作業環境・健康管理基準。",
  },
  {
    id: "shi-alkyl-en-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "四アルキル鉛中毒予防規則",
    shortTitle: "四アルキル鉛則",
    description: "昭和47年労働省令第38号",
    eGovLawId: "347M50002000038",
    lawNameInData: "四アルキル鉛中毒予防規則",
    scopeNote: "四エチル鉛・四メチル鉛等の極度に毒性の高い有機鉛取扱業務の予防基準。",
  },
  {
    id: "tokka-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "特定化学物質障害予防規則",
    shortTitle: "特化則",
    description: "昭和47年労働省令第39号",
    eGovLawId: "347M50002000039",
    lawNameInData: "特定化学物質障害予防規則",
    circularLawRef: "特定化学物質障害予防規則",
    scopeNote: "発がん性等の特定化学物質を取扱う業務の管理区分・作業環境測定・特殊健康診断。",
  },
  {
    id: "koa-atsu-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "高気圧作業安全衛生規則",
    shortTitle: "高圧則",
    description: "昭和47年労働省令第40号",
    eGovLawId: "347M50002000040",
    lawNameInData: "高気圧作業安全衛生規則",
    circularLawRef: "高気圧作業安全衛生規則",
    scopeNote: "潜水業務・高気圧室業務における減圧・呼吸用ガス・健康管理基準。",
  },
  {
    id: "denri-houshasen-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "電離放射線障害防止規則",
    shortTitle: "電離則",
    description: "昭和47年労働省令第41号",
    eGovLawId: "347M50002000041",
    lawNameInData: "電離放射線障害防止規則",
    circularLawRef: "電離放射線障害防止規則",
    scopeNote: "X線・γ線・放射性同位元素取扱業務の被ばく線量管理・健康診断基準。",
  },
  {
    id: "sankketsu-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "酸素欠乏症等防止規則",
    shortTitle: "酸欠則",
    description: "昭和47年労働省令第42号",
    eGovLawId: "347M50002000042",
    lawNameInData: "酸素欠乏症等防止規則",
    scopeNote: "酸素濃度18%未満・硫化水素10ppm超の作業環境での測定・換気・救護基準。",
  },
  {
    id: "jimusho-eisei-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "事務所衛生基準規則",
    shortTitle: "事務所則",
    description: "昭和47年労働省令第43号",
    eGovLawId: "347M50002000043",
    lawNameInData: "事務所衛生基準規則",
    scopeNote: "事務作業に従事する労働者の気積・換気・温湿度・照度・休養設備の基準。",
  },
  {
    id: "kikai-kentei-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "機械等検定規則",
    shortTitle: "機械等検定規則",
    description: "昭和47年労働省令第45号",
    eGovLawId: "347M50002000045",
    lawNameInData: "機械等検定規則",
    scopeNote: "防爆構造電気機械器具・保護帽・防じんマスク等の個別検定・型式検定手続。",
  },
  {
    id: "kikai-kentei-kisoku-katashiki",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "機械等型式検定規則",
    shortTitle: "型式検定規則",
    description: "昭和47年労働省令第46号",
    eGovLawId: "347M50002000046",
    scopeNote: "型式検定対象の機械等の構造規格適合性確認・型式承認手続。",
  },
  {
    id: "funjin-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "粉じん障害防止規則",
    shortTitle: "粉じん則",
    description: "昭和54年労働省令第18号",
    eGovLawId: "354M50002000018",
    lawNameInData: "粉じん障害防止規則",
    circularLawRef: "粉じん障害防止規則",
    scopeNote:
      "金属研磨・坑内作業・アーク溶接等の特定粉じん作業における換気・呼吸用保護具・健康診断基準。",
  },
  {
    id: "sekimen-kisoku",
    parentId: "rodo-anzen-eisei-ho",
    level: "ministerialOrdinance",
    title: "石綿障害予防規則",
    shortTitle: "石綿則",
    description: "平成17年厚生労働省令第21号",
    eGovLawId: "417M60000100021",
    lawNameInData: "石綿障害予防規則",
    circularLawRef: "石綿障害予防規則",
    scopeNote: "建築物解体時の石綿事前調査・除去工事の作業基準・労働者保護措置。",
  },
  {
    id: "jinpai-ho",
    level: "law",
    title: "じん肺法",
    shortTitle: "じん肺法",
    description: "昭和35年法律第30号",
    eGovLawId: "335AC0000000030",
    lawNameInData: "じん肺法",
    scopeNote:
      "粉じん作業に従事する労働者のじん肺健康管理。安衛法と並列の独立法であり、じん肺管理区分・健康管理手帳制度を規定。",
  },
  {
    id: "jinpai-ho-sikokisokoku",
    parentId: "jinpai-ho",
    level: "ministerialOrdinance",
    title: "じん肺法施行規則",
    shortTitle: "じん肺則",
    description: "昭和35年労働省令第6号",
    eGovLawId: "335M50002000006",
    circularLawRef: "じん肺法施行規則",
    scopeNote: "じん肺健康診断の実施方法・じん肺管理区分決定手続・記録保存。",
  },
];

/** 安衛法系の最上位ID（フィルタやヘッダ表示で使用） */
export const ROOT_LAW_ID = "rodo-anzen-eisei-ho";

/** 法令単位の収録条文数を取得（RAGコーパスの実測値） */
export function getArticleCount(lawNameInData: string | undefined): number {
  if (!lawNameInData) return 0;
  return allLawArticles.filter((a) => a.law === lawNameInData).length;
}

/** 法令単位の関連通達・告示・指針件数を取得 */
export function getCircularCount(circularLawRef: string | undefined): number {
  if (!circularLawRef) return 0;
  return mhlwNotices.filter((n) => n.lawRef === circularLawRef).length;
}

/** 法令名から e-Gov 法令検索URLを組み立てる（IDが無ければnull） */
export function getEGovUrl(eGovLawId: string | undefined): string | null {
  return eGovLawId ? `${EGOV_BASE}/${eGovLawId}` : null;
}

/** 子ノード（政令・省令）を親IDで取得 */
export function getChildren(parentId: string): LawHierarchyNode[] {
  return LAW_HIERARCHY_NODES.filter((n) => n.parentId === parentId);
}

/** 階層ノードをレベルで取得 */
export function getNodesByLevel(level: LawHierarchyLevel): LawHierarchyNode[] {
  return LAW_HIERARCHY_NODES.filter((n) => n.level === level);
}

/** 集計値（ページヘッダで使用） */
export const HIERARCHY_TOTALS = {
  laws: LAW_HIERARCHY_NODES.filter((n) => n.level === "law").length,
  cabinetOrders: LAW_HIERARCHY_NODES.filter((n) => n.level === "cabinetOrder").length,
  ministerialOrdinances: LAW_HIERARCHY_NODES.filter(
    (n) => n.level === "ministerialOrdinance"
  ).length,
  noticesTotal: mhlwNotices.filter((n) => n.docType === "通達").length,
  announcementsTotal: mhlwNotices.filter((n) => n.docType === "告示").length,
  guidelinesTotal: mhlwNotices.filter((n) => n.docType === "指針").length,
} as const;
