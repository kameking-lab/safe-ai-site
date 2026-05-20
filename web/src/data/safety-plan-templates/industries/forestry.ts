/**
 * 林業 / Forestry.
 *
 * The highest-fatality industry per 1,000 workers in Japan. Chainsaw kickback,
 * tree-felling struck-by, and skidding-rope tension accidents are the
 * dominant fatal mechanisms. The Forestry Safety Rules (林業労働安全衛生規則
 * — informally) are codified within 安衛則 第6章 (伐木作業等の特別則 §477〜510)
 * and 林業労働安全衛生ガイドライン (林災防 / 中央労働災害防止協会).
 * Special education (チェーンソー特別教育) is a hard statutory requirement.
 */

import type {
  CircularReference,
  LawReference,
  MonthIndex,
  MonthlyEvent,
  SafetyGoal,
  SafetyMeasure,
} from "@/types/safety-plan";

export const forestryIndustryGoals: SafetyGoal[] = [
  {
    category: "accident-reduction",
    title: "伐木造材作業（チェーンソー）における死亡災害ゼロ",
    description:
      "受口・追口・かかり木処理の標準作業手順、防護衣（チェーンソー用防護ズボン）・防護帽・聴覚保護具の完全着用、複数作業者間の安全距離（2 倍樹高）確保を徹底する。",
    target: "伐木作業中の死亡災害 0件 / 防護衣着用率 100%",
    kpi: "伐木作業件数 / 災害発生件数",
  },
  {
    category: "education-coverage",
    title: "チェーンソー特別教育の修了率 100%",
    description:
      "全ての伐木作業者が安衛則第36条第8号の特別教育（学科18時間・実技9時間）を修了するまで、単独伐木作業に従事させない。",
    target: "特別教育修了率 100%",
    kpi: "対象者数 / 修了者数",
  },
  {
    category: "compliance",
    title: "高性能林業機械（プロセッサ・フォワーダ等）の安全運用",
    description:
      "車両系林業機械の運転技能講習（安衛令第20条第12号）修了者のみ運転に従事させ、機械周辺の立入禁止区画と誘導者を確保する。",
    target: "資格不適合運転 0件 / 立入禁止区画違反 0件",
    kpi: "技能講習修了者数 / 機械運転件数",
  },
];

export const forestryIndustryMeasures: SafetyMeasure[] = [
  {
    category: "industry-specific",
    title: "チェーンソー作業従事者の特別教育（安衛則第36条第8号）",
    description:
      "胸高直径 70cm 以上の立木の伐木作業（または、かかり木の処理を行う場合）に従事する労働者に対し、特別教育（学科18時間・実技9時間）を行い、修了記録を 3 年間保存する。",
    frequency: "新規入場時 / 業務拡張時",
    responsible: "事業者 / 安全衛生推進者",
    reference: "安衛則第36条第8号 / 平成31年厚労省告示第77号",
  },
  {
    category: "industry-specific",
    title: "伐木作業の作業計画策定と KY 実施",
    description:
      "受口・追口の角度、つるの形状、かかり木処理の手順、退避場所・退避路、合図方法を作業計画書に明記し、毎朝 KY ボードで全作業者と共有する。",
    frequency: "作業日毎",
    responsible: "現場責任者 / 班長",
    reference: "安衛則第477条〜第478条",
  },
  {
    category: "industry-specific",
    title: "チェーンソー用防護衣・防護帽・聴覚保護具の完全着用",
    description:
      "JIS T 8125-2 適合の防護ズボン、ヘルメット・防顔網・聴覚保護具を着用しないチェーンソー作業を禁止。装備の摩耗を月次で点検する。",
    frequency: "作業の都度 / 装備点検は月1回",
    responsible: "現場責任者",
    reference: "安衛則第485条 / 平成30年基発0820第2号",
  },
  {
    category: "industry-specific",
    title: "かかり木処理の標準作業（複数人作業・牽引・隔離）",
    description:
      "かかり木は牽引装置（ロープウインチ・トラクター）で処理するか、隔離措置をとる。胴突き等の危険な処理方法を禁止し、作業中は周囲 1.5 倍樹高に立入禁止を設ける。",
    frequency: "発生の都度",
    responsible: "現場責任者 / 班長",
    reference: "安衛則第481条",
  },
  {
    category: "industry-specific",
    title: "車両系林業機械の運転技能講習修了者の確認",
    description:
      "プロセッサ・ハーベスタ・フォワーダ等の機体重量 3t 以上の車両系林業機械の運転は、運転技能講習修了者に限る。修了証を機械稼働簿に紐付け管理する。",
    frequency: "新規入場時 / 配置変更時",
    responsible: "事業者 / 機械担当者",
    reference: "安衛令第20条第12号 / 安衛則第151条の29",
  },
];

