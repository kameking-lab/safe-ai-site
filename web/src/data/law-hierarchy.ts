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
    lawNameInData: "じん肺法施行規則",
    circularLawRef: "じん肺法施行規則",
    scopeNote: "じん肺健康診断の実施方法・じん肺管理区分決定手続・記録保存。",
  },
  // 50法令体制への拡張（+11法令、じん肺則は既存ノードを活用）
  {
    id: "karoshi-boshi-ho",
    level: "law",
    title: "過労死等防止対策推進法",
    shortTitle: "過労死防止法",
    description: "平成26年法律第100号",
    eGovLawId: "426AC1000000100",
    lawNameInData: "過労死等防止対策推進法",
    scopeNote:
      "脳・心臓疾患／精神障害による過労死の防止を国の責務として位置づけ、調査研究・啓発・大綱策定・協議会の枠組みを定める。",
  },
  {
    id: "rosai-boshi-dantai-ho",
    level: "law",
    title: "労働災害防止団体法",
    shortTitle: "労災防止団体法",
    description: "昭和39年法律第118号",
    eGovLawId: "339AC0000000118",
    lawNameInData: "労働災害防止団体法",
    scopeNote:
      "中央労働災害防止協会(中災防)と業種別労働災害防止協会(建災防／陸災防／港災防／林災防／鉱業労災防止)の根拠法。労働災害防止規程の認可制度を含む。",
  },
  {
    id: "kensetsu-rosai-boshi-kitei",
    parentId: "rosai-boshi-dantai-ho",
    level: "ministerialOrdinance",
    title: "建設業労働災害防止規程",
    shortTitle: "建災防規程",
    description: "建設業労働災害防止協会作成（労働災害防止団体法第36条 厚生労働大臣認可）",
    lawNameInData: "建設業労働災害防止規程",
    scopeNote:
      "建設業労働災害防止協会の会員事業者に拘束力をもつ規程。安全衛生管理体制・墜落防止・解体工事・下請混在作業の措置を具体化。",
  },
  {
    id: "kenko-zoshin-ho",
    level: "law",
    title: "健康増進法",
    shortTitle: "健康増進法",
    description: "平成14年法律第103号",
    eGovLawId: "414AC0000000103",
    lawNameInData: "健康増進法",
    scopeNote:
      "国民の健康増進と受動喫煙防止のための施策を定める。第二種施設（事務所・工場・飲食店）の屋内禁煙・喫煙専用室基準は事業場禁煙対策の根拠。",
  },
  {
    id: "koatsu-gas-hoanho",
    level: "law",
    title: "高圧ガス保安法",
    shortTitle: "高圧ガス保安法",
    description: "昭和26年法律第204号",
    eGovLawId: "326AC0000000204",
    lawNameInData: "高圧ガス保安法",
    scopeNote:
      "高圧ガスの製造・貯蔵・販売・移動・消費の規制。1MPa以上の圧縮ガス・液化ガスを対象とし、保安統括者・冷凍保安責任者の選任を義務付ける。",
  },
  {
    id: "soon-kisei-ho",
    level: "law",
    title: "騒音規制法",
    shortTitle: "騒音規制法",
    description: "昭和43年法律第98号",
    eGovLawId: "343AC0000000098",
    lawNameInData: "騒音規制法",
    scopeNote:
      "工場・事業場の特定施設および建設工事の特定建設作業から発生する騒音を規制。労働衛生(85dB)・敷地境界線騒音規制を補完する環境法。",
  },
  {
    id: "kashin-ho",
    level: "law",
    title: "化学物質の審査及び製造等の規制に関する法律（化審法）",
    shortTitle: "化審法",
    description: "昭和48年法律第117号",
    eGovLawId: "348AC0000000117",
    lawNameInData: "化学物質の審査及び製造等の規制に関する法律",
    scopeNote:
      "新規化学物質の事前審査・第一種特定化学物質(PCB等)の原則禁止・優先評価化学物質のリスク評価を定める。特化則・有機則と上流側で接続。",
  },
  {
    id: "dokugeki-ho",
    level: "law",
    title: "毒物及び劇物取締法",
    shortTitle: "毒劇法",
    description: "昭和25年法律第303号",
    eGovLawId: "325AC0000000303",
    lawNameInData: "毒物及び劇物取締法",
    scopeNote:
      "毒物・劇物・特定毒物の製造・輸入・販売・取扱を規制。営業登録・毒物劇物取扱責任者・「医薬用外毒物/劇物」表示・譲渡記録5年保存を義務付ける。",
  },
  {
    id: "shokuhin-eisei-ho",
    level: "law",
    title: "食品衛生法",
    shortTitle: "食品衛生法",
    description: "昭和22年法律第233号",
    eGovLawId: "322AC0000000233",
    lawNameInData: "食品衛生法",
    scopeNote:
      "食品の安全性確保のための営業許可・HACCP・規格基準・食品衛生管理者を定める。飲食店・食品製造業の事業場運営における基幹法。",
  },
  {
    id: "kowan-rodo-ho",
    level: "law",
    title: "港湾労働法",
    shortTitle: "港湾労働法",
    description: "昭和63年法律第40号",
    eGovLawId: "363AC0000000040",
    lawNameInData: "港湾労働法",
    scopeNote:
      "六大港湾(東京/横浜/名古屋/大阪/神戸/関門)の港湾運送業に適用。港湾労働者派遣の特例・雇用管理者選任・港湾労働者証制度を定める。",
  },
  {
    id: "senin-anzen-eisei-kisoku",
    level: "ministerialOrdinance",
    title: "船員労働安全衛生規則",
    shortTitle: "船員安衛則",
    description: "昭和39年運輸省令第53号",
    eGovLawId: "339M50000800053",
    lawNameInData: "船員労働安全衛生規則",
    scopeNote:
      "国土交通省所管。船員法に基づき船員の労働安全衛生（船倉閉鎖区画・高所作業・化学物質取扱・健康診断）を定める。陸上の安衛法体系は船員に適用されない。",
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
