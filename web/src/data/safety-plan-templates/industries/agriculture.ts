/**
 * 農業 / Agriculture.
 *
 * Agricultural machinery (tractor/combine) rollovers and PTO entanglement
 * remain the dominant fatal-accident drivers, with heat stroke during
 * summer field work also a chronic risk. Labor Standards Act §41 exempts
 * agriculture from working-time / day-off / break provisions, which makes
 * voluntary fatigue management and heat acclimatization explicit topics
 * here. Reference: MHLW「農業における労働安全衛生指針」, 林災防/中災防 materials.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const agricultureIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "農業機械（トラクター・コンバイン等）転倒・巻き込まれ災害ゼロ",
    description:
      "農業機械のヒヤリハットを月次で収集し、安全フレーム・シートベルト・PTO防護カバーの装着徹底とほ場進入路の段差解消で、転倒・巻き込まれ災害をゼロにする。",
    target: "農機関連の重大災害 0件 / シートベルト装着率 100%",
    kpi: "農機関連災害件数 / 機械点検記録数",
  },
  {
    category: "health-promotion",
    title: "夏季屋外作業者の熱中症発症ゼロ",
    description:
      "WBGT実測に基づく作業中止基準と休憩計画、空調服・経口補水液の常備、暑熱順化期間の確保により、熱中症を発症させない。",
    target: "熱中症による救急搬送 0件 / 暑熱順化計画策定 100%",
    kpi: "WBGT測定回数 / 熱中症発生件数",
  },
  {
    category: "ra-coverage",
    title: "化学物質（農薬・燃料・肥料）取扱いのリスクアセスメント実施",
    description:
      "農薬・燃料・肥料の SDS を取り寄せ、年1回以上のリスクアセスメントを実施。保護具・換気・保管方法を見直す。",
    target: "対象化学物質の RA 実施率 100%",
    kpi: "化学物質RA実施件数 / SDS整備率",
  },
];

export const agricultureIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "農業機械の始業前点検と安全装置の確認",
    description:
      "トラクター・コンバイン・刈払機・スピードスプレーヤー等について、始業前にブレーキ・PTO防護カバー・シートベルト・前照灯・タイヤ空気圧を点検し、点検記録を 1 年間保存する。",
    frequency: "始業前（毎日） / 月次総点検",
    responsible: "農場長 / 機械担当者",
    reference: "農作業安全のための指針（農林水産省）",
  },
  {
    category: "industry-specific",
    title: "農業機械の特別教育（刈払機・農用車両系トラクター）",
    description:
      "刈払機取扱い・トラクター運転（安衛則第36条相当の社内特別教育）を新規入場者・配置転換者に実施し、修了記録を保存する。",
    frequency: "新規入場の都度 / 年1回フォローアップ",
    responsible: "事業者 / 安全衛生推進者",
    reference: "安衛則第36条（特別教育に類する社内教育）",
  },
  {
    category: "industry-specific",
    title: "熱中症予防の WBGT 計測と作業中止基準",
    description:
      "ほ場・ハウス・選果場で WBGT を測定し、28℃以上で休憩延長、31℃以上で原則作業中止。暑熱順化のため新規入場後 7 日間は短時間作業を徹底する。",
    frequency: "5月〜9月の屋外作業日毎",
    responsible: "農場長 / 衛生推進者",
    reference: "安衛則第612条の2 / 基安発0701第1号",
  },
  {
    category: "industry-specific",
    title: "農薬散布作業のばく露低減・保護具着用",
    description:
      "農薬散布前後の手洗い・うがい、防護衣・防護マスク・防護メガネの着用、散布後の作業着の分別洗濯、空容器の適正処理を徹底する。",
    frequency: "散布作業の都度",
    responsible: "農場長 / 散布作業者",
    reference: "農薬取締法 / 農薬の使用の禁止・制限に関する省令",
  },
  {
    category: "industry-specific",
    title: "高齢就労者・家族労働者の安全配慮",
    description:
      "65 歳以上の就労者比率が高い農業特有の事情を踏まえ、エイジフレンドリーガイドラインに基づき作業手順・体力に応じた配置・健康相談を実施する。",
    frequency: "通年 / 年1回見直し",
    responsible: "事業者 / 産業医（嘱託）",
    reference: "高年齢労働者の安全と健康確保のためのガイドライン（2020年厚労省）",
  },
];

export const agricultureMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  3: [
    {
      title: "春作業前の農機総点検",
      category: "equipment-check",
      description:
        "田起こし・代かき・播種期に先立ち、トラクター・耕運機・スピードスプレーヤーの安全装置・PTO防護カバー・シートベルトを総点検する。",
      required: false,
    },
  ],
  5: [
    {
      title: "農作業安全月間（5月・農林水産省）",
      category: "education",
      description:
        "農水省主催「春の農作業安全確認運動」に呼応し、地域 JA・農機メーカー講師による安全研修を実施。家族労働者にも呼びかける。",
      required: false,
    },
  ],
  7: [
    {
      title: "夏季熱中症対策強化期間",
      category: "industry-specific",
      description:
        "WBGT 測定の見える化、休憩時間延長、暑熱順化計画、空調服・冷却タオル支給、塩飴・経口補水液の常備を徹底する。",
      reference: "安衛則第612条の2",
      required: true,
    },
  ],
  9: [
    {
      title: "秋の農作業安全確認運動（農林水産省）",
      category: "education",
      description:
        "稲刈り・果樹収穫期に先立ち、コンバイン・脚立・梯子・運搬車の事故事例を共有し、KY ボードで再発防止策を議論する。",
      required: false,
    },
  ],
  11: [
    {
      title: "冬期 ハウス・畜舎の換気と一酸化炭素中毒予防",
      category: "industry-specific",
      description:
        "暖房機の点検と CO 警報器の動作確認、ハウス・畜舎の換気手順を周知する。",
      required: false,
    },
  ],
};

export const agricultureLawReferences: LawReference[] = [
  {
    name: "労働基準法（農業関連）",
    articles: [
      "第41条（労働時間・休憩・休日の適用除外）",
      "第60条（年少者の使用制限）",
    ],
    summary:
      "農業は労働時間・休憩・休日の適用除外。自主的な勤務時間管理と健康確保措置の整備が経営者の責務となる。",
  },
  {
    name: "労働安全衛生法（農業関連）",
    articles: [
      "第59条（雇入れ時等の安全衛生教育）",
      "第60条の2（職長等教育に類する社内教育）",
    ],
    summary:
      "農業は安衛法施行令の業種上「その他の事業」として扱われるが、農業機械取扱い等の特別教育に類する社内教育の実施が推奨される。",
  },
  {
    name: "農薬取締法",
    articles: ["第18条（農薬の使用の禁止）", "第24条（使用基準の遵守）"],
    summary:
      "登録農薬の適正使用、ばく露低減のための保護具着用、使用記録の保存を定める。",
  },
];

export const agricultureCircularReferences: CircularReference[] = [
  {
    number: "23消安第6051号",
    date: "2023-12-15",
    title: "農作業安全のための指針（農林水産省）の改正について",
  },
  {
    number: "基安発0701第1号",
    date: "2023-07-01",
    title: "屋外作業における熱中症予防対策の徹底について（WBGT 等）",
  },
];

export const agricultureBasicPolicy = `当社（当農場）は、農業機械転倒・巻き込まれと熱中症を二大重点リスクと位置付け、家族労働者・高齢就労者・季節雇用者を含む全ての作業者が安心して農作業に従事できる職場を実現する。トラクター・コンバイン等の安全フレーム・シートベルト・PTO防護の徹底、WBGT に基づく作業計画、農薬・燃料の SDS 整備とリスクアセスメントを 3 本柱として、年次安全衛生計画を運用する。`;
