/**
 * 年間 安全衛生カレンダー（一般的な目安）。
 *
 * 全国安全週間・全国労働衛生週間・年末年始無災害運動などの全国的な運動期間と、
 * 季節リスク・主な法定の定期事項を月別に整理した一般的なリファレンス。
 * 具体的な実施時期・対象は事業場の規模・業種・作業に応じて事業者が定める。
 */

export type CalendarItem = { label: string; href?: string };
export type CalendarMonth = { month: number; items: CalendarItem[] };

/** 毎日・毎月・随時に行う主な安全衛生活動（リンク付き）。 */
export const RECURRING_ITEMS: CalendarItem[] = [
  { label: "毎日: KY（危険予知）", href: "/ky/paper" },
  { label: "毎日: 作業開始前点検（機械・工具）", href: "/site-records/inspection" },
  { label: "都度: 新規入場者 受入教育", href: "/site-records/induction" },
  { label: "毎月: 安全衛生委員会（常時50人以上）", href: "/site-records/committee" },
  { label: "毎週/毎月: 安全パトロール・職場巡視", href: "/site-records/patrol" },
  { label: "随時: ヒヤリハット報告・集計", href: "/site-records/near-miss" },
  { label: "毎月: 月次安全衛生レポート作成", href: "/site-records/monthly" },
];

export const SAFETY_CALENDAR: CalendarMonth[] = [
  { month: 1, items: [{ label: "年末年始無災害運動（〜1/15頃）" }, { label: "寒さ・路面凍結・除雪作業の災害に注意" }, { label: "年始の安全朝礼・方針の再確認", href: "/signage" }] },
  { month: 2, items: [{ label: "冬季の転倒・凍結・一酸化炭素中毒に注意" }, { label: "新年度の安全衛生計画の検討開始", href: "/strategy/plan-generator" }] },
  { month: 3, items: [{ label: "年度末の工程繁忙による無理・過労に注意" }, { label: "次年度の体制・計画・教育計画の整備", href: "/strategy/plan-generator" }] },
  { month: 4, items: [{ label: "新入者・配置転換者への雇入れ時等教育", href: "/site-records/induction" }, { label: "新年度の安全衛生方針・体制の周知", href: "/signage" }, { label: "定期健康診断の年間計画", href: "/health-checkup-scheduler" }] },
  { month: 5, items: [{ label: "気温上昇期：暑熱順化を計画的に開始", href: "/heat-illness-prevention/acclimatization" }, { label: "大型連休前後の安全確認" }] },
  { month: 6, items: [{ label: "全国安全週間 準備期間（6/1〜6/30）" }, { label: "熱中症対策の本格化（WBGT測定・記録）", href: "/heat-illness-prevention" }, { label: "梅雨：足場・感電・くずれの災害に注意" }] },
  { month: 7, items: [{ label: "全国安全週間（7/1〜7/7）" }, { label: "熱中症ピーク：WBGT日次記録・掲示", href: "/heat-illness-prevention/log" }, { label: "夏季の長時間労働・過労に注意" }] },
  { month: 8, items: [{ label: "熱中症・台風・強風への備え" }, { label: "お盆前後の応援・不慣れな作業の災害に注意" }] },
  { month: 9, items: [{ label: "全国労働衛生週間 準備期間（9/1〜9/30）" }, { label: "台風・大雨時の作業中止基準の確認" }, { label: "秋の健康診断・有所見者の事後措置", href: "/health-checkup-scheduler" }] },
  { month: 10, items: [{ label: "全国労働衛生週間（10/1〜10/7）" }, { label: "日没が早まる：照度・通路・交通の確認" }] },
  { month: 11, items: [{ label: "年末年始無災害運動 準備（12/1〜）" }, { label: "寒さ対策・乾燥による火災に注意" }] },
  { month: 12, items: [{ label: "年末年始無災害運動（12/1〜1/15頃）" }, { label: "年末工程の繁忙・応援者の災害に注意" }, { label: "1年の災害・ヒヤリの総括と次年度への反映", href: "/site-records/monthly" }] },
];

export const MONTH_LABEL = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
