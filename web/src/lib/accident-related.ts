// 事故タイプから「KYテンプレ」「保護具カテゴリ」「関連法令」を推定する
//
// 事故詳細から /ky, /equipment-finder, /laws へ動線を張る際に使う。
// `template` は ky-industry-presets の id、`categories` は equipment-categories の id。
// `articles` は法令の章キーワード（laws ページでハイライト用）。

import type { AccidentType } from "@/lib/types/domain";

export type AccidentRelated = {
  /** KY業種プリセット id（getPresetById で引ける） */
  template: string;
  /** 推奨される保護具カテゴリ（equipment-categories の id） */
  categories: string[];
  /** 関連法令キーワード（条文タイトルや省令名で laws ページにマッチさせる） */
  articles: string[];
  /** UIに表示する一行要約 */
  rationale: string;
};

const FALLBACK: AccidentRelated = {
  template: "construction",
  categories: ["helmet", "safety-shoes", "gloves"],
  articles: ["労働安全衛生規則"],
  rationale: "汎用の安全衛生則に基づく基本対策を推奨します。",
};

const RELATED: Record<AccidentType, AccidentRelated> = {
  墜落: {
    template: "construction",
    categories: ["harness", "helmet", "safety-shoes"],
    articles: ["足場等からの墜落防止", "労働安全衛生規則 第518条", "フルハーネス型墜落制止用器具"],
    rationale: "高所作業ではフルハーネス・ヘルメット・滑り止め安全靴が必須です。",
  },
  転倒: {
    template: "cleaning",
    categories: ["safety-shoes", "visibility"],
    articles: ["通路の安全確保", "労働安全衛生規則 第540条"],
    rationale: "通路整理・耐滑安全靴・段差表示で転倒を防ぎます。",
  },
  "はさまれ・巻き込まれ": {
    template: "manufacturing",
    categories: ["gloves", "safety-shoes", "protective-clothing"],
    articles: ["機械の安全装置", "労働安全衛生規則 第101条", "プレス機械の安全"],
    rationale: "機械の運転停止・ロックアウトと耐切創手袋で挟まれを防ぎます。",
  },
  "切れ・こすれ": {
    template: "manufacturing",
    categories: ["gloves", "goggles", "protective-clothing"],
    articles: ["保護具の使用義務", "労働安全衛生規則 第594条"],
    rationale: "耐切創手袋・保護メガネで切創・擦過傷を防ぎます。",
  },
  "飛来・落下": {
    template: "construction",
    categories: ["helmet", "goggles", "safety-shoes"],
    articles: ["飛来落下物の防止", "労働安全衛生規則 第538条"],
    rationale: "ヘルメット・落下物養生・立入制限が基本対策です。",
  },
  感電: {
    template: "construction",
    categories: ["gloves", "safety-shoes", "protective-clothing"],
    articles: ["電気工事の安全", "労働安全衛生規則 第339条", "電気取扱業務"],
    rationale: "停電作業・絶縁手袋・絶縁靴と電気取扱特別教育が必要です。",
  },
  車両: {
    template: "transport",
    categories: ["visibility", "helmet", "safety-shoes"],
    articles: ["車両系建設機械", "労働安全衛生規則 第151条"],
    rationale: "誘導者の配置・高視認性ベスト・立入禁止区画で接触を防ぎます。",
  },
  交通事故: {
    template: "transport",
    categories: ["visibility", "helmet"],
    articles: ["自動車運転業務の管理", "改善基準告示"],
    rationale: "運転前点検・拘束時間の遵守・高視認性ベスト着用が基本です。",
  },
  "崩壊・倒壊": {
    template: "construction",
    categories: ["helmet", "safety-shoes", "protective-clothing"],
    articles: ["土止め支保工", "労働安全衛生規則 第361条"],
    rationale: "支保工・土止め・地山点検と立入制限が必須です。",
  },
  火災: {
    template: "manufacturing",
    categories: ["protective-clothing", "gas-mask", "gloves"],
    articles: ["危険物の取扱い", "消防法", "労働安全衛生規則 第279条"],
    rationale: "火気使用許可・消火器配置・耐火性保護衣で延焼を防ぎます。",
  },
  爆発: {
    template: "manufacturing",
    categories: ["protective-clothing", "goggles", "gas-mask"],
    articles: ["爆発・火災の防止", "労働安全衛生規則 第256条"],
    rationale: "可燃性ガスの除去・防爆機器・耐爆フェイスシールドが必要です。",
  },
  "高温・低温の物との接触": {
    template: "manufacturing",
    categories: ["gloves", "protective-clothing", "goggles"],
    articles: ["熱に対する措置", "労働安全衛生規則 第608条"],
    rationale: "耐熱・耐冷手袋・保護衣と接触面の温度管理が必要です。",
  },
  "有害物等との接触": {
    template: "manufacturing",
    categories: ["gloves", "goggles", "gas-mask", "protective-clothing"],
    articles: ["特定化学物質障害予防規則", "有機溶剤中毒予防規則"],
    rationale: "保護具の他、局所排気・作業環境測定が法令上必要です。",
  },
  酸素欠乏: {
    template: "construction",
    categories: ["gas-mask", "harness", "protective-clothing"],
    articles: ["酸素欠乏症等防止規則", "酸素欠乏危険作業主任者"],
    rationale: "酸素濃度測定・送気マスク・救助体制が酸欠則で必須です。",
  },
  溺水: {
    template: "construction",
    categories: ["life-saving", "harness", "visibility"],
    articles: ["水上作業の安全", "労働安全衛生規則 第532条"],
    rationale: "ライフジャケット・救命浮環・救助手段の確保が必要です。",
  },
  熱中症: {
    template: "construction",
    categories: ["protective-clothing", "helmet", "visibility"],
    articles: ["熱中症対策", "STOP！熱中症 クールワークキャンペーン"],
    rationale: "WBGT測定・休憩・水分塩分補給と空調服の活用を推奨します。",
  },
  低体温症: {
    template: "construction",
    categories: ["protective-clothing", "gloves"],
    articles: ["寒冷作業の管理", "労働安全衛生規則 第609条"],
    rationale: "防寒衣・休憩室の暖房・水分補給で低体温症を防ぎます。",
  },
  有害光線: {
    template: "manufacturing",
    categories: ["goggles", "protective-clothing", "helmet"],
    articles: ["電離放射線障害防止規則", "紫外線対策"],
    rationale: "遮光眼鏡・遮光保護衣・距離管理が基本対策です。",
  },
  有害物質: {
    template: "manufacturing",
    categories: ["gas-mask", "gloves", "goggles", "protective-clothing"],
    articles: ["特定化学物質障害予防規則", "化学物質リスクアセスメント"],
    rationale: "SDS確認・リスクアセスメント・保護具の選定が法令義務です。",
  },
  激突され: {
    template: "construction",
    categories: ["helmet", "visibility", "safety-shoes"],
    articles: ["車両系建設機械", "労働安全衛生規則 第158条"],
    rationale: "立入禁止区域・誘導者・高視認性ベストで衝突を防ぎます。",
  },
  振動障害: {
    template: "construction",
    categories: ["gloves", "ear-protection"],
    articles: ["振動障害予防", "チェーンソー取扱い"],
    rationale: "防振手袋・連続作業時間の管理・健康診断が必要です。",
  },
  "動作の反動・無理な動作": {
    template: "manufacturing",
    categories: ["gloves", "protective-clothing", "safety-shoes"],
    articles: ["腰痛予防対策指針", "重量物取扱い"],
    rationale: "リフティング機器の活用・無理な姿勢の回避・腰痛予防体操が有効です。",
  },
};

export function getAccidentRelated(type: AccidentType): AccidentRelated {
  return RELATED[type] ?? FALLBACK;
}
