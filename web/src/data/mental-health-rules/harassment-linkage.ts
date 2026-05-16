import type { HarassmentLinkage } from "@/types/mental-health";

/**
 * Harassment-prevention duties that intersect with the stress-check program.
 *
 * Each entry surfaces the operational overlap that internal auditors and
 * labour-standards inspectors look for: the same complaint window must accept
 * both stress-check follow-ups and harassment reports, and high-stress survey
 * results often correlate with unreported harassment cases.
 */
export const HARASSMENT_LINKAGES: HarassmentLinkage[] = [
  {
    type: "power",
    employerDuties: [
      "事業主の方針明確化と労働者への周知・啓発（パワハラの内容・行ってはならない旨）",
      "相談窓口の設置と適切な対応体制の整備",
      "事後の迅速かつ適切な対応（事実確認・行為者処分・再発防止）",
      "プライバシー保護と不利益取扱の禁止",
    ],
    legalBasis: [
      "労働施策総合推進法 第30条の2（2020年6月施行、中小企業は2022年4月から義務化）",
      "事業主が職場における優越的な関係を背景とした言動に起因する問題に関して雇用管理上講ずべき措置等についての指針（令和2年厚労省告示第5号）",
    ],
    linkToStressCheck:
      "ストレスチェックの集団分析で『上司のサポート』が著しく低い部署は、パワハラ事案の存在を示唆。窓口を共通化し、対応マニュアル上で連携手順を明文化する。",
  },
  {
    type: "sexual",
    employerDuties: [
      "事業主の方針明確化と労働者への周知・啓発",
      "相談窓口の設置と運営",
      "事後の迅速かつ適切な対応（被害者ケア・行為者処分・再発防止）",
      "性的指向・性自認に対するハラスメントも対象に含める",
    ],
    legalBasis: [
      "男女雇用機会均等法 第11条",
      "事業主が職場における性的な言動に起因する問題に関して雇用管理上講ずべき措置等についての指針（平成18年厚労省告示第615号）",
    ],
    linkToStressCheck:
      "高ストレス者面接でセクハラ被害が判明した場合、医師面接の守秘範囲を超えない形でハラスメント窓口へ接続する手順を事前に整備しておく。",
  },
  {
    type: "maternity",
    employerDuties: [
      "妊娠・出産・育児休業・介護休業等を理由とする不利益取扱の禁止",
      "ハラスメント防止措置（方針明確化・相談窓口・事後対応）の実施",
      "制度利用申出への適切な対応",
    ],
    legalBasis: [
      "男女雇用機会均等法 第9条・第11条の3",
      "育児・介護休業法 第10条・第25条",
    ],
    linkToStressCheck:
      "復職時のストレスチェック結果が悪化している場合、両立支援プランの見直しとあわせて、配属先でのマタハラ・パタハラの兆候を確認する。",
  },
  {
    type: "customer",
    employerDuties: [
      "顧客等からの著しい迷惑行為に対する被害者ケアと相談体制の整備",
      "対応マニュアル整備（記録・録画・警察連携）と現場研修",
      "悪質事案での就業環境調整（配置転換・テレワーク・接客中断）",
    ],
    legalBasis: [
      "労働施策総合推進法 改正案（2026年4月時点で施行日未確定）",
      "カスタマーハラスメント対策企業マニュアル（厚労省、令和4年）",
      "心理的負荷による精神障害の認定基準（令和5年改正で『顧客や取引先から著しい迷惑行為を受けた』が追加）",
    ],
    linkToStressCheck:
      "接客・コールセンター部門のストレスチェック結果は職場改善計画に直結。高ストレス者面接で具体事案が判明した場合は労災相談ルートを併走させる。",
  },
];

export function getLinkageByType(
  type: HarassmentLinkage["type"],
): HarassmentLinkage | undefined {
  return HARASSMENT_LINKAGES.find((l) => l.type === type);
}
