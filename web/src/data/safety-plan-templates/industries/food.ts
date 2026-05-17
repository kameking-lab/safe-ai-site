/**
 * 飲食業 / Food service.
 *
 * Leading hazards: 切創、火傷、転倒（厨房の水濡れ・油）、腰痛、
 * カスタマーハラスメント、長時間労働、深夜業。
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const foodIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "切創・火傷ゼロ",
    description:
      "厨房での切創・火傷災害をゼロにする。包丁の取扱ルール、耐切創手袋、火気・熱源の安全距離、保護具の支給を徹底する。",
    target: "切創・火傷災害 0件",
    kpi: "切創・火傷件数 / 厨房従事者数",
  },
  {
    category: "accident-reduction",
    title: "厨房での転倒ゼロ",
    description:
      "厨房の水濡れ・油こぼれ・段差による転倒をゼロにする。即時清掃ルール、すべりにくい靴の貸与、ノンスリップマットを運用する。",
    target: "厨房転倒災害 0件",
    kpi: "厨房での転倒件数",
  },
  {
    category: "compliance",
    title: "食中毒予防（HACCPに沿った衛生管理）",
    description:
      "HACCPに沿った衛生管理を全店舗で運用し、食中毒の発生をゼロにする。一般衛生管理と重要管理点を毎日記録する。",
    target: "食中毒発生 0件 / HACCP記録 100%",
    kpi: "発生件数 / 記録運用状況",
  },
];

export const foodIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "包丁・調理機械の安全取扱",
    description:
      "包丁は専用ラックで保管・受渡しは置く方式、スライサー等は安全カバーと注意喚起表示、清掃時の電源遮断を徹底。耐切創手袋を支給する。",
    frequency: "通年 / 教育は新人配属時・年1回",
    responsible: "店長 / 料理長",
  },
  {
    category: "industry-specific",
    title: "火傷防止対策",
    description:
      "熱湯・油・蒸気の取扱手順、調理服・耐熱手袋・前掛けの着用、揚げ物作業の油はね対策、フライヤー清掃手順を整備する。",
    frequency: "通年 / 教育は新人配属時",
    responsible: "店長 / 料理長",
  },
  {
    category: "industry-specific",
    title: "厨房転倒防止（4S＋滑り止め）",
    description:
      "水・油の即時清掃、ノンスリップマット運用、すべりにくい靴の貸与、整理整頓、通路幅確保を徹底。",
    frequency: "毎日",
    responsible: "店長 / 料理長",
  },
  {
    category: "industry-specific",
    title: "HACCPに沿った衛生管理",
    description:
      "一般衛生管理（施設・器具・健康・手洗い等）と重要管理点（加熱・冷却・温度管理等）を毎日記録。月次で振り返り、年1回見直し。",
    frequency: "毎日 / 振り返りは月1回",
    responsible: "店長 / HACCP責任者",
    reference: "食品衛生法第51条",
  },
  {
    category: "industry-specific",
    title: "カスタマーハラスメント対応（接客現場）",
    description:
      "暴言・暴力・不当要求への対応マニュアル、複数対応体制、警察連携基準、被害従業員へのフォロー（産業医面談等）を整備。",
    frequency: "通年",
    responsible: "店長 / 本部",
  },
];

export const foodMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  5: [
    {
      title: "食中毒予防強化期間（梅雨〜夏）",
      category: "industry-specific",
      description:
        "細菌性食中毒の流行期に向けて、温度管理・手洗い・調理器具消毒・体調管理を徹底。",
      required: false,
    },
  ],
  10: [
    {
      title: "食中毒予防強化期間（ノロウイルス対策）",
      category: "industry-specific",
      description:
        "ウイルス性食中毒の流行期に向けて、嘔吐物処理手順・有症者の就業制限・手洗い・調理器具消毒を徹底。",
      required: false,
    },
  ],
  12: [
    {
      title: "年末繁忙期の安全配慮",
      category: "industry-specific",
      description:
        "長時間労働の抑制、深夜業務の安全確保、調理機械のメンテナンス、応援要員への教育を実施。",
      required: false,
    },
  ],
};

export const foodLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: ["第18条（衛生委員会）", "第59条（教育）"],
    summary: "飲食業に対する衛生委員会・教育の基本枠組を定める。",
  },
  {
    name: "労働安全衛生規則",
    articles: ["第544条（通路）", "第609条（換気）", "第618条（救急用具）"],
    summary: "厨房等の通路・換気・救急用具の備付けの基準を定める。",
  },
  {
    name: "食品衛生法",
    articles: ["第51条（HACCPに沿った衛生管理）"],
    summary: "食品取扱事業者にHACCPに沿った衛生管理計画の作成・実施・記録を義務付ける。",
  },
];

export const foodCircularReferences: CircularReference[] = [
  {
    number: "基発0123第2号",
    date: "2024-01-23",
    title: "第三次産業における労働災害防止対策（転倒・腰痛）の徹底について",
  },
];

export const foodBasicPolicy = `当社は「美味しさと安全を両立する厨房」を方針とし、切創・火傷・転倒災害および食中毒の発生をゼロにする。包丁・調理機械の取扱ルール、4S徹底、HACCPに沿った衛生管理、カスタマーハラスメント対策を通じて、従業員が誇りと安心を持って働ける店舗を実現する。`;
