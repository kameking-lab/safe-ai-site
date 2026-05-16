import type {
  IllnessCategory,
  IllnessCategoryMeta,
  IllnessCondition,
} from "@/types/illness-consideration";

import { CANCER_CONDITIONS } from "./cancer";
import { STROKE_CONDITIONS } from "./stroke";
import { HEART_DISEASE_CONDITIONS } from "./heart-disease";
import { DIABETES_CONDITIONS } from "./diabetes";
import { MENTAL_HEALTH_CONDITIONS } from "./mental-health";
import { INTRACTABLE_DISEASE_CONDITIONS } from "./intractable-disease";

export const ILLNESS_CATEGORIES: IllnessCategoryMeta[] = [
  {
    id: "cancer",
    label: "がん（悪性新生物）",
    shortLabel: "がん",
    summary:
      "外科治療・化学療法・放射線療法・ホルモン療法など複数の治療局面で配慮事項が異なります。外来通院と勤務の両立、再発不安への対応が中心です。",
    riskHighlights: [
      "化学療法期の感染リスク・倦怠感",
      "重量物取扱・術後創部への負荷",
      "再発不安に伴う心理的支援",
    ],
    relatedLaws: [
      "労働安全衛生法第69条（健康保持増進）",
      "労働安全衛生法第70条の2（両立支援）",
      "がん対策基本法",
      "厚労省「事業場における治療と仕事の両立支援のためのガイドライン」（令和5年改訂）",
    ],
  },
  {
    id: "stroke",
    label: "脳血管疾患（脳卒中）",
    shortLabel: "脳卒中",
    summary:
      "運動麻痺・高次脳機能障害・再発リスクの3点が職務影響の柱。短時間勤務・職務再設計・環境改修を組み合わせます。",
    riskHighlights: [
      "再発予防のための血圧・服薬管理",
      "高次脳機能障害の早期察知",
      "高所作業・運転業務の可否判定",
    ],
    relatedLaws: [
      "労働安全衛生法第66条（健康診断）",
      "障害者の雇用の促進等に関する法律",
      "脳卒中・循環器病対策基本法",
    ],
  },
  {
    id: "heart-disease",
    label: "心疾患（循環器疾患）",
    shortLabel: "心疾患",
    summary:
      "心筋梗塞・心不全・不整脈などで身体活動量の上限が変化します。METs（運動強度）と業務負荷の整合が要です。",
    riskHighlights: [
      "重量物・暑熱寒冷暴露の制限",
      "ペースメーカ装着者の電磁干渉対策",
      "AED・救急体制の整備",
    ],
    relatedLaws: [
      "労働安全衛生法第66条の8（長時間労働者面接指導）",
      "脳卒中・循環器病対策基本法",
    ],
  },
  {
    id: "diabetes",
    label: "糖尿病",
    shortLabel: "糖尿病",
    summary:
      "食事・服薬・自己血糖管理を業務時間内で確保することが鍵。合併症進行段階では大幅な職務再設計が必要です。",
    riskHighlights: [
      "低血糖発作への即時対応",
      "合併症（網膜症・腎症・神経障害）",
      "透析導入時のシフト調整",
    ],
    relatedLaws: [
      "労働安全衛生法第66条（健康診断）",
      "障害者の雇用の促進等に関する法律（合併症進行時）",
    ],
  },
  {
    id: "mental-health",
    label: "精神疾患・メンタルヘルス",
    shortLabel: "メンタル",
    summary:
      "うつ病・不安障害・双極性障害・適応障害・発達障害など。再休職予防のため、段階的な業務付与と継続的なモニタリングが必須です。",
    riskHighlights: [
      "復職プログラム（リワーク）の運用",
      "ストレスチェックとの連動",
      "ハラスメント・対人関係要因の除去",
    ],
    relatedLaws: [
      "労働安全衛生法第66条の10（ストレスチェック制度）",
      "労働施策総合推進法（パワハラ防止）",
      "厚労省「心の健康問題により休業した労働者の職場復帰支援の手引き」",
    ],
  },
  {
    id: "intractable-disease",
    label: "難病・指定難病",
    shortLabel: "難病",
    summary:
      "多発性硬化症・パーキンソン病・炎症性腸疾患・関節リウマチ・SLEなど。長期にわたる再発寛解への対応が必要です。",
    riskHighlights: [
      "再発時の臨時休暇制度",
      "難病医療費助成制度の活用",
      "障害者雇用への切替検討",
    ],
    relatedLaws: [
      "難病の患者に対する医療等に関する法律",
      "障害者の雇用の促進等に関する法律",
      "労働安全衛生法第70条の2（両立支援）",
    ],
  },
];

export const ALL_ILLNESS_CONDITIONS: IllnessCondition[] = [
  ...CANCER_CONDITIONS,
  ...STROKE_CONDITIONS,
  ...HEART_DISEASE_CONDITIONS,
  ...DIABETES_CONDITIONS,
  ...MENTAL_HEALTH_CONDITIONS,
  ...INTRACTABLE_DISEASE_CONDITIONS,
];

export function getCategoryMeta(
  id: IllnessCategory,
): IllnessCategoryMeta | undefined {
  return ILLNESS_CATEGORIES.find((c) => c.id === id);
}

export function getConditionsByCategory(
  id: IllnessCategory,
): IllnessCondition[] {
  return ALL_ILLNESS_CONDITIONS.filter((c) => c.category === id);
}

export function getConditionById(id: string): IllnessCondition | undefined {
  return ALL_ILLNESS_CONDITIONS.find((c) => c.id === id);
}