export const forestryMonthlyExtras: Partial<Record<MonthIndex, MonthlyEvent[]>> = {
  3: [
    {
      title: "春の山林災害ゼロ運動（林災防）",
      category: "industry-specific",
      description:
        "林災防主催の災害ゼロ運動に参加し、防護衣・チェーンソー目立て・救急体制（携帯電話圏外時の救助連絡網）を再確認する。",
      required: false,
    },
  ],
  6: [
    {
      title: "全国安全週間 山林・林業特別取組",
      category: "industry-specific",
      description:
        "現場責任者によるパトロール、防護装備の全数点検、かかり木処理事例の振り返り、新規入場者の追加教育を実施する。",
      required: false,
    },
  ],
  7: [
    {
      title: "夏季 熱中症・蜂・マダニ・蛇対策",
      category: "industry-specific",
      description:
        "WBGT 測定、長袖・長ズボン・防護網の着用、蜂アレルギー対応薬（エピペン等）の携行、ヘビ咬傷時の緊急連絡フローを周知する。",
      required: true,
      reference: "安衛則第612条の2",
    },
  ],
  10: [
    {
      title: "秋季 伐木最盛期の作業計画レビュー",
      category: "industry-specific",
      description:
        "立木調査・路網計画・退避路・作業順序を全班で共有し、新人作業者を伐木単独作業から外す配置とする。",
      required: false,
    },
  ],
  11: [
    {
      title: "山林災害撲滅運動（林災防）",
      category: "education",
      description:
        "林災防の災害撲滅運動に呼応し、年間事故事例の振り返りと翌年度の重点取組を全員で議論する。",
      required: false,
    },
  ],
};

export const forestryLawReferences: LawReference[] = [
  {
    name: "労働安全衛生規則（林業関連）",
    articles: [
      "第36条第8号（チェーンソー特別教育）",
      "第477条〜第510条（伐木等の業務に係る危険の防止）",
      "第151条の29（車両系林業機械の運転）",
    ],
    summary:
      "伐木・造材作業、車両系林業機械、伐木造材機械の運転に係る特別教育・技能講習・作業計画・退避措置等を定める。",
  },
  {
    name: "労働安全衛生法施行令",
    articles: [
      "第20条第12号（車両系林業機械の運転技能講習）",
    ],
    summary:
      "機体重量 3t 以上の車両系林業機械の運転を就業制限業務とし、技能講習修了者でなければ業務に就かせてはならない。",
  },
];

export const forestryCircularReferences: CircularReference[] = [
  {
    number: "基発0820第2号",
    date: "2018-08-20",
    title: "伐木等作業の安全に関する規則の改正について（防護衣着用の義務化等）",
  },
  {
    number: "平成31年厚労省告示第77号",
    date: "2019-03-29",
    title: "チェーンソーによる伐木等の業務に係る特別教育規程",
  },
];

export const forestryBasicPolicy = `当社は、林業が全産業中最も死亡災害率が高い業種であることを正面から受け止め、伐木作業従事者全員のチェーンソー特別教育修了・防護衣完全着用・かかり木処理の標準作業遵守を経営の最優先事項とする。山林災害撲滅運動・全国安全週間と歩調を合わせ、車両系林業機械の運転資格管理、退避路と退避場所の事前確認、救急救助体制（圏外通信・搬送ルート）の整備を年間計画として運用する。`;
