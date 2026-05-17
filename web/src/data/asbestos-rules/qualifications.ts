import type { AsbestosQualification } from "@/types/asbestos";

/**
 * Required qualifications for asbestos-related demolition and renovation
 * work. Aligned with the post-R5.10 (2023-10-01) regime where pre-work
 * investigation must be carried out by a qualified investigator
 * (建築物石綿含有建材調査者).
 *
 * Sources: 厚生労働省「石綿障害予防規則」, 国土交通省「建築物石綿含有建材
 * 調査者講習」運営要領, 厚生労働省「特別教育規程」.
 */
export const ASBESTOS_QUALIFICATIONS: AsbestosQualification[] = [
  {
    id: "chief-supervisor",
    name: "石綿作業主任者",
    type: "chief-supervisor",
    requiredWhen:
      "石綿含有建築物の解体・改修や石綿含有物の取扱い作業を行うすべての事業者で選任が必要。レベル区分（1〜3）を問わず必須。",
    howToObtain:
      "都道府県労働局長登録教習機関で「石綿作業主任者技能講習」（2 日間・学科＋修了試験）を修了。試験合格で修了証が交付される。",
    lawReferences: [
      {
        name: "労働安全衛生法",
        articles: ["第14条"],
        summary:
          "作業主任者の選任義務。石綿則 §19 で具体的な職務（隔離養生確認、保護具点検、作業方法決定）が規定。",
      },
      {
        name: "石綿障害予防規則",
        articles: ["第19条", "第20条"],
        summary: "石綿作業主任者の選任義務と職務。",
      },
    ],
  },
  {
    id: "special-education",
    name: "石綿取扱作業従事者特別教育",
    type: "special-education",
    requiredWhen:
      "石綿含有物の解体・改修・除去等の作業に従事するすべての労働者が受講必須。一度修了すれば事業者を変えても有効。",
    howToObtain:
      "事業者または登録機関による特別教育を受講（学科 4.5 時間以上）。終了後は修了記録を 3 年間保存（実務上は離職時まで保存推奨）。",
    lawReferences: [
      {
        name: "労働安全衛生法",
        articles: ["第59条第3項"],
        summary: "危険有害業務の特別教育義務。",
      },
      {
        name: "石綿障害予防規則",
        articles: ["第27条"],
        summary: "石綿取扱作業従事者への特別教育義務。",
      },
    ],
  },
  {
    id: "qualified-investigator",
    name: "建築物石綿含有建材調査者（一般・特定）",
    type: "investigator",
    requiredWhen:
      "R5.10（2023-10-01）以降に着手する建築物の解体・改修工事における事前調査を実施するために必須。一戸建住宅・共同住宅の住戸内部は一般建築物石綿含有建材調査者で可。それ以外の建築物は特定建築物石綿含有建材調査者または一般建築物石綿含有建材調査者が担当。",
    howToObtain:
      "国土交通大臣・厚生労働大臣・環境大臣告示に基づく登録講習機関で 11 時間以上の講習を受講し、修了考査に合格。受講前提として実務経験要件（または特定の建築・電気・施工管理国家資格保有）あり。",
    lawReferences: [
      {
        name: "石綿障害予防規則",
        articles: ["第3条第4項"],
        summary:
          "事前調査は調査者講習修了者またはこれと同等の知識・技能を有する者が行うべき旨を規定。",
      },
      {
        name: "建築物石綿含有建材調査者講習登録規程",
        summary:
          "国交省・厚労省・環境省合同告示で講習要件・修了考査・登録機関を定める。",
      },
    ],
  },
  {
    id: "analyst",
    name: "石綿分析者（JATI協会等の分析技術者）",
    type: "analyst",
    requiredWhen:
      "事前調査で目視判定がつかない建材について分析調査（X 線回折・分散染色等）を行う場合に、試料採取・分析を担当する。社内に有資格者がいなければ外部分析機関に委託。",
    howToObtain:
      "JATI協会・日本作業環境測定協会等が実施する石綿分析技術者育成研修を受講し、修了試験合格。建築物石綿含有建材調査者と異なり国家資格化はされていないが、ISO/IEC 17025 認定機関での分析が事実上の標準。",
    lawReferences: [
      {
        name: "石綿障害予防規則",
        articles: ["第3条第2項"],
        summary:
          "分析調査は分析を適切に行うために必要な知識・技能を有する者が行う旨を規定。",
      },
    ],
  },
];
