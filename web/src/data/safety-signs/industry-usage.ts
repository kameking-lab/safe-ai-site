import type { IndustryId, UsageRequirement } from "@/types/safety-sign";
import { SAFETY_SIGNS } from "./index";

export interface IndustryDescriptor {
  id: IndustryId;
  /** Japanese display label. */
  label: string;
  /** English label. */
  labelEn: string;
  /** Short paragraph describing typical sign deployment in the industry. */
  intro: string;
  /** Mascot icon for the hub card. */
  icon: string;
  /** Tailwind accent token. */
  accent: "amber" | "emerald" | "blue" | "rose" | "slate" | "violet";
  /** Operational themes that drive sign selection. */
  themes: string[];
  /** Statutory anchors mentioned in industry context. */
  statutes: string[];
}

export const INDUSTRIES: IndustryDescriptor[] = [
  {
    id: "construction",
    label: "建設業",
    labelEn: "Construction",
    intro:
      "墜落・転落・崩壊・重機接触が主要リスク。安衛則第518〜519条、539条、第585条に基づく現場標識を基本セットとして整備します。",
    icon: "🏗️",
    accent: "amber",
    themes: ["墜落防止", "重機作業区分", "粉じん・化学", "緊急対応"],
    statutes: ["労働安全衛生規則", "クレーン等安全規則", "酸素欠乏症等防止規則"],
  },
  {
    id: "manufacturing",
    label: "製造業",
    labelEn: "Manufacturing",
    intro:
      "機械への巻き込まれ・粉じん・有機溶剤・騒音が中心。ライン入口の保護具着用標識と区域標示、停電作業時のロックアウト表示が必須です。",
    icon: "🏭",
    accent: "blue",
    themes: ["保護具着用", "機械安全", "化学物質取扱", "騒音管理"],
    statutes: ["労働安全衛生規則", "有機溶剤中毒予防規則", "粉じん障害防止規則"],
  },
  {
    id: "transport",
    label: "運輸・物流業",
    labelEn: "Transport & logistics",
    intro:
      "車両動線と歩行者動線の区分、バース安全、ドライバー入構動線が重要。歩行者通路標識・フォークリフト関連の警告／指示／禁止標識をセットで運用します。",
    icon: "🚛",
    accent: "slate",
    themes: ["車両動線", "荷役安全", "夜間視認性", "緊急通報"],
    statutes: ["労働安全衛生規則", "道路交通法", "貨物自動車運送事業法"],
  },
  {
    id: "healthcare",
    label: "医療・福祉",
    labelEn: "Healthcare & welfare",
    intro:
      "感染症・放射線・薬剤暴露・腰痛が主要リスク。バイオハザード警告、AED・救護所案内、特殊機器（MRI・X線）周辺の電波・磁場標識が必要です。",
    icon: "🏥",
    accent: "rose",
    themes: ["感染防止", "放射線管理", "AED・救護", "MRI・磁場"],
    statutes: [
      "労働安全衛生規則",
      "電離放射線障害防止規則",
      "感染症の予防及び感染症の患者に対する医療に関する法律",
    ],
  },
  {
    id: "service",
    label: "サービス業（小売・飲食・宿泊）",
    labelEn: "Service (retail, food, lodging)",
    intro:
      "床面の滑り・転倒、火災避難、清掃中の薬品が主要リスク。健康増進法に基づく禁煙標識、避難誘導、AED、滑り注意の標識を中心に整備します。",
    icon: "🛍️",
    accent: "emerald",
    themes: ["転倒防止", "避難誘導", "禁煙・防火", "顧客向け案内"],
    statutes: ["健康増進法", "消防法", "食品衛生法", "労働安全衛生規則"],
  },
  {
    id: "warehouse",
    label: "倉庫業",
    labelEn: "Warehouse",
    intro:
      "フォークリフト稼働路と歩行者の交差、ラック過積載、高所棚作業がリスク。歩行者専用通路の指示標識、過積載・段積み禁止、避難経路を整備します。",
    icon: "📦",
    accent: "violet",
    themes: ["フォーク動線", "ラック荷重", "歩行動線", "夜間荷役"],
    statutes: ["労働安全衛生規則", "倉庫業法"],
  },
  {
    id: "chemical",
    label: "化学・プラント",
    labelEn: "Chemical / process plants",
    intro:
      "引火性・有毒・腐食性物質、酸欠、高圧ガスを扱うため、警告・禁止・指示・安全状態・防火の全カテゴリが網羅的に必要です。",
    icon: "⚗️",
    accent: "rose",
    themes: ["危険物管理", "酸欠・窒息", "緊急洗浄", "プラント停止保全"],
    statutes: [
      "労働安全衛生規則",
      "特定化学物質障害予防規則",
      "高圧ガス保安法",
      "消防法",
    ],
  },
  {
    id: "agriculture",
    label: "農業・林業",
    labelEn: "Agriculture & forestry",
    intro:
      "農薬・粉じん（穀物・木粉）・振動工具・転落が主要リスク。農薬倉庫、サイロ、林業機械の周辺に化学物質警告と振動・粉じんの指示標識を配置します。",
    icon: "🌾",
    accent: "emerald",
    themes: ["農薬管理", "粉じん", "振動工具", "屋外暑熱"],
    statutes: ["農薬取締法", "労働安全衛生規則"],
  },
];

export function getIndustryDescriptor(id: IndustryId): IndustryDescriptor {
  const descriptor = INDUSTRIES.find((i) => i.id === id);
  if (!descriptor) {
    throw new Error(`Unknown industry: ${id}`);
  }
  return descriptor;
}

export interface IndustrySignEntry {
  signId: string;
  signName: string;
  category: string;
  requirement: UsageRequirement;
  examples: string[];
}

export function getIndustrySigns(industry: IndustryId): IndustrySignEntry[] {
  return SAFETY_SIGNS.flatMap((sign) => {
    const usage = sign.industryUsage.find((u) => u.industry === industry);
    if (!usage) return [];
    return [
      {
        signId: sign.id,
        signName: sign.name,
        category: sign.category,
        requirement: usage.requirement,
        examples: usage.examples,
      },
    ];
  });
}

export const REQUIREMENT_LABEL: Record<UsageRequirement, string> = {
  required: "必須",
  recommended: "推奨",
  situational: "状況対応",
};

export const REQUIREMENT_BADGE: Record<UsageRequirement, string> = {
  required: "bg-red-100 text-red-700 border-red-200",
  recommended: "bg-amber-100 text-amber-700 border-amber-200",
  situational: "bg-slate-100 text-slate-700 border-slate-200",
};
