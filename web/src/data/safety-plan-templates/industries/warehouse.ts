/**
 * 倉庫・運送取扱業 / Warehouse & Forwarding.
 *
 * Specialized version of 卸売業 with emphasis on 高層棚, 自動倉庫, RFID,
 * テールゲートリフター, and EC物流 by-products.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const warehouseIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "フォークリフト・自動倉庫災害ゼロ",
    description:
      "フォークリフト・スタッカー・自動倉庫との接触・はさまれをゼロにする。歩車分離、自動倉庫の侵入検知、メンテナンス時のLOTO（ロックアウト/タグアウト）を徹底する。",
    target: "フォークリフト・自動倉庫災害 0件",
    kpi: "災害件数 / 自動倉庫稼働時間",
  },
  {
    category: "accident-reduction",
    title: "墜落・転落災害ゼロ（高層棚）",
    description:
      "高層棚への積込・取出し作業中の墜落・転落をゼロにする。高所ピッキング機（オーダーピッカー）の活用、フルハーネス使用を徹底する。",
    target: "墜落・転落災害 0件",
    kpi: "墜落・転落件数 / 高所作業件数",
  },
  {
    category: "accident-reduction",
    title: "荷役災害（テールゲートリフター等）の削減",
    description:
      "トラック荷台での墜落・転倒、テールゲートリフター操作時のはさまれを防止する。陸災防の指導に沿い特別教育修了者を選任する。",
    target: "荷役災害 前年比 50% 減",
    kpi: "荷役災害件数 / 配送件数",
  },
];

export const warehouseIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "フォークリフトの確実な運用（資格・点検・分離）",
    description:
      "技能講習・特別教育修了者のみが運転、構内8km/h以下、歩車分離、月次・年次の点検、フォーク先端の安全表示を運用。",
    frequency: "通年 / 点検は始業前・月1回・年1回",
    responsible: "倉庫長 / 整備担当",
    reference: "安衛則第151条の2〜第151条の26",
  },
  {
    category: "industry-specific",
    title: "オーダーピッカー（高所ピッキング車）の安全運用",
    description:
      "オーダーピッカー操作者はフルハーネス必須、保護柵の確認、走行中の高位置移動禁止、人員と荷の同時昇降禁止を徹底。",
    frequency: "通年 / 教育は新規対象者の都度",
    responsible: "倉庫長 / 安全担当",
    reference: "安衛則第36条第41号（フルハーネス特別教育）",
  },
  {
    category: "industry-specific",
    title: "自動倉庫・ロボットのLOTO（保守時の確実な停止）",
    description:
      "自動倉庫・搬送ロボットの保守・清掃時はロックアウト/タグアウトを必須化。複数人作業時は鍵を作業者全員が個別管理する。",
    frequency: "保守・清掃の都度",
    responsible: "保守担当 / 安全管理者",
    reference: "安衛則第107条（清掃等の場合の運転停止）",
  },
  {
    category: "industry-specific",
    title: "テールゲートリフター操作の特別教育",
    description:
      "テールゲートリフターによる積卸し作業に従事する者には特別教育を実施（令和6年2月施行）。修了記録を保存。",
    frequency: "新規対象者の都度",
    responsible: "倉庫長",
    reference: "安衛則第36条第5号の3",
  },
  {
    category: "industry-specific",
    title: "陸上貨物運送事業の荷役作業安全対策",
    description:
      "陸災防「荷役作業の安全対策ガイドライン」に基づき、墜落防止設備、保護帽・墜落制止用器具の支給、荷主との安全打合せを実施。",
    frequency: "通年",
    responsible: "倉庫長 / 営業",
    reference: "陸災防ガイドライン",
  },
];

export const warehouseMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  6: [
    {
      title: "全国安全週間 荷役安全取組",
      category: "industry-specific",
      description:
        "陸災防取組に呼応し、保護具着用、トラック荷台作業の安全手順、テールゲートリフター運用を点検。",
      required: false,
    },
  ],
  11: [
    {
      title: "陸上貨物運送事業労働災害防止強化期間",
      category: "industry-specific",
      description:
        "繁忙期に向けて荷役作業の安全手順を再確認、保護具着用を徹底。",
      required: false,
    },
  ],
};

export const warehouseLawReferences: LawReference[] = [
  {
    name: "労働安全衛生法",
    articles: ["第14条（作業主任者）", "第59条第3項（特別教育）", "第61条（就業制限）"],
    summary:
      "フォークリフト等の運転に係る資格・特別教育・作業主任者を定める。",
  },
  {
    name: "労働安全衛生規則",
    articles: [
      "第36条第5号の3（テールゲートリフター特別教育）",
      "第107条（清掃等の運転停止）",
      "第151条の2〜第151条の26（フォークリフト等）",
      "第518条〜第533条（墜落の防止）",
    ],
    summary:
      "テールゲートリフター・自動倉庫保守・フォークリフト・墜落防止の基準を定める。",
  },
];

export const warehouseCircularReferences: CircularReference[] = [
  {
    number: "基発0331第4号",
    date: "2024-03-31",
    title: "陸上貨物運送事業における荷役作業の安全対策ガイドラインの一部改正について",
  },
  {
    number: "基発0223第1号",
    date: "2024-02-23",
    title: "墜落制止用器具に係る規制及びテールゲートリフター操作業務に係る特別教育の周知について",
  },
];

export const warehouseBasicPolicy = `当社は「機械と人の領域を確実に分ける」を方針とし、フォークリフト・自動倉庫・荷役作業による災害をゼロにする。歩車分離、特別教育・技能講習修了者の選任、保守時のLOTO、テールゲートリフターの安全運用を通じて、倉庫・物流の全工程で安全を確保する。`;
